import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { z } from 'zod';
import { FormField } from '../ui/form-field';
import { Select } from '../ui/select';
import { CustomDateTimePicker } from '../ui/datetime-picker';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { chemicalJobSchema, type ChemicalJobFormData } from '../../types/schema';

interface ChemicalFormProps {
  onSubmit: (data: ChemicalJobFormData) => void;
  initialData?: Partial<ChemicalJobFormData>;
  isSubmitting?: boolean;
  isEditMode?: boolean;
}

type FormErrors = {
  [K in keyof ChemicalJobFormData]?: string;
} & {
  'measurements.solution'?: string;
  'measurements.pieces'?: string;
  'measurements.totalArea'?: string;
};

export function ChemicalForm({ onSubmit, initialData, isSubmitting = false, isEditMode = false }: ChemicalFormProps) {
  const defaultMeasurements = {
    stoppageReason: 'none' as const,
    solution: 'Honed' as const,
    pieces: 0,
    totalArea: '',
    stoppageStartTime: undefined,
    stoppageEndTime: undefined,
    maintenanceReason: undefined,
  };

  const [formData, setFormData] = React.useState<Partial<ChemicalJobFormData>>({
    startTime: new Date().toISOString(),
    status: isEditMode ? initialData?.status : 'pending',
    qualityCheckStatus: isEditMode ? initialData?.qualityCheckStatus : 'pending',
    stage: 'chemical_conversion',
    measurements: {
      ...defaultMeasurements,
      ...initialData?.measurements
    },
    ...initialData
  });

  // Update form data when initialData changes
  React.useEffect(() => {
    if (initialData) {
      console.log('[ChemicalForm] Initializing form with data:', JSON.stringify(initialData, null, 2));
      setFormData({
        ...formData,
        ...initialData,
        measurements: {
          ...defaultMeasurements,
          ...initialData.measurements
        }
      });
    }
  }, [initialData]);

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validateForm = (data: Partial<ChemicalJobFormData>): boolean => {
    try {
      chemicalJobSchema.parse({
        ...data,
        stage: 'chemical_conversion',
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
    console.log('[ChemicalForm] Submitting form data:', JSON.stringify(formData, null, 2));
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (validateForm(formData)) {
      onSubmit(formData as ChemicalJobFormData);
    }
  };

  const handleChange = (field: keyof ChemicalJobFormData | string, value: any) => {
    console.log(`[ChemicalForm] Field changed: ${field}, value:`, value);
    let newFormData: Partial<ChemicalJobFormData>;

    if (field.startsWith('measurements.')) {
      const measurementField = field.split('.')[1];
      newFormData = {
        ...formData,
        measurements: {
          ...defaultMeasurements,
          ...formData.measurements,
          [measurementField]: value
        }
      };
    } else {
      newFormData = { ...formData, [field]: value };
    }

    console.log('[ChemicalForm] Updated form data:', JSON.stringify(newFormData, null, 2));
    setFormData(newFormData);
    setTouched(prev => ({ ...prev, [field]: true }));

    if (errors[field as keyof FormErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <FormField
          label="Status"
          error={errors.status}
          touched={touched.status}
          required
          render={() => (
            <Select
              label="Status"
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
          error={errors.startTime}
          touched={touched.startTime}
          required
          render={() => (
            <CustomDateTimePicker
              label="Start Time"
              value={formData.startTime ? new Date(formData.startTime) : new Date()}
              onChange={(date) => handleChange('startTime', date.toISOString())}
            />
          )}
        />

        {(formData.status === 'completed' || isEditMode) && (
          <FormField
            label="End Time"
            error={errors.endTime}
            touched={touched.endTime}
            render={() => (
              <CustomDateTimePicker
                label="End Time"
                value={formData.endTime ? new Date(formData.endTime) : new Date()}
                onChange={(date) => handleChange('endTime', date.toISOString())}
              />
            )}
          />
        )}

        <FormField
          label="Solution Type"
          error={errors['measurements.solution']}
          touched={touched['measurements.solution']}
          required
          render={() => (
            <Select
              label="Solution"
              value={formData.measurements?.solution || 'Honed'}
              options={[
                { label: 'Honed', value: 'Honed' },
                { label: 'Polished', value: 'Polished' }
              ]}
              onValueChange={(value) => handleChange('measurements.solution', value)}
            />
          )}
        />

        <FormField
          label="Pieces"
          error={errors['measurements.pieces']}
          touched={touched['measurements.pieces']}
          render={() => (
            <Input
              keyboardType="numeric"
              value={formData.measurements?.pieces?.toString() || '0'}
              onChangeText={(text) => handleChange('measurements.pieces', parseInt(text) || 0)}
              placeholder="Enter number of pieces"
            />
          )}
        />

        <FormField
          label="Comments"
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