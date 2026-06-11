import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ComparableItem {
  name: string;
  price: number;
  source?: string;
}

interface PriceRange {
  low: number;
  mid: number;
  high: number;
  insight?: string;
}

interface SellRange {
  low: number;
  high: number;
  sweet_spot: number;
}

export interface AIEstimate {
  spend_price: number | null;
  buyers_value: PriceRange;
  current_value: PriceRange;
  sell_price_range: SellRange;
  confidence: 'low' | 'medium' | 'high';
  depreciation_pct: number;
  condition_assessment: string;
  reasoning: string;
  market_trend: 'rising' | 'stable' | 'falling';
  suggested_starting_price: number;
  suggested_buy_now_price: number;
  comparable_items: ComparableItem[];
  // Legacy flat fields (backward compat)
  estimated_market_value_low?: number;
  estimated_market_value_mid?: number;
  estimated_market_value_high?: number;
}

interface Props {
  estimate: AIEstimate;
}

const CONFIDENCE_CONFIG = {
  high:   { color: '#10b981', label: 'High Confidence',   icon: 'shield-checkmark' },
  medium: { color: '#f59e0b', label: 'Medium Confidence', icon: 'alert-circle' },
  low:    { color: '#e94560', label: 'Low Confidence',    icon: 'help-circle' },
};

const TREND_CONFIG = {
  rising:  { color: '#10b981', icon: 'trending-up',   label: 'Market Rising' },
  stable:  { color: '#a0a0b8', icon: 'remove',        label: 'Market Stable' },
  falling: { color: '#e94560', icon: 'trending-down', label: 'Market Falling' },
};

function fmt(n?: number | null) {
  if (n == null || isNaN(n)) return 'R—';
  return `R${Math.round(n).toLocaleString('en-ZA')}`;
}

