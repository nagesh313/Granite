import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { FormFieldProps } from '../../types/schema';

interface DateTimePickerProps extends FormFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
}

export function CustomDateTimePicker({
  label,
  value,
  onChange,
  error,
  touched,
  required = false,
  disabled = false,
  mode = 'datetime',
}: DateTimePickerProps) {
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(value);
  const [step, setStep] = React.useState<'date' | 'time'>(mode === 'datetime' ? 'date' : mode as 'date' | 'time');

  const handleConfirm = () => {
    onChange(selectedDate);
    setIsModalVisible(false);
    setStep('date');
  };

  const handleDateChange = (amount: number, unit: 'year' | 'month' | 'day' | 'hour' | 'minute') => {
    const newDate = new Date(selectedDate);
    switch (unit) {
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + amount);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + amount);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + amount);
        break;
      case 'hour':
        newDate.setHours(newDate.getHours() + amount);
        break;
      case 'minute':
        newDate.setMinutes(newDate.getMinutes() + amount);
        break;
    }
    setSelectedDate(newDate);
  };

  const formatDateTime = (date: Date) => {
    if (mode === 'date') {
      return date.toLocaleDateString();
    } else if (mode === 'time') {
      return date.toLocaleTimeString();
    }
    return date.toLocaleString();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          error && touched && styles.errorInput,
          disabled && styles.disabled,
        ]}
        onPress={() => !disabled && setIsModalVisible(true)}
        disabled={disabled}
      >
        <Text style={[styles.buttonText, disabled && styles.disabledText]}>
          {formatDateTime(value)}
        </Text>
      </TouchableOpacity>

      {error && touched && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {step === 'date' ? 'Select Date' : 'Select Time'}
            </Text>

            <ScrollView style={styles.pickerContainer}>
              {step === 'date' ? (
                <View>
                  <View style={styles.row}>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleDateChange(-1, 'year')}
                    >
                      <Text style={styles.adjustButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.valueText}>
                      {selectedDate.getFullYear()}
                    </Text>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleDateChange(1, 'year')}
                    >
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.row}>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleDateChange(-1, 'month')}
                    >
                      <Text style={styles.adjustButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.valueText}>
                      {selectedDate.getMonth() + 1}
                    </Text>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleDateChange(1, 'month')}
                    >
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.row}>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleDateChange(-1, 'day')}
                    >
                      <Text style={styles.adjustButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.valueText}>
                      {selectedDate.getDate()}
                    </Text>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleDateChange(1, 'day')}
                    >
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <View style={styles.row}>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleDateChange(-1, 'hour')}
                    >
                      <Text style={styles.adjustButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.valueText}>
                      {selectedDate.getHours().toString().padStart(2, '0')}
                    </Text>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleDateChange(1, 'hour')}
                    >
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.row}>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleDateChange(-1, 'minute')}
                    >
                      <Text style={styles.adjustButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.valueText}>
                      {selectedDate.getMinutes().toString().padStart(2, '0')}
                    </Text>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleDateChange(1, 'minute')}
                    >
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.buttonContainer}>
              {mode === 'datetime' && step === 'date' && (
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => setStep('time')}
                >
                  <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
              )}

              {(mode !== 'datetime' || step === 'time') && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                >
                  <Text style={styles.buttonText}>Confirm</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsModalVisible(false);
                  setStep('date');
                  setSelectedDate(value);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
  button: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  buttonText: {
    fontSize: 16,
    color: '#000000',
  },
  disabledText: {
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
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  adjustButton: {
    backgroundColor: '#6366F1',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  adjustButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 20,
    fontWeight: '600',
    width: 60,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nextButton: {
    backgroundColor: '#6366F1',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  confirmButton: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
});