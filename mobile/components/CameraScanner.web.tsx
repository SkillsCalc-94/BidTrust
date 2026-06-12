/**
 * Web implementation of CameraScanner.
 * Uses browser getUserMedia for live viewfinder and canvas snapshot for capture.
 * Barcode scanning priority:
 *   1. Native BarcodeDetector API (Chrome/Android — fastest, no bundle cost)
 *   2. @zxing/browser (iOS Safari + all other browsers — full cross-browser support)
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/browser';

const { width: SW, height: SH } = Dimensions.get('window');
const FRAME = Math.min(SW * 0.72, 280);

export interface ScanResult {
  imageUri: string;
  barcode?: { type: string; data: string };
  productName?: string;
  scanData?: any;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onCapture: (result: ScanResult) => void;
}

type Phase = 'requesting' | 'live' | 'captured' | 'error';

export default function CameraScanner({ visible, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barcodeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>('requesting');
  const [errorMsg, setErrorMsg] = useState('');
  const [torch, setTorch] = useState(false);
  const [detectedBarcode, setDetectedBarcode] = useState<{ type: string; data: string } | null>(null);

  const laserAnim = useRef(new Animated.Value(0)).current;

  // Laser sweep animation
  useEffect(() => {
    if (phase !== 'live') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(laserAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setPhase('requesting');
    setErrorMsg('');
    detectedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase('live');
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access in your browser settings.'
        : err.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : `Camera error: ${err.message}`;
      setErrorMsg(msg);
      setPhase('error');
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (barcodeIntervalRef.current) {
      clearInterval(barcodeIntervalRef.current);
      barcodeIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (visible) {
      startCamera();
    } else {
      stopCamera();
      setPhase('requesting');
      setDetectedBarcode(null);
      detectedRef.current = false;
    }
    return () => stopCamera();
  }, [visible]);

  // Torch toggle via track constraints
  useEffect(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      (track as any).applyConstraints({ advanced: [{ torch }] }).catch(() => {});
    } catch {}
  }, [torch]);

  // Barcode scanning loop — uses native BarcodeDetector if available, falls back to ZXing
  const zxingRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (phase !== 'live') return;

    const useNative = 'BarcodeDetector' in window;

    if (useNative) {
      // ── Native BarcodeDetector (Chrome / Android) ──────────────────────────
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'data_matrix', 'pdf417'],
      });
      barcodeIntervalRef.current = setInterval(async () => {
        if (detectedRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0 && !detectedRef.current) {
            detectedRef.current = true;
            const bc = barcodes[0];
            setDetectedBarcode({ type: bc.format, data: bc.rawValue });
            setTimeout(() => captureFrame({ type: bc.format, data: bc.rawValue }), 300);
          }
        } catch {}
      }, 400);
    } else {
      // ── ZXing fallback (iOS Safari + Firefox + all other browsers) ─────────
      const reader = new BrowserMultiFormatReader();
      zxingRef.current = reader;

      barcodeIntervalRef.current = setInterval(async () => {
        if (detectedRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
        if (!canvasRef.current) return;

        // Draw current frame to canvas then decode
        const c = canvasRef.current;
        c.width = videoRef.current.videoWidth || 640;
        c.height = videoRef.current.videoHeight || 480;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0, c.width, c.height);

        try {
          const result = await reader.decodeFromCanvas(c);
          if (result && !detectedRef.current) {
            detectedRef.current = true;
            const bc = { type: result.getBarcodeFormat().toString(), data: result.getText() };
            setDetectedBarcode(bc);
            setTimeout(() => captureFrame(bc), 300);
          }
        } catch (e) {
          // NotFoundException is normal when no barcode in frame — ignore
          if (!(e instanceof NotFoundException)) console.warn('ZXing error', e);
        }
      }, 500);
    }

    return () => {
      if (barcodeIntervalRef.current) clearInterval(barcodeIntervalRef.current);
      zxingRef.current = null;
    };
  }, [phase]);

  function captureFrame(barcode?: { type: string; data: string }) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL('image/jpeg', 0.85);

    setPhase('captured');
    stopCamera();
    onCapture({ imageUri: dataUri, barcode });
    setTimeout(() => handleClose(), 400);
  }

  function handleManualCapture() {
    if (phase !== 'live') return;
    captureFrame();
  }

  function handleClose() {
    stopCamera();
    setPhase('requesting');
    setDetectedBarcode(null);
    detectedRef.current = false;
    onClose();
  }

  if (!visible) return null;

  const laserY = laserAnim.interpolate({ inputRange: [0, 1], outputRange: [0, FRAME - 4] });
  const MASK_SIDE = (SW - FRAME) / 2;
  const MASK_TOP_H = Math.max((SH - FRAME) / 2 - 60, 80);

  return (
    <View style={styles.container}>
      {/* Live video viewfinder */}
      {/* @ts-ignore — web-only <video> element */}
      <video
        ref={videoRef}
        style={styles.video as any}
        autoPlay
        playsInline
        muted
      />
      {/* Hidden canvas for frame capture */}
      {/* @ts-ignore */}
      <canvas ref={canvasRef} style={{ display: 'none' } as any} />

      {/* Requesting / Error states */}
      {phase === 'requesting' && (
        <View style={styles.statusOverlay}>
          <ActivityIndicator color="#e94560" size="large" />
          <Text style={styles.statusText}>Starting camera...</Text>
        </View>
      )}

      {phase === 'error' && (
        <View style={styles.statusOverlay}>
          <Ionicons name="camera-off-outline" size={64} color="#e94560" />
          <Text style={styles.errorTitle}>Camera Unavailable</Text>
          <Text style={styles.errorMsg}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={startCamera}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Vignette overlay with scan frame */}
      {(phase === 'live' || phase === 'captured') && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[styles.mask, { height: MASK_TOP_H }]} />
          <View style={{ flexDirection: 'row', height: FRAME }}>
            <View style={[styles.mask, { width: MASK_SIDE }]} />
            {/* Scan frame */}
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cTL]} />
              <View style={[styles.corner, styles.cTR]} />
              <View style={[styles.corner, styles.cBL]} />
              <View style={[styles.corner, styles.cBR]} />
              {phase === 'live' && !detectedBarcode && (
                <Animated.View style={[styles.laser, { transform: [{ translateY: laserY }] }]} />
              )}
              {detectedBarcode && (
                <View style={styles.barcodeFlash}>
                  <Ionicons name="checkmark-circle" size={36} color="#10b981" />
                  <Text style={styles.barcodeText}>Barcode detected!</Text>
                </View>
              )}
              {phase === 'captured' && (
                <View style={styles.barcodeFlash}>
                  <Ionicons name="checkmark-circle" size={40} color="#10b981" />
                </View>
              )}
            </View>
            <View style={[styles.mask, { width: MASK_SIDE }]} />
          </View>
          <View style={[styles.mask, { flex: 1 }]} />
        </View>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleClose}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>AI Scanner</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setTorch(t => !t)}>
          <Ionicons name={torch ? 'flash' : 'flash-off'} size={22} color={torch ? '#f59e0b' : '#fff'} />
        </TouchableOpacity>
      </View>

      {/* Hint */}
      {phase === 'live' && (
        <View style={[styles.hintWrap, { top: MASK_TOP_H + FRAME + 14 }]} pointerEvents="none">
          <Text style={styles.hintText}>
            {'Point at a barcode to auto-scan, or tap the button to identify any item'}
          </Text>
        </View>
      )}

      {/* Bottom controls */}
      {(phase === 'live' || phase === 'captured') && (
        <View style={styles.bottomBar}>
          <View style={styles.sideBtn} />
          <TouchableOpacity
            style={[styles.shutter, phase !== 'live' && styles.shutterDone]}
            onPress={handleManualCapture}
            disabled={phase !== 'live'}
          >
            {phase === 'captured'
              ? <Ionicons name="checkmark" size={36} color="#10b981" />
              : <View style={styles.shutterInner} />}
          </TouchableOpacity>
          <View style={styles.sideBtn} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'fixed' as any,   // fixed escapes ScrollView clipping on web
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute' as any,
    top: 0, left: 0, width: '100%', height: '100%',
    objectFit: 'cover',
  } as any,
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d0d14',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    zIndex: 10,
  },
  statusText: { color: '#888', marginTop: 16, fontSize: 15 },
  errorTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  errorMsg: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  retryBtn: { backgroundColor: '#e94560', borderRadius: 10, paddingHorizontal: 28, paddingVertical: 12 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  mask: { backgroundColor: 'rgba(0,0,0,0.62)' },
  scanFrame: { width: FRAME, height: FRAME, position: 'relative', overflow: 'hidden' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#e94560', borderWidth: 3 },
  cTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  laser: {
    position: 'absolute', left: 4, right: 4, height: 2,
    backgroundColor: '#e94560',
    shadowColor: '#e94560', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  barcodeFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,185,129,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  barcodeText: { color: '#10b981', fontWeight: '700', fontSize: 14, marginTop: 6 },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
    zIndex: 20,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hintWrap: { position: 'absolute', left: 20, right: 20, zIndex: 20 },
  hintText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  bottomBar: {
    position: 'absolute', bottom: 48, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 32, zIndex: 20,
  },
  sideBtn: { width: 48, height: 48 },
  shutter: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: '#e94560',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#e94560', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  shutterDone: { backgroundColor: '#1a1a2e', borderColor: '#10b981' },
  shutterInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff' },
});