function PhaseRow({
  phaseNum,
  label,
  sublabel,
  color,
  low,
  mid,
  high,
  insight,
  highlight,
}: {
  phaseNum: number;
  label: string;
  sublabel: string;
  color: string;
  low: number;
  mid: number;
  high: number;
  insight?: string;
  highlight?: boolean;
}) {
  return (
    <View style={[phaseStyles.row, highlight && phaseStyles.rowHighlight, { borderLeftColor: color }]}>
      <View style={phaseStyles.header}>
        <View style={[phaseStyles.badge, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={[phaseStyles.badgeNum, { color }]}>{phaseNum}</Text>
        </View>
        <View style={phaseStyles.labelBlock}>
          <Text style={phaseStyles.label}>{label}</Text>
          <Text style={phaseStyles.sublabel}>{sublabel}</Text>
        </View>
        <Text style={[phaseStyles.midPrice, { color }]}>{fmt(mid)}</Text>
      </View>
      <View style={phaseStyles.rangeRow}>
        <Text style={phaseStyles.rangeLabel}>{fmt(low)}</Text>
        <View style={phaseStyles.track}>
          <View style={[phaseStyles.fill, { backgroundColor: color + '40', width: '100%' }]} />
          <View
            style={[
              phaseStyles.fillSolid,
              {
                backgroundColor: color,
                width: `${Math.min(100, Math.max(5, ((mid - low) / (high - low || 1)) * 100))}%`,
              },
            ]}
          />
        </View>
        <Text style={phaseStyles.rangeLabel}>{fmt(high)}</Text>
      </View>
      {insight ? <Text style={phaseStyles.insight}>{insight}</Text> : null}
    </View>
  );
}

const phaseStyles = StyleSheet.create({
  row: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 13,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e94560',
    borderWidth: 1,
    borderColor: '#252538',
  },
  rowHighlight: {
    backgroundColor: '#13131f',
    borderColor: '#333355',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeNum: {
    fontSize: 12,
    fontWeight: '800',
  },
  labelBlock: {
    flex: 1,
  },
  label: {
    color: '#f1f1f1',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  sublabel: {
    color: '#4a4a6a',
    fontSize: 10,
    marginTop: 1,
  },
  midPrice: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  rangeLabel: {
    color: '#4a4a6a',
    fontSize: 10,
    fontWeight: '600',
    minWidth: 42,
    textAlign: 'center',
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#252538',
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 3,
  },
  fillSolid: {
    position: 'absolute',
    height: '100%',
    borderRadius: 3,
  },
  insight: {
    color: '#a0a0b8',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default function AIEstimateCard({ estimate }: Props) {
  const [expanded, setExpanded] = useState(false);

  const conf = CONFIDENCE_CONFIG[estimate.confidence] || CONFIDENCE_CONFIG.medium;
  const trend = TREND_CONFIG[estimate.market_trend] || TREND_CONFIG.stable;

  // Normalise legacy flat shape
  const buyers: PriceRange = estimate.buyers_value || {
    low: estimate.estimated_market_value_low || 0,
    mid: estimate.estimated_market_value_mid || 0,
    high: estimate.estimated_market_value_high || 0,
  };
  const current: PriceRange = estimate.current_value || buyers;
  const sell: SellRange = estimate.sell_price_range || {
    low: estimate.suggested_starting_price || buyers.low,
    high: estimate.suggested_buy_now_price || buyers.high,
    sweet_spot: buyers.mid,
  };
  const spendPrice = estimate.spend_price;
  const deprPct = estimate.depreciation_pct;

  return (
    <View style={styles.card}>
      {/* Header bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.aiChip}>
            <Text style={styles.aiChipText}>AI</Text>
          </View>
          <Text style={styles.topBarTitle}>4-Phase Valuation</Text>
        </View>
        <View style={styles.topBarRight}>
          <View style={[styles.trendChip, { borderColor: trend.color + '55' }]}>
            <Ionicons name={trend.icon as any} size={11} color={trend.color} />
            <Text style={[styles.trendText, { color: trend.color }]}>{trend.label}</Text>
          </View>
          <View style={[styles.confChip, { borderColor: conf.color + '55' }]}>
            <View style={[styles.confDot, { backgroundColor: conf.color }]} />
            <Text style={[styles.confText, { color: conf.color }]}>{estimate.confidence}</Text>
          </View>
        </View>
      </View>

      {/* Sweet spot hero */}
      <View style={styles.heroBox}>
        <Text style={styles.heroLabel}>BEST SELL PRICE</Text>
        <Text style={styles.heroPrice}>{fmt(sell.sweet_spot)}</Text>
        <Text style={styles.heroRange}>Range: {fmt(sell.low)} – {fmt(sell.high)}</Text>
        {spendPrice != null && deprPct != null && (
          <View style={styles.deprRow}>
            <Text style={styles.deprText}>
              Paid {fmt(spendPrice)} · lost approx {Math.round(deprPct)}% value
            </Text>
          </View>
        )}
      </View>

      {/* 4 Phase rows */}
      {spendPrice != null && (
        <PhaseRow
          phaseNum={1}
          label="Spend Price"
          sublabel="What you originally paid"
          color="#6366f1"
          low={spendPrice * 0.95}
          mid={spendPrice}
          high={spendPrice * 1.05}
        />
      )}

      <PhaseRow
        phaseNum={2}
        label="Buyers Value"
        sublabel="Market research — what buyers pay"
        color="#f59e0b"
        low={buyers.low}
        mid={buyers.mid}
        high={buyers.high}
        insight={buyers.insight}
      />

      <PhaseRow
        phaseNum={3}
        label="Current Value"
        sublabel="AI · photos · condition · your answers"
        color="#e94560"
        low={current.low}
        mid={current.mid}
        high={current.high}
        insight={current.insight}
        highlight
      />

      <PhaseRow
        phaseNum={4}
        label="Potential Sell Price"
        sublabel="Realistic listing range for a quick sale"
        color="#10b981"
        low={sell.low}
        mid={sell.sweet_spot}
        high={sell.high}
      />

      {/* Expandable detail */}
      <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded(v => !v)}>
        <Text style={styles.expandBtnText}>{expanded ? 'Hide details' : 'Show details'}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#4a4a6a" />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.detail}>
          {estimate.condition_assessment ? (
            <View style={styles.detailRow}>
              <Ionicons name="eye-outline" size={13} color="#a0a0b8" style={{ marginTop: 1 }} />
              <Text style={styles.detailText}>{estimate.condition_assessment}</Text>
            </View>
          ) : null}

          {estimate.reasoning ? (
            <View style={styles.detailRow}>
              <Ionicons name="bulb-outline" size={13} color="#a0a0b8" style={{ marginTop: 1 }} />
              <Text style={styles.detailText}>{estimate.reasoning}</Text>
            </View>
          ) : null}

          {estimate.comparable_items && estimate.comparable_items.length > 0 && (
            <View style={styles.comparables}>
              <Text style={styles.comparablesTitle}>Comparable Sales</Text>
              {estimate.comparable_items.slice(0, 4).map((item, i) => (
                <View key={i} style={styles.comparableRow}>
                  <Text style={styles.comparableName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.comparableRight}>
                    {item.source ? <Text style={styles.comparableSource}>{item.source}</Text> : null}
                    <Text style={styles.comparablePrice}>{fmt(item.price)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#13131f',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#252538',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiChip: {
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  aiChipText: {
    color: '#f97316',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  topBarTitle: {
    color: '#f1f1f1',
    fontSize: 14,
    fontWeight: '700',
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  confChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },
  confDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  confText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  heroLabel: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroPrice: {
    color: '#10b981',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 4,
  },
  heroRange: {
    color: '#4a4a6a',
    fontSize: 12,
    fontWeight: '600',
  },
  deprRow: {
    marginTop: 8,
    backgroundColor: 'rgba(233,69,96,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deprText: {
    color: '#e94560',
    fontSize: 11,
    fontWeight: '600',
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    marginTop: 2,
  },
  expandBtnText: {
    color: '#4a4a6a',
    fontSize: 12,
    fontWeight: '600',
  },
  detail: {
    borderTopWidth: 1,
    borderTopColor: '#252538',
    paddingTop: 12,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-start',
  },
  detailText: {
    color: '#a0a0b8',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  comparables: {
    marginTop: 4,
  },
  comparablesTitle: {
    color: '#4a4a6a',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  comparableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c2e',
  },
  comparableName: {
    color: '#a0a0b8',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  comparableRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  comparableSource: {
    color: '#4a4a6a',
    fontSize: 9,
    fontWeight: '600',
  },
  comparablePrice: {
    color: '#f1f1f1',
    fontSize: 13,
    fontWeight: '700',
  },
});
