import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ComparableItem {
  name: string;
  price: number;
}

interface AIEstimate {
  estimated_market_value_low: number;
  estimated_market_value_mid: number;
  estimated_market_value_high: number;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  suggested_starting_price: number;
  suggested_buy_now_price: number;
  condition_assessment: string;
  comparable_items: ComparableItem[];
}

interface AIEstimateCardProps {
  estimate: AIEstimate;
}

const CONFIDENCE_COLORS = {
  high: '#4caf50',
  medium: '#ff9800',
  low: '#f44336',
};

const CONFIDENCE_LABELS = {
  high: 'High Confidence',
  medium: 'Medium Confidence',
  low: 'Low Confidence',
};

export default function AIEstimateCard({ estimate }: AIEstimateCardProps) {
  const confidenceColor = CONFIDENCE_COLORS[estimate.confidence] || '#888';
  const confidenceLabel = CONFIDENCE_LABELS[estimate.confidence] || estimate.confidence;

  // Price range bar
  const low = estimate.estimated_market_value_low || 0;
  const mid = estimate.estimated_market_value_mid || 0;
  const high = estimate.estimated_market_value_high || 1;
  const rangeWidth = high - low || 1;
  const midPercent = ((mid - low) / rangeWidth) * 100;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✨ AI Market Estimate</Text>
        <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + '22', borderColor: confidenceColor }]}>
          <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
          <Text style={[styles.confidenceText, { color: confidenceColor }]}>{confidenceLabel}</Text>
        </View>
      </View>

      {/* Price Range */}
      <View style={styles.priceRange}>
        <View style={styles.priceEndpoint}>
          <Text style={styles.priceEndpointLabel}>Low</Text>
          <Text style={styles.priceEndpointValue}>${low.toFixed(0)}</Text>
        </View>

        <View style={styles.rangeBarContainer}>
          <View style={styles.rangeBar}>
            <View style={[styles.rangeBarFill, { width: `${midPercent}%` }]} />
            <View style={styles.rangeBarMidDot} />
          </View>
          <Text style={styles.midPrice}>${mid.toFixed(0)}</Text>
        </View>

        <View style={styles.priceEndpoint}>
          <Text style={styles.priceEndpointLabel}>High</Text>
          <Text style={styles.priceEndpointValue}>${high.toFixed(0)}</Text>
        </View>
      </View>

      {/* Suggested Prices */}
      <View style={styles.suggestedRow}>
        <View style={styles.suggestedItem}>
          <Text style={styles.suggestedLabel}>Suggested Start</Text>
          <Text style={styles.suggestedValue}>${estimate.suggested_starting_price?.toFixed(0)}</Text>
        </View>
        <View style={styles.suggestedDivider} />
        <View style={styles.suggestedItem}>
          <Text style={styles.suggestedLabel}>Buy Now</Text>
          <Text style={styles.suggestedValueBuyNow}>${estimate.suggested_buy_now_price?.toFixed(0)}</Text>
        </View>
      </View>

      {/* Condition Assessment */}
      {estimate.condition_assessment && (
        <View style={styles.conditionRow}>
          <Text style={styles.conditionLabel}>Condition: </Text>
          <Text style={styles.conditionValue}>{estimate.condition_assessment}</Text>
        </View>
      )}

      {/* Reasoning */}
      {estimate.reasoning && (
        <Text style={styles.reasoning}>{estimate.reasoning}</Text>
      )}

      {/* Comparable Items */}
      {estimate.comparable_items && estimate.comparable_items.length > 0 && (
        <View style={styles.comparables}>
          <Text style={styles.comparablesTitle}>Comparable Sales</Text>
          {estimate.comparable_items.slice(0, 3).map((item, i) => (
            <View key={i} style={styles.comparableRow}>
              <Text style={styles.comparableName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.comparablePrice}>${item.price?.toFixed(0)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f1e3a',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(233,69,96,0.25)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    gap: 4,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceRange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  priceEndpoint: {
    alignItems: 'center',
    minWidth: 44,
  },
  priceEndpointLabel: {
    color: '#666',
    fontSize: 10,
    marginBottom: 2,
  },
  priceEndpointValue: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
  rangeBarContainer: {
    flex: 1,
    alignItems: 'center',
  },
  rangeBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#1e3a5f',
    borderRadius: 3,
    marginBottom: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  rangeBarFill: {
    height: '100%',
    backgroundColor: '#e94560',
    borderRadius: 3,
  },
  rangeBarMidDot: {
    position: 'absolute',
    top: -2,
    left: '50%',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e94560',
    marginLeft: -5,
    borderWidth: 2,
    borderColor: '#0f1e3a',
  },
  midPrice: {
    color: '#e94560',
    fontSize: 18,
    fontWeight: '800',
  },
  suggestedRow: {
    flexDirection: 'row',
    backgroundColor: '#162040',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  suggestedItem: {
    flex: 1,
    alignItems: 'center',
  },
  suggestedDivider: {
    width: 1,
    backgroundColor: '#1e3a5f',
    marginVertical: 4,
  },
  suggestedLabel: {
    color: '#666',
    fontSize: 10,
    marginBottom: 3,
  },
  suggestedValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  suggestedValueBuyNow: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: '700',
  },
  conditionRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  conditionLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  conditionValue: {
    color: '#bbb',
    fontSize: 12,
    flex: 1,
  },
  reasoning: {
    color: '#888',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  comparables: {
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    paddingTop: 10,
  },
  comparablesTitle: {
    color: '#666',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  comparableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  comparableName: {
    color: '#aaa',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  comparablePrice: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
