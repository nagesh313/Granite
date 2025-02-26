import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { FormFieldProps } from '../../types/schema';

interface InputFieldProps extends FormFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  multiline?: boolean;
  numberOfLines?: number;
}

interface RenderFieldProps extends FormFieldProps {
  render: () => React.ReactElement;
  value?: string;
}

type Props = InputFieldProps | RenderFieldProps;

const isRenderProp = (props: Props): props is RenderFieldProps => {
  return 'render' in props;
};

export function FormField(props: Props) {
  const {
    label,
    error,
    touched,
    required = false,
    disabled = false,
  } = props;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>

      {isRenderProp(props) ? (
        props.render()
      ) : (
        <TextInput
          style={[
            styles.input,
            error && touched && styles.errorInput,
            props.multiline && { height: 24 * (props.numberOfLines || 1) },
          ]}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          keyboardType={props.keyboardType}
          editable={!disabled}
          multiline={props.multiline}
          numberOfLines={props.numberOfLines}
        />
      )}

      {error && touched && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#374151',
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  errorInput: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 4,
  },
});