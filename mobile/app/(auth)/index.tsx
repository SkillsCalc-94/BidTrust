import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Tilt3D from '../../components/Tilt3D';
import SplineScene from '../../components/SplineScene';
import ScanHero from '../../components/ScanHero';

const { width } = Dimensions.get('window');

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI Price Estimation',
    desc: 'Scan any item — barcode or not — and get an instant, research-backed market value in seconds.',
  },
  {
    icon: '🔒',
    title: 'Escrow Protection',
    desc: 'We hold payment securely until the item is delivered and verified. Both parties are protected.',
  },
  {
    icon: '✅',
    title: 'Verified Sellers',
    desc: 'Every seller is ID-verified by our team. Know exactly who you\'re buying from.',
  },
  {
    icon: '⚡',
    title: 'Live Auctions',
    desc: 'Bid in real time, make direct offers, or set a Buy Now price to sell instantly.',
  },
];

const STEPS = [
  { num: '1', icon: 'scan-outline', title: 'Scan & Price', desc: 'Point your camera at any item. AI identifies it and fetches live prices from OLX SA, Gumtree, Takealot and more.' },
  { num: '2', icon: 'storefront-outline', title: 'List in Minutes', desc: 'Your listing goes live instantly. Set auction or fixed price — AI suggests the sweet spot.' },
  { num: '3', icon: 'people-outline', title: 'Buyers Bid or Offer', desc: 'Buyers place bids or make offers in real time. You stay in control.' },
  { num: '4', icon: 'shield-checkmark-outline', title: 'Safe & Secure Payment', desc: 'We hold payment in escrow until the item is verified and delivered. Then you get paid.' },
];

const STATS = [
  { num: '12K+', label: 'Items Listed' },
  { num: '98%', label: 'Satisfaction' },
  { num: 'R45M', label: 'Transacted' },
];

const TRUST = [
  '🛡️ Escrow Protected',
  '🤖 AI Powered',
  '✅ Verified Sellers',
  '⚡ Live Bidding',
  '🔒 100% Secure',
  '💎 Premium Items',
];

