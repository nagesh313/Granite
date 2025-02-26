import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { z } from 'zod';
import { FormField } from '../ui/form-field';
import { Select } from '../ui/select';
import { CustomDateTimePicker } from '../ui/datetime-picker';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Text } from '../ui/text';
import type { Machine, EpoxyJobFormData } from '@/types/schema';

const epoxyJobSchema = z.object({
  stage: z.literal('epoxy'),
  machineId: z.number().optional(),
  startTime: z.string(),
  endTime: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled', 'paused']),
  qualityCheckStatus: z.enum(['pending', 'passed', 'failed']),
  blockId: z.number(),
  processedPieces: z.number().optional(),
  comments: z.string().optional(),
  measurements: z.object({
    stoppageReason: z.enum(['none', 'maintenance', 'power_outage']),
    epoxyType: z.string(),
    pieces: z.number(),
    totalArea: z.union([z.number(), z.string()]),
    stoppageStartTime: z.string().nullable(),
    stoppageEndTime: z.string().nullable(),
    maintenanceReason: z.string().optional(),
  }),
});

interface EpoxyFormProps {
  onSubmit: (data: EpoxyJobFormData) => void;
  initialData?: Partial<EpoxyJobFormData>;
  machines: Machine[];
  isSubmitting?: boolean;
  isEditMode?: boolean;
}

type FormErrors = {
  [K in keyof EpoxyJobFormData]?: string;
} & {
  'measurements.stoppageReason'?: string;
  'measurements.epoxyType'?: string;
  'measurements.pieces'?: string;
  'measurements.totalArea'?: string;
  'measurements.stoppageStartTime'?: string;
  'measurements.stoppageEndTime'?: string;
  'measurements.maintenanceReason'?: string;
};

export function EpoxyForm({ onSubmit, initialData, machines, isSubmitting = false, isEditMode = false }: EpoxyFormProps) {
  const defaultMeasurements = {
    stoppageReason: 'none' as const,
    epoxyType: '',
    pieces: 0,
    totalArea: 0,
    stoppageStartTime: null,
    stoppageEndTime: null,
    maintenanceReason: undefined,
  };

  const [formData, setFormData] = React.useState<Partial<EpoxyJobFormData>>({
    startTime: new Date().toISOString(),
    status: isEditMode ? initialData?.status : 'pending',
    qualityCheckStatus: isEditMode ? initialData?.qualityCheckStatus : 'pending',
    stage: 'epoxy',
    measurements: {
      ...defaultMeasurements,
      ...initialData?.measurements
    },
    ...initialData
  });

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validateForm = (data: Partial<EpoxyJobFormData>): boolean => {
    try {
      epoxyJobSchema.parse({
        ...data,
        stage: 'epoxy',
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
      onSubmit(formData as EpoxyJobFormData);
    }
  };

  const handleChange = (field: keyof EpoxyJobFormData | 'measurements', value: any) => {
    let newFormData: Partial<EpoxyJobFormData>;

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

        {formData.status === 'completed' && (
          <FormField
            label="End Time"
            value={formData.endTime}
            error={errors.endTime}
            touched={touched.endTime}
            render={() => (
              <CustomDateTimePicker
                label="Select End Time"
                value={formData.endTime ? new Date(formData.endTime) : new Date()}
                onChange={(date) => handleChange('endTime', date ? date.toISOString() : null)}
              />
            )}
          />
        )}

        <FormField
          label="Epoxy Type"
          value={formData.measurements?.epoxyType}
          error={errors['measurements.epoxyType']}
          touched={touched['measurements.epoxyType']}
          required
          render={() => (
            <Input
              value={formData.measurements?.epoxyType || ''}
              onChangeText={(value) => handleChange('measurements', { epoxyType: value })}
              placeholder="Enter epoxy type"
            />
          )}
        />

        <FormField
          label="Number of Pieces"
          value={formData.measurements?.pieces?.toString()}
          error={errors['measurements.pieces']}
          touched={touched['measurements.pieces']}
          required
          render={() => (
            <Input
              keyboardType="numeric"
              value={formData.measurements?.pieces?.toString()}
              onChangeText={(value) => handleChange('measurements', { pieces: parseInt(value) || 0 })}
              placeholder="Enter number of pieces"
            />
          )}
        />

        <FormField
          label="Total Area"
          value={formData.measurements?.totalArea?.toString()}
          error={errors['measurements.totalArea']}
          touched={touched['measurements.totalArea']}
          required
          render={() => (
            <Input
              keyboardType="numeric"
              value={formData.measurements?.totalArea?.toString()}
              onChangeText={(value) => handleChange('measurements', { totalArea: value })}
              placeholder="Enter total area"
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
                { label: 'Maintenance', value: 'maintenance' },
                { label: 'Power Outage', value: 'power_outage' }
              ]}
              onValueChange={(value) => handleChange('measurements', { stoppageReason: value })}
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
                    handleChange('measurements', {
                      stoppageStartTime: date ? date.toISOString() : null
                    })
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
                    handleChange('measurements', {
                      stoppageEndTime: date ? date.toISOString() : null
                    })
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
                    multiline
                    numberOfLines={3}
                    value={formData.measurements?.maintenanceReason || ''}
                    onChangeText={(value) =>
                      handleChange('measurements', { maintenanceReason: value })
                    }
                    placeholder="Enter maintenance reason"
                    style={styles.textArea}
                  />
                )}
              />
            )}
          </>
        )}

        <FormField
          label="Quality Check Status"
          value={formData.qualityCheckStatus}
          error={errors.qualityCheckStatus}
          touched={touched.qualityCheckStatus}
          required
          render={() => (
            <Select
              label="Select Quality Check Status"
              value={formData.qualityCheckStatus || 'pending'}
              options={[
                { label: 'Pending', value: 'pending' },
                { label: 'Passed', value: 'passed' },
                { label: 'Failed', value: 'failed' }
              ]}
              onValueChange={(value) => handleChange('qualityCheckStatus', value)}
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
          variant="default"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || Object.keys(errors).length > 0}
          style={styles.submitButton}
        >
          <Text style={styles.buttonText}>
            {isEditMode ? 'Update Job' : 'Create Job'}
          </Text>
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
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
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  }
});