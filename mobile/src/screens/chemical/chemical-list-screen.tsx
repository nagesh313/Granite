import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/Button';
import type { RootStackScreenProps } from '@/types/navigation';
import type { ChemicalJob, Block } from '@/types/schema';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '@/config/api';
import { JobCard } from '@/components/production/job-card';
import ProductionFilter, { 
  ProductionStatus, 
  SortField, 
  SortOrder 
} from '@/components/ui/ProductionFilter';

type Props = RootStackScreenProps<'ChemicalList'>;

export function ChemicalListScreen({ navigation }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductionStatus>('all');
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const { data: jobs, isLoading: jobsLoading, error: jobsError } = useQuery<ChemicalJob[]>({
    queryKey: ['chemical-jobs'],
    queryFn: async () => {
      console.log('[ChemicalList] Fetching chemical jobs');
      try {
        const url = getFullApiUrl(API_ENDPOINTS.productionJobs + '?stage=chemical_conversion');
        console.log('[ChemicalList] Fetching from URL:', url);

        const response = await fetchWithRetry(url);
        console.log('[ChemicalList] Raw response:', JSON.stringify(response, null, 2));

        if (!Array.isArray(response)) {
          console.error('[ChemicalList] Invalid response format:', response);
          throw new Error('Expected array response from API');
        }

        const chemicalJobs = response.filter(job => job.stage === 'chemical_conversion');
        console.log('[ChemicalList] Filtered chemical jobs:', chemicalJobs.length);
        console.log('[ChemicalList] Sample job:', chemicalJobs[0]);
        return chemicalJobs;
      } catch (error) {
        console.error('[ChemicalList] Error fetching jobs:', error);
        throw error;
      }
    }
  });

  const { data: blocks, isLoading: blocksLoading, error: blocksError } = useQuery<Block[]>({
    queryKey: ['blocks'],
    queryFn: async () => {
      console.log('[ChemicalList] Fetching blocks');
      try {
        const response = await fetchWithRetry(
          getFullApiUrl(API_ENDPOINTS.blocks.list)
        );
        console.log('[ChemicalList] Blocks response:', response?.length);
        return response;
      } catch (error) {
        console.error('[ChemicalList] Error fetching blocks:', error);
        throw error;
      }
    }
  });

  const filteredAndSortedJobs = useMemo(() => {
    if (!jobs) return [];

    return jobs
      .filter(job => {
        const block = blocks?.find(b => b.id === job.blockId);
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
            const blockA = blocks?.find(b => b.id === a.blockId)?.blockNumber || '';
            const blockB = blocks?.find(b => b.id === b.blockId)?.blockNumber || '';
            comparison = blockA.localeCompare(blockB);
            break;
          }
          case 'totalSlabs':
            comparison = (a.measurements?.pieces || 0) - (b.measurements?.pieces || 0);
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
        <Text style={styles.loadingText}>Loading chemical jobs...</Text>
      </View>
    );
  }

  if (jobsError || blocksError) {
    console.error('[ChemicalList] Error state:', jobsError, blocksError);
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load chemical jobs or blocks</Text>
        <Text style={styles.errorDetail}>{jobsError?.toString() || blocksError?.toString()}</Text>
        <Button 
          title="Retry" 
          onPress={() => {
            navigation.replace('ChemicalList');
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
        searchPlaceholder="Search block number, company or color..."
      />

      <Button
        title="New Chemical Job"
        onPress={() => {
          navigation.navigate('ChemicalForm', {
            initialData: undefined
          });
        }}
        style={styles.addButton}
      />

      <FlatList
        data={filteredAndSortedJobs}
        keyExtractor={(item) => (item.id || '').toString()}
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
                  navigation.navigate('ChemicalForm', {
                    initialData: item
                  })
                }
              />
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No chemical jobs found</Text>
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
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  }
});

export default ChemicalListScreen;