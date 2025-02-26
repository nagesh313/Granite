import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

export interface CustomTextProps extends TextProps {
  variant?: 'default' | 'heading' | 'subheading' | 'caption';
}

export function Text({ variant = 'default', style, ...props }: CustomTextProps) {
  return (
    <RNText 
      style={[
        styles.text,
        styles[variant],
        style
      ]} 
      {...props} 
    />
  );
}

const styles = StyleSheet.create({
  text: {
    color: '#000',
    fontSize: 14,
  },
  default: {},
  heading: {
    fontSize: 24,
    fontWeight: '600',
  },
  subheading: {
    fontSize: 18,
    fontWeight: '500',
  },
  caption: {
    fontSize: 12,
    color: '#64748b',
  },
});
