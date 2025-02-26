import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { z } from 'zod';
import { FormField } from '../ui/form-field';
import { Select } from '../ui/select';
import { CustomDateTimePicker } from '../ui/datetime-picker';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { grindingJobSchema, type GrindingJobFormData, type Machine } from '../../types/schema';

interface GrindingFormProps {
  onSubmit: (data: GrindingJobFormData) => void;
  initialData?: Partial<GrindingJobFormData>;
  machines: Machine[];
  isSubmitting?: boolean;
  isEditMode?: boolean;
}

type FormErrors = {
  [K in keyof GrindingJobFormData]?: string;
} & {
  'measurements.stoppageReason'?: string;
  'measurements.stoppageStartTime'?: string;
  'measurements.stoppageEndTime'?: string;
  'measurements.maintenanceReason'?: string;
  'measurements.finish'?: string;
};

export function GrindingForm({ onSubmit, initialData, machines, isSubmitting = false, isEditMode = false }: GrindingFormProps) {
  const defaultMeasurements = {
    stoppageReason: 'none' as const,
    finish: 'Normal' as const,
    pieces: 0,
    totalArea: 0,
    stoppageStartTime: undefined,
    stoppageEndTime: undefined,
    maintenanceReason: undefined,
  };

  const [formData, setFormData] = React.useState<Partial<GrindingJobFormData>>({
    startTime: new Date().toISOString(),
    status: isEditMode ? initialData?.status : 'pending',
    qualityCheckStatus: isEditMode ? initialData?.qualityCheckStatus : 'pending',
    stage: 'grinding',
    measurements: {
      ...defaultMeasurements,
      ...initialData?.measurements
    },
    ...initialData
  });

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [showStoppage, setShowStoppage] = React.useState(
    formData.measurements?.stoppageReason !== 'none'
  );

  const validateForm = (data: Partial<GrindingJobFormData>): boolean => {
    try {
      const validatedData = grindingJobSchema.parse({
        ...data,
        stage: 'grinding',
        measurements: {
          ...defaultMeasurements,
          ...data.measurements
        }
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        error.errors.forEach((err) => {
          if (err.path) {
            const path = err.path.join('.');
            newErrors[path as keyof FormErrors] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = () => {
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (validateForm(formData)) {
      onSubmit(formData as GrindingJobFormData);
    }
  };

  const handleChange = (field: keyof GrindingJobFormData | 'measurements', value: any) => {
    let newFormData: Partial<GrindingJobFormData>;

    if (field === 'measurements') {
      newFormData = {
        ...formData,
        measurements: {
          ...formData.measurements,
          ...value
        }
      };
    } else {
      newFormData = { ...formData, [field]: value };
    }

    setFormData(newFormData);
    setTouched(prev => ({ ...prev, [field]: true }));

    // Clear errors for the changed field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <FormField
          label="Machine"
          value={formData.machineId?.toString()}
          error={errors.machineId}
          touched={touched.machineId}
          required
          render={() => (
            <Select
              value={formData.machineId?.toString() || ''}
              options={machines.map(m => ({ label: m.name, value: m.id.toString() }))}
              onValueChange={(value) => handleChange('machineId', parseInt(value))}
              placeholder="Select machine"
            />
          )}
        />

        <FormField
          label="Status"
          value={formData.status}
          error={errors.status}
          touched={touched.status}
          required
          render={() => (
            <Select
              value={formData.status || 'pending'}
              options={[
                { label: 'Pending', value: 'pending' },
                { label: 'In Progress', value: 'in_progress' },
                { label: 'Completed', value: 'completed' },
                { label: 'Failed', value: 'failed' },
                { label: 'Cancelled', value: 'cancelled' },
                { label: 'Paused', value: 'paused' }
              ]}
              onValueChange={(value) => handleChange('status', value)}
            />
          )}
        />

        <FormField
          label="Start Time"
          value={formData.startTime}
          error={errors.startTime}
          touched={touched.startTime}
          required
          render={() => (
            <CustomDateTimePicker
              value={formData.startTime ? new Date(formData.startTime) : new Date()}
              onChange={(date) => handleChange('startTime', date.toISOString())}
            />
          )}
        />

        {isEditMode && (
          <FormField
            label="End Time"
            value={formData.endTime}
            error={errors.endTime}
            touched={touched.endTime}
            render={() => (
              <CustomDateTimePicker
                value={formData.endTime ? new Date(formData.endTime) : new Date()}
                onChange={(date) => handleChange('endTime', date.toISOString())}
              />
            )}
          />
        )}

        <FormField
          label="Processed Pieces"
          value={formData.processedPieces?.toString()}
          error={errors.processedPieces}
          touched={touched.processedPieces}
          required
          render={() => (
            <Input
              keyboardType="numeric"
              value={formData.processedPieces?.toString()}
              onChangeText={(text) => handleChange('processedPieces', parseInt(text) || 0)}
              placeholder="Enter number of pieces"
            />
          )}
        />

        <FormField
          label="Finish Type"
          value={formData.measurements?.finish}
          error={errors['measurements.finish']}
          touched={touched['measurements.finish']}
          required
          render={() => (
            <Select
              value={formData.measurements?.finish || 'Normal'}
              options={[
                { label: 'Normal', value: 'Normal' },
                { label: 'Lappato', value: 'Lappato' }
              ]}
              onValueChange={(value) => handleChange('measurements', { finish: value })}
            />
          )}
        />

        <FormField
          label="Comments"
          value={formData.comments}
          error={errors.comments}
          touched={touched.comments}
          render={() => (
            <Input
              multiline
              numberOfLines={4}
              value={formData.comments || ''}
              onChangeText={(text) => handleChange('comments', text)}
              placeholder="Add any comments"
              style={styles.textArea}
            />
          )}
        />

        <Button
          title={isEditMode ? 'Update Job' : 'Create Job'}
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || Object.keys(errors).length > 0}
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
    gap: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 40,
  }
});