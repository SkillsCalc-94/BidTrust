/**
 * ScanHero — landing page AI scan demo (no login required).
 *
 * Flow:
 *  idle → camera → photo captured
 *    → identifying  (fast: AI reads item, ~1-2s)
 *    → questions    (3 inline questions for ALL item types for best accuracy)
 *    → pricing      (full competitor research with answers, ~3-5s)
 *    → result       (4-phase price card + sign-up CTA)
 */
import React, { useState, useRef, useEffect } from 'react';
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
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import CameraScanner, { ScanResult } from './CameraScanner';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bidtrust.onrender.com/api';

type Phase = 'idle' | 'scanning' | 'identifying' | 'questions' | 'pricing' | 'result' | 'error';

interface Identification {
  product_name: string;
  brand?: string;
  model?: string;
  category: string;
  item_type: string;
  condition_estimate: string;
  identifying_features?: string;
  confidence: string;
}

interface CompetitorPrices {
  retail_price_new?: number;
  secondhand_prices?: { excellent?: number; good?: number; fair?: number; poor?: number };
  competitor_listings?: Array<{ platform: string; price_low: number; price_high: number }>;
  market_trend?: string;
  demand_level?: string;
  best_sell_price?: number;
  price_insight?: string;
}

function fmt(n?: number) {
  if (!n) return '—';
  return `R${Math.round(n).toLocaleString('en-ZA')}`;
}

const CATEGORY_ICONS: Record<string, string> = {
  electronics: '📱',
  luxury: '💎',
  vehicle: '🚗',
  furniture: '🛋️',
  clothing: '👕',
  other: '📦',
};

