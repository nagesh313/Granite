import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { FormFieldProps } from '../../types/schema';

interface Option {
  label: string;
  value: string;
}

interface SelectProps extends FormFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
}

export function Select({
  label,
  value,
  onValueChange,
  options,
  error,
  touched,
  required = false,
  disabled = false,
}: SelectProps) {
  const [modalVisible, setModalVisible] = React.useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      
      <TouchableOpacity
        style={[
          styles.selectButton,
          error && touched && styles.errorInput,
          disabled && styles.disabled,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
      >
        <Text style={[styles.selectButtonText, !value && styles.placeholder]}>
          {selectedOption?.label || 'Select an option'}
        </Text>
      </TouchableOpacity>

      {error && touched && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={styles.optionsList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.option}
                  onPress={() => {
                    onValueChange(option.value);
                    setModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    option.value === value && styles.selectedOption
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  selectButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#000000',
  },
  placeholder: {
    color: '#9CA3AF',
  },
  errorInput: {
    borderColor: '#EF4444',
  },
  disabled: {
    backgroundColor: '#F3F4F6',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsList: {
    marginBottom: 16,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  optionText: {
    fontSize: 16,
  },
  selectedOption: {
    color: '#6366F1',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#6366F1',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
