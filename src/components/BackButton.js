import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BackButton({ onPress, color, size, style }) {
  return (
    <TouchableOpacity
      style={[styles.backBtn, style]}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-back" size={size || 24} color={color || '#fff'} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
