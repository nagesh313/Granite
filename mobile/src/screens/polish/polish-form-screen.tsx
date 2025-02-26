import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import type { RootStackScreenProps } from '@/types/navigation';
import { PolishForm } from '@/components/polish/polish-form';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '@/config/api';
import type { BaseProductionJob, Machine } from '@/types/schema';

export const PolishFormScreen: React.FC<RootStackScreenProps<'PolishForm'>> = ({ 
  route,
  navigation 
}) => {
  const { machines, initialData } = route.params;
  const isEditMode = !!initialData?.id;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      console.log('[PolishForm] Submitting data:', data);

      const method = isEditMode ? 'PATCH' : 'POST';
      const url = isEditMode 
        ? getFullApiUrl(`${API_ENDPOINTS.productionJobs}/${initialData.id}`) 
        : getFullApiUrl(API_ENDPOINTS.productionJobs);

      const formattedData = {
        ...data,
        stage: 'polishing' as const,
        measurements: {
          stoppageReason: data.measurements?.stoppageReason || 'none',
          polishingTime: data.measurements?.polishingTime || 0,
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

      console.log('[PolishForm] Formatted data:', formattedData);

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

      console.log('[PolishForm] Submission successful:', response);
      navigation.goBack();
    } catch (error) {
      console.error('[PolishForm] Submission error:', error);
      Alert.alert(
        'Error',
        'Failed to submit polish job. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <PolishForm
        onSubmit={handleSubmit}
        initialData={{
          stage: 'polishing' as const,
          measurements: {
            stoppageReason: 'none',
            polishingTime: 0,
            stoppageStartTime: null,
            stoppageEndTime: null,
            maintenanceReason: '',
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

export default PolishFormScreen;