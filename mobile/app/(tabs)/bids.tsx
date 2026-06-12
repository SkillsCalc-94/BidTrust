import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import CountdownTimer from '../../components/CountdownTimer';

type ActivityTab = 'bids' | 'won' | 'offers' | 'listings';

export default function BidsScreen() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<ActivityTab>('bids');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const TABS: { key: ActivityTab; label: string }[] = [
    { key: 'bids', label: 'Active Bids' },
    { key: 'won', label: 'Won' },
    { key: 'offers', label: 'Offers' },
    { key: 'listings', label: 'My Listings' },
  ];

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      switch (activeTab) {
        case 'bids': {
          // Get listings where user has active bids
          const res = await api.get<{ listings: any[] }>('/listings?sort=ending_soon');
          // Filter those with user's bids (in a real app, add a dedicated endpoint)
          setData(res.listings || []);
          break;
        }
        case 'listings': {
          const res = await api.get<{ listings: any[] }>('/listings?sort=newest');
          setData(res.listings || []);
          break;
        }
        default:
          setData([]);
      }
    } catch (err) {
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function renderBidItem({ item }: { item: any }) {
    const primaryPhoto = item.listing_photos?.find((p: any) => p.is_primary) || item.listing_photos?.[0];
    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => router.push(`/listing/${item.id}`)}
      >
        {primaryPhoto && (
          <Image source={{ uri: primaryPhoto.url }} style={styles.itemImage} />
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.itemPrice}>R{item.current_price?.toFixed(2)}</Text>
          <CountdownTimer endTime={item.auction_end_time} />
        </View>
      </TouchableOpacity>
    );
  }

  function renderListingItem({ item }: { item: any }) {
    const primaryPhoto = item.listing_photos?.find((p: any) => p.is_primary) || item.listing_photos?.[0];
    const statusColors: Record<string, string> = {
      active: '#4caf50',
      ended: '#ff9800',
      payment_held: '#2196f3',
      sold: '#9c27b0',
      cancelled: '#f44336',
    };

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => router.push(`/listing/${item.id}`)}
      >
        {primaryPhoto && (
          <Image source={{ uri: primaryPhoto.url }} style={styles.itemImage} />
        )}
        <View style={styles.itemInfo}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || '#666' }]}>
              <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.itemPrice}>R{item.current_price?.toFixed(2)}</Text>
          {item.status === 'active' && <CountdownTimer endTime={item.auction_end_time} />}
        </View>
        {item.status === 'active' && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => Alert.alert('Edit', 'Edit functionality coming soon')}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>
        {activeTab === 'bids' ? '🔨' : activeTab === 'won' ? '🏆' : activeTab === 'offers' ? '💬' : '📦'}
      </Text>
      <Text style={styles.emptyTitle}>
        {activeTab === 'bids' ? 'No active bids' :
         activeTab === 'won' ? 'No won items yet' :
         activeTab === 'offers' ? 'No offers yet' :
         'No listings yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'bids' ? 'Find something to bid on!' :
         activeTab === 'won' ? 'Win some auctions to see them here' :
         activeTab === 'offers' ? 'Make offers on listings to see them here' :
         'List your first item to start selling'}
      </Text>
      {(activeTab === 'bids') && (
        <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.emptyActionText}>Browse Listings</Text>
        </TouchableOpacity>
      )}
      {activeTab === 'listings' && (
        <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/(tabs)/sell')}>
          <Text style={styles.emptyActionText}>List an Item</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e94560" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={activeTab === 'listings' ? renderListingItem : renderBidItem}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor="#e94560"
              colors={['#e94560']}
            />
          }
          contentContainerStyle={data.length === 0 ? styles.emptyList : styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#e94560',
  },
  tabText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#e94560',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  emptyList: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#0f3460',
  },
  itemInfo: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemPrice: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  editBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#0f3460',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAction: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
