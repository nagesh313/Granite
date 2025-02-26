import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, TouchableOpacityProps } from 'react-native';

export interface ButtonProps extends TouchableOpacityProps {
  title?: string;
  loading?: boolean;
  variant?: 'default' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

export function Button({ 
  title,
  loading,
  variant = 'default',
  size = 'default',
  style,
  disabled,
  children,
  ...props 
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#000' : '#fff'} />
      ) : (
        <>
          {title && (
            <Text style={[
              styles.text,
              variant === 'outline' && styles.outlineText,
            ]}>
              {title}
            </Text>
          )}
          {children}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  default: {
    backgroundColor: '#000',
  },
  destructive: {
    backgroundColor: '#ef4444',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  outlineText: {
    color: '#000',
  },
  sm: {
    height: 32,
    paddingHorizontal: 12,
  },
  lg: {
    height: 48,
    paddingHorizontal: 24,
  },
  disabled: {
    opacity: 0.5,
  },
});
