import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

interface PriceInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  editable?: boolean;
}

export default function PriceInput({
  value,
  onChangeText,
  placeholder = '0.00',
  label,
  editable = true,
}: PriceInputProps) {
  function handleChange(text: string) {
    // Allow only valid price input: digits and up to 2 decimal places
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    onChangeText(cleaned);
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputRow}>
        <Text style={styles.currency}>$</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#666"
          editable={editable}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  currency: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 12,
  },
});
