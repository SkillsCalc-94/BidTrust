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
} from 'react-native';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';

function StarRating({ rating }: { rating: number | null }) {
  const stars = rating ? Math.round(rating) : 0;
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={{ color: i <= stars ? '#FFD700' : '#333', fontSize: 16 }}>★</Text>
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
    Alert.alert(
      'Become a Seller',
      'This will verify your account as a seller so you can list items. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setBecomingSellerLoading(true);
            try {
              await api.post('/auth/verify-seller');
              await refreshProfile();
              Alert.alert('Success', 'You are now a verified seller!');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to verify seller');
            } finally {
              setBecomingSellerLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      await api.put('/auth/profile', { full_name: fullName.trim(), phone: phone.trim() });
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
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Avatar & Info */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          {profile?.seller_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.memberSince}>Member since {memberSince}</Text>

        <StarRating rating={profile?.rating} />

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {profile?.role === 'seller' ? '🏪 Seller' : profile?.role === 'admin' ? '⚡ Admin' : '🛒 Buyer'}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.total_sales ?? 0}</Text>
          <Text style={styles.statLabel}>Sales</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.total_purchases ?? 0}</Text>
          <Text style={styles.statLabel}>Purchases</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.rating ? profile.rating.toFixed(1) : 'N/A'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Become Seller */}
      {profile?.role === 'buyer' && (
        <TouchableOpacity
          style={[styles.sellerBtn, becomingSellerLoading && styles.btnDisabled]}
          onPress={handleBecomeSeller}
          disabled={becomingSellerLoading}
        >
          {becomingSellerLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.sellerBtnIcon}>🏪</Text>
              <View>
                <Text style={styles.sellerBtnTitle}>Become a Seller</Text>
                <Text style={styles.sellerBtnSubtitle}>Start listing your items today</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Edit Profile */}
      <TouchableOpacity style={styles.actionBtn} onPress={() => {
        setFullName(profile?.full_name || '');
        setPhone(profile?.phone || '');
        setEditModalVisible(true);
      }}>
        <Text style={styles.actionBtnIcon}>✏️</Text>
        <Text style={styles.actionBtnText}>Edit Profile</Text>
        <Text style={styles.actionBtnArrow}>›</Text>
      </TouchableOpacity>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🔔</Text>
            <View>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingSubtext}>Bid updates & auction alerts</Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#333', true: '#e94560' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🌙</Text>
            <View>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingSubtext}>Always on — built for night owls</Text>
            </View>
          </View>
          <Switch
            value={true}
            disabled
            trackColor={{ false: '#333', true: '#e94560' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <TouchableOpacity style={styles.linkRow}>
          <Text style={styles.linkText}>Privacy Policy</Text>
          <Text style={styles.actionBtnArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow}>
          <Text style={styles.linkText}>Terms of Service</Text>
          <Text style={styles.actionBtnArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow}>
          <Text style={styles.linkText}>Support</Text>
          <Text style={styles.actionBtnArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={[styles.signOutBtn, signingOut && styles.btnDisabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color="#e94560" />
        ) : (
          <Text style={styles.signOutText}>Sign Out</Text>
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
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? (
                <ActivityIndicator size="small" color="#e94560" />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor="#666"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor="#666"
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
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#e94560',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(233,69,96,0.3)',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#4caf50',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  verifiedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  email: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  memberSince: {
    color: '#555',
    fontSize: 12,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  roleBadgeText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#0f3460',
    marginVertical: 4,
  },
  sellerBtn: {
    backgroundColor: 'rgba(233,69,96,0.15)',
    borderWidth: 1.5,
    borderColor: '#e94560',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sellerBtnIcon: {
    fontSize: 28,
  },
  sellerBtnTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  sellerBtnSubtitle: {
    color: '#888',
    fontSize: 12,
  },
  actionBtn: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  actionBtnIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionBtnText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  actionBtnArrow: {
    color: '#555',
    fontSize: 22,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#555',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingRow: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtext: {
    color: '#666',
    fontSize: 11,
  },
  linkRow: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  linkText: {
    color: '#fff',
    fontSize: 14,
  },
  signOutBtn: {
    backgroundColor: 'rgba(233,69,96,0.1)',
    borderWidth: 1,
    borderColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  signOutText: {
    color: '#e94560',
    fontWeight: '700',
    fontSize: 16,
  },
  version: {
    color: '#333',
    fontSize: 12,
    textAlign: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  modal: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
    paddingTop: 60,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  modalCancel: {
    color: '#888',
    fontSize: 16,
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
  label: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 13,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
});