export default function LandingScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ══════════════════════════════════════════════════
            1. HERO — brand identity + tagline
        ══════════════════════════════════════════════════ */}
        <View style={styles.hero}>
          {/* Decorative blobs */}
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />

          {/* Logo mark */}
          <View style={styles.logoWrap}>
            <View style={styles.logoMark}>
              <Ionicons name="hammer" size={30} color="#fff" />
            </View>
            <Text style={styles.logoText}>
              Bid<Text style={styles.logoAccent}>Trust</Text>
            </Text>
          </View>

          <Text style={styles.heroHeadline}>
            The smarter way{'\n'}to buy &amp; sell
          </Text>
          <Text style={styles.heroSub}>
            AI-powered pricing · Escrow-protected payments · Verified sellers
          </Text>

          {/* CTA buttons */}
          <View style={styles.heroCta}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => router.push('/register')}
              activeOpacity={0.85}
            >
              <Ionicons name="rocket-outline" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Get Started — It's Free</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => router.push('/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSecondaryText}>I already have an account</Text>
            </TouchableOpacity>
          </View>

          {/* Trust pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillScroll}
            contentContainerStyle={styles.pillContent}
          >
            {TRUST.map((t, i) => (
              <View key={i} style={styles.pill}>
                <Text style={styles.pillText}>{t}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ══════════════════════════════════════════════════
            2. STATS BAR
        ══════════════════════════════════════════════════ */}
        <View style={styles.statsBar}>
          {STATS.map((s, i) => (
            <React.Fragment key={i}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{s.num}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              {i < STATS.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ══════════════════════════════════════════════════
            3. AI SCAN DEMO — the core selling point
            Visitors can try it without signing up
        ══════════════════════════════════════════════════ */}
        <View style={styles.scanSection}>
          <ScanHero />
        </View>

        {/* ══════════════════════════════════════════════════
            4. PHONE MOCKUP + 3D SCENE
        ══════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTag}>THE APP</Text>
          <Text style={styles.sectionTitle}>Everything in one place</Text>
          <Text style={styles.sectionDesc}>
            Browse live auctions, scan items, manage bids and track your listings — all from one app.
          </Text>

          {/* 3D Spline scene — web only */}
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            height={360}
          />

          {/* Phone mockup */}
          <View style={styles.mockupRow}>
            <Tilt3D maxTilt={14} glowColor="#e94560">
              <View style={styles.phone}>
                <View style={styles.phoneInner}>
                  <View style={styles.phoneNotch} />
                  <View style={styles.phoneContent}>
                    <View style={styles.phoneStatusBar}>
                      <Text style={styles.phoneTime}>9:41</Text>
                      <View style={styles.phoneStatusIcons}>
                        <Ionicons name="wifi" size={9} color="#fff" />
                        <Ionicons name="battery-full" size={9} color="#fff" />
                      </View>
                    </View>
                    <View style={styles.phoneHeader}>
                      <Text style={styles.phoneLogoText}>
                        Bid<Text style={{ color: '#e94560' }}>Trust</Text>
                      </Text>
                      <Ionicons name="notifications-outline" size={13} color="#a0a0b8" />
                    </View>
                    <View style={styles.phoneCards}>
                      {[
                        { icon: 'laptop-outline', name: 'MacBook Pro', price: 'R15 999' },
                        { icon: 'watch-outline', name: 'Rolex Sub', price: 'R89K' },
                      ].map((item, i) => (
                        <View key={i} style={styles.phoneCard}>
                          <View style={styles.phoneCardImg}>
                            <Ionicons name={item.icon as any} size={18} color="#4a4a6a" />
                          </View>
                          <View style={styles.phoneCardInfo}>
                            <Text style={styles.phoneCardName}>{item.name}</Text>
                            <Text style={styles.phoneCardPrice}>{item.price}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                    <View style={styles.phoneTabBar}>
                      {['home', 'search', 'add-circle', 'person'].map((icon, i) => (
                        <Ionicons key={i} name={icon as any} size={15} color={i === 0 ? '#e94560' : '#4a4a6a'} />
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </Tilt3D>

            {/* Floating badges */}
            <View style={styles.badge1}>
              <Text style={styles.badge1Num}>AI</Text>
              <Text style={styles.badge1Label}>Pricing</Text>
            </View>
            <View style={styles.badge2}>
              <Ionicons name="shield-checkmark" size={13} color="#10b981" />
              <Text style={styles.badge2Label}>Secured</Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════
            5. HOW IT WORKS
        ══════════════════════════════════════════════════ */}
        <View style={[styles.section, styles.sectionAlt]}>
          <Text style={styles.sectionTag}>HOW IT WORKS</Text>
          <Text style={styles.sectionTitle}>Simple, safe and fair</Text>
          {STEPS.map((step, i) => (
            <View key={step.num} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <View style={styles.stepCircle}>
                  <Ionicons name={step.icon as any} size={18} color="#fff" />
                </View>
                {i < STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════════════════════
            6. FEATURES GRID
        ══════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTag}>FEATURES</Text>
          <Text style={styles.sectionTitle}>Why choose BidTrust?</Text>
          <View style={styles.featureGrid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureCard}>
                <View style={styles.featureIconBox}>
                  <Text style={styles.featureEmoji}>{f.icon}</Text>
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════
            7. FINAL CTA
        ══════════════════════════════════════════════════ */}
        <View style={styles.finalCta}>
          <View style={styles.finalBlob} />
          <Text style={styles.sectionTag}>JOIN TODAY</Text>
          <Text style={styles.finalTitle}>Ready to start?</Text>
          <Text style={styles.finalDesc}>
            Join thousands of buyers and sellers on BidTrust. Free to join, safe to use.
          </Text>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.push('/register')}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.btnPrimaryText}>Create Free Account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/login')} style={styles.signInLink}>
            <Text style={styles.signInText}>Sign in instead</Text>
            <Ionicons name="arrow-forward" size={13} color="#4a4a6a" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d14' },
  scroll: { paddingBottom: 0 },

  /* ── HERO ── */
  hero: {
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: 24,
    paddingBottom: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  blob1: {
    position: 'absolute', top: -80, right: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(233,69,96,0.07)',
  },
  blob2: {
    position: 'absolute', top: 80, left: -100,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(233,69,96,0.04)',
  },
  blob3: {
    position: 'absolute', bottom: 0, right: 20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(249,115,22,0.05)',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  logoMark: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#e94560',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#e94560', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 14,
  },
  logoText: {
    fontSize: 32, fontWeight: '900', color: '#f1f1f1', letterSpacing: -0.5,
  },
  logoAccent: { color: '#e94560' },
  heroHeadline: {
    fontSize: 36, fontWeight: '900', color: '#f1f1f1',
    textAlign: 'center', letterSpacing: -1, lineHeight: 42,
    marginBottom: 12,
  },
  heroSub: {
    fontSize: 14, color: '#666', textAlign: 'center',
    lineHeight: 21, marginBottom: 28,
  },
  heroCta: { width: '100%', gap: 12, marginBottom: 24 },
  btnPrimary: {
    backgroundColor: '#e94560',
    borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#e94560', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnSecondary: {
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1,
    borderColor: '#252538', backgroundColor: '#13131f',
  },
  btnSecondaryText: { color: '#a0a0b8', fontWeight: '600', fontSize: 15 },
  pillScroll: { width: width, marginLeft: -24 },
  pillContent: { paddingHorizontal: 24, gap: 8 },
  pill: {
    backgroundColor: '#13131f', borderRadius: 24,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#252538',
  },
  pillText: { color: '#a0a0b8', fontSize: 12, fontWeight: '600' },

  /* ── STATS BAR ── */
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 24, marginTop: 8, marginBottom: 0,
    backgroundColor: '#13131f',
    borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#252538',
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: {
    color: '#e94560', fontSize: 22, fontWeight: '900',
    marginBottom: 2, letterSpacing: -0.5,
  },
  statLabel: { color: '#4a4a6a', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: '#252538' },

  /* ── SCAN SECTION ── */
  scanSection: {
    marginTop: 0,
    borderTopWidth: 1, borderTopColor: '#1a1a2e',
    borderBottomWidth: 1, borderBottomColor: '#1a1a2e',
  },

  /* ── GENERIC SECTION ── */
  section: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    borderTopWidth: 1, borderTopColor: '#13131f',
  },
  sectionAlt: { backgroundColor: '#0a0a11' },
  sectionTag: {
    fontSize: 11, fontWeight: '700', color: '#e94560',
    letterSpacing: 2, marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 26, fontWeight: '800', color: '#f1f1f1',
    letterSpacing: -0.5, marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14, color: '#666', lineHeight: 21,
    marginBottom: 24,
  },

  /* ── PHONE MOCKUP ── */
  mockupRow: {
    alignItems: 'center',
    marginTop: 28,
    position: 'relative',
  },
  phone: {
    width: 170, height: 330, borderRadius: 30,
    backgroundColor: '#13131f',
    borderWidth: 2, borderColor: '#252538',
    padding: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6, shadowRadius: 32, elevation: 20,
  },
  phoneInner: {
    flex: 1, borderRadius: 27,
    backgroundColor: '#0d0d14', overflow: 'hidden',
    position: 'relative',
  },
  phoneNotch: {
    position: 'absolute', top: 0, alignSelf: 'center',
    width: 56, height: 16, backgroundColor: '#13131f',
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12, zIndex: 1,
  },
  phoneContent: { flex: 1, paddingTop: 18 },
  phoneStatusBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingBottom: 4,
  },
  phoneTime: { color: '#f1f1f1', fontSize: 9, fontWeight: '700' },
  phoneStatusIcons: { flexDirection: 'row', gap: 4 },
  phoneHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
  },
  phoneLogoText: { color: '#f1f1f1', fontSize: 11, fontWeight: '900' },
  phoneCards: { flexDirection: 'row', gap: 5, paddingHorizontal: 8 },
  phoneCard: {
    flex: 1, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: '#252538', backgroundColor: '#1c1c2e',
  },
  phoneCardImg: {
    height: 64, backgroundColor: '#252538',
    justifyContent: 'center', alignItems: 'center',
  },
  phoneCardInfo: { padding: 5 },
  phoneCardName: { color: '#f1f1f1', fontSize: 7, fontWeight: '600', marginBottom: 2 },
  phoneCardPrice: { color: '#f59e0b', fontSize: 8, fontWeight: '900' },
  phoneTabBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'center', paddingVertical: 9,
    backgroundColor: '#13131f', borderTopWidth: 1, borderTopColor: '#252538',
  },
  badge1: {
    position: 'absolute', top: 24, right: width * 0.12,
    backgroundColor: '#13131f', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  badge1Num: { color: '#f97316', fontSize: 13, fontWeight: '900' },
  badge1Label: { color: '#a0a0b8', fontSize: 9, fontWeight: '600' },
  badge2: {
    position: 'absolute', bottom: 48, left: width * 0.12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#13131f', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  badge2Label: { color: '#10b981', fontSize: 11, fontWeight: '700' },

  /* ── HOW IT WORKS ── */
  stepRow: {
    flexDirection: 'row', gap: 16,
    alignItems: 'flex-start', marginBottom: 0,
  },
  stepLeft: { alignItems: 'center', width: 44 },
  stepCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#e94560',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#e94560', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8,
  },
  stepLine: {
    width: 2, flex: 1, minHeight: 32,
    backgroundColor: '#252538', marginTop: 4,
  },
  stepBody: { flex: 1, paddingBottom: 28 },
  stepTitle: {
    color: '#f1f1f1', fontWeight: '700', fontSize: 15,
    marginBottom: 4, marginTop: 12,
  },
  stepDesc: { color: '#555', fontSize: 13, lineHeight: 20 },

  /* ── FEATURES ── */
  featureGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  featureCard: {
    width: (width - 60) / 2,
    backgroundColor: '#13131f',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#252538',
  },
  featureIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#1c1c2e',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1, borderColor: '#252538',
  },
  featureEmoji: { fontSize: 22 },
  featureTitle: { color: '#f1f1f1', fontWeight: '700', fontSize: 14, marginBottom: 6 },
  featureDesc: { color: '#4a4a6a', fontSize: 12, lineHeight: 18 },

  /* ── FINAL CTA ── */
  finalCta: {
    paddingHorizontal: 24, paddingVertical: 48,
    borderTopWidth: 1, borderTopColor: '#13131f',
    alignItems: 'center', gap: 0, overflow: 'hidden', position: 'relative',
  },
  finalBlob: {
    position: 'absolute', top: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(233,69,96,0.05)',
  },
  finalTitle: {
    fontSize: 30, fontWeight: '900', color: '#f1f1f1',
    letterSpacing: -0.5, marginBottom: 10, marginTop: 6,
  },
  finalDesc: {
    fontSize: 14, color: '#555', textAlign: 'center',
    lineHeight: 21, marginBottom: 28, maxWidth: 280,
  },
  signInLink: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginTop: 16,
  },
  signInText: { color: '#4a4a6a', fontWeight: '600', fontSize: 14 },
});