export default function ScanHero() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [identification, setIdentification] = useState<Identification | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [competitorPrices, setCompetitorPrices] = useState<CompetitorPrices | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Question fields
  const [origPrice, setOrigPrice] = useState('');
  const [defects, setDefects] = useState('');
  const [accessories, setAccessories] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pre-warm Render backend on mount so it's awake when user taps Scan
  useEffect(() => {
    fetch(`${API_BASE}/health`, { method: 'GET' }).catch(() => {});
  }, []);

  // Idle pulse on scan button
  useEffect(() => {
    if (phase !== 'idle') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  // Fade-in when transitioning to questions or result
  useEffect(() => {
    if (phase === 'questions' || phase === 'result') {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }
  }, [phase]);

  function reset() {
    setPhase('idle');
    setCapturedImage(null);
    setIdentification(null);
    setImageUrl(null);
    setCompetitorPrices(null);
    setErrorMsg('');
    setOrigPrice('');
    setDefects('');
    setAccessories('');
  }

  // ── Step 1: photo captured → identify item (fast) ─────────────────────────
  async function handleScanResult(scan: ScanResult) {
    setScannerOpen(false);
    setCapturedImage(scan.imageUri);
    setPhase('identifying');

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

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${API_BASE}/scan/demo`, { method: 'POST', body: fd, signal: controller.signal }).finally(() => clearTimeout(timer));
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      setIdentification(data.identification);
      setImageUrl(data.image_url);
      setPhase('questions'); // always show questions
    } catch (err: any) {
      const msg = err.name === 'AbortError'
        ? 'Server is waking up — please try again in 30 seconds.'
        : err.message || 'Could not identify item. Please try again.';
      setErrorMsg(msg);
      setPhase('error');
    }
  }

  // ── Step 2: user submits questions → fetch full pricing ───────────────────
  async function handleGetPrice(skip = false) {
    if (!identification) return;
    setPhase('pricing');

    try {
      const body: any = {
        product_name: identification.product_name,
        category: identification.category,
        item_type: identification.item_type,
        image_url: imageUrl,
      };
      if (!skip) {
        if (origPrice) body.original_price = origPrice;
        if (defects) body.q1_defects = defects;
        if (accessories) body.q2_accessories = accessories;
      }

      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), 40000);
      const res = await fetch(`${API_BASE}/scan/demo/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller2.signal,
      }).finally(() => clearTimeout(timer2));
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      setCompetitorPrices(data.competitor_prices);
      setPhase('result');
    } catch (err: any) {
      const msg = err.name === 'AbortError'
        ? 'Request timed out. The server may be waking up — please try again in 30 seconds.'
        : err.message || 'Price research failed. Please try again.';
      setErrorMsg(msg);
      setPhase('error');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.wrap}>
      <CameraScanner
        visible={scannerOpen}
        onClose={() => { setScannerOpen(false); if (phase === 'scanning') setPhase('idle'); }}
        onCapture={handleScanResult}
      />

      {/* Section header */}
      <View style={styles.header}>
        <View style={styles.liveChip}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE DEMO — NO SIGN UP NEEDED</Text>
        </View>
        <Text style={styles.title}>See AI Pricing in Action</Text>
        <Text style={styles.subtitle}>
          Scan any item — barcode or no barcode — get an instant market price from SA platforms
        </Text>
      </View>

      {/* ── IDLE ─────────────────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <View style={styles.idleWrap}>
          {/* Scan frame illustration */}
          <View style={styles.scanFrame}>
            <View style={[styles.fc, styles.fcTL]} />
            <View style={[styles.fc, styles.fcTR]} />
            <View style={[styles.fc, styles.fcBL]} />
            <View style={[styles.fc, styles.fcBR]} />
            <Ionicons name="scan-outline" size={52} color="#2a2a3e" />
          </View>

          {/* Example item badges */}
          <View style={styles.badgeRow}>
            {['📱 iPhone', '💻 Laptop', '🎮 PS5', '💎 Rolex', '🛋️ Sofa', '👟 Sneakers'].map((t, i) => (
              <View key={i} style={styles.badge}>
                <Text style={styles.badgeText}>{t}</Text>
              </View>
            ))}
          </View>

          {/* Main scan button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => { setPhase('scanning'); setScannerOpen(true); }}
              activeOpacity={0.85}
            >
              <Ionicons name="scan" size={26} color="#fff" />
              <Text style={styles.scanBtnTitle}>Scan Any Item Now</Text>
              <Text style={styles.scanBtnSub}>Free · Instant · No account needed</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Feature pills */}
          <View style={styles.featureRow}>
            {[
              { icon: 'barcode-outline', text: 'Barcode auto-detect' },
              { icon: 'eye-outline', text: 'AI visual recognition' },
              { icon: 'trending-up-outline', text: 'Live SA market prices' },
            ].map((f, i) => (
              <View key={i} style={styles.featurePill}>
                <Ionicons name={f.icon as any} size={13} color="#e94560" />
                <Text style={styles.featurePillText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── IDENTIFYING ──────────────────────────────────────────────────── */}
      {phase === 'identifying' && (
        <View style={styles.loadingCard}>
          {capturedImage && (
            <Image source={{ uri: capturedImage }} style={styles.loadingThumb} />
          )}
          <ActivityIndicator color="#e94560" size="large" style={{ marginTop: 16 }} />
          <Text style={styles.loadingTitle}>Reading your item...</Text>
          <Text style={styles.loadingStep}>🔍 AI is analysing the photo</Text>
          <Text style={styles.loadingStep}>🏷️ Checking barcode databases</Text>
          <Text style={styles.loadingStep}>✨ Identifying brand & model</Text>
        </View>
      )}

      {/* ── QUESTIONS ────────────────────────────────────────────────────── */}
      {phase === 'questions' && identification && (
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          {/* Identified item header */}
          <View style={styles.identifiedRow}>
            {capturedImage && (
              <Image source={{ uri: capturedImage }} style={styles.identifiedThumb} />
            )}
            <View style={styles.identifiedInfo}>
              <View style={styles.identifiedTop}>
                <Text style={styles.itemTypeEmoji}>
                  {CATEGORY_ICONS[identification.item_type] || '📦'}
                </Text>
                <View style={[
                  styles.confBadge,
                  identification.confidence === 'high' ? styles.confHigh : styles.confMed,
                ]}>
                  <Ionicons
                    name={identification.confidence === 'high' ? 'checkmark-circle' : 'help-circle'}
                    size={11}
                    color={identification.confidence === 'high' ? '#10b981' : '#f59e0b'}
                  />
                  <Text style={[
                    styles.confText,
                    { color: identification.confidence === 'high' ? '#10b981' : '#f59e0b' },
                  ]}>
                    {identification.confidence === 'high' ? 'Identified' : 'Partial match'}
                  </Text>
                </View>
              </View>
              <Text style={styles.identifiedName} numberOfLines={2}>
                {identification.product_name}
              </Text>
              {identification.brand ? (
                <Text style={styles.identifiedBrand}>{identification.brand}{identification.model ? ` · ${identification.model}` : ''}</Text>
              ) : null}
            </View>
          </View>

          {/* Questions banner */}
          <View style={styles.questionsBanner}>
            <Ionicons name="flash" size={16} color="#f59e0b" />
            <Text style={styles.questionsBannerText}>
              3 quick questions → more accurate price estimate
            </Text>
          </View>

          {/* Question fields */}
          <View style={styles.fields}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>💰 What did you originally pay?</Text>
              <View style={styles.currencyRow}>
                <View style={styles.currencyPrefix}>
                  <Text style={styles.currencySymbol}>R</Text>
                </View>
                <TextInput
                  style={styles.currencyInput}
                  value={origPrice}
                  onChangeText={setOrigPrice}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 8000"
                  placeholderTextColor="#3a3a52"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>🔧 Any defects or damage?</Text>
              <TextInput
                style={styles.textInput}
                value={defects}
                onChangeText={setDefects}
                placeholder="e.g. Small scratch on screen, fully working"
                placeholderTextColor="#3a3a52"
              />
            </View>

            <View style={[styles.field, { marginBottom: 0 }]}>
              <Text style={styles.fieldLabel}>📦 Original box / accessories included?</Text>
              <TextInput
                style={styles.textInput}
                value={accessories}
                onChangeText={setAccessories}
                placeholder="e.g. Yes, box and charger included"
                placeholderTextColor="#3a3a52"
              />
            </View>
          </View>

          {/* Get price button */}
          <TouchableOpacity
            style={styles.priceBtn}
            onPress={() => handleGetPrice(false)}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={18} color="#fff" />
            <Text style={styles.priceBtnText}>Get Full Price Estimate</Text>
            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleGetPrice(true)} style={styles.skipLink}>
            <Text style={styles.skipText}>Skip questions — estimate without answers</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      {phase === 'pricing' && (
        <View style={styles.loadingCard}>
          {capturedImage && (
            <Image source={{ uri: capturedImage }} style={styles.loadingThumb} />
          )}
          <ActivityIndicator color="#10b981" size="large" style={{ marginTop: 16 }} />
          <Text style={styles.loadingTitle}>Researching SA market...</Text>
          {identification?.item_type === 'electronics' || identification?.item_type === 'luxury' ? (
            <>
              <Text style={styles.loadingStep}>🛒 Checking Takealot, Hi-Fi Corp, Game...</Text>
              <Text style={styles.loadingStep}>📊 Comparing OLX SA & Gumtree listings</Text>
            </>
          ) : (
            <>
              <Text style={styles.loadingStep}>📊 Searching OLX SA & Gumtree SA</Text>
              <Text style={styles.loadingStep}>📍 Checking Facebook Marketplace SA</Text>
            </>
          )}
          <Text style={styles.loadingStep}>💡 Calculating best sell price...</Text>
        </View>
      )}

      {/* ── ERROR ────────────────────────────────────────────────────────── */}
      {phase === 'error' && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={48} color="#e94560" />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={reset}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── RESULT ───────────────────────────────────────────────────────── */}
      {phase === 'result' && identification && competitorPrices && (
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          {/* Item header */}
          <View style={styles.resultHeader}>
            {capturedImage && (
              <Image source={{ uri: capturedImage }} style={styles.resultThumb} />
            )}
            <View style={styles.resultItemInfo}>
              <Text style={styles.resultName} numberOfLines={2}>
                {identification.product_name}
              </Text>
              {identification.brand ? (
                <Text style={styles.resultBrand}>{identification.brand}</Text>
              ) : null}
              <View style={styles.resultMeta}>
                <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                <Text style={styles.resultConfText}>AI Identified</Text>
                <Text style={styles.resultCat}> · {identification.category}</Text>
              </View>
            </View>
          </View>

          {/* Hero best sell price */}
          <View style={styles.heroPriceBlock}>
            <Text style={styles.heroPriceLabel}>BEST SELL PRICE</Text>
            <Text style={styles.heroPriceValue}>{fmt(competitorPrices.best_sell_price)}</Text>
            <View style={styles.priceRangeRow}>
              <Text style={styles.priceRange}>
                {fmt(competitorPrices.secondhand_prices?.fair)} — {fmt(competitorPrices.secondhand_prices?.excellent)}
              </Text>
              <View style={[
                styles.trendChip,
                competitorPrices.market_trend === 'rising' && styles.trendUp,
                competitorPrices.market_trend === 'falling' && styles.trendDown,
              ]}>
                <Ionicons
                  name={competitorPrices.market_trend === 'rising' ? 'trending-up' : competitorPrices.market_trend === 'falling' ? 'trending-down' : 'remove'}
                  size={10} color="#fff"
                />
                <Text style={styles.trendText}>{competitorPrices.market_trend ?? 'stable'}</Text>
              </View>
            </View>
          </View>

          {/* 4 price phases */}
          <View style={styles.phases}>
            {[
              { dot: '#7c3aed', label: 'Retail new price', val: competitorPrices.retail_price_new },
              { dot: '#f59e0b', label: 'What buyers pay (secondhand)', val: competitorPrices.secondhand_prices?.good },
              { dot: '#e94560', label: 'Current market value', val: competitorPrices.secondhand_prices?.excellent },
              { dot: '#10b981', label: 'Sweet spot to sell', val: competitorPrices.best_sell_price, highlight: true },
            ].map((p, i) => (
              <View key={i} style={styles.phaseRow}>
                <View style={[styles.phaseDot, { backgroundColor: p.dot }]} />
                <Text style={styles.phaseLabel}>{p.label}</Text>
                <Text style={[styles.phaseVal, p.highlight && { color: '#10b981' }]}>{fmt(p.val)}</Text>
              </View>
            ))}
          </View>

          {/* SA platform prices */}
          {competitorPrices.competitor_listings?.length ? (
            <View style={styles.platforms}>
              <Text style={styles.platformsTitle}>PRICES ON SA PLATFORMS</Text>
              {competitorPrices.competitor_listings.slice(0, 4).map((l, i) => (
                <View key={i} style={styles.platformRow}>
                  <Text style={styles.platformName}>{l.platform}</Text>
                  <Text style={styles.platformPrice}>{fmt(l.price_low)} – {fmt(l.price_high)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {competitorPrices.price_insight ? (
            <Text style={styles.insight}>{competitorPrices.price_insight}</Text>
          ) : null}

          {/* CTA */}
          <View style={styles.ctaBlock}>
            <Text style={styles.ctaTitle}>Ready to sell this item?</Text>
            <Text style={styles.ctaDesc}>
              Sign up free and list it in under 2 minutes. Your AI estimate carries over automatically.
            </Text>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push('/register')}
              activeOpacity={0.85}
            >
              <Ionicons name="rocket-outline" size={18} color="#fff" />
              <Text style={styles.ctaBtnText}>Sign Up & List This Item</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={reset} style={styles.scanAgain}>
              <Ionicons name="scan-outline" size={14} color="#4a4a6a" />
              <Text style={styles.scanAgainText}>Scan another item</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingVertical: 32 },

  /* Header */
  header: { alignItems: 'center', marginBottom: 28 },
  liveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(233,69,96,0.1)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(233,69,96,0.2)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e94560' },
  liveText: { color: '#e94560', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  subtitle: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  /* Idle */
  idleWrap: { alignItems: 'center', gap: 20 },
  scanFrame: {
    width: 130, height: 130, borderRadius: 18,
    backgroundColor: '#13131f', borderWidth: 1, borderColor: '#1e1e30',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  fc: { position: 'absolute', width: 18, height: 18, borderColor: '#e94560', borderWidth: 2.5 },
  fcTL: { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  fcTR: { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  fcBL: { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  fcBR: { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  badge: {
    backgroundColor: '#13131f', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#1e1e30',
  },
  badgeText: { color: '#555', fontSize: 12 },
  scanBtn: {
    backgroundColor: '#e94560', borderRadius: 18,
    paddingVertical: 22, paddingHorizontal: 28,
    alignItems: 'center', gap: 6, width: '100%',
    shadowColor: '#e94560', shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  scanBtnTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  scanBtnSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  featurePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#13131f', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#1e1e30',
  },
  featurePillText: { color: '#666', fontSize: 12 },

  /* Loading states */
  loadingCard: {
    backgroundColor: '#13131f', borderRadius: 20,
    borderWidth: 1, borderColor: '#1e1e30',
    padding: 28, alignItems: 'center', gap: 8,
  },
  loadingThumb: {
    width: '100%', height: 160, borderRadius: 12,
    backgroundColor: '#0d0d14',
  },
  loadingTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 4 },
  loadingStep: { color: '#555', fontSize: 13 },

  /* Error */
  errorCard: {
    backgroundColor: '#13131f', borderRadius: 20,
    borderWidth: 1, borderColor: '#1e1e30',
    padding: 32, alignItems: 'center', gap: 14,
  },
  errorText: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    backgroundColor: '#e94560', borderRadius: 10,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  /* Shared card wrapper */
  card: {
    backgroundColor: '#13131f', borderRadius: 20,
    borderWidth: 1, borderColor: '#1e1e30',
    overflow: 'hidden',
  },

  /* Questions phase */
  identifiedRow: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#1e1e30',
  },
  identifiedThumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#0d0d14' },
  identifiedInfo: { flex: 1, justifyContent: 'center', gap: 6 },
  identifiedTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTypeEmoji: { fontSize: 18 },
  confBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
  },
  confHigh: { backgroundColor: 'rgba(16,185,129,0.12)' },
  confMed: { backgroundColor: 'rgba(245,158,11,0.12)' },
  confText: { fontSize: 11, fontWeight: '600' },
  identifiedName: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 20 },
  identifiedBrand: { color: '#555', fontSize: 12 },

  questionsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  questionsBannerText: { color: '#f59e0b', fontSize: 13, fontWeight: '600', flex: 1 },

  fields: { padding: 16, gap: 14 },
  field: {},
  fieldLabel: { color: '#a0a0b8', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  currencyRow: { flexDirection: 'row', alignItems: 'center' },
  currencyPrefix: {
    backgroundColor: '#0d0d14', borderWidth: 1, borderRightWidth: 0,
    borderColor: '#252538', borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  currencySymbol: { color: '#e94560', fontSize: 15, fontWeight: '700' },
  currencyInput: {
    flex: 1, backgroundColor: '#0d0d14',
    borderWidth: 1, borderColor: '#252538',
    borderTopRightRadius: 10, borderBottomRightRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    color: '#fff', fontSize: 15,
  },
  textInput: {
    backgroundColor: '#0d0d14', borderWidth: 1, borderColor: '#252538',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    color: '#fff', fontSize: 14,
  },
  priceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e94560', margin: 16, marginTop: 4,
    borderRadius: 14, paddingVertical: 16,
    shadowColor: '#e94560', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  priceBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  skipLink: { alignItems: 'center', paddingBottom: 16 },
  skipText: { color: '#3a3a52', fontSize: 12 },

  /* Result */
  resultHeader: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#1e1e30',
  },
  resultThumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#0d0d14' },
  resultItemInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  resultName: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 20 },
  resultBrand: { color: '#555', fontSize: 12 },
  resultMeta: { flexDirection: 'row', alignItems: 'center' },
  resultConfText: { color: '#10b981', fontSize: 11, fontWeight: '600', marginLeft: 4 },
  resultCat: { color: '#3a3a52', fontSize: 11 },

  heroPriceBlock: {
    padding: 18, alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.05)',
    borderBottomWidth: 1, borderBottomColor: '#1e1e30',
  },
  heroPriceLabel: { color: '#10b981', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  heroPriceValue: { color: '#10b981', fontSize: 38, fontWeight: '900', marginBottom: 4 },
  priceRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceRange: { color: '#555', fontSize: 13 },
  trendChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#3a3a52', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  trendUp: { backgroundColor: 'rgba(16,185,129,0.25)' },
  trendDown: { backgroundColor: 'rgba(233,69,96,0.25)' },
  trendText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  phases: { paddingHorizontal: 16, paddingVertical: 14, gap: 11 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  phaseDot: { width: 8, height: 8, borderRadius: 4 },
  phaseLabel: { flex: 1, color: '#666', fontSize: 13 },
  phaseVal: { color: '#fff', fontSize: 14, fontWeight: '700' },

  platforms: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#0d0d14', borderRadius: 12, padding: 12, gap: 8,
  },
  platformsTitle: { color: '#3a3a52', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  platformRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  platformName: { color: '#666', fontSize: 13 },
  platformPrice: { color: '#fff', fontSize: 13, fontWeight: '600' },

  insight: {
    color: '#555', fontSize: 12, lineHeight: 18,
    paddingHorizontal: 16, paddingBottom: 12,
  },

  ctaBlock: {
    padding: 16, gap: 10,
    borderTopWidth: 1, borderTopColor: '#1e1e30',
    backgroundColor: 'rgba(233,69,96,0.04)',
  },
  ctaTitle: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  ctaDesc: { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  ctaBtn: {
    backgroundColor: '#e94560', borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#e94560', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  scanAgain: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 6,
  },
  scanAgainText: { color: '#3a3a52', fontSize: 13 },
});
