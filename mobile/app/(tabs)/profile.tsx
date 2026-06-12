import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function StarRating({ rating }: { rating: number | null }) {
  const stars = rating ? Math.round(rating) : 0;
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= stars ? 'star' : 'star-outline'}
          size={14}
          color={i <= stars ? '#f59e0b' : '#4a4a6a'}
        />
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const [becomingSellerLoading, setBecomingSellerLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  async function handleBecomeSeller() {
    const doIt = async () => {
      setBecomingSellerLoading(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ role: 'seller', seller_verified: true })
          .eq('id', user!.id);
        if (error) throw new Error(error.message);
        await refreshProfile();
        Alert.alert('Success', 'You are now a verified seller!');
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to verify seller');
      } finally {
        setBecomingSellerLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('This will verify your account as a seller so you can list items. Continue?')) {
        await doIt();
      }
    } else {
      Alert.alert('Become a Seller', 'This will verify your account as a seller so you can list items. Continue?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: doIt },
      ]);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', user!.id);
      if (error) throw new Error(error.message);
      await refreshProfile();
      setEditModalVisible(false);
      Alert.alert('Saved', 'Profile updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSignOut() {
    const doSignOut = async () => {
      setSigningOut(true);
      try {
        await signOut();
        router.replace('/(auth)/login');
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Sign out failed');
        setSigningOut(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        await doSignOut();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
      ]);
    }
  }

  const roleLabel = profile?.role === 'seller' ? 'SELLER' : profile?.role === 'admin' ? 'ADMIN' : 'BUYER';
  const roleColor = profile?.role === 'seller' ? '#10b981' : profile?.role === 'admin' ? '#f97316' : '#a0a0b8';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Hero Header */}
      <View style={styles.heroSection}>
        {/* Decorative background pattern */}
        <View style={styles.heroBgDecor1} />
        <View style={styles.heroBgDecor2} />

        <View style={styles.avatarWrapper}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          {profile?.seller_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={11} color="#fff" />
            </View>
          )}
        </View>

        <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.heroMeta}>
          <View style={styles.memberSincePill}>
            <Ionicons name="calendar-outline" size={11} color="#4a4a6a" />
            <Text style={styles.memberSinceText}>Since {memberSince}</Text>
          </View>
          <View style={[styles.rolePill, { borderColor: roleColor }]}>
            <Text style={[styles.rolePillText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
        </View>

        <View style={styles.heroStars}>
          <StarRating rating={profile?.rating} />
          {profile?.rating ? (
            <Text style={styles.ratingText}>{profile.rating.toFixed(1)}</Text>
          ) : (
            <Text style={styles.ratingTextMuted}>No ratings yet</Text>
          )}
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile?.total_sales ?? 0}</Text>
          <Text style={styles.statLabel}>Sales</Text>
          <Ionicons name="trending-up-outline" size={16} color="#10b981" style={{ marginTop: 4 }} />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile?.total_purchases ?? 0}</Text>
          <Text style={styles.statLabel}>Purchases</Text>
          <Ionicons name="bag-outline" size={16} color="#a0a0b8" style={{ marginTop: 4 }} />
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>
            {profile?.rating ? profile.rating.toFixed(1) : '—'}
          </Text>
          <Text style={styles.statLabel}>Rating</Text>
          <Ionicons name="star" size={16} color="#f59e0b" style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* Become a Seller CTA */}
      {profile?.role === 'buyer' && (
        <TouchableOpacity
          style={[styles.sellerCard, becomingSellerLoading && styles.btnDisabled]}
          onPress={handleBecomeSeller}
          disabled={becomingSellerLoading}
          activeOpacity={0.85}
        >
          <View style={styles.sellerCardIconWrap}>
            <Text style={styles.sellerCardIcon}>🏪</Text>
          </View>
          <View style={styles.sellerCardContent}>
            <Text style={styles.sellerCardTitle}>Become a Verified Seller</Text>
            <Text style={styles.sellerCardSubtitle}>Start listing items and reach buyers today</Text>
          </View>
          {becomingSellerLoading ? (
            <ActivityIndicator color="#e94560" size="small" />
          ) : (
            <View style={styles.sellerCardArrow}>
              <Ionicons name="arrow-forward" size={16} color="#e94560" />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* My Account Section */}
      <Text style={styles.sectionLabel}>MY ACCOUNT</Text>
      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => {
            setFullName(profile?.full_name || '');
            setPhone(profile?.phone || '');
            setEditModalVisible(true);
          }}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(233,69,96,0.1)' }]}>
            <Ionicons name="person-outline" size={18} color="#e94560" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Edit Profile</Text>
            <Text style={styles.menuSubtext}>Name, phone number</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#4a4a6a" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <View style={styles.menuRow}>
          <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
            <Ionicons name="notifications-outline" size={18} color="#f59e0b" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Notifications</Text>
            <Text style={styles.menuSubtext}>Bid updates & alerts</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#252538', true: '#e94560' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.menuDivider} />

        <View style={[styles.menuRow, styles.menuRowDisabled]}>
          <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(74,74,106,0.15)' }]}>
            <Ionicons name="card-outline" size={18} color="#4a4a6a" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuLabel, { color: '#4a4a6a' }]}>Payment Methods</Text>
            <Text style={styles.menuSubtext}>Coming soon</Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        </View>

        <View style={styles.menuDivider} />

        <TouchableOpacity style={styles.menuRow} onPress={() => Alert.alert('Help & Support', 'Email us at support@bidtrust.co.za or visit our website for FAQs.')}>
          <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
            <Ionicons name="help-circle-outline" size={18} color="#10b981" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Help & Support</Text>
            <Text style={styles.menuSubtext}>FAQs, contact us</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#4a4a6a" />
        </TouchableOpacity>
      </View>

      {/* Legal Section */}
      <Text style={styles.sectionLabel}>LEGAL</Text>
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuRow} onPress={() => Alert.alert('Privacy Policy', 'Our privacy policy is available at bidtrust.co.za/privacy')}>
          <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(160,160,184,0.08)' }]}>
            <Ionicons name="document-text-outline" size={18} color="#a0a0b8" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#4a4a6a" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity style={styles.menuRow} onPress={() => Alert.alert('Terms of Service', 'Our terms of service are available at bidtrust.co.za/terms')}>
          <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(160,160,184,0.08)' }]}>
            <Ionicons name="shield-outline" size={18} color="#a0a0b8" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Terms of Service</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#4a4a6a" />
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <Text style={styles.sectionLabel}>DANGER ZONE</Text>
      <TouchableOpacity
        style={[styles.signOutBtn, signingOut && styles.btnDisabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color="#e94560" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={18} color="#e94560" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.version}>BidTrust v1.0.0</Text>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={savingProfile} style={styles.modalSaveBtn}>
              {savingProfile ? (
                <ActivityIndicator size="small" color="#e94560" />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor="#4a4a6a"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor="#4a4a6a"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  content: {
    paddingBottom: 48,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 28,
    paddingHorizontal: 24,
    backgroundColor: '#13131f',
    borderBottomWidth: 1,
    borderBottomColor: '#252538',
    position: 'relative',
    overflow: 'hidden',
  },
  heroBgDecor1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(233,69,96,0.06)',
  },
  heroBgDecor2: {
    position: 'absolute',
    top: 20,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(233,69,96,0.03)',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#e94560',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(233,69,96,0.3)',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10b981',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#13131f',
  },
  name: {
    color: '#f1f1f1',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  email: {
    color: '#4a4a6a',
    fontSize: 13,
    marginBottom: 12,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  memberSincePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1c1c2e',
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#252538',
  },
  memberSinceText: {
    color: '#4a4a6a',
    fontSize: 11,
    fontWeight: '600',
  },
  rolePill: {
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '700',
  },
  ratingTextMuted: {
    color: '#4a4a6a',
    fontSize: 12,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#13131f',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252538',
  },
  statValue: {
    color: '#f1f1f1',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  statLabel: {
    color: '#4a4a6a',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Seller CTA
  sellerCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#13131f',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(233,69,96,0.35)',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sellerCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(233,69,96,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(233,69,96,0.2)',
  },
  sellerCardIcon: {
    fontSize: 24,
  },
  sellerCardContent: {
    flex: 1,
  },
  sellerCardTitle: {
    color: '#f1f1f1',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  sellerCardSubtitle: {
    color: '#a0a0b8',
    fontSize: 12,
  },
  sellerCardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(233,69,96,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section label
  sectionLabel: {
    color: '#4a4a6a',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },

  // Menu
  menuSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#13131f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252538',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  menuRowDisabled: {
    opacity: 0.6,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#252538',
    marginLeft: 58,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    color: '#f1f1f1',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 1,
  },
  menuSubtext: {
    color: '#4a4a6a',
    fontSize: 11,
  },
  comingSoonBadge: {
    backgroundColor: '#1c1c2e',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#252538',
  },
  comingSoonText: {
    color: '#4a4a6a',
    fontSize: 11,
    fontWeight: '600',
  },

  // Sign out
  signOutBtn: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e94560',
    marginTop: 4,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(233,69,96,0.06)',
  },
  signOutText: {
    color: '#e94560',
    fontWeight: '700',
    fontSize: 15,
  },
  version: {
    color: '#252538',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // Modal
  modal: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252538',
    paddingTop: 60,
    backgroundColor: '#13131f',
  },
  modalCancelBtn: {
    paddingHorizontal: 4,
  },
  modalSaveBtn: {
    paddingHorizontal: 4,
  },
  modalTitle: {
    color: '#f1f1f1',
    fontSize: 17,
    fontWeight: '700',
  },
  modalCancel: {
    color: '#a0a0b8',
    fontSize: 16,
    fontWeight: '500',
  },
  modalSave: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: '700',
  },
  modalContent: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#a0a0b8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalInput: {
    backgroundColor: '#13131f',
    borderRadius: 12,
    padding: 14,
    color: '#f1f1f1',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#252538',
  },
});
