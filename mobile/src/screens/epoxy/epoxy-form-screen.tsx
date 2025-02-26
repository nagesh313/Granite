import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { EpoxyForm } from '@/components/epoxy/epoxy-form';
import type { RootStackScreenProps } from '@/types/navigation';
import { getFullApiUrl, API_ENDPOINTS } from '@/config/api';
import type { EpoxyJobFormData } from '@/types/schema';

export function EpoxyFormScreen({
  navigation,
  route,
}: RootStackScreenProps<'EpoxyForm'>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { initialData, machines } = route.params;
  const isEditMode = !!initialData?.id;

  const handleSubmit = async (formData: EpoxyJobFormData) => {
    try {
      setIsSubmitting(true);
      const url = isEditMode
        ? getFullApiUrl(`${API_ENDPOINTS.productionJobs}/${initialData.id}`)
        : getFullApiUrl(API_ENDPOINTS.productionJobs);

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          stage: 'epoxy',
          measurements: {
            ...formData.measurements,
            stoppageReason: formData.measurements?.stoppageReason || 'none',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to save job: ${errorData}`);
      }

      // Invalidate and refetch jobs list
      await queryClient.invalidateQueries({
        queryKey: ['production-jobs', 'epoxy'],
      });

      Alert.alert(
        'Success',
        `Job ${isEditMode ? 'updated' : 'created'} successfully`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to the list screen
              navigation.goBack();
              // Trigger a refresh of the list
              queryClient.invalidateQueries({
                queryKey: ['production-jobs', 'epoxy'],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert(
        'Error',
        `Failed to ${isEditMode ? 'update' : 'create'} job. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <EpoxyForm
        onSubmit={handleSubmit}
        initialData={initialData}
        machines={machines}
        isSubmitting={isSubmitting}
        isEditMode={isEditMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
});

export default EpoxyFormScreen;