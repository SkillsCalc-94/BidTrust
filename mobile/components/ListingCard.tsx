import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import CountdownTimer from './CountdownTimer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 36) / 2; // 2 columns with padding

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

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Image */}
      <View style={styles.imageContainer}>
        {primaryPhoto ? (
          <Image
            source={{ uri: primaryPhoto.url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>📷</Text>
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgesContainer}>
          {listing.buy_now_price && (
            <View style={styles.buyNowBadge}>
              <Text style={styles.buyNowBadgeText}>Buy Now</Text>
            </View>
          )}
          {listing.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓</Text>
            </View>
          )}
        </View>

        {isEnded && (
          <View style={styles.endedOverlay}>
            <Text style={styles.endedOverlayText}>ENDED</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        <Text style={styles.price}>
          ${(listing.current_price || listing.starting_price).toFixed(2)}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.bidCount}>
            {bidCount} bid{bidCount !== 1 ? 's' : ''}
          </Text>
          {!isEnded && (
            <CountdownTimer endTime={listing.auction_end_time} compact />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#16213e',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: CARD_WIDTH * 0.75,
    backgroundColor: '#0f3460',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 32,
  },
  badgesContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    gap: 4,
  },
  buyNowBadge: {
    backgroundColor: '#4caf50',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  buyNowBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  verifiedBadge: {
    backgroundColor: '#2196f3',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  verifiedBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  endedOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endedOverlayText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 2,
  },
  info: {
    padding: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 6,
    minHeight: 36,
  },
  price: {
    color: '#e94560',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidCount: {
    color: '#888',
    fontSize: 11,
  },
});
