import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';

export interface InputProps extends TextInputProps {
  error?: boolean;
}

export function Input({ error, style, ...props }: InputProps) {
  return (
    <TextInput
      style={[
        styles.input,
        error && styles.error,
        style
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  error: {
    borderColor: '#ef4444',
  },
});
