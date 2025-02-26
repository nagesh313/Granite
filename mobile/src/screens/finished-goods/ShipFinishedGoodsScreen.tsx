import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootStackScreenProps } from '@/types/navigation';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '@/config/api';

interface FinishedGood {
  id: number;
  blockId: number;
  slabCount: number;
  block: {
    blockNumber: string;
    blockType: string;
    quality: string;
  };
}

export const ShipFinishedGoodsScreen: React.FC<RootStackScreenProps<'ShipFinishedGoods'>> = ({ 
  navigation,
  route 
}) => {
  const queryClient = useQueryClient();
  const [selectedGood, setSelectedGood] = useState<FinishedGood | null>(null);
  const [slabsToShip, setSlabsToShip] = useState('1');
  const [shippingCompany, setShippingCompany] = useState('');

  const { data: finishedGoods = [], isLoading: isLoadingGoods, error: finishedGoodsError } = useQuery<FinishedGood[]>({
    queryKey: ['finished-goods', route.params?.standId],
    queryFn: async () => {
      try {
        const url = getFullApiUrl(`${API_ENDPOINTS.finishedGoods.byStand}/${route.params?.standId}`);
        console.log('[ShipFinishedGoods] Fetching from URL:', url);
        const response = await fetchWithRetry(url);
        console.log('[ShipFinishedGoods] Fetched goods:', response);
        return response || [];
      } catch (error) {
        console.error('[ShipFinishedGoods] Error fetching goods:', error);
        throw error;
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000)
  });

  const shipGoodsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGood) {
        throw new Error('Please select a finished good');
      }

      const payload = {
        finishedGoodId: selectedGood.id,
        slabsShipped: parseInt(slabsToShip),
        shippingCompany,
        shippingDate: new Date().toISOString(),
      };

      console.log('[ShipFinishedGoods] Shipping goods with payload:', payload);

      const url = getFullApiUrl(API_ENDPOINTS.finishedGoods.ship);
      console.log('[ShipFinishedGoods] Shipping to URL:', url);

      return await fetchWithRetry(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stands'] });
      Alert.alert('Success', 'Goods shipped successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    },
    onError: (error: Error) => {
      console.error('[ShipFinishedGoods] Shipping error:', error);
      Alert.alert(
        'Error',
        'Failed to ship goods. Please try again later.',
        [{ text: 'OK' }]
      );
    },
  });

  // Show loading state
  if (isLoadingGoods) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading finished goods...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (finishedGoodsError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Unable to load finished goods. Please try again later.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Ship Finished Goods</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Finished Good</Text>
            <ScrollView style={styles.goodsList}>
              {finishedGoods.map((good) => (
                <TouchableOpacity
                  key={good.id}
                  style={[
                    styles.goodItem,
                    selectedGood?.id === good.id && styles.selectedGood
                  ]}
                  onPress={() => setSelectedGood(good)}
                >
                  <Text style={styles.goodNumber}>Block {good.block.blockNumber}</Text>
                  <View style={styles.goodDetails}>
                    <Text style={styles.goodInfo}>Type: {good.block.blockType}</Text>
                    <Text style={styles.goodInfo}>Available: {good.slabCount} slabs</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {finishedGoods.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No finished goods available for shipping
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Number of Slabs to Ship</Text>
            <TextInput
              style={styles.input}
              value={slabsToShip}
              onChangeText={setSlabsToShip}
              keyboardType="numeric"
              placeholder="Enter number of slabs"
              editable={!!selectedGood}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Company</Text>
            <TextInput
              style={styles.input}
              value={shippingCompany}
              onChangeText={setShippingCompany}
              placeholder="Enter shipping company name"
              editable={!!selectedGood}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.shipButton,
                (!selectedGood || !slabsToShip || !shippingCompany || shipGoodsMutation.isLoading) && 
                styles.disabledButton
              ]}
              onPress={() => shipGoodsMutation.mutate()}
              disabled={!selectedGood || !slabsToShip || !shippingCompany || shipGoodsMutation.isLoading}
            >
              {shipGoodsMutation.isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.shipButtonText}>Ship Goods</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
    color: '#111827',
  },
  form: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  goodsList: {
    maxHeight: 300,
  },
  goodItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedGood: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  goodNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  goodDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goodInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  shipButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#a5b4fc',
  },
  shipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default ShipFinishedGoodsScreen;