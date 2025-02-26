import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootStackScreenProps } from '@/types/navigation';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '@/config/api';

interface Block {
  blockNumber: string;
  length: number;
  width: number;
  height: number;
}

interface FinishedGood {
  block: Block;
  color: string;
}

interface ShippedGood {
  id: number;
  slabsShipped: number;
  shippedAt: string;
  shippingCompany: string;
  finishedGood: FinishedGood;
}

export const EditShipmentScreen = ({
  navigation,
  route,
}: RootStackScreenProps<'EditShipment'>) => {
  const queryClient = useQueryClient();
  const [shipment, setShipment] = useState<ShippedGood | null>(null);
  const [slabsShipped, setSlabsShipped] = useState('');
  const [shippingCompany, setShippingCompany] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
    const fetchShipment = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const endpoint = API_ENDPOINTS.finishedGoods.shipments(route.params.shipmentId);
        const fullUrl = getFullApiUrl(endpoint);

        console.log('[EditShipment] Fetching shipment details:', {
          shipmentId: route.params.shipmentId,
          endpoint,
          fullUrl,
          timestamp: new Date().toISOString()
        });

        const response = await fetchWithRetry(
          fullUrl,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('[EditShipment] Response received:', {
          response,
          responseType: typeof response,
          hasData: !!response,
          timestamp: new Date().toISOString()
        });

        if (!response) {
          throw new Error('No data received from server');
        }

        setShipment(response);
        setSlabsShipped(response.slabsShipped.toString());
        setShippingCompany(response.shippingCompany);
      } catch (err: any) {
        console.error('[EditShipment] Fetch error:', {
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });

        let errorMessage = 'Failed to load shipment details';

        // Enhanced error messaging for specific error cases
        if (err.message.includes('Unexpected character: <')) {
          errorMessage = 'Server returned invalid data format. Please try again later.';
        } else if (err.message.includes('NetworkError')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Failed to connect to the server. Please try again.';
        }

        setError(errorMessage);
        Alert.alert(
          'Error',
          errorMessage,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchShipment();
  }, [route.params.shipmentId, navigation]);

  const updateShipmentMutation = useMutation({
    mutationFn: async () => {
      if (!shipment) throw new Error('No shipment data available');

      const endpoint = API_ENDPOINTS.finishedGoods.shipments(route.params.shipmentId);
      const fullUrl = getFullApiUrl(endpoint);

      console.log('[EditShipment] Updating shipment:', {
        id: route.params.shipmentId,
        slabsShipped,
        shippingCompany,
        url: fullUrl
      });

      const response = await fetchWithRetry(
        fullUrl,
        {
          method: 'PUT',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slabsShipped: parseInt(slabsShipped, 10),
            shippedAt: shipment.shippedAt,
            shippingCompany,
          }),
        }
      );

      console.log('[EditShipment] Update response:', response);

      if (!response || response.error) {
        throw new Error(response?.error || 'Failed to update shipment');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipped-goods'] });
      Alert.alert('Success', 'Shipment updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    },
    onError: (error: Error) => {
      console.error('[EditShipment] Update error:', {
        error: error.message,
        stack: error.stack
      });
      Alert.alert(
        'Error',
        `Failed to update shipment: ${error.message}`,
        [{ text: 'OK' }]
      );
    },
  });

  const handleUpdate = () => {
    if (!slabsShipped || !shippingCompany) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const slabCount = parseInt(slabsShipped, 10);
    if (isNaN(slabCount) || slabCount <= 0) {
      Alert.alert('Error', 'Please enter a valid number of slabs');
      return;
    }

    updateShipmentMutation.mutate();
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading || !shipment) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading shipment details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Shipment</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Block Details</Text>
            {shipment && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Block Number</Text>
                  <Text style={styles.value}>{shipment.finishedGood.block.blockNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Color</Text>
                  <Text style={styles.value}>{shipment.finishedGood.color}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Dimensions</Text>
                  <Text style={styles.value}>
                    {shipment.finishedGood.block.length}″ × {shipment.finishedGood.block.width}″ × {shipment.finishedGood.block.height}″
                  </Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipment Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Number of Slabs</Text>
              <TextInput
                style={styles.input}
                value={slabsShipped}
                onChangeText={setSlabsShipped}
                keyboardType="numeric"
                placeholder="Enter number of slabs"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shipping Company</Text>
              <TextInput
                style={styles.input}
                value={shippingCompany}
                onChangeText={setShippingCompany}
                placeholder="Enter shipping company name"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.updateButton,
            (!slabsShipped || !shippingCompany || updateShipmentMutation.isPending) && styles.disabledButton
          ]}
          onPress={handleUpdate}
          disabled={!slabsShipped || !shippingCompany || updateShipmentMutation.isPending}
        >
          <Text style={styles.updateButtonText}>
            {updateShipmentMutation.isPending ? 'Updating...' : 'Update Shipment'}
          </Text>
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
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
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#a5b4fc',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditShipmentScreen;