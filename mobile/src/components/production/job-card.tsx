import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import type { BaseProductionJob, Block } from '@/types/schema';

interface JobCardProps {
  job: BaseProductionJob & { block?: Block };
  onPress?: () => void;
}

export function JobCard({ job, onPress }: JobCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#22C55E';
      case 'in_progress':
        return '#3B82F6';
      case 'failed':
        return '#EF4444';
      case 'cancelled':
        return '#6B7280';
      case 'paused':
        return '#F59E0B';
      default:
        return '#9CA3AF';
    }
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.blockNumber}>
              {job.block?.blockNumber || 'N/A'}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(job.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {job.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.timestamp}>
            Started: {formatDate(job.startTime)}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.label}>Block Type:</Text>
            <Text style={styles.value}>{job.block?.blockType || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text style={styles.value}>{job.block?.marka || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Color:</Text>
            <Text style={styles.value}>{job.block?.color || 'N/A'}</Text>
          </View>
          {/* Removed Total Slabs and Processed because they weren't in the edited code and the intention was to only show specific block info */}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  header: {
    gap: 4,
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  timestamp: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
});