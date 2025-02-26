import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { z } from 'zod';
import { FormField } from '../ui/form-field';
import { Select } from '../ui/select';
import { CustomDateTimePicker } from '../ui/datetime-picker';
import { Input } from '../ui/input';
import { Button } from '../ui/Button';
import type { BaseProductionJob, Machine } from '@/types/schema';

const polishJobSchema = z.object({
  machineId: z.number({
    required_error: "Machine is required"
  }),
  blockId: z.number(),
  stage: z.literal('polish'),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled', 'paused']),
  startTime: z.string(),
  endTime: z.string().optional().nullable(),
  measurements: z.object({
    stoppageReason: z.enum(['none', 'power_outage', 'maintenance']),
    polishingTime: z.number(),
    stoppageStartTime: z.string().optional().nullable(),
    stoppageEndTime: z.string().optional().nullable(),
    maintenanceReason: z.string().optional(),
  }),
  processedPieces: z.number().optional(),
  comments: z.string().optional(),
});

type PolishJobFormData = z.infer<typeof polishJobSchema>;

interface PolishFormProps {
  onSubmit: (data: PolishJobFormData) => void;
  initialData?: Partial<BaseProductionJob>;
  machines: Machine[];
  isSubmitting?: boolean;
  isEditMode?: boolean;
}

type FormErrors = Record<string, string>;

export function PolishForm({ onSubmit, initialData, machines, isSubmitting = false, isEditMode = false }: PolishFormProps) {
  const [formData, setFormData] = React.useState<Partial<PolishJobFormData>>({
    startTime: new Date().toISOString(),
    status: isEditMode ? initialData?.status : 'pending',
    stage: 'polish',
    measurements: {
      stoppageReason: 'none',
      polishingTime: 0,
      stoppageStartTime: null,
      stoppageEndTime: null,
      maintenanceReason: '',
      ...initialData?.measurements
    },
    ...initialData
  });

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validateForm = (data: Partial<PolishJobFormData>): boolean => {
    try {
      polishJobSchema.parse(data);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
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
      onSubmit(formData as PolishJobFormData);
    }
  };

  const handleChange = (field: string, value: any) => {
    let newFormData: Partial<PolishJobFormData>;

    if (field.startsWith('measurements.')) {
      const measurementField = field.split('.')[1];
      newFormData = {
        ...formData,
        measurements: {
          ...formData.measurements,
          [measurementField]: value
        }
      };
    } else {
      newFormData = { ...formData, [field]: value };
    }

    setFormData(newFormData);
    setTouched(prev => ({ ...prev, [field]: true }));

    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
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
              label="Select Machine"
              value={formData.machineId?.toString() || ''}
              options={machines.map(m => ({ label: m.name, value: m.id.toString() }))}
              onValueChange={(value) => handleChange('machineId', parseInt(value))}
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
              label="Select Status"
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
              label="Select Start Time"
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
                label="Select End Time"
                value={formData.endTime ? new Date(formData.endTime) : new Date()}
                onChange={(date) => handleChange('endTime', date.toISOString())}
              />
            )}
          />
        )}

        <FormField
          label="Polishing Time (minutes)"
          value={formData.measurements?.polishingTime?.toString()}
          error={errors['measurements.polishingTime']}
          touched={touched['measurements.polishingTime']}
          required
          render={() => (
            <Input
              keyboardType="numeric"
              value={formData.measurements?.polishingTime?.toString()}
              onChangeText={(text) => handleChange('measurements.polishingTime', parseInt(text) || 0)}
              placeholder="Enter polishing time in minutes"
            />
          )}
        />

        <FormField
          label="Stoppage Reason"
          value={formData.measurements?.stoppageReason}
          error={errors['measurements.stoppageReason']}
          touched={touched['measurements.stoppageReason']}
          required
          render={() => (
            <Select
              label="Select Stoppage Reason"
              value={formData.measurements?.stoppageReason || 'none'}
              options={[
                { label: 'None', value: 'none' },
                { label: 'Power Outage', value: 'power_outage' },
                { label: 'Maintenance', value: 'maintenance' }
              ]}
              onValueChange={(value) => handleChange('measurements.stoppageReason', value)}
            />
          )}
        />

        {formData.measurements?.stoppageReason !== 'none' && (
          <>
            <FormField
              label="Stoppage Start Time"
              value={formData.measurements?.stoppageStartTime}
              error={errors['measurements.stoppageStartTime']}
              touched={touched['measurements.stoppageStartTime']}
              render={() => (
                <CustomDateTimePicker
                  label="Select Stoppage Start Time"
                  value={
                    formData.measurements?.stoppageStartTime
                      ? new Date(formData.measurements.stoppageStartTime)
                      : new Date()
                  }
                  onChange={(date) =>
                    handleChange('measurements.stoppageStartTime', date.toISOString())
                  }
                />
              )}
            />

            <FormField
              label="Stoppage End Time"
              value={formData.measurements?.stoppageEndTime}
              error={errors['measurements.stoppageEndTime']}
              touched={touched['measurements.stoppageEndTime']}
              render={() => (
                <CustomDateTimePicker
                  label="Select Stoppage End Time"
                  value={
                    formData.measurements?.stoppageEndTime
                      ? new Date(formData.measurements.stoppageEndTime)
                      : new Date()
                  }
                  onChange={(date) =>
                    handleChange('measurements.stoppageEndTime', date.toISOString())
                  }
                />
              )}
            />

            {formData.measurements?.stoppageReason === 'maintenance' && (
              <FormField
                label="Maintenance Reason"
                value={formData.measurements?.maintenanceReason}
                error={errors['measurements.maintenanceReason']}
                touched={touched['measurements.maintenanceReason']}
                render={() => (
                  <Input
                    value={formData.measurements?.maintenanceReason || ''}
                    onChangeText={(text) =>
                      handleChange('measurements.maintenanceReason', text)
                    }
                    placeholder="Enter maintenance reason"
                  />
                )}
              />
            )}
          </>
        )}

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