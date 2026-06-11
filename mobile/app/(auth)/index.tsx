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
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>🔨</Text>
          </View>
          <Text style={styles.heroTitle}>BidTrust</Text>
          <Text style={styles.heroTagline}>The marketplace you can trust</Text>
          <Text style={styles.heroDesc}>
            Buy and sell second-hand or new items safely. We use AI to price your goods,
            and escrow to protect every transaction.
          </Text>
          <View style={styles.heroBadges}>
            <View style={styles.badge}><Text style={styles.badgeText}>🛡️ Escrow Protected</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>🤖 AI Powered</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>✅ Verified</Text></View>
          </View>
        </Animated.View>

        {/* CTA Buttons */}
        <View style={styles.ctaSection}>
          <TouchableOpacity style={styles.ctaPrimary} onPress={() => router.push('/register')} activeOpacity={0.85}>
            <Text style={styles.ctaPrimaryText}>Get Started — It's Free</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaSecondary} onPress={() => router.push('/login')} activeOpacity={0.85}>
            <Text style={styles.ctaSecondaryText}>I already have an account</Text>
          </TouchableOpacity>
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          <Text style={styles.sectionTitle}>Simple, safe, and fair</Text>
          {STEPS.map((step) => (
            <View key={step.num} style={styles.stepRow}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNum}>{step.num}</Text>
              </View>
              <View style={styles.stepText}>
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
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Trust stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Built on trust</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>100%</Text>
              <Text style={styles.statLabel}>Escrow Protected</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>AI</Text>
              <Text style={styles.statLabel}>Fair Pricing</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>0%</Text>
              <Text style={styles.statLabel}>Hidden Fees</Text>
            </View>
          </View>
        </View>

        {/* Final CTA */}
        <View style={styles.finalCta}>
          <Text style={styles.finalCtaTitle}>Ready to start?</Text>
          <Text style={styles.finalCtaDesc}>Join BidTrust and start buying or selling safely today.</Text>
          <TouchableOpacity style={styles.ctaPrimary} onPress={() => router.push('/register')} activeOpacity={0.85}>
            <Text style={styles.ctaPrimaryText}>Create Free Account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/login')} style={{ marginTop: 12 }}>
            <Text style={styles.ctaSecondaryText}>Sign in instead</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },

  hero: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  logoIcon: { fontSize: 40 },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  heroTagline: {
    fontSize: 16,
    color: '#e94560',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 16,
  },
  heroDesc: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 320,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  badge: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  badgeText: { color: '#ccc', fontSize: 12, fontWeight: '600' },

  ctaSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  ctaPrimary: {
    backgroundColor: '#e94560',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  ctaPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  ctaSecondary: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  ctaSecondaryText: { color: '#aaa', fontWeight: '600', fontSize: 15 },

  section: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: '#16213e',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e94560',
    letterSpacing: 2,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 24,
  },

  stepRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 16,
    alignItems: 'flex-start',
  },
  stepNumCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNum: { color: '#fff', fontWeight: '900', fontSize: 18 },
  stepText: { flex: 1 },
  stepTitle: { color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  stepDesc: { color: '#888', fontSize: 14, lineHeight: 21 },

  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (width - 60) / 2,
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  featureIcon: { fontSize: 28, marginBottom: 10 },
  featureTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 6 },
  featureDesc: { color: '#777', fontSize: 12, lineHeight: 18 },

  statsSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: '#16213e',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { color: '#e94560', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#888', fontSize: 11, marginTop: 4, textAlign: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: '#0f3460' },

  finalCta: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: '#16213e',
    alignItems: 'center',
  },
  finalCtaTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 8 },
  finalCtaDesc: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24, lineHeight: 21 },
});
