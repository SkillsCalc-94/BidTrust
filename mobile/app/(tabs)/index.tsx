import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import ListingCard from '../../components/ListingCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  { label: 'All', emoji: '🏠' },
  { label: 'Electronics', emoji: '📱' },
  { label: 'Furniture', emoji: '🛋️' },
  { label: 'Clothing', emoji: '👕' },
  { label: 'Vehicles', emoji: '🚗' },
  { label: 'Collectibles', emoji: '💎' },
  { label: 'Sports', emoji: '⚽' },
  { label: 'Books', emoji: '📚' },
  { label: 'Other', emoji: '📦' },
];

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Ending Soon', value: 'ending_soon' },
  { label: 'Price ↑', value: 'price_asc' },
  { label: 'Price ↓', value: 'price_desc' },
];

export interface Listing {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  condition: string | null;
  starting_price: number;
  current_price: number;
  buy_now_price: number | null;
  auction_end_time: string;
  status: string;
  verified: boolean;
  ai_estimated_value_low: number | null;
  ai_estimated_value_high: number | null;
  view_count: number;
  seller: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    rating: number | null;
    seller_verified: boolean;
  } | null;
  listing_photos: Array<{ id: string; url: string; is_primary: boolean; sort_order: number }>;
  bids?: Array<{ count: number }> | number;
}

export default function HomeScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [error, setError] = useState('');

  const fetchListings = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (category !== 'All') params.set('category', category);
      if (search) params.set('search', search);
      params.set('sort', sort);

      const data = await api.get<{ listings: Listing[] }>(`/listings?${params.toString()}`);
      setListings(data.listings || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, search, sort]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  function handleSearch() {
    setSearch(searchInput);
  }

  function handleClearSearch() {
    setSearchInput('');
    setSearch('');
  }

  const renderHeader = () => (
    <View>
      {/* App Header */}
      <View style={styles.appHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.appLogoText}>Bid<Text style={styles.appLogoAccent}>Trust</Text></Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="search-outline" size={22} color="#a0a0b8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={22} color="#a0a0b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={17} color="#4a4a6a" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search listings..."
            placeholderTextColor="#4a4a6a"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color="#4a4a6a" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Go</Text>
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.label}
            style={[styles.chip, category === cat.label && styles.chipActive]}
            onPress={() => setCategory(cat.label)}
          >
            <Text style={styles.chipEmoji}>{cat.emoji}</Text>
            <Text style={[styles.chipText, category === cat.label && styles.chipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Section header + sort */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Live Auctions</Text>
          {listings.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{listings.length}</Text>
            </View>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortContent}
        >
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={styles.sortChip}
              onPress={() => setSort(opt.value)}
            >
              <Text style={[styles.sortChipText, sort === opt.value && styles.sortChipTextActive]}>
                {opt.label}
              </Text>
              {sort === opt.value && <View style={styles.sortUnderline} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#e94560" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchListings()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && listings.length === 0 && !error && (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="storefront-outline" size={48} color="#252538" />
          </View>
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to list an item for sale!</Text>
          <TouchableOpacity style={styles.emptyCtaBtn} onPress={() => router.push('/(tabs)/sell')}>
            <Text style={styles.emptyCtaBtnText}>List the First Item</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading && listings.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>Loading auctions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onPress={() => router.push(`/listing/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchListings(true)}
            tintColor="#e94560"
            colors={['#e94560']}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d14',
  },
  loadingText: {
    color: '#a0a0b8',
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 24,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {},
  appLogoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f1f1f1',
    letterSpacing: 0.5,
  },
  appLogoAccent: {
    color: '#e94560',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 4,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: '#252538',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131f',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#252538',
  },
  searchInput: {
    flex: 1,
    color: '#f1f1f1',
    fontSize: 14,
    paddingVertical: 11,
  },
  clearBtn: {
    padding: 4,
  },
  searchBtn: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  categoryScroll: {
    marginTop: 4,
    marginBottom: 4,
  },
  categoryContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131f',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#252538',
    gap: 5,
  },
  chipActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  chipEmoji: {
    fontSize: 13,
  },
  chipText: {
    color: '#a0a0b8',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    color: '#f1f1f1',
    fontSize: 18,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#e94560',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  sortContent: {
    gap: 4,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
  },
  sortChipText: {
    color: '#4a4a6a',
    fontSize: 13,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: '#e94560',
    fontWeight: '700',
  },
  sortUnderline: {
    position: 'absolute',
    bottom: -2,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: '#e94560',
    borderRadius: 1,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  errorBox: {
    margin: 12,
    backgroundColor: 'rgba(233,69,96,0.08)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(233,69,96,0.2)',
  },
  errorText: {
    color: '#e94560',
    fontSize: 13,
    flex: 1,
  },
  retryText: {
    color: '#e94560',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: '#252538',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#f1f1f1',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#a0a0b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 21,
  },
  emptyCtaBtn: {
    backgroundColor: '#e94560',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyCtaBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
