import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CuttingForm } from '../../components/cutting/cutting-form';
import type { RootStackScreenProps } from '../../types/navigation';
import type { CuttingJobFormData, Machine } from '../../types/schema';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '../../config/api';

export const CuttingFormScreen: React.FC<RootStackScreenProps<'CuttingForm'>> = ({ 
  route,
  navigation 
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { machines, initialData } = route.params;
  const isEditMode = !!initialData?.id;

  const handleSubmit = async (data: CuttingJobFormData) => {
    try {
      setIsSubmitting(true);
      console.log('[CuttingForm] Submitting data:', data);

      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode 
        ? getFullApiUrl(`${API_ENDPOINTS.productionJobs}/${initialData.id}`) 
        : getFullApiUrl(API_ENDPOINTS.productionJobs);

      const formattedData = {
        ...data,
        stage: 'cutting',
        measurements: {
          stoppageReason: data.measurements?.stoppageReason || 'none',
          trolleyNumber: data.measurements?.trolleyNumber || 0,
          brazingNumber: data.measurements?.brazingNumber || 0,
          segmentHeights: data.measurements?.segmentHeights || [],
          totalArea: data.measurements?.totalArea || '0',
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

      console.log('[CuttingForm] Formatted data:', formattedData);

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

      console.log('[CuttingForm] Submission successful:', response);
      navigation.goBack();
    } catch (error) {
      console.error('[CuttingForm] Submission error:', error);
      Alert.alert(
        'Error',
        'Failed to submit cutting job. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <CuttingForm
        onSubmit={handleSubmit}
        initialData={{
          stage: 'cutting',
          measurements: {
            stoppageReason: 'none',
            trolleyNumber: 0,
            brazingNumber: 0,
            segmentHeights: [],
            totalArea: '0',
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

export default CuttingFormScreen;