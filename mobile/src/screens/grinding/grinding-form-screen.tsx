import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import type { RootStackScreenProps } from '@/types/navigation';
import { GrindingForm } from '@/components/grinding/grinding-form';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '@/config/api';
import type { GrindingJobFormData, Machine } from '@/types/schema';

export const GrindingFormScreen: React.FC<RootStackScreenProps<'GrindingForm'>> = ({ 
  route,
  navigation 
}) => {
  const { machines, initialData } = route.params;
  const isEditMode = !!initialData?.id;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (data: GrindingJobFormData) => {
    try {
      setIsSubmitting(true);
      console.log('[GrindingForm] Submitting data:', data);

      const method = isEditMode ? 'PATCH' : 'POST';
      const url = isEditMode 
        ? getFullApiUrl(`${API_ENDPOINTS.productionJobs}/${initialData.id}`) 
        : getFullApiUrl(API_ENDPOINTS.productionJobs);

      const formattedData = {
        ...data,
        stage: 'grinding' as const,
        measurements: {
          stoppageReason: data.measurements?.stoppageReason || 'none',
          finish: data.measurements?.finish || 'Normal',
          pieces: data.measurements?.pieces || 0,
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
      };

      console.log('[GrindingForm] Formatted data:', formattedData);

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

      console.log('[GrindingForm] Submission successful:', response);
      navigation.goBack();
    } catch (error) {
      console.error('[GrindingForm] Submission error:', error);
      Alert.alert(
        'Error',
        'Failed to submit grinding job. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <GrindingForm
        onSubmit={handleSubmit}
        initialData={{
          stage: 'grinding' as const,
          measurements: {
            stoppageReason: 'none',
            finish: 'Normal',
            pieces: 0,
          },
          ...initialData
        }}
        machines={machines}
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

export default GrindingFormScreen;