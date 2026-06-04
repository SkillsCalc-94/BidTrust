import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  FlatList,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import CountdownTimer from '../../components/CountdownTimer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ListingDetail {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  condition: string | null;
  starting_price: number;
  current_price: number;
  buy_now_price: number | null;
  reserve_price: number | null;
  auction_end_time: string;
  status: string;
  verified: boolean;
  location: string | null;
  ai_estimated_value_low: number | null;
  ai_estimated_value_high: number | null;
  view_count: number;
  seller: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    rating: number | null;
    seller_verified: boolean;
    created_at: string;
  } | null;
  listing_photos: Array<{ id: string; url: string; is_primary: boolean; sort_order: number }>;
  bids: Array<{ id: string; amount: number; created_at: string; bidder: { id: string; display_name: string } }>;
  bid_count: number;
  highest_bid: any;
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [photoIndex, setPhotoIndex] = useState(0);

  // Bid modal
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState('');

  // Offer modal
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerError, setOfferError] = useState('');

  const fetchListing = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.get<{ listing: ListingDetail }>(`/listings/${id}`);
      const l = data.listing;
      // Sort photos
      if (l.listing_photos) {
        l.listing_photos.sort((a, b) => a.sort_order - b.sort_order);
      }
      setListing(l);
      if (l.current_price) {
        setBidAmount(String(Math.ceil(l.current_price + 1)));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load listing');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  async function handlePlaceBid() {
    if (!bidAmount || isNaN(parseFloat(bidAmount))) {
      setBidError('Please enter a valid bid amount');
      return;
    }
    const amount = parseFloat(bidAmount);
    if (listing && amount <= listing.current_price) {
      setBidError(`Bid must be higher than current price: $${listing.current_price.toFixed(2)}`);
      return;
    }
    setBidError('');
    setBidLoading(true);
    try {
      await api.post(`/bids/${id}`, { amount });
      setBidModalVisible(false);
      setBidAmount('');
      Alert.alert('Bid Placed!', `Your bid of $${amount.toFixed(2)} has been placed.`);
      fetchListing(true);
    } catch (err: any) {
      setBidError(err.message || 'Failed to place bid');
    } finally {
      setBidLoading(false);
    }
  }

  async function handleMakeOffer() {
    if (!offerAmount || isNaN(parseFloat(offerAmount))) {
      setOfferError('Please enter a valid offer amount');
      return;
    }
    setOfferError('');
    setOfferLoading(true);
    try {
      await api.post(`/offers/listing/${id}`, { amount: parseFloat(offerAmount), message: offerMessage });
      setOfferModalVisible(false);
      setOfferAmount('');
      setOfferMessage('');
      Alert.alert('Offer Sent!', 'Your offer has been sent to the seller.');
    } catch (err: any) {
      setOfferError(err.message || 'Failed to send offer');
    } finally {
      setOfferLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Listing not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchListing()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const photos = listing.listing_photos || [];
  const isOwnListing = user?.id === listing.seller?.id;
  const isActive = listing.status === 'active';
  const auctionEnded = new Date(listing.auction_end_time) <= new Date();
  const canBid = isActive && !auctionEnded && !isOwnListing && user;

  const conditionLabels: Record<string, string> = {
    new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', poor: 'Poor',
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchListing(true)} tintColor="#e94560" colors={['#e94560']} />
      }
    >
      {/* Photo Carousel */}
      <View style={styles.carouselContainer}>
        {photos.length > 0 ? (
          <>
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setPhotoIndex(index);
              }}
              renderItem={({ item }) => (
                <Image source={{ uri: item.url }} style={styles.carouselImage} resizeMode="cover" />
              )}
            />
            {photos.length > 1 && (
              <View style={styles.dotsContainer}>
                {photos.map((_, i) => (
                  <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.noPhotoPlaceholder}>
            <Text style={styles.noPhotoText}>No Photos</Text>
          </View>
        )}

        {listing.verified && (
          <View style={styles.verifiedOverlay}>
            <Text style={styles.verifiedOverlayText}>✓ Verified</Text>
          </View>
        )}
        {listing.status !== 'active' && (
          <View style={styles.statusOverlay}>
            <Text style={styles.statusOverlayText}>{listing.status.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {/* Title & Meta */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.metaRow}>
            {listing.category && <Text style={styles.metaBadge}>{listing.category}</Text>}
            {listing.condition && (
              <Text style={styles.metaBadge}>{conditionLabels[listing.condition] || listing.condition}</Text>
            )}
            {listing.location && <Text style={styles.locationText}>📍 {listing.location}</Text>}
          </View>
          <Text style={styles.viewCount}>👁 {listing.view_count} views</Text>
        </View>

        {/* Seller */}
        {listing.seller && (
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              {listing.seller.avatar_url ? (
                <Image source={{ uri: listing.seller.avatar_url }} style={styles.sellerAvatarImg} />
              ) : (
                <View style={styles.sellerAvatarPlaceholder}>
                  <Text style={styles.sellerAvatarInitials}>
                    {listing.seller.full_name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{listing.seller.full_name || 'Seller'}</Text>
              <Text style={styles.sellerRating}>
                {'★'.repeat(Math.round(listing.seller.rating || 0))}
                {'☆'.repeat(5 - Math.round(listing.seller.rating || 0))}
                {listing.seller.rating ? ` ${listing.seller.rating.toFixed(1)}` : ' No rating yet'}
              </Text>
            </View>
            {listing.seller.seller_verified && (
              <View style={styles.sellerVerified}>
                <Text style={styles.sellerVerifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>
        )}

        {/* AI Estimate */}
        {(listing.ai_estimated_value_low || listing.ai_estimated_value_high) && (
          <View style={styles.aiEstimateCard}>
            <Text style={styles.aiEstimateLabel}>✨ AI Estimated Value</Text>
            <Text style={styles.aiEstimateRange}>
              ${listing.ai_estimated_value_low?.toFixed(0)} – ${listing.ai_estimated_value_high?.toFixed(0)}
            </Text>
          </View>
        )}

        {/* Pricing & Timer */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <View>
              <Text style={styles.currentPriceLabel}>Current Price</Text>
              <Text style={styles.currentPrice}>${listing.current_price?.toFixed(2)}</Text>
              <Text style={styles.bidCount}>{listing.bid_count} bid{listing.bid_count !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>{auctionEnded ? 'Auction Ended' : 'Time Left'}</Text>
              {!auctionEnded && <CountdownTimer endTime={listing.auction_end_time} />}
            </View>
          </View>

          {listing.buy_now_price && isActive && !auctionEnded && (
            <View style={styles.buyNowRow}>
              <Text style={styles.buyNowLabel}>Buy Now:</Text>
              <Text style={styles.buyNowPrice}>${listing.buy_now_price.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {canBid && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.bidBtn}
              onPress={() => {
                setBidAmount(String(Math.ceil((listing.current_price || listing.starting_price) + 1)));
                setBidError('');
                setBidModalVisible(true);
              }}
            >
              <Text style={styles.bidBtnText}>Place Bid</Text>
            </TouchableOpacity>

            {listing.buy_now_price && (
              <TouchableOpacity
                style={styles.buyNowBtn}
                onPress={() => Alert.alert('Buy Now', `Purchase for $${listing.buy_now_price?.toFixed(2)}?\n\nPayment flow coming soon.`)}
              >
                <Text style={styles.buyNowBtnText}>Buy Now ${listing.buy_now_price.toFixed(2)}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.offerBtn}
              onPress={() => {
                setOfferAmount('');
                setOfferMessage('');
                setOfferError('');
                setOfferModalVisible(true);
              }}
            >
              <Text style={styles.offerBtnText}>Make Offer</Text>
            </TouchableOpacity>
          </View>
        )}

        {!user && (
          <TouchableOpacity style={styles.loginToActBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginToActBtnText}>Sign in to bid or buy</Text>
          </TouchableOpacity>
        )}

        {/* Bid History */}
        {listing.bids && listing.bids.length > 0 && (
          <View style={styles.bidHistory}>
            <Text style={styles.sectionTitle}>Bid History</Text>
            {listing.bids.slice(0, 5).map((bid, i) => (
              <View key={bid.id} style={[styles.bidRow, i === 0 && styles.bidRowTop]}>
                <Text style={styles.bidBidderName}>{bid.bidder?.display_name || 'Anonymous'}</Text>
                <Text style={[styles.bidAmount, i === 0 && styles.bidAmountTop]}>
                  ${bid.amount.toFixed(2)}
                  {i === 0 && <Text style={styles.highestBadge}> ★ Highest</Text>}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        {listing.description && (
          <View style={styles.descSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descText}>{listing.description}</Text>
          </View>
        )}

        {/* Report */}
        <TouchableOpacity style={styles.reportLink} onPress={() => Alert.alert('Report', 'Report feature coming soon')}>
          <Text style={styles.reportLinkText}>🚩 Report this listing</Text>
        </TouchableOpacity>
      </View>

      {/* Bid Modal */}
      <Modal
        visible={bidModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBidModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Place a Bid</Text>
            <Text style={styles.modalSubtitle}>
              Current price: ${listing.current_price?.toFixed(2)} — bid must be higher
            </Text>

            {bidError ? <Text style={styles.modalError}>{bidError}</Text> : null}

            <View style={styles.bidInputRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.bidInput}
                value={bidAmount}
                onChangeText={setBidAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#666"
                autoFocus
              />
            </View>

            <Text style={styles.modalNote}>
              5% platform fee applies. Payment held in escrow until delivery confirmed.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setBidModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, bidLoading && styles.btnDisabled]}
                onPress={handlePlaceBid}
                disabled={bidLoading}
              >
                {bidLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirm Bid</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Offer Modal */}
      <Modal
        visible={offerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Make an Offer</Text>
            <Text style={styles.modalSubtitle}>Propose a fixed price to the seller</Text>

            {offerError ? <Text style={styles.modalError}>{offerError}</Text> : null}

            <View style={styles.bidInputRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.bidInput}
                value={offerAmount}
                onChangeText={setOfferAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#666"
              />
            </View>

            <TextInput
              style={[styles.bidInput, { marginTop: 10, paddingLeft: 14, minHeight: 72, textAlignVertical: 'top' }]}
              value={offerMessage}
              onChangeText={setOfferMessage}
              placeholder="Add a message to the seller (optional)"
              placeholderTextColor="#666"
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setOfferModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, offerLoading && styles.btnDisabled]}
                onPress={handleMakeOffer}
                disabled={offerLoading}
              >
                {offerLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Send Offer</Text>
                )}
              </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 24,
  },
  errorText: {
    color: '#e94560',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  carouselContainer: {
    width: SCREEN_WIDTH,
    height: 300,
    position: 'relative',
    backgroundColor: '#16213e',
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  noPhotoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    color: '#555',
    fontSize: 14,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 18,
  },
  verifiedOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#4caf50',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  statusOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusOverlayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  body: {
    padding: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  metaBadge: {
    backgroundColor: '#16213e',
    color: '#aaa',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  locationText: {
    color: '#888',
    fontSize: 13,
    alignSelf: 'center',
  },
  viewCount: {
    color: '#555',
    fontSize: 12,
    marginTop: 4,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  sellerAvatar: {
    marginRight: 10,
  },
  sellerAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  sellerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarInitials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  sellerRating: {
    color: '#FFD700',
    fontSize: 12,
  },
  sellerVerified: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sellerVerifiedText: {
    color: '#4caf50',
    fontSize: 11,
    fontWeight: '700',
  },
  aiEstimateCard: {
    backgroundColor: 'rgba(233,69,96,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(233,69,96,0.4)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiEstimateLabel: {
    color: '#e94560',
    fontSize: 13,
    fontWeight: '600',
  },
  aiEstimateRange: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pricingCard: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentPriceLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  currentPrice: {
    color: '#e94560',
    fontSize: 28,
    fontWeight: '800',
  },
  bidCount: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  timerContainer: {
    alignItems: 'flex-end',
  },
  timerLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 4,
  },
  buyNowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
    gap: 8,
  },
  buyNowLabel: {
    color: '#aaa',
    fontSize: 13,
  },
  buyNowPrice: {
    color: '#4caf50',
    fontWeight: '700',
    fontSize: 16,
  },
  actionButtons: {
    gap: 10,
    marginBottom: 16,
  },
  bidBtn: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  bidBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
  buyNowBtn: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  buyNowBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  offerBtn: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e94560',
  },
  offerBtnText: {
    color: '#e94560',
    fontWeight: '600',
    fontSize: 15,
  },
  loginToActBtn: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e94560',
  },
  loginToActBtnText: {
    color: '#e94560',
    fontWeight: '600',
  },
  bidHistory: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  bidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
  },
  bidRowTop: {
    backgroundColor: 'rgba(233,69,96,0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  bidBidderName: {
    color: '#bbb',
    fontSize: 14,
  },
  bidAmount: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  bidAmountTop: {
    color: '#e94560',
  },
  highestBadge: {
    color: '#e94560',
    fontSize: 11,
    fontWeight: '700',
  },
  descSection: {
    marginBottom: 16,
  },
  descText: {
    color: '#bbb',
    fontSize: 14,
    lineHeight: 22,
  },
  reportLink: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  reportLinkText: {
    color: '#555',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 16,
  },
  modalError: {
    color: '#e94560',
    fontSize: 13,
    marginBottom: 12,
    backgroundColor: 'rgba(233,69,96,0.1)',
    padding: 8,
    borderRadius: 6,
  },
  bidInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1e4a7a',
  },
  currencySymbol: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginRight: 8,
  },
  bidInput: {
    flex: 1,
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: 14,
    backgroundColor: '#0f3460',
  },
  modalNote: {
    color: '#555',
    fontSize: 11,
    marginTop: 10,
    lineHeight: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#0f3460',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#aaa',
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 2,
    backgroundColor: '#e94560',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
