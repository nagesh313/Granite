import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINTS, fetchWithRetry, getFullApiUrl } from '@/config/api';
import type { RootStackScreenProps } from '@/types/navigation';
import type { ProductionStatus } from '@/types/schema';

type ProductionAnalytics = {
  totalJobs: number;
  inProgress: number;
  completed: number;
  averageCuttingTime: number;
  dailyJobs: number;
  weeklyJobs: number;
  monthlyJobs: number;
};

type ProductionJob = {
  id: string;
  status: ProductionStatus;
  completedAt?: string;
};

export const ProductionScreen = ({ navigation }: RootStackScreenProps<'Production'>) => {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['production-analytics'],
    queryFn: async () => {
      console.log('[Production] Fetching analytics from:', getFullApiUrl(API_ENDPOINTS.analytics));
      try {
        const response = await fetchWithRetry(getFullApiUrl(API_ENDPOINTS.analytics));
        console.log('[Production] Analytics response:', JSON.stringify(response, null, 2));
        return response as ProductionAnalytics;
      } catch (err) {
        console.error('[Production] Error fetching analytics:', err);
        throw err;
      }
    }
  });

  const { data: jobs, isLoading: isJobsLoading } = useQuery({
    queryKey: ['production-jobs'],
    queryFn: async () => {
      console.log('[Production] Fetching jobs from:', getFullApiUrl(API_ENDPOINTS.productionJobs));
      try {
        const response = await fetchWithRetry(getFullApiUrl(API_ENDPOINTS.productionJobs));
        console.log('[Production] Jobs response:', JSON.stringify(response, null, 2));
        return response as ProductionJob[];
      } catch (err) {
        console.error('[Production] Error fetching jobs:', err);
        throw err;
      }
    }
  });

  if (isLoading || isJobsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading production data...</Text>
      </View>
    );
  }

  if (error) {
    console.error('[Production] Rendering error state:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load production data</Text>
        <Text style={styles.errorDetail}>{error.toString()}</Text>
      </View>
    );
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const activeJobs = jobs?.filter(job => job.status === 'in_progress')?.length || 0;
  const completedToday = jobs?.filter(job => {
    const today = new Date();
    const jobDate = new Date(job.completedAt || '');
    return jobDate.toDateString() === today.toDateString() && job.status === 'completed';
  })?.length || 0;

  console.log('[Production] Rendering with data:', {
    activeJobs,
    completedToday,
    analyticsPresent: !!analytics,
    jobsPresent: !!jobs
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Production Status</Text>

        <Card style={styles.statusCard}>
          <Text style={styles.cardTitle}>Current Production</Text>
          <Text style={styles.statusText}>Active Jobs: {activeJobs}</Text>
          <Text style={styles.statusText}>In Progress: {analytics?.inProgress || 0}</Text>
          <Text style={styles.statusText}>Completed Today: {completedToday}</Text>
        </Card>

        <Card style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Latest Updates</Text>
          <Text style={styles.updateText}>• Total Jobs: {analytics?.totalJobs || 0}</Text>
          <Text style={styles.updateText}>• Average Time: {formatTime(analytics?.averageCuttingTime || 0)}</Text>
          <Text style={styles.updateText}>• Monthly Jobs: {analytics?.monthlyJobs || 0}</Text>
        </Card>

        <View style={styles.buttonGroup}>
          <Button 
            title="View Cutting Jobs" 
            onPress={() => navigation.navigate('CuttingList')}
            style={styles.button}
          />
          <Button 
            title="View Grinding Jobs" 
            onPress={() => navigation.navigate('GrindingList')}
            style={[styles.button, { backgroundColor: '#6366f1' }]}
          />
          <Button 
            title="View Chemical Jobs" 
            onPress={() => navigation.navigate('ChemicalList')}
            style={[styles.button, { backgroundColor: '#14b8a6' }]}
          />
          <Button 
            title="View Epoxy Jobs" 
            onPress={() => navigation.navigate('EpoxyList')}
            style={[styles.button, { backgroundColor: '#8b5cf6' }]}
          />
          <Button 
            title="View Polish Jobs" 
            onPress={() => navigation.navigate('PolishList')}
            style={[styles.button, { backgroundColor: '#ec4899' }]}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#2563eb',
  },
  statusCard: {
    marginBottom: 16,
  },
  detailsCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f2937',
  },
  statusText: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 8,
  },
  updateText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 6,
  },
  buttonGroup: {
    gap: 12,
  },
  button: {
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4b5563',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    padding: 20,
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
});

export default ProductionScreen;