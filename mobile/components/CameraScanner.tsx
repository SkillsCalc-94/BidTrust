import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  ActivityIndicator,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

const { width: SW, height: SH } = Dimensions.get('window');
const FRAME = Math.min(SW * 0.72, 280);

export interface ScanResult {
  imageUri: string;
  /** Set if a barcode was detected */
  barcode?: { type: string; data: string };
  /** Product name identified (from barcode DB or AI vision) */
  productName?: string;
  /** Raw AI/backend scan data */
  scanData?: any;
}

interface CameraScannerProps {
  visible: boolean;
  onClose: () => void;
  /** Called once a photo is captured and (optionally) a barcode found */
  onCapture: (result: ScanResult) => void;
}

type ScanPhase = 'scanning' | 'captured' | 'identifying';

export default function CameraScanner({ visible, onClose, onCapture }: CameraScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<ScanPhase>('scanning');
  const [detectedBarcode, setDetectedBarcode] = useState<BarcodeScanningResult | null>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const barcodeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barcodeProcessed = useRef(false);

  // Laser line animation
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  // Corner pulse when barcode detected
  const triggerPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 120, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [pulseAnim]);

  function resetState() {
    setPhase('scanning');
    setDetectedBarcode(null);
    setCapturedUri(null);
    barcodeProcessed.current = false;
    if (barcodeDebounce.current) clearTimeout(barcodeDebounce.current);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  // Auto-capture when barcode locked on
  const handleBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (barcodeProcessed.current || phase !== 'scanning') return;
    if (barcodeDebounce.current) clearTimeout(barcodeDebounce.current);
    barcodeDebounce.current = setTimeout(async () => {
      if (barcodeProcessed.current) return;
      barcodeProcessed.current = true;
      triggerPulse();
      setDetectedBarcode(result);
      // Auto-take photo at this moment
      try {
        const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85, skipProcessing: false });
        if (photo) {
          setCapturedUri(photo.uri);
          setPhase('captured');
          onCapture({ imageUri: photo.uri, barcode: { type: result.type, data: result.data } });
          setTimeout(handleClose, 400);
        }
      } catch {
        barcodeProcessed.current = false;
      }
    }, 500);
  }, [phase, triggerPulse, onCapture]);

  async function handleManualCapture() {
    if (phase !== 'scanning') return;
    setPhase('identifying');
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85, skipProcessing: false });
      if (photo) {
        setCapturedUri(photo.uri);
        setPhase('captured');
        onCapture({ imageUri: photo.uri });
        setTimeout(handleClose, 400);
      } else {
        setPhase('scanning');
      }
    } catch {
      setPhase('scanning');
    }
  }

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME - 4],
  });

  if (!visible) return null;

  // ── Permission not yet determined ──────────────────────────────────────────
  if (!permission) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.centered}>
          <ActivityIndicator color="#e94560" size="large" />
        </View>
      </Modal>
    );
  }

  // ── Permission denied ──────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <Modal visible animationType="slide" onRequestClose={handleClose}>
        <View style={styles.permissionScreen}>
          <Ionicons name="camera-outline" size={72} color="#e94560" />
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSubtitle}>
            BidTrust uses your camera to scan items and barcodes for instant AI price estimates.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Allow Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permCancel} onPress={handleClose}>
            <Text style={styles.permCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Live viewfinder */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: [
              'ean13', 'ean8', 'upc_a', 'upc_e',
              'code128', 'code39', 'code93',
              'qr', 'datamatrix', 'pdf417', 'aztec',
              'itf14', 'codabar',
            ],
          }}
          onBarcodeScanned={phase === 'scanning' ? handleBarcodeScanned : undefined}
        />

        {/* Dark vignette overlay */}
        <View style={styles.overlay} pointerEvents="none">
          {/* Top mask */}
          <View style={styles.maskTop} />
          <View style={styles.maskRow}>
            {/* Left mask */}
            <View style={styles.maskSide} />

            {/* Scan frame */}
            <Animated.View style={[styles.scanFrame, { transform: [{ scale: pulseAnim }] }]}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {/* Laser line */}
              {phase === 'scanning' && (
                <Animated.View
                  style={[styles.laser, { transform: [{ translateY: laserTranslateY }] }]}
                />
              )}

              {/* Barcode detected flash */}
              {detectedBarcode && (
                <View style={styles.barcodeFlash}>
                  <Ionicons name="checkmark-circle" size={36} color="#10b981" />
                  <Text style={styles.barcodeText}>Barcode detected!</Text>
                </View>
              )}
            </Animated.View>

            {/* Right mask */}
            <View style={styles.maskSide} />
          </View>
          {/* Bottom mask */}
          <View style={styles.maskBottom} />
        </View>

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

        {/* Hint text */}
        <View style={styles.hintWrap} pointerEvents="none">
          <Text style={styles.hintText}>
            {phase === 'identifying'
              ? 'Analysing item...'
              : phase === 'captured'
              ? 'Got it!'
              : 'Point at a barcode to auto-scan, or tap the button to identify any item'}
          </Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          {/* Flip camera */}
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
          >
            <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Shutter */}
          <TouchableOpacity
            style={[styles.shutter, phase !== 'scanning' && styles.shutterDisabled]}
            onPress={handleManualCapture}
            disabled={phase !== 'scanning'}
          >
            {phase === 'identifying' ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : phase === 'captured' ? (
              <Ionicons name="checkmark" size={36} color="#10b981" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </TouchableOpacity>

          {/* Placeholder for symmetry */}
          <View style={styles.sideBtn} />
        </View>
      </View>
    </Modal>
  );
}

const MASK_SIDE = (SW - FRAME) / 2;
const MASK_TOP = (SH - FRAME) / 2 - 60;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },

  // Permission screen
  permissionScreen: {
    flex: 1, backgroundColor: '#0d0d14',
    justifyContent: 'center', alignItems: 'center', padding: 40,
  },
  permTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 12, textAlign: 'center' },
  permSubtitle: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  permBtn: { backgroundColor: '#e94560', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  permCancel: { marginTop: 16 },
  permCancelText: { color: '#666', fontSize: 14 },

  // Overlay / masks
  overlay: { ...StyleSheet.absoluteFillObject },
  maskTop: { height: MASK_TOP, backgroundColor: 'rgba(0,0,0,0.62)' },
  maskRow: { flexDirection: 'row', height: FRAME },
  maskSide: { width: MASK_SIDE, backgroundColor: 'rgba(0,0,0,0.62)' },
  maskBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },

  // Scan frame
  scanFrame: {
    width: FRAME, height: FRAME, position: 'relative', overflow: 'hidden',
  },
  corner: {
    position: 'absolute', width: 24, height: 24,
    borderColor: '#e94560', borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

  // Laser
  laser: {
    position: 'absolute', left: 4, right: 4, height: 2,
    backgroundColor: '#e94560',
    shadowColor: '#e94560', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },

  // Barcode flash
  barcodeFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,185,129,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  barcodeText: { color: '#10b981', fontWeight: '700', fontSize: 14, marginTop: 6 },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },

  // Hint
  hintWrap: {
    position: 'absolute',
    top: MASK_TOP + FRAME + 16,
    left: 20, right: 20,
  },
  hintText: {
    color: 'rgba(255,255,255,0.75)', fontSize: 13,
    textAlign: 'center', lineHeight: 18,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 48, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 32,
  },
  sideBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  shutter: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: '#e94560',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#e94560', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  shutterDisabled: { backgroundColor: '#444', shadowOpacity: 0 },
  shutterInner: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff',
  },
});
