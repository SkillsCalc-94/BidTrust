import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CountdownTimer from './CountdownTimer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 36) / 2;
const IMAGE_HEIGHT = CARD_WIDTH * 1.1;

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    current_price: number;
    starting_price: number;
    buy_now_price: number | null;
    auction_end_time: string;
    status: string;
    verified: boolean;
    listing_photos?: Array<{ url: string; is_primary: boolean; sort_order: number }>;
    bids?: any;
    seller?: { full_name: string | null } | null;
  };
  onPress: () => void;
}

export default function ListingCard({ listing, onPress }: ListingCardProps) {
  const primaryPhoto =
    listing.listing_photos?.find((p) => p.is_primary) ||
    listing.listing_photos?.[0];

  const bidCount = Array.isArray(listing.bids)
    ? listing.bids[0]?.count ?? listing.bids.length
    : typeof listing.bids === 'number'
    ? listing.bids
    : 0;

  const isEnded = new Date(listing.auction_end_time) <= new Date();
  const msLeft = new Date(listing.auction_end_time).getTime() - Date.now();
  const isUrgent = msLeft > 0 && msLeft < 60 * 60 * 1000;

  const sellerFirst = listing.seller?.full_name?.split(' ')[0] || null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Full-bleed image */}
      <View style={styles.imageContainer}>
        {primaryPhoto ? (
          <Image
            source={{ uri: primaryPhoto.url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="camera-outline" size={32} color="#4a4a6a" />
            <Text style={styles.placeholderText}>No Photo</Text>
          </View>
        )}

        {/* Dark gradient overlay at bottom (simulated with multiple views) */}
        <View style={styles.overlayFade1} />
        <View style={styles.overlayFade2} />
        <View style={styles.imageOverlay} />

        {/* Price overlay bottom-left */}
        <View style={styles.priceOverlay}>
          <Text style={styles.priceCurrency}>$</Text>
          <Text style={styles.priceOverlayText}>
            {(listing.current_price || listing.starting_price).toFixed(0)}
          </Text>
        </View>

        {/* Time badge top-right */}
        {!isEnded && (
          <View style={[styles.timeBadge, isUrgent && styles.timeBadgeUrgent]}>
            <Ionicons name="time-outline" size={9} color="#fff" />
            <CountdownTimer endTime={listing.auction_end_time} compact />
          </View>
        )}

        {/* BUY NOW badge top-left */}
        {listing.buy_now_price && (
          <View style={styles.buyNowBadge}>
            <Text style={styles.buyNowBadgeText}>BUY NOW</Text>
          </View>
        )}

        {/* Verified badge */}
        {listing.verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark" size={9} color="#fff" />
          </View>
        )}

        {isEnded && (
          <View style={styles.endedOverlay}>
            <Text style={styles.endedOverlayText}>ENDED</Text>
          </View>
        )}
      </View>

      {/* Info section */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>

        <View style={styles.footer}>
          <View style={styles.bidRow}>
            <Ionicons name="hammer-outline" size={11} color="#4a4a6a" />
            <Text style={styles.bidCount}>
              {bidCount} bid{bidCount !== 1 ? 's' : ''}
            </Text>
          </View>
          {sellerFirst && (
            <View style={styles.sellerRow}>
              <Ionicons name="person-outline" size={9} color="#4a4a6a" />
              <Text style={styles.sellerName}>{sellerFirst}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#13131f',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#252538',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#1c1c2e',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c2e',
    gap: 6,
  },
  placeholderText: {
    color: '#4a4a6a',
    fontSize: 10,
    fontWeight: '600',
  },
  overlayFade1: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(13,13,20,0.4)',
  },
  overlayFade2: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '25%',
    backgroundColor: 'rgba(13,13,20,0.45)',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '20%',
    backgroundColor: 'rgba(13,13,20,0.5)',
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
  },
  priceCurrency: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  priceOverlayText: {
    color: '#f59e0b',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  timeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  timeBadgeUrgent: {
    backgroundColor: '#e94560',
  },
  buyNowBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#e94560',
    borderRadius: 24,
    paddingHorizontal: 7,
    paddingVertical: 3,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  buyNowBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#10b981',
    borderRadius: 9999,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#13131f',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  endedOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endedOverlayText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 3,
  },
  info: {
    padding: 10,
    paddingTop: 9,
    paddingBottom: 11,
  },
  title: {
    color: '#f1f1f1',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bidCount: {
    color: '#4a4a6a',
    fontSize: 11,
    fontWeight: '500',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sellerName: {
    color: '#4a4a6a',
    fontSize: 11,
  },
});
