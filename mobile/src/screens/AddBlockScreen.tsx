import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import type { RootStackScreenProps } from '@/types/navigation';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '@/config/api';

interface BlockFormData {
  blockNumber: string;
  blockType: string;
  marka: string;
  color: string;
  length: string;
  width: string;
  height: string;
  blockWeight: string;
  mineName: string;
  vehicleId: string;
  density: string;
  source: string;
  quality: string;
  description: string;
}

export const AddBlockScreen = ({ navigation }: RootStackScreenProps<'AddBlock'>) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BlockFormData>({
    blockNumber: '',
    blockType: '',
    marka: '',
    color: '',
    length: '',
    width: '',
    height: '',
    blockWeight: '',
    mineName: '',
    vehicleId: '',
    density: '2.7',
    source: '',
    quality: '',
    description: '',
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);
      console.log('[AddBlock] Submitting form data:', formData);

      const apiUrl = getFullApiUrl(API_ENDPOINTS.addBlock);
      console.log('[AddBlock] Submitting to URL:', apiUrl);

      const response = await fetchWithRetry(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          length: Number(formData.length),
          width: Number(formData.width),
          height: Number(formData.height),
          blockWeight: Number(formData.blockWeight),
          density: Number(formData.density),
          status: 'in_stock',
          dateReceived: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      console.log('[AddBlock] Success response:', data);

      Alert.alert(
        'Success',
        'Block added successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('[AddBlock] Error adding block:', error);
      Alert.alert(
        'Error',
        'Failed to add block. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label: string, key: keyof BlockFormData, keyboardType: 'default' | 'numeric' | 'email-address' = 'default', multiline: boolean = false) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput
        ]}
        value={formData[key]}
        onChangeText={(value) => setFormData(prev => ({ ...prev, [key]: value }))}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        placeholderTextColor="#9ca3af"
      />
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderInput('Block Number *', 'blockNumber')}
        {renderInput('Block Type *', 'blockType')}
        {renderInput('Company/Brand', 'marka')}
        {renderInput('Color', 'color')}
        {renderInput('Length (cm) *', 'length', 'numeric')}
        {renderInput('Width (cm) *', 'width', 'numeric')}
        {renderInput('Height (cm) *', 'height', 'numeric')}
        {renderInput('Weight (T) *', 'blockWeight', 'numeric')}
        {renderInput('Mine Name', 'mineName')}
        {renderInput('Vehicle ID', 'vehicleId')}
        {renderInput('Density', 'density', 'numeric')}
        {renderInput('Source', 'source')}
        {renderInput('Quality Grade', 'quality')}
        {renderInput('Description', 'description', 'default', true)}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Add Block</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  scrollContent: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#374151',
  },
});

export default AddBlockScreen;