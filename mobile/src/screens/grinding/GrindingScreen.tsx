import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS, fetchWithRetry, getFullApiUrl } from '@/config/api';
import type { RootStackScreenProps } from '@/types/navigation';
import ProductionFilter, { 
  ProductionStatus, 
  SortField, 
  SortOrder 
} from '@/components/ui/ProductionFilter';

type GrindingJob = {
  id: number;
  blockId: number;
  blockNumber: string;
  startTime: string;
  endTime?: string;
  status: ProductionStatus;
  totalSlabs: number;
  processedPieces: number;
  qualityCheckStatus: 'pending' | 'passed' | 'failed';
  measurements?: {
    gritLevel?: 'coarse' | 'medium' | 'fine';
    waterFlow?: string;
    pressure?: string;
  };
};

const additionalFilters = [
  { label: 'All Quality Status', value: 'all' },
  { label: 'Quality Pending', value: 'pending' },
  { label: 'Quality Passed', value: 'passed' },
  { label: 'Quality Failed', value: 'failed' },
];

export const GrindingScreen = ({ navigation }: RootStackScreenProps<'Grinding'>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductionStatus>('all');
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [qualityFilter, setQualityFilter] = useState('all');

  const { data: jobs, isLoading, error } = useQuery<GrindingJob[]>({
    queryKey: ['/api/grinding-jobs'],
    queryFn: async () => {
      const response = await fetchWithRetry(getFullApiUrl(API_ENDPOINTS.grindingJobs));
      return response as GrindingJob[];
    },
  });

  const filteredAndSortedJobs = useMemo(() => {
    if (!jobs) return [];

    return jobs
      .filter(job => {
        const matchesSearch = 
          job.blockNumber.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || job.status === statusFilter;

        const matchesQuality = qualityFilter === 'all' || job.qualityCheckStatus === qualityFilter;

        return matchesSearch && matchesStatus && matchesQuality;
      })
      .sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'startTime':
            comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            break;
          case 'endTime':
            if (!a.endTime && !b.endTime) comparison = 0;
            else if (!a.endTime) comparison = 1;
            else if (!b.endTime) comparison = -1;
            else comparison = new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
            break;
          case 'blockNumber':
            comparison = a.blockNumber.localeCompare(b.blockNumber);
            break;
          case 'totalSlabs':
            comparison = a.totalSlabs - b.totalSlabs;
            break;
          default:
            comparison = 0;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [jobs, searchTerm, statusFilter, sortField, sortOrder, qualityFilter]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading grinding jobs...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load grinding jobs</Text>
        <Text style={styles.errorDetail}>{error.toString()}</Text>
      </View>
    );
  }

  const renderJobCard = ({ item }: { item: GrindingJob }) => (
    <TouchableOpacity 
      style={styles.jobCard}
      onPress={() => {
        Alert.alert(
          `Grinding Job - ${item.blockNumber}`,
          `Status: ${item.status}\n` +
          `Start Time: ${new Date(item.startTime).toLocaleString()}\n` +
          `End Time: ${item.endTime ? new Date(item.endTime).toLocaleString() : 'N/A'}\n` +
          `Total Slabs: ${item.totalSlabs}\n` +
          `Processed: ${item.processedPieces}\n` +
          `Quality: ${item.qualityCheckStatus}\n` +
          `Grit Level: ${item.measurements?.gritLevel || 'N/A'}\n` +
          `Water Flow: ${item.measurements?.waterFlow || 'N/A'}\n` +
          `Pressure: ${item.measurements?.pressure || 'N/A'}`,
          [
            { text: 'Close', style: 'cancel' },
            { 
              text: 'Edit',
              onPress: () => {
                navigation.navigate('EditGrindingJob', { jobId: item.id });
              },
            },
          ]
        );
      }}
    >
      <View style={styles.jobHeader}>
        <Text style={styles.blockNumber}>{item.blockNumber}</Text>
        <View style={[
          styles.statusBadge,
          item.status === 'completed' && styles.completedBadge,
          item.status === 'in_progress' && styles.inProgressBadge,
          item.status === 'pending' && styles.pendingBadge,
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.progressText}>
          Progress: {item.processedPieces}/{item.totalSlabs} slabs
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(item.processedPieces / item.totalSlabs) * 100}%` }
            ]} 
          />
        </View>
      </View>

      <View style={styles.jobDetails}>
        <Text style={styles.detailText}>
          Grit Level: {item.measurements?.gritLevel || 'N/A'}
        </Text>
        <Text style={styles.detailText}>
          Water Flow: {item.measurements?.waterFlow || 'N/A'}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.timeText}>
          Started: {new Date(item.startTime).toLocaleDateString()}
        </Text>
        <View style={[
          styles.qualityBadge,
          item.qualityCheckStatus === 'passed' && styles.qualityPassedBadge,
          item.qualityCheckStatus === 'failed' && styles.qualityFailedBadge,
        ]}>
          <Text style={styles.qualityText}>{item.qualityCheckStatus}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ProductionFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        additionalFilters={additionalFilters}
        onAdditionalFilterChange={setQualityFilter}
        selectedAdditionalFilter={qualityFilter}
      />

      <FlatList
        data={filteredAndSortedJobs}
        renderItem={renderJobCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No grinding jobs found</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('NewGrindingJob')}
      >
        <Text style={styles.addButtonText}>+ New Grinding Job</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4b5563',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  blockNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  completedBadge: {
    backgroundColor: '#dcfce7',
  },
  inProgressBadge: {
    backgroundColor: '#dbeafe',
  },
  pausedBadge: {
    backgroundColor: '#fee2e2',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7', 
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  jobDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  qualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  qualityPassedBadge: {
    backgroundColor: '#dcfce7',
  },
  qualityFailedBadge: {
    backgroundColor: '#fee2e2',
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GrindingScreen;