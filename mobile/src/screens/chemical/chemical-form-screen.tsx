import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import type { RootStackScreenProps } from '@/types/navigation';
import { ChemicalForm } from '@/components/chemical/chemical-form';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '@/config/api';
import type { ChemicalJobFormData } from '@/types/schema';

export const ChemicalFormScreen: React.FC<RootStackScreenProps<'ChemicalForm'>> = ({ 
  route,
  navigation 
}) => {
  const { initialData } = route.params;
  const isEditMode = !!initialData?.id;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (data: ChemicalJobFormData) => {
    try {
      setIsSubmitting(true);
      console.log('[ChemicalForm] Submitting data:', JSON.stringify(data, null, 2));

      const method = isEditMode ? 'PATCH' : 'POST';
      const url = isEditMode 
        ? getFullApiUrl(`${API_ENDPOINTS.productionJobs}/${initialData.id}`) 
        : getFullApiUrl(API_ENDPOINTS.productionJobs);

      console.log('[ChemicalForm] Request URL:', url);
      console.log('[ChemicalForm] Request method:', method);

      // Ensure measurements object matches the schema
      const formattedData = {
        ...data,
        stage: 'chemical_conversion' as const,
        measurements: {
          stoppageReason: data.measurements?.stoppageReason || 'none',
          solution: data.measurements?.solution || 'Honed',
          pieces: data.measurements?.pieces || 0,
          totalArea: data.measurements?.totalArea || '',
          stoppageStartTime: data.measurements?.stoppageStartTime 
            ? new Date(data.measurements.stoppageStartTime).toISOString()
            : null,
          stoppageEndTime: data.measurements?.stoppageEndTime
            ? new Date(data.measurements.stoppageEndTime).toISOString()
            : null,
          maintenanceReason: data.measurements?.maintenanceReason || null,
        },
        startTime: new Date(data.startTime).toISOString(),
        endTime: data.endTime ? new Date(data.endTime).toISOString() : null,
        status: data.status || 'pending',
        comments: data.comments || '',
        qualityCheckStatus: data.qualityCheckStatus || 'pending',
        processedPieces: data.processedPieces || 0,
      };

      console.log('[ChemicalForm] Formatted request data:', JSON.stringify(formattedData, null, 2));

      const response = await fetchWithRetry(
        url,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedData),
        }
      );

      console.log('[ChemicalForm] API Response:', JSON.stringify(response, null, 2));

      if (!response) {
        throw new Error('No response received from server');
      }

      if (response.error) {
        throw new Error(response.error);
      }

      Alert.alert(
        'Success',
        isEditMode ? 'Chemical job updated successfully' : 'Chemical job created successfully',
        [{ text: 'OK' }]
      );

      navigation.goBack();
    } catch (error) {
      console.error('[ChemicalForm] Submission error:', error);
      Alert.alert(
        'Error',
        `Failed to ${isEditMode ? 'update' : 'create'} chemical job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ChemicalForm
        onSubmit={handleSubmit}
        initialData={{
          stage: 'chemical_conversion' as const,
          measurements: {
            stoppageReason: 'none',
            solution: 'Honed',
            pieces: 0,
            totalArea: initialData?.measurements?.totalArea || '',
          },
          ...initialData
        }}
        isSubmitting={isSubmitting}
        isEditMode={isEditMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});

export default ChemicalFormScreen;