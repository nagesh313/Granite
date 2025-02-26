import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/Button';
import type { RootStackScreenProps } from '@/types/navigation';
import type { PolishingJob, Block, Machine } from '@/types/schema';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '@/config/api';
import { JobCard } from '@/components/production/job-card';
import ProductionFilter, { 
  ProductionStatus, 
  SortField, 
  SortOrder 
} from '@/components/ui/ProductionFilter';

export function PolishListScreen({ navigation }: RootStackScreenProps<'PolishList'>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductionStatus>('all');
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const { data: jobs, isLoading: jobsLoading, error: jobsError } = useQuery<PolishingJob[]>({
    queryKey: ['polishing-jobs'],
    queryFn: async () => {
      console.log('[PolishList] Fetching polish jobs');
      try {
        const url = getFullApiUrl(`${API_ENDPOINTS.productionJobs}?stage=polishing`);
        console.log('[PolishList] Fetching from URL:', url);
        const response = await fetchWithRetry<PolishingJob[]>(url);
        console.log('[PolishList] Raw response:', JSON.stringify(response, null, 2));

        if (!Array.isArray(response)) {
          console.error('[PolishList] Invalid response format:', response);
          throw new Error('Expected array response from API');
        }

        const polishJobs = response.filter(job => job.stage === 'polishing');
        console.log('[PolishList] Filtered polish jobs:', polishJobs.length);
        return polishJobs;
      } catch (error) {
        console.error('[PolishList] Error fetching jobs:', error);
        throw error;
      }
    }
  });

  const { data: blocks, isLoading: blocksLoading } = useQuery<Block[]>({
    queryKey: ['blocks'],
    queryFn: async () => {
      console.log('[PolishList] Fetching blocks');
      const response = await fetchWithRetry<Block[]>(
        getFullApiUrl('/api/blocks')
      );
      console.log('[PolishList] Blocks response:', response?.length);
      return response;
    }
  });

  const { data: machines, isLoading: machinesLoading } = useQuery<Machine[]>({
    queryKey: ['machines'],
    queryFn: async () => {
      console.log('[PolishList] Fetching machines');
      const response = await fetchWithRetry<Machine[]>(
        getFullApiUrl(API_ENDPOINTS.machines)
      );
      console.log('[PolishList] Machines response:', response?.length);
      return response;
    }
  });

  const filteredAndSortedJobs = useMemo(() => {
    if (!jobs) return [];

    return jobs
      .filter(job => {
        const block = blocks?.find(b => b.id === job.blockId);
        const blockNumber = block?.blockNumber || '';
        const companyName = block?.companyName || '';
        const color = block?.color || '';

        const searchString = `${blockNumber} ${companyName} ${color}`.toLowerCase();
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
            const blockA = blocks?.find(b => b.id === a.blockId)?.blockNumber || '';
            const blockB = blocks?.find(b => b.id === b.blockId)?.blockNumber || '';
            comparison = blockA.localeCompare(blockB);
            break;
          }
          case 'totalSlabs':
            comparison = (a.totalSlabs || 0) - (b.totalSlabs || 0);
            break;
          default:
            comparison = 0;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [jobs, blocks, searchTerm, statusFilter, sortField, sortOrder]);

  if (jobsLoading || blocksLoading || machinesLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading polish jobs...</Text>
      </View>
    );
  }

  if (jobsError) {
    console.error('[PolishList] Error state:', jobsError);
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load polish jobs</Text>
        <Text style={styles.errorDetail}>{jobsError.toString()}</Text>
        <Button 
          title="Retry" 
          onPress={() => {
            navigation.replace('PolishList');
          }}
          style={styles.retryButton}
        />
      </View>
    );
  }

  const getBlockInfo = (blockId: number) => {
    return blocks?.find(b => b.id === blockId);
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

      <Button
        title="New Polish Job"
        onPress={() => {
          if (!machines?.length) {
            Alert.alert('Error', 'No machines available for polish jobs');
            return;
          }
          navigation.navigate('PolishForm', {
            initialData: undefined,
            machines: machines?.filter(m => m.type.toLowerCase() === 'polishing') || []
          });
        }}
        style={styles.addButton}
      />

      <FlatList
        data={filteredAndSortedJobs}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => {
          const block = getBlockInfo(item.blockId);
          return (
            <View style={styles.cardContainer}>
              <JobCard
                job={{
                  ...item,
                  block
                }}
                onPress={() =>
                  navigation.navigate('PolishForm', {
                    initialData: {
                      ...item,
                      stage: 'polishing',
                      measurements: {
                        ...item.measurements,
                        stoppageReason: item.measurements?.stoppageReason || 'none',
                      }
                    },
                    machines: machines?.filter(m => m.type.toLowerCase() === 'polishing') || []
                  })
                }
              />
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No polish jobs found</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
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
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  retryButton: {
    minWidth: 120,
  },
  addButton: {
    margin: 16,
  },
  listContent: {
    padding: 16,
  },
  cardContainer: {
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  }
});

export default PolishListScreen;