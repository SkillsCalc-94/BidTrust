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
} from 'react-native';
import { router } from 'expo-router';
import api from '../../lib/api';
import ListingCard from '../../components/ListingCard';

const CATEGORIES = ['All', 'Electronics', 'Furniture', 'Clothing', 'Vehicles', 'Collectibles', 'Sports', 'Books', 'Other'];

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
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search listings..."
            placeholderTextColor="#666"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
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
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort options */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortScroll}
        contentContainerStyle={styles.sortContent}
      >
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.sortChip, sort === opt.value && styles.sortChipActive]}
            onPress={() => setSort(opt.value)}
          >
            <Text style={[styles.sortChipText, sort === opt.value && styles.sortChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchListings()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && listings.length === 0 && !error && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to list an item for sale!</Text>
        </View>
      )}
    </View>
  );

  if (loading && listings.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>Loading listings...</Text>
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
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 10,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: '#888',
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  categoryScroll: {
    marginTop: 4,
  },
  categoryContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  chipActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  chipText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  sortScroll: {
    marginTop: 8,
    marginBottom: 4,
  },
  sortContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  sortChip: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#333',
  },
  sortChipActive: {
    borderColor: '#e94560',
  },
  sortChipText: {
    color: '#666',
    fontSize: 12,
  },
  sortChipTextActive: {
    color: '#e94560',
    fontWeight: '600',
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  errorBox: {
    margin: 12,
    backgroundColor: 'rgba(233,69,96,0.1)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#e94560',
    fontSize: 13,
    flex: 1,
  },
  retryText: {
    color: '#e94560',
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 14,
  },
});
