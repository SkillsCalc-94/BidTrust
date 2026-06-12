/**
 * ScanHero — landing page AI scan demo.
 * No login required. Shows live camera, identifies item, displays competitor
 * price estimate, then nudges user to sign up.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import CameraScanner, { ScanResult } from './CameraScanner';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bidtrust-api.onrender.com/api';

interface DemoResult {
  identification: {
    product_name: string;
    brand?: string;
    category: string;
    condition_estimate: string;
    confidence: string;
    identifying_features?: string;
  };
  competitor_prices?: {
    retail_price_new?: number;
    secondhand_prices?: { excellent?: number; good?: number; fair?: number; poor?: number };
    best_sell_price?: number;
    market_trend?: string;
    demand_level?: string;
    price_insight?: string;
    competitor_listings?: Array<{ platform: string; price_low: number; price_high: number }>;
  };
  image_url?: string;
}

type Phase = 'idle' | 'scanning' | 'analyzing' | 'result' | 'error';

function fmt(n?: number) {
  if (!n) return '—';
  return `R${Math.round(n).toLocaleString('en-ZA')}`;
}

export default function ScanHero() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<DemoResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Idle pulse on scan button
  React.useEffect(() => {
    if (phase !== 'idle') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  // Scan line during analysis
  React.useEffect(() => {
    if (phase !== 'analyzing') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  async function handleScanResult(scan: ScanResult) {
    setScannerOpen(false);
    setCapturedImage(scan.imageUri);
    setPhase('analyzing');

    try {
      const fd = new FormData();
      if (Platform.OS === 'web') {
        const [meta, b64] = scan.imageUri.split(',');
        const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bytes = atob(b64);
        const arr = new Uint8Array(bytes.length);
        for (let j = 0; j < bytes.length; j++) arr[j] = bytes.charCodeAt(j);
        fd.append('image', new Blob([arr], { type: mime }), 'scan.jpg');
      } else {
        const ext = scan.imageUri.split('.').pop() || 'jpg';
        (fd as any).append('image', { uri: scan.imageUri, type: `image/${ext}`, name: `scan.${ext}` } as any);
      }
      if (scan.barcode) {
        fd.append('barcode_data', scan.barcode.data);
        fd.append('barcode_type', scan.barcode.type);
      }

      const res = await fetch(`${API_BASE}/scan/demo`, { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const data: DemoResult = await res.json();
      setResult(data);
      setPhase('result');
    } catch (err: any) {
      setErrorMsg(err.message || 'Scan failed. Please try again.');
      setPhase('error');
    }
  }

  function reset() {
    setPhase('idle');
    setResult(null);
    setCapturedImage(null);
    setErrorMsg('');
  }

  const scanLineY = scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 120] });

  return (
    <View style={styles.wrap}>
      <CameraScanner
        visible={scannerOpen}
        onClose={() => { setScannerOpen(false); if (phase === 'scanning') setPhase('idle'); }}
        onCapture={handleScanResult}
      />

      {/* Section header */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>LIVE DEMO — NO SIGN UP NEEDED</Text>
        </View>
        <Text style={styles.title}>See AI Pricing in Action</Text>
        <Text style={styles.subtitle}>
          Scan any item — barcode or no barcode — and get an instant market price estimate from SA platforms
        </Text>
      </View>

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <View style={styles.idleCard}>
          {/* Animated scan illustration */}
          <View style={styles.scanIllustration}>
            <View style={styles.scanBox}>
              <View style={[styles.scanCorner, styles.scTL]} />
              <View style={[styles.scanCorner, styles.scTR]} />
              <View style={[styles.scanCorner, styles.scBL]} />
              <View style={[styles.scanCorner, styles.scBR]} />
              <Ionicons name="shirt-outline" size={40} color="#2a2a3e" />
            </View>
            <View style={styles.scanExampleBadges}>
              {['📱 iPhone', '💻 Laptop', '🎮 PS5', '👟 Sneakers', '🪑 Chair'].map((t, i) => (
                <View key={i} style={styles.exampleBadge}>
                  <Text style={styles.exampleBadgeText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => { setPhase('scanning'); setScannerOpen(true); }}
              activeOpacity={0.85}
            >
              <View style={styles.scanBtnGlow} />
              <Ionicons name="scan" size={28} color="#fff" />
              <Text style={styles.scanBtnText}>Scan Any Item Now</Text>
              <Text style={styles.scanBtnSub}>Free · Instant · No account needed</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.featureRow}>
            {[
              { icon: 'barcode-outline', text: 'Barcode auto-detect' },
              { icon: 'eye-outline', text: 'AI visual recognition' },
              { icon: 'trending-up-outline', text: 'Live SA market prices' },
            ].map((f, i) => (
              <View key={i} style={styles.featurePill}>
                <Ionicons name={f.icon as any} size={14} color="#e94560" />
                <Text style={styles.featurePillText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── ANALYZING ── */}
      {phase === 'analyzing' && (
        <View style={styles.analyzingCard}>
          {capturedImage && (
            <View style={styles.capturedWrap}>
              <Image source={{ uri: capturedImage }} style={styles.capturedImg} />
              {/* Scan line overlay */}
              <Animated.View style={[styles.scanLineOverlay, { transform: [{ translateY: scanLineY }] }]} />
              <View style={styles.analyzingOverlay}>
                <View style={styles.analyzingBadge}>
                  <ActivityIndicator size="small" color="#e94560" />
                  <Text style={styles.analyzingText}>Identifying item...</Text>
                </View>
              </View>
            </View>
          )}
          <View style={styles.analyzingSteps}>
            {[
              '🔍 Reading image with AI vision...',
              '🏷️ Searching barcode databases...',
              '📊 Fetching OLX SA, Gumtree, Takealot prices...',
              '💡 Calculating fair market value...',
            ].map((s, i) => (
              <Text key={i} style={styles.analyzingStep}>{s}</Text>
            ))}
          </View>
        </View>
      )}

      {/* ── ERROR ── */}
      {phase === 'error' && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={48} color="#e94560" />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={reset}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── RESULT ── */}
      {phase === 'result' && result && (
        <View style={styles.resultCard}>
          {/* Item identity row */}
          <View style={styles.resultHeader}>
            {capturedImage && (
              <Image source={{ uri: capturedImage }} style={styles.resultThumb} />
            )}
            <View style={styles.resultItemInfo}>
              <Text style={styles.resultItemName} numberOfLines={2}>
                {result.identification.product_name}
              </Text>
              {result.identification.brand ? (
                <Text style={styles.resultBrand}>{result.identification.brand}</Text>
              ) : null}
              <View style={styles.resultMeta}>
                <View style={styles.confidenceBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                  <Text style={styles.confidenceText}>
                    {result.identification.confidence === 'high' ? 'High confidence' : 'Identified'}
                  </Text>
                </View>
                <Text style={styles.resultCategory}>{result.identification.category}</Text>
              </View>
            </View>
          </View>

          {/* Price estimate block */}
          {result.competitor_prices && (
            <>
              {/* Hero sell price */}
              <View style={styles.heroPriceBlock}>
                <Text style={styles.heroPriceLabel}>Best Sell Price</Text>
                <Text style={styles.heroPriceValue}>
                  {fmt(result.competitor_prices.best_sell_price)}
                </Text>
                <View style={styles.priceRangeRow}>
                  <Text style={styles.priceRangeText}>
                    {fmt(result.competitor_prices.secondhand_prices?.fair)} —{' '}
                    {fmt(result.competitor_prices.secondhand_prices?.excellent)}
                  </Text>
                  <View style={[
                    styles.trendBadge,
                    result.competitor_prices.market_trend === 'rising' && styles.trendRising,
                    result.competitor_prices.market_trend === 'falling' && styles.trendFalling,
                  ]}>
                    <Ionicons
                      name={result.competitor_prices.market_trend === 'rising' ? 'trending-up' : result.competitor_prices.market_trend === 'falling' ? 'trending-down' : 'remove'}
                      size={11}
                      color="#fff"
                    />
                    <Text style={styles.trendText}>{result.competitor_prices.market_trend ?? 'stable'}</Text>
                  </View>
                </View>
              </View>

              {/* 4-phase price rows */}
              <View style={styles.phaseRows}>
                <View style={styles.phaseRow}>
                  <View style={[styles.phaseDot, { backgroundColor: '#7c3aed' }]} />
                  <Text style={styles.phaseLabel}>Retail new</Text>
                  <Text style={styles.phaseValue}>{fmt(result.competitor_prices.retail_price_new)}</Text>
                </View>
                <View style={styles.phaseRow}>
                  <View style={[styles.phaseDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.phaseLabel}>Buyer pays (secondhand)</Text>
                  <Text style={styles.phaseValue}>{fmt(result.competitor_prices.secondhand_prices?.good)}</Text>
                </View>
                <View style={styles.phaseRow}>
                  <View style={[styles.phaseDot, { backgroundColor: '#e94560' }]} />
                  <Text style={styles.phaseLabel}>Current market value</Text>
                  <Text style={styles.phaseValue}>{fmt(result.competitor_prices.secondhand_prices?.excellent)}</Text>
                </View>
                <View style={styles.phaseRow}>
                  <View style={[styles.phaseDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.phaseLabel}>Sweet spot to sell</Text>
                  <Text style={[styles.phaseValue, { color: '#10b981' }]}>{fmt(result.competitor_prices.best_sell_price)}</Text>
                </View>
              </View>

              {/* Platform comps */}
              {result.competitor_prices.competitor_listings?.length ? (
                <View style={styles.platformList}>
                  <Text style={styles.platformListTitle}>Prices on SA platforms</Text>
                  {result.competitor_prices.competitor_listings.slice(0, 4).map((l, i) => (
                    <View key={i} style={styles.platformRow}>
                      <Text style={styles.platformName}>{l.platform}</Text>
                      <Text style={styles.platformPrice}>{fmt(l.price_low)} – {fmt(l.price_high)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {result.competitor_prices.price_insight ? (
                <Text style={styles.insight}>{result.competitor_prices.price_insight}</Text>
              ) : null}
            </>
          )}

          {/* CTA */}
          <View style={styles.resultCTA}>
            <Text style={styles.resultCTATitle}>Ready to sell this?</Text>
            <Text style={styles.resultCTADesc}>
              Create a free account and list it in under 2 minutes. Your AI estimate is already saved.
            </Text>
            <TouchableOpacity style={styles.ctaPrimary} onPress={() => router.push('/register')} activeOpacity={0.85}>
              <Ionicons name="rocket-outline" size={18} color="#fff" />
              <Text style={styles.ctaPrimaryText}>Sign Up & List This Item</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={reset} style={styles.scanAgainBtn}>
              <Ionicons name="scan-outline" size={15} color="#a0a0b8" />
              <Text style={styles.scanAgainText}>Scan another item</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingVertical: 32 },

  header: { alignItems: 'center', marginBottom: 24 },
  headerBadge: {
    backgroundColor: 'rgba(233,69,96,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(233,69,96,0.25)',
  },
  headerBadgeText: { color: '#e94560', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  subtitle: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Idle
  idleCard: { alignItems: 'center', gap: 24 },
  scanIllustration: { alignItems: 'center', gap: 16, marginBottom: 4 },
  scanBox: {
    width: 120, height: 120,
    borderRadius: 16,
    backgroundColor: '#13131f',
    borderWidth: 1, borderColor: '#1e1e30',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  scanCorner: { position: 'absolute', width: 16, height: 16, borderColor: '#e94560', borderWidth: 2 },
  scTL: { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  scTR: { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  scBL: { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  scBR: { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanExampleBadges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  exampleBadge: {
    backgroundColor: '#13131f', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#1e1e30',
  },
  exampleBadgeText: { color: '#666', fontSize: 12 },

  scanBtn: {
    backgroundColor: '#e94560',
    borderRadius: 18,
    paddingHorizontal: 32, paddingVertical: 20,
    alignItems: 'center', gap: 6,
    shadowColor: '#e94560', shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  scanBtnGlow: {
    position: 'absolute', top: -20, left: -20, right: -20, bottom: -20,
    backgroundColor: 'rgba(233,69,96,0.15)',
    borderRadius: 40,
  },
  scanBtnText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  scanBtnSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },

  featureRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  featurePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#13131f',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#1e1e30',
  },
  featurePillText: { color: '#a0a0b8', fontSize: 12 },

  // Analyzing
  analyzingCard: { gap: 16 },
  capturedWrap: {
    borderRadius: 16, overflow: 'hidden',
    height: 200, backgroundColor: '#13131f',
    position: 'relative',
  },
  capturedImg: { width: '100%', height: '100%' },
  scanLineOverlay: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: '#e94560',
    shadowColor: '#e94560', shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end', padding: 12,
  },
  analyzingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  analyzingText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  analyzingSteps: { gap: 6 },
  analyzingStep: { color: '#666', fontSize: 12 },

  // Error
  errorCard: { alignItems: 'center', gap: 16, padding: 24 },
  errorText: { color: '#888', fontSize: 14, textAlign: 'center' },
  retryBtn: { backgroundColor: '#e94560', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontWeight: '700' },

  // Result
  resultCard: {
    backgroundColor: '#13131f',
    borderRadius: 20,
    borderWidth: 1, borderColor: '#1e1e30',
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#1e1e30',
  },
  resultThumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#0d0d14' },
  resultItemInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  resultItemName: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 20 },
  resultBrand: { color: '#888', fontSize: 13 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confidenceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
  },
  confidenceText: { color: '#10b981', fontSize: 11, fontWeight: '600' },
  resultCategory: { color: '#4a4a6a', fontSize: 11 },

  heroPriceBlock: {
    padding: 16, alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.06)',
    borderBottomWidth: 1, borderBottomColor: '#1e1e30',
  },
  heroPriceLabel: { color: '#10b981', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  heroPriceValue: { color: '#10b981', fontSize: 36, fontWeight: '800', marginBottom: 4 },
  priceRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceRangeText: { color: '#666', fontSize: 13 },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#4a4a6a',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  trendRising: { backgroundColor: 'rgba(16,185,129,0.3)' },
  trendFalling: { backgroundColor: 'rgba(233,69,96,0.3)' },
  trendText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  phaseRows: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  phaseDot: { width: 8, height: 8, borderRadius: 4 },
  phaseLabel: { flex: 1, color: '#888', fontSize: 13 },
  phaseValue: { color: '#fff', fontSize: 14, fontWeight: '700' },

  platformList: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#0d0d14',
    borderRadius: 12, padding: 12, gap: 8,
  },
  platformListTitle: { color: '#4a4a6a', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  platformRow: { flexDirection: 'row', justifyContent: 'space-between' },
  platformName: { color: '#888', fontSize: 13 },
  platformPrice: { color: '#fff', fontSize: 13, fontWeight: '600' },

  insight: { color: '#666', fontSize: 12, lineHeight: 18, paddingHorizontal: 16, paddingBottom: 12 },

  resultCTA: {
    padding: 16, gap: 10,
    borderTopWidth: 1, borderTopColor: '#1e1e30',
    backgroundColor: 'rgba(233,69,96,0.04)',
  },
  resultCTATitle: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  resultCTADesc: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  ctaPrimary: {
    backgroundColor: '#e94560',
    borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#e94560', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  scanAgainBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8,
  },
  scanAgainText: { color: '#4a4a6a', fontSize: 13 },
});
