import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { RootStackScreenProps } from '@/types/navigation';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '@/config/api';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

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

export const ShippedGoodsScreen = ({ navigation }: RootStackScreenProps<'ShippedGoods'>) => {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [search, setSearch] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: shipments = [], refetch, isLoading, error } = useQuery<ShippedGood[]>({
    queryKey: ['shipped-goods'],
    queryFn: async () => {
      console.log('[ShippedGoods] Fetching shipments from:',
        getFullApiUrl(API_ENDPOINTS.finishedGoods.shipments()));

      try {
        const response = await fetchWithRetry(
          getFullApiUrl(API_ENDPOINTS.finishedGoods.shipments()),
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('[ShippedGoods] Response received:', {
          responseData: response,
          dataSize: Array.isArray(response) ? response.length : 0,
          timestamp: new Date().toISOString()
        });

        if (!response) {
          throw new Error('No data received from server');
        }

        return response.map((shipment: any) => ({
          ...shipment,
          finishedGood: {
            ...shipment.finishedGood,
            block: shipment.finishedGood?.block || {
              blockNumber: 'N/A',
              length: 0,
              width: 0,
              height: 0
            }
          }
        }));
      } catch (error: any) {
        console.error('[ShippedGoods] Error fetching shipments:', {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    }
  });

  const calculateCoverage = (length: number, height: number, slabCount: number) => {
    const lengthFt = Math.floor((length - 6) / 12) + (Math.floor((length - 6) % 12 / 3) * 0.25);
    const heightFt = Math.floor((height - 6) / 12) + (Math.floor((height - 6) % 12 / 3) * 0.25);
    return Math.round((lengthFt * heightFt * slabCount) * 100) / 100;
  };

  const uniqueColors = Array.from(new Set(shipments.map(s => s.finishedGood.color)));
  console.log('[ShippedGoods] Unique colors:', uniqueColors);

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch =
      shipment.finishedGood.block.blockNumber.toLowerCase().includes(search.toLowerCase()) ||
      shipment.shippingCompany.toLowerCase().includes(search.toLowerCase());

    const matchesColor =
      !selectedColor || selectedColor === "all" || shipment.finishedGood.color === selectedColor;

    const shipmentDate = new Date(shipment.shippedAt);
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const matchesMonth = shipmentDate >= monthStart && shipmentDate <= monthEnd;

    return matchesSearch && matchesColor && matchesMonth;
  });

  console.log('[ShippedGoods] Filtered shipments:', filteredShipments.length);

  const monthlyTotalSlabs = filteredShipments.reduce((total, shipment) =>
    total + shipment.slabsShipped, 0);

  const monthlyTotalCoverage = filteredShipments.reduce((total, shipment) =>
    total + calculateCoverage(
      shipment.finishedGood.block.length,
      shipment.finishedGood.block.height,
      shipment.slabsShipped
    ), 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('[ShippedGoods] Refresh error:', error);
      Alert.alert('Error', 'Failed to refresh shipments');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEditShipment = (shipment: ShippedGood) => {
    console.log('[ShippedGoods] Navigating to edit shipment:', {
      shipmentId: shipment.id,
      timestamp: new Date().toISOString()
    });
    navigation.navigate('EditShipment', { shipmentId: shipment.id });
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: date,
      label: format(date, 'MMMM yyyy')
    };
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading shipments...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Failed to load shipments. Please try again.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Shipped Goods</Text>
          <Text style={styles.subtitle}>Track and monitor shipped inventory</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Monthly Summary</Text>
          <Text style={styles.cardSubtitle}>
            {format(selectedMonth, 'MMMM yyyy')}
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Slabs</Text>
              <Text style={styles.summaryValue}>{monthlyTotalSlabs}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Area</Text>
              <Text style={styles.summaryValue}>{monthlyTotalCoverage.toFixed(2)} sq ft</Text>
            </View>
          </View>
        </View>

        <View style={styles.filtersCard}>
          <Text style={styles.cardTitle}>Filters</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.monthPicker}
          >
            {monthOptions.map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.monthOption,
                  selectedMonth.getMonth() === option.value.getMonth() &&
                    selectedMonth.getFullYear() === option.value.getFullYear() &&
                    styles.selectedMonth
                ]}
                onPress={() => setSelectedMonth(option.value)}
              >
                <Text
                  style={[
                    styles.monthText,
                    selectedMonth.getMonth() === option.value.getMonth() &&
                      selectedMonth.getFullYear() === option.value.getFullYear() &&
                      styles.selectedMonthText
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.colorPicker}
          >
            <TouchableOpacity
              style={[
                styles.colorOption,
                (!selectedColor || selectedColor === "all") && styles.selectedColor
              ]}
              onPress={() => setSelectedColor("all")}
            >
              <Text style={[
                styles.colorText,
                (!selectedColor || selectedColor === "all") && styles.selectedColorText
              ]}>All Colors</Text>
            </TouchableOpacity>
            {uniqueColors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  selectedColor === color && styles.selectedColor
                ]}
                onPress={() => setSelectedColor(color)}
              >
                <Text style={[
                  styles.colorText,
                  selectedColor === color && styles.selectedColorText
                ]}>{color}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by block number or company"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <View style={styles.shipmentsList}>
          {filteredShipments.map((shipment) => (
            <TouchableOpacity
              key={shipment.id}
              style={styles.shipmentCard}
              onPress={() => handleEditShipment(shipment)}
            >
              <View style={styles.shipmentHeader}>
                <View style={styles.blockInfo}>
                  <Text style={styles.blockNumber}>
                    Block {shipment.finishedGood.block.blockNumber}
                  </Text>
                  <View style={styles.colorBadge}>
                    <Text style={styles.colorBadgeText}>{shipment.finishedGood.color}</Text>
                  </View>
                </View>
                <Text style={styles.dateText}>
                  {format(new Date(shipment.shippedAt), 'PPP')}
                </Text>
              </View>

              <Text style={styles.dimensions}>
                <Text style={styles.dimensionsLabel}>(L × W × H): </Text>
                {shipment.finishedGood.block.length}″ × {shipment.finishedGood.block.width}″ × {shipment.finishedGood.block.height}″
              </Text>

              <View style={styles.shipmentDetails}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Company</Text>
                  <Text style={styles.detailValue}>{shipment.shippingCompany}</Text>
                </View>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Slabs Shipped</Text>
                  <Text style={styles.detailValue}>{shipment.slabsShipped}</Text>
                </View>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Area</Text>
                  <Text style={styles.detailValue}>
                    {calculateCoverage(
                      shipment.finishedGood.block.length,
                      shipment.finishedGood.block.height,
                      shipment.slabsShipped
                    )} sq ft
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {filteredShipments.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No shipments found for the selected filters
              </Text>
            </View>
          )}
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
    fontSize: 24,
    fontWeight: Platform.select({ ios: '700', android: 'bold' }),
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  summaryCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  filtersCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  monthPicker: {
    marginVertical: 12,
  },
  monthOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  selectedMonth: {
    backgroundColor: '#2563eb',
  },
  monthText: {
    fontSize: 14,
    color: '#4b5563',
  },
  selectedMonthText: {
    color: '#fff',
  },
  colorPicker: {
    marginBottom: 12,
  },
  colorOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  selectedColor: {
    backgroundColor: '#2563eb',
  },
  colorText: {
    fontSize: 14,
    color: '#4b5563',
  },
  selectedColorText: {
    color: '#fff',
  },
  searchContainer: {
    marginTop: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  shipmentsList: {
    padding: 16,
    paddingTop: 0,
  },
  shipmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  colorBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  colorBadgeText: {
    fontSize: 12,
    color: '#4b5563',
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
  },
  dimensions: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  dimensionsLabel: {
    color: '#9ca3af',
  },
  shipmentDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  detailBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ShippedGoodsScreen;