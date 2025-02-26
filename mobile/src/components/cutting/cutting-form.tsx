import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { z } from 'zod';
import { FormField } from '../ui/form-field';
import { Select } from '../ui/select';
import { CustomDateTimePicker } from '../ui/datetime-picker';
import { Text } from '../ui/text';
import { cuttingJobSchema, type CuttingJob, type Machine } from '../../types/schema';

interface CuttingFormProps {
  onSubmit: (data: CuttingJob) => void;
  initialData?: CuttingJob;
  machines: Machine[];
  isSubmitting?: boolean;
}

export function CuttingForm({ onSubmit, initialData, machines, isSubmitting = false }: CuttingFormProps) {
  const [formData, setFormData] = React.useState<Partial<CuttingJob>>({
    stage: 'cutting',
    status: initialData?.status || 'pending',
    startTime: initialData?.startTime || new Date().toISOString(),
    measurements: initialData?.measurements || {
      segmentHeights: [],
      stoppageReason: 'none',
      trolleyNumber: 0,
      totalArea: 0
    },
    ...initialData
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const handleSubmit = () => {
    try {
      const validatedData = cuttingJobSchema.parse(formData);
      onSubmit(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
        // Mark all fields as touched when submitting with errors
        const allTouched: Record<string, boolean> = {};
        Object.keys(formData).forEach(key => {
          allTouched[key] = true;
        });
        setTouched(allTouched);
      }
    }
  };

  const handleChange = (field: keyof CuttingJob, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Select
        label="Machine"
        value={formData.machineId?.toString() || ''}
        options={machines.map(m => ({ label: m.name, value: m.id.toString() }))}
        onValueChange={(value) => handleChange('machineId', parseInt(value))}
        error={errors.machineId}
        touched={touched.machineId}
        required
      />

      <CustomDateTimePicker
        label="Start Time"
        value={new Date(formData.startTime || new Date())}
        onChange={(date) => handleChange('startTime', date.toISOString())}
        error={errors.startTime}
        touched={touched.startTime}
        required
      />

      <FormField
        label="Total Slabs"
        value={formData.totalSlabs?.toString() || ''}
        onChangeText={(value) => handleChange('totalSlabs', parseInt(value) || 0)}
        error={errors.totalSlabs}
        touched={touched.totalSlabs}
        keyboardType="numeric"
        required
      />

      <FormField
        label="Processed Pieces"
        value={formData.processedPieces?.toString() || ''}
        onChangeText={(value) => handleChange('processedPieces', parseInt(value) || 0)}
        error={errors.processedPieces}
        touched={touched.processedPieces}
        keyboardType="numeric"
      />

      <Select
        label="Quality Check Status"
        value={formData.qualityCheckStatus || 'pending'}
        options={[
          { label: 'Pending', value: 'pending' },
          { label: 'Passed', value: 'passed' },
          { label: 'Failed', value: 'failed' }
        ]}
        onValueChange={(value) => handleChange('qualityCheckStatus', value)}
        error={errors.qualityCheckStatus}
        touched={touched.qualityCheckStatus}
      />

      <FormField
        label="Operator Notes"
        value={formData.operatorNotes || ''}
        onChangeText={(value) => handleChange('operatorNotes', value)}
        error={errors.operatorNotes}
        touched={touched.operatorNotes}
        multiline
        numberOfLines={4}
      />

      <FormField
        label="Comments"
        value={formData.comments || ''}
        onChangeText={(value) => handleChange('comments', value)}
        error={errors.comments}
        touched={touched.comments}
        multiline
        numberOfLines={4}
      />

      <Select
        label="Status"
        value={formData.status || 'pending'}
        options={[
          { label: 'Pending', value: 'pending' },
          { label: 'In Progress', value: 'in_progress' },
          { label: 'Completed', value: 'completed' },
          { label: 'Failed', value: 'failed' }
        ]}
        onValueChange={(value) => handleChange('status', value)}
        error={errors.status}
        touched={touched.status}
        required
      />

      <TouchableOpacity
        style={[
          styles.submitButton,
          (Object.keys(errors).length > 0 || isSubmitting) && styles.submitButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={Object.keys(errors).length > 0 || isSubmitting}
      >
        <Text style={styles.submitButtonText}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  submitButton: {
    backgroundColor: '#6366F1',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});