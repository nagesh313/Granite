import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import type { CuttingJobFormData, Machine } from '@/types/schema';
import { cuttingJobSchema } from '@/types/schema';

type Props = {
  onSubmit: (data: CuttingJobFormData) => Promise<void>;
  machines: Machine[];
  defaultValues?: Partial<CuttingJobFormData>;
  isSubmitting: boolean;
  isEditMode: boolean;
};

export function CuttingForm({ onSubmit, machines, defaultValues, isSubmitting, isEditMode }: Props) {
  const [selectedMachine, setSelectedMachine] = useState<Machine | undefined>(
    machines.find(m => m.id === defaultValues?.machineId)
  );

  const { control, handleSubmit, formState: { errors }, watch } = useForm<CuttingJobFormData>({
    resolver: zodResolver(cuttingJobSchema),
    defaultValues: {
      machineId: defaultValues?.machineId,
      blockId: defaultValues?.blockId,
      startTime: defaultValues?.startTime || new Date().toISOString(),
      endTime: defaultValues?.endTime,
      status: defaultValues?.status || 'in_progress',
      stage: 'cutting',
      measurements: {
        segmentHeights: defaultValues?.measurements?.segmentHeights || 
          Array(14).fill({ height: 0 }).map((_, i) => ({ bladeId: i + 1, height: 0 })),
        stoppageReason: defaultValues?.measurements?.stoppageReason || 'none',
        trolleyNumber: defaultValues?.measurements?.trolleyNumber || 1,
        brazingNumber: defaultValues?.measurements?.brazingNumber,
        totalArea: defaultValues?.measurements?.totalArea || '0',
        stoppageStartTime: defaultValues?.measurements?.stoppageStartTime,
        stoppageEndTime: defaultValues?.measurements?.stoppageEndTime,
        maintenanceReason: defaultValues?.measurements?.maintenanceReason,
      },
      totalSlabs: defaultValues?.totalSlabs || 1,
      comments: defaultValues?.comments,
    }
  });

  const renderSegmentHeights = () => {
    return Array.from({ length: 14 }, (_, index) => (
      <View key={index} style={styles.segmentRow}>
        <Text style={styles.label}>Blade {index + 1}</Text>
        <Controller
          control={control}
          name={`measurements.segmentHeights.${index}.height`}
          render={({ field: { onChange, value } }) => (
            <Input
              keyboardType="numeric"
              placeholder="Height (mm)"
              value={value?.toString()}
              onChangeText={(text) => onChange(parseFloat(text) || 0)}
              style={styles.segmentInput}
              error={!!errors.measurements?.segmentHeights?.[index]?.height}
            />
          )}
        />
      </View>
    ));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <FormField
          control={control}
          name="machineId"
          label="Machine"
          error={errors.machineId?.message}
          render={({ field: { onChange, value } }) => (
            <Select
              items={machines.map(m => ({ label: m.name, value: m.id.toString() }))}
              selectedValue={value?.toString()}
              onValueChange={(val) => {
                const machineId = parseInt(val);
                onChange(machineId);
                setSelectedMachine(machines.find(m => m.id === machineId));
              }}
              placeholder="Select machine"
            />
          )}
        />

        <View style={styles.segmentHeights}>
          <Text style={styles.sectionTitle}>Blade Measurements</Text>
          {renderSegmentHeights()}
        </View>

        <FormField
          control={control}
          name="measurements.trolleyNumber"
          label="Trolley Number"
          error={errors.measurements?.trolleyNumber?.message}
          render={({ field: { onChange, value } }) => (
            <Input
              keyboardType="numeric"
              placeholder="Enter trolley number"
              value={value?.toString()}
              onChangeText={(text) => onChange(parseInt(text) || 0)}
            />
          )}
        />

        <FormField
          control={control}
          name="totalSlabs"
          label="Total Slabs"
          error={errors.totalSlabs?.message}
          render={({ field: { onChange, value } }) => (
            <Input
              keyboardType="numeric"
              placeholder="Enter total slabs"
              value={value?.toString()}
              onChangeText={(text) => onChange(parseInt(text) || 0)}
            />
          )}
        />

        <FormField
          control={control}
          name="comments"
          label="Comments"
          error={errors.comments?.message}
          render={({ field: { onChange, value } }) => (
            <Input
              multiline
              numberOfLines={4}
              placeholder="Add any comments"
              value={value}
              onChangeText={onChange}
              style={styles.textArea}
            />
          )}
        />

        <Button 
          title={isEditMode ? 'Update Job' : 'Create Job'}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          disabled={isSubmitting}
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
  segmentHeights: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    flex: 1,
  },
  segmentInput: {
    flex: 2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});