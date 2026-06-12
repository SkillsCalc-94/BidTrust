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
    desc: 'Upload a few photos and our AI instantly estimates your item\'s market value — no guesswork.',
  },
  {
    icon: '🔒',
    title: 'Escrow Protection',
    desc: 'We hold payment securely until the item is delivered and verified. Buyer and seller are both protected.',
  },
  {
    icon: '✅',
    title: 'Verified Sellers',
    desc: 'Every seller is verified by our team. You know exactly who you\'re buying from.',
  },
  {
    icon: '⚡',
    title: 'Live Auctions',
    desc: 'Bid in real time or make an offer. Set a Buy Now price to sell instantly.',
  },
];

const STEPS = [
  { num: '1', title: 'List Your Item', desc: 'Take a few photos, answer quick questions, and let AI suggest a fair price.' },
  { num: '2', title: 'Buyers Bid or Offer', desc: 'Your listing goes live. Buyers place bids or make direct offers.' },
  { num: '3', title: 'We Hold Payment', desc: 'When a sale is agreed, we securely hold the buyer\'s payment in escrow.' },
  { num: '4', title: 'Ship & Get Paid', desc: 'Send the item to us for verification. Once confirmed, we release your payment.' },
];

const TRUST_TICKER = [
  '🛡️ Escrow Protected',
  '🤖 AI Powered',
  '✅ Verified Sellers',
  '⚡ Live Bidding',
  '🔒 100% Secure',
  '💎 Premium Items',
];

const STATS = [
  { num: '12K+', label: 'Items Listed' },
  { num: '98%', label: 'Satisfaction' },
  { num: 'R45M', label: 'Transacted' },
];

export default function LandingScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View style={[styles.hero, { opacity: heroOpacity }]}>
          {/* Background decorative circles */}
          <View style={styles.heroDecor1} />
          <View style={styles.heroDecor2} />
          <View style={styles.heroDecor3} />

          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Ionicons name="hammer" size={28} color="#fff" />
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Bid<Text style={styles.heroTitleAccent}>Trust</Text>
          </Text>
          <Text style={styles.heroTagline}>The marketplace you can trust</Text>
          <Text style={styles.heroDesc}>
            Buy and sell second-hand or new items safely. We use AI to price your goods,
            and escrow to protect every transaction.
          </Text>

          {/* Trust Ticker */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tickerScroll}
            contentContainerStyle={styles.tickerContent}
          >
            {TRUST_TICKER.map((item, i) => (
              <View key={i} style={styles.tickerItem}>
                <Text style={styles.tickerText}>{item}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Interactive 3D scene (web only — renders nothing on iOS/Android) */}
        <View style={styles.splineSection}>
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            height={420}
          />
        </View>

        {/* Phone mockup frame — interactive 3D tilt */}
        <View style={styles.phoneMockupSection}>
          <Tilt3D maxTilt={14} glowColor="#e94560">
          <View style={styles.phoneMockupOuter}>
            <View style={styles.phoneMockupInner}>
              {/* Phone screen content */}
              <View style={styles.phoneScreen}>
                {/* Status bar mock */}
                <View style={styles.phoneStatusBar}>
                  <Text style={styles.phoneStatusTime}>9:41</Text>
                  <View style={styles.phoneStatusIcons}>
                    <Ionicons name="wifi" size={10} color="#fff" />
                    <Ionicons name="battery-full" size={10} color="#fff" />
                  </View>
                </View>
                {/* App header mock */}
                <View style={styles.phoneAppHeader}>
                  <Text style={styles.phoneLogoText}>Bid<Text style={{ color: '#e94560' }}>Trust</Text></Text>
                  <Ionicons name="notifications-outline" size={14} color="#a0a0b8" />
                </View>
                {/* Mock listing cards */}
                <View style={styles.phoneMockGrid}>
                  <View style={[styles.phoneMockCard, { backgroundColor: '#1c1c2e' }]}>
                    <View style={[styles.phoneMockCardImg, { backgroundColor: '#252538' }]}>
                      <Ionicons name="laptop-outline" size={20} color="#4a4a6a" />
                    </View>
                    <View style={styles.phoneMockCardInfo}>
                      <Text style={styles.phoneMockCardTitle}>MacBook Pro</Text>
                      <Text style={styles.phoneMockCardPrice}>R15 999</Text>
                    </View>
                  </View>
                  <View style={[styles.phoneMockCard, { backgroundColor: '#1c1c2e' }]}>
                    <View style={[styles.phoneMockCardImg, { backgroundColor: '#252538' }]}>
                      <Ionicons name="watch-outline" size={20} color="#4a4a6a" />
                    </View>
                    <View style={styles.phoneMockCardInfo}>
                      <Text style={styles.phoneMockCardTitle}>Rolex Sub</Text>
                      <Text style={styles.phoneMockCardPrice}>R89K</Text>
                    </View>
                  </View>
                </View>
                {/* Tab bar mock */}
                <View style={styles.phoneTabBar}>
                  {['home', 'search', 'add-circle', 'person'].map((icon, i) => (
                    <Ionicons
                      key={i}
                      name={icon as any}
                      size={16}
                      color={i === 0 ? '#e94560' : '#4a4a6a'}
                    />
                  ))}
                </View>
              </View>
              {/* Notch */}
              <View style={styles.phoneNotch} />
            </View>
          </View>
          </Tilt3D>

          {/* Floating stat badges around phone */}
          <View style={styles.floatBadge1}>
            <Text style={styles.floatBadgeNum}>AI</Text>
            <Text style={styles.floatBadgeLabel}>Pricing</Text>
          </View>
          <View style={styles.floatBadge2}>
            <Ionicons name="shield-checkmark" size={14} color="#10b981" />
            <Text style={styles.floatBadgeLabel2}>Secure</Text>
          </View>
        </View>

        {/* Stats section */}
        <View style={styles.statsSection}>
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

        {/* CTA Buttons */}
        <View style={styles.ctaSection}>
          <TouchableOpacity style={styles.ctaPrimary} onPress={() => router.push('/register')} activeOpacity={0.85}>
            <Ionicons name="rocket-outline" size={18} color="#fff" />
            <Text style={styles.ctaPrimaryText}>Get Started — It's Free</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaSecondary} onPress={() => router.push('/login')} activeOpacity={0.85}>
            <Text style={styles.ctaSecondaryText}>I already have an account</Text>
          </TouchableOpacity>
        </View>

        {/* ── AI SCAN HERO — the big selling point ── */}
        <View style={styles.scanHeroSection}>
          <ScanHero />
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          <Text style={styles.sectionTitle}>Simple, safe, and fair</Text>
          {STEPS.map((step, i) => (
            <View key={step.num} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <View style={styles.stepNumCircle}>
                  <Text style={styles.stepNum}>{step.num}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={styles.stepConnector} />}
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FEATURES</Text>
          <Text style={styles.sectionTitle}>Why choose BidTrust?</Text>
          <View style={styles.featuresGrid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureCard}>
                <View style={styles.featureIconWrap}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Final CTA */}
        <View style={styles.finalCta}>
          <View style={styles.finalCtaDecor} />
          <Text style={styles.finalCtaLabel}>JOIN TODAY</Text>
          <Text style={styles.finalCtaTitle}>Ready to start?</Text>
          <Text style={styles.finalCtaDesc}>Join thousands of buyers and sellers on BidTrust.</Text>
          <TouchableOpacity style={styles.ctaPrimary} onPress={() => router.push('/register')} activeOpacity={0.85}>
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.ctaPrimaryText}>Create Free Account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/login')} style={styles.signInLink}>
            <Text style={styles.signInLinkText}>Sign in instead</Text>
            <Ionicons name="arrow-forward" size={14} color="#4a4a6a" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d14' },
  scanHeroSection: {
    marginHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: '#1e1e30',
    backgroundColor: '#0d0d14',
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecor1: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(233,69,96,0.07)',
  },
  heroDecor2: {
    position: 'absolute',
    top: 60,
    left: -100,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(233,69,96,0.04)',
  },
  heroDecor3: {
    position: 'absolute',
    bottom: -40,
    right: 40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(249,115,22,0.05)',
  },
  logoRow: {
    marginBottom: 16,
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#f1f1f1',
    letterSpacing: -1,
    marginBottom: 4,
  },
  heroTitleAccent: {
    color: '#e94560',
  },
  heroTagline: {
    fontSize: 16,
    color: '#a0a0b8',
    fontWeight: '500',
    marginBottom: 16,
  },
  heroDesc: {
    fontSize: 15,
    color: '#4a4a6a',
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 300,
    marginBottom: 20,
  },

  // Trust Ticker
  tickerScroll: {
    width: width,
    marginLeft: -24,
  },
  tickerContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  tickerItem: {
    backgroundColor: '#13131f',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#252538',
  },
  tickerText: {
    color: '#a0a0b8',
    fontSize: 12,
    fontWeight: '600',
  },

  // Phone mockup
  phoneMockupSection: {
    alignItems: 'center',
    paddingVertical: 32,
    position: 'relative',
  },
  splineSection: {
    paddingHorizontal: 16,
    marginTop: 8,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  phoneMockupOuter: {
    width: 180,
    height: 340,
    borderRadius: 32,
    backgroundColor: '#13131f',
    borderWidth: 2,
    borderColor: '#252538',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 20,
  },
  phoneMockupInner: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: '#0d0d14',
    overflow: 'hidden',
    position: 'relative',
  },
  phoneNotch: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 60,
    height: 18,
    backgroundColor: '#13131f',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  phoneScreen: {
    flex: 1,
    paddingTop: 20,
  },
  phoneStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  phoneStatusTime: {
    color: '#f1f1f1',
    fontSize: 9,
    fontWeight: '700',
  },
  phoneStatusIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  phoneAppHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  phoneLogoText: {
    color: '#f1f1f1',
    fontSize: 12,
    fontWeight: '900',
  },
  phoneMockGrid: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
  },
  phoneMockCard: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#252538',
  },
  phoneMockCardImg: {
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneMockCardInfo: {
    padding: 6,
  },
  phoneMockCardTitle: {
    color: '#f1f1f1',
    fontSize: 8,
    fontWeight: '600',
    marginBottom: 2,
  },
  phoneMockCardPrice: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: '900',
  },
  phoneTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#13131f',
    borderTopWidth: 1,
    borderTopColor: '#252538',
  },

  // Float badges
  floatBadge1: {
    position: 'absolute',
    top: 50,
    right: width * 0.1,
    backgroundColor: '#13131f',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  floatBadgeNum: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  floatBadgeLabel: {
    color: '#a0a0b8',
    fontSize: 10,
    fontWeight: '600',
  },
  floatBadge2: {
    position: 'absolute',
    bottom: 60,
    left: width * 0.1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#13131f',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  floatBadgeLabel2: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },

  // Stats
  statsSection: {
    flexDirection: 'row',
    marginHorizontal: 24,
    backgroundColor: '#13131f',
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#252538',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    color: '#e94560',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  statLabel: {
    color: '#4a4a6a',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#252538',
  },

  // CTA
  ctaSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  ctaPrimary: {
    backgroundColor: '#e94560',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ctaPrimaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  ctaSecondary: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252538',
    backgroundColor: '#13131f',
  },
  ctaSecondaryText: {
    color: '#a0a0b8',
    fontWeight: '600',
    fontSize: 15,
  },

  // How it works
  section: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: '#13131f',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e94560',
    letterSpacing: 2,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f1f1f1',
    marginBottom: 24,
    letterSpacing: -0.5,
  },

  stepRow: {
    flexDirection: 'row',
    marginBottom: 0,
    gap: 16,
    alignItems: 'flex-start',
  },
  stepLeft: {
    alignItems: 'center',
    width: 40,
  },
  stepNumCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  stepConnector: {
    width: 2,
    height: 36,
    backgroundColor: '#252538',
    marginTop: 4,
  },
  stepTextWrap: {
    flex: 1,
    paddingBottom: 28,
  },
  stepNum: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  stepTitle: {
    color: '#f1f1f1',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
    marginTop: 10,
  },
  stepDesc: {
    color: '#4a4a6a',
    fontSize: 14,
    lineHeight: 21,
  },

  // Features
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (width - 60) / 2,
    backgroundColor: '#13131f',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#252538',
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1c1c2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#252538',
  },
  featureIcon: {
    fontSize: 22,
  },
  featureTitle: {
    color: '#f1f1f1',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 6,
  },
  featureDesc: {
    color: '#4a4a6a',
    fontSize: 12,
    lineHeight: 18,
  },

  // Final CTA
  finalCta: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    borderTopWidth: 1,
    borderTopColor: '#13131f',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  finalCtaDecor: {
    position: 'absolute',
    top: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(233,69,96,0.04)',
  },
  finalCtaLabel: {
    color: '#e94560',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  finalCtaTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#f1f1f1',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  finalCtaDesc: {
    fontSize: 15,
    color: '#4a4a6a',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
    maxWidth: 280,
  },
  signInLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  signInLinkText: {
    color: '#4a4a6a',
    fontWeight: '600',
    fontSize: 15,
  },
});
