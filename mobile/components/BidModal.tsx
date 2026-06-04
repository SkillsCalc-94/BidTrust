import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface BidModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  currentPrice: number;
  mode?: 'bid' | 'offer';
  title?: string;
}

export default function BidModal({
  visible,
  onClose,
  onSubmit,
  currentPrice,
  mode = 'bid',
  title,
}: BidModalProps) {
  const [amount, setAmount] = useState(
    mode === 'bid' ? String(Math.ceil(currentPrice + 1)) : ''
  );
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const minAmount = mode === 'bid' ? currentPrice + 0.01 : 0;

  async function handleSubmit() {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (mode === 'bid' && parsed <= currentPrice) {
      setError(`Bid must be higher than $${currentPrice.toFixed(2)}`);
      return;
    }

    setError('');
    setLoading(true);
    try {
      await onSubmit(parsed);
      setAmount(mode === 'bid' ? String(Math.ceil(currentPrice + 1)) : '');
      setMessage('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setError('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

        <View style={styles.card}>
          <Text style={styles.modalTitle}>
            {title || (mode === 'bid' ? 'Place a Bid' : 'Make an Offer')}
          </Text>
          <Text style={styles.modalSubtitle}>
            {mode === 'bid'
              ? `Current price: $${currentPrice.toFixed(2)} — enter a higher amount`
              : 'Propose a fixed price to the seller'}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Amount input */}
          <View style={styles.amountRow}>
            <Text style={styles.currency}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(text) => {
                const clean = text.replace(/[^0-9.]/g, '');
                setAmount(clean);
              }}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#555"
              autoFocus
            />
          </View>

          {mode === 'offer' && (
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Add a message (optional)"
              placeholderTextColor="#555"
              multiline
              numberOfLines={3}
            />
          )}

          <Text style={styles.noteText}>
            {mode === 'bid'
              ? '5% platform fee applies. Funds held securely in escrow.'
              : 'Seller will be notified and can accept or decline.'}
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>
                  {mode === 'bid' ? 'Confirm Bid' : 'Send Offer'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(233,69,96,0.12)',
    borderWidth: 1,
    borderColor: '#e94560',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#e94560',
    fontSize: 13,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e4a7a',
  },
  currency: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    paddingVertical: 14,
  },
  messageInput: {
    backgroundColor: '#0f3460',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1e4a7a',
    marginBottom: 12,
    minHeight: 76,
    textAlignVertical: 'top',
  },
  noteText: {
    color: '#555',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#aaa',
    fontWeight: '600',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
