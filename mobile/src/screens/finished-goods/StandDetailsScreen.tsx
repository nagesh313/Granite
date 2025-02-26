import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { RootStackScreenProps } from '@/types/navigation';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '@/config/api';

interface Block {
  id: number;
  blockNumber: string;
  blockType: string;
  length: number;
  width: number;
  height: number;
  color: string;
}

interface FinishedGood {
  id: number;
  blockId: number;
  slabCount: number;
  stock_added_at: string;
  mediaCount: number;
  block: Block;
}

export const StandDetailsScreen = ({ 
  route,
  navigation 
}: RootStackScreenProps<'StandDetails'>) => {
  const { data: finishedGoods = [], isLoading } = useQuery<FinishedGood[]>({
    queryKey: ['finished-goods', route.params.standId],
    queryFn: async () => {
      const response = await fetchWithRetry(
        getFullApiUrl(`${API_ENDPOINTS.finishedGoods.byStand}/${route.params.standId}`)
      );
      return response || [];
    }
  });

  const calculateCoverage = (item: FinishedGood) => {
    if (!item.block?.length || !item.block?.height) return 0;

    const lengthFt = Math.floor((item.block.length - 6) / 12) +
      (Math.floor(((item.block.length - 6) % 12) / 3) * 0.25);
    const heightFt = Math.floor((item.block.height - 6) / 12) +
      (Math.floor(((item.block.height - 6) % 12) / 3) * 0.25);

    return Math.round((lengthFt * heightFt * item.slabCount) * 100) / 100;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {finishedGoods.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <View style={styles.sectionColumn}>
                    <Text style={styles.label}>Block Number</Text>
                    <Text style={styles.value}>{item.block.blockNumber}</Text>
                  </View>
                  <View style={styles.sectionColumn}>
                    <Text style={styles.label}>Block Type</Text>
                    <Text style={styles.value}>{item.block.blockType}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <View style={styles.sectionColumn}>
                    <Text style={styles.label}>Dimensions (L×W×H)</Text>
                    <Text style={styles.value}>
                      {item.block.length}″ × {item.block.width || '-'}″ × {item.block.height}″
                    </Text>
                  </View>
                  <View style={styles.sectionColumn}>
                    <Text style={styles.label}>Color</Text>
                    <Text style={styles.value}>{item.block.color}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <View style={styles.sectionColumn}>
                    <Text style={styles.label}>Slabs</Text>
                    <Text style={styles.value}>{item.slabCount}</Text>
                  </View>
                  <View style={styles.sectionColumn}>
                    <Text style={styles.label}>Coverage</Text>
                    <Text style={styles.value}>{calculateCoverage(item)} sq ft</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Added On</Text>
                <Text style={styles.value}>
                  {item.stock_added_at
                    ? new Date(item.stock_added_at).toLocaleString()
                    : 'N/A'}
                </Text>
              </View>

              {item.mediaCount > 0 && (
                <TouchableOpacity 
                  style={styles.mediaButton}
                  onPress={() => {
                    // TODO: Implement media gallery view
                    console.log('View media for item:', item.id);
                  }}
                >
                  <Text style={styles.mediaButtonText}>
                    View Media ({item.mediaCount})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {!isLoading && (!finishedGoods || finishedGoods.length === 0) && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No finished goods in this stand</Text>
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
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
  cardContent: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  sectionColumn: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  mediaButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  mediaButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default StandDetailsScreen;
