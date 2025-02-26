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
import type { Block } from '@/types/schema';

type PolishJob = {
  id: number;
  blockId: number;
  startTime: string;
  endTime?: string;
  status: ProductionStatus;
  totalSlabs: number;
  processedPieces: number;
  measurements?: {
    glossLevel?: number;
    pressure?: number;
    polishingTime?: number;
  };
};

export const PolishScreen = ({ navigation }: RootStackScreenProps<'Polish'>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductionStatus>('all');
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const { data: jobs, isLoading: jobsLoading, error: jobsError } = useQuery<PolishJob[]>({
    queryKey: ['/api/polishing-jobs'],
    queryFn: async () => {
      const response = await fetchWithRetry(getFullApiUrl(API_ENDPOINTS.polishingJobs));
      return response;
    },
  });

  const { data: blocks, isLoading: blocksLoading } = useQuery<Block[]>({
    queryKey: ['blocks'],
    queryFn: async () => {
      const response = await fetchWithRetry(getFullApiUrl(API_ENDPOINTS.blocks.list));
      return response;
    }
  });

  const filteredAndSortedJobs = useMemo(() => {
    if (!jobs || !blocks) return [];

    return jobs
      .filter(job => {
        const block = blocks.find(b => b.id === job.blockId);
        if (!block) return false;

        const searchString = `${block.blockNumber} ${block.companyName || ''} ${block.color || ''}`.toLowerCase();
        const matchesSearch = searchString.includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || job.status === statusFilter;

        return matchesSearch && matchesStatus;
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
          case 'blockNumber': {
            const blockA = blocks.find(b => b.id === a.blockId)?.blockNumber || '';
            const blockB = blocks.find(b => b.id === b.blockId)?.blockNumber || '';
            comparison = blockA.localeCompare(blockB);
            break;
          }
          case 'totalSlabs':
            comparison = a.totalSlabs - b.totalSlabs;
            break;
          default:
            comparison = 0;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [jobs, blocks, searchTerm, statusFilter, sortField, sortOrder]);

  if (jobsLoading || blocksLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading polishing jobs...</Text>
      </View>
    );
  }

  if (jobsError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load polishing jobs</Text>
        <Text style={styles.errorDetail}>{jobsError.toString()}</Text>
      </View>
    );
  }

  const renderJobCard = ({ item }: { item: PolishJob }) => {
    const block = blocks?.find(b => b.id === item.blockId);
    if (!block) return null;

    return (
      <TouchableOpacity 
        style={styles.jobCard}
        onPress={() => {
          Alert.alert(
            `Polishing Job - ${block.blockNumber}`,
            `Status: ${item.status}\n` +
            `Company: ${block.companyName || 'N/A'}\n` +
            `Color: ${block.color || 'N/A'}\n` +
            `Start Time: ${new Date(item.startTime).toLocaleString()}\n` +
            `End Time: ${item.endTime ? new Date(item.endTime).toLocaleString() : 'N/A'}\n` +
            `Total Slabs: ${item.totalSlabs}\n` +
            `Processed: ${item.processedPieces}\n` +
            `Gloss Level: ${item.measurements?.glossLevel || 'N/A'}\n` +
            `Pressure: ${item.measurements?.pressure || 'N/A'} bar\n` +
            `Polishing Time: ${item.measurements?.polishingTime ? `${item.measurements.polishingTime} min` : 'N/A'}`,
            [
              { text: 'Close', style: 'cancel' },
              { 
                text: 'Edit',
                onPress: () => {
                  navigation.navigate('EditPolishJob', { jobId: item.id });
                },
              },
            ]
          );
        }}
      >
        <View style={styles.jobHeader}>
          <View>
            <Text style={styles.blockNumber}>{block.blockNumber}</Text>
            <Text style={styles.companyName}>{block.companyName || 'No Company'}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            item.status === 'completed' && styles.completedBadge,
            item.status === 'in_progress' && styles.inProgressBadge,
            item.status === 'skipped' && styles.skippedBadge,
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
            Gloss Level: {item.measurements?.glossLevel || 'N/A'}
          </Text>
          <Text style={styles.detailText}>
            Pressure: {item.measurements?.pressure || 'N/A'} bar
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.timeText}>
            Started: {new Date(item.startTime).toLocaleDateString()}
          </Text>
          <Text style={styles.colorText}>
            {block.color || 'No Color'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
        searchPlaceholder="Search block number, company name or color..."
      />

      <FlatList
        data={filteredAndSortedJobs}
        renderItem={renderJobCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No polishing jobs found</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('NewPolishJob')}
      >
        <Text style={styles.addButtonText}>+ New Polishing Job</Text>
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  blockNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  companyName: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
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
  skippedBadge: {
    backgroundColor: '#fee2e2',
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
  colorText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
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

export default PolishScreen;