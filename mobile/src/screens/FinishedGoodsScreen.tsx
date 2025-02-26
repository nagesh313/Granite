import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  SafeAreaView,
  StatusBar,
  SectionList,
  Dimensions,
  ScrollView,
} from 'react-native';
import type { RootStackScreenProps } from '@/types/navigation';
import { useQuery } from '@tanstack/react-query';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '@/config/api';

interface Stand {
  id: number;
  rowNumber: number;
  position: number;
  maxCapacity: number;
  currentSlabs: number;
  coverage: number;
}

const ROWS = [1, 2, 3, 4]; // 4 rows total
const STANDS_PER_ROW = 14; // 14 stands per row
const MAX_CAPACITY = 200;

export const FinishedGoodsScreen = ({ navigation }: RootStackScreenProps<'FinishedGoods'>) => {
  const [selectedStand, setSelectedStand] = useState<Stand | null>(null);

  const { data: rawStands = [], isLoading } = useQuery<Stand[]>({
    queryKey: ['stands'],
    queryFn: async () => {
      try {
        const response = await fetchWithRetry(
          getFullApiUrl(API_ENDPOINTS.finishedGoods.stands)
        );
        return response || [];
      } catch (error) {
        console.error('Error fetching stands:', error);
        return [];
      }
    }
  });

  // Group stands by row and ensure exactly 14 stands per row
  const groupedStands = ROWS.map(rowNumber => {
    const rowStands = rawStands
      .filter(stand => stand.rowNumber === rowNumber)
      .sort((a, b) => a.position - b.position);

    const emptyStandsNeeded = STANDS_PER_ROW - rowStands.length;
    const emptyStands = Array.from(
      { length: emptyStandsNeeded },
      (_, i) => ({
        id: -(rowNumber * 100 + i),
        rowNumber,
        position: rowStands.length + i + 1,
        maxCapacity: MAX_CAPACITY,
        currentSlabs: 0,
        coverage: 0
      })
    );

    const stands = [...rowStands, ...emptyStands].slice(0, STANDS_PER_ROW);

    return {
      title: `Row ${rowNumber}`,
      data: [stands]
    };
  });

  const handleAddStock = () => {
    console.log('[Navigation] Selected stand before AddFinishedStock:', selectedStand);
    // Always pass an object with optional standId
    navigation.navigate('AddFinishedStock', {
      standId: selectedStand?.id
    });
  };

  const handleShipGoods = () => {
    console.log('[Navigation] Selected stand before ShipFinishedGoods:', selectedStand);
    // Always pass an object with optional standId
    navigation.navigate('ShipFinishedGoods', {
      standId: selectedStand?.id
    });
  };

  const handleStandSelect = (stand: Stand) => {
    console.log('[Navigation] Stand selected:', stand);
    setSelectedStand(stand);
    if (stand.currentSlabs > 0) {
      console.log('[Navigation] Navigating to StandDetails with id:', stand.id);
      navigation.navigate('StandDetails', {
        standId: stand.id
      });
    }
  };

  const getCapacityPercentage = (currentSlabs: number | string, maxCapacity: number) => {
    const current = typeof currentSlabs === 'string' ? parseInt(currentSlabs, 10) : currentSlabs;
    return (current / maxCapacity) * 100;
  };

  const getStandStyles = (stand: Stand) => {
    const percentage = getCapacityPercentage(stand.currentSlabs, stand.maxCapacity);
    const baseStyle = [styles.standCard];

    if (stand.id === selectedStand?.id) {
      baseStyle.push(styles.selectedCard);
    }

    if (stand.currentSlabs === 0) {
      return [...baseStyle, styles.emptyCard];
    }

    if (percentage >= 90) {
      return [...baseStyle, styles.dangerCard];
    } else if (percentage >= 70) {
      return [...baseStyle, styles.warningCard];
    } else if (percentage >= 40) {
      return [...baseStyle, styles.infoCard];
    }
    return [...baseStyle, styles.successCard];
  };

  const renderStandItem = ({ item, index }: { item: Stand, index: number }) => (
    <TouchableOpacity 
      style={[
        ...getStandStyles(item),
        index === STANDS_PER_ROW - 1 && styles.lastStandInRow
      ]}
      onPress={() => handleStandSelect(item)}
    >
      <View style={styles.standContent}>
        <Text style={styles.standName}>
          R{item.rowNumber}-{String(item.position).padStart(2, '0')}
        </Text>
        <View style={styles.capacityContainer}>
          <Text style={styles.capacityText}>
            {item.currentSlabs}
            <Text style={styles.maxCapacity}> / {item.maxCapacity}</Text>
          </Text>
          <Text style={styles.slabsText}>slabs</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderRow = ({ section: { data } }: { section: { data: Stand[][] } }) => (
    <ScrollView 
      horizontal
      showsHorizontalScrollIndicator={true}
      contentContainerStyle={styles.rowScrollContent}
    >
      <View style={styles.rowContainer}>
        {data[0].map((item, index) => (
          <View key={item.id} style={styles.standWrapper}>
            {renderStandItem({ item, index })}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Finished Goods</Text>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendColor} />
          <Text style={styles.legendText}>&lt; 40%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.legendInfo]} />
          <Text style={styles.legendText}>40-70%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.legendWarning]} />
          <Text style={styles.legendText}>70-90%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.legendDanger]} />
          <Text style={styles.legendText}>&gt; 90%</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.button, styles.addButton]}
          onPress={handleAddStock}
        >
          <Text style={styles.buttonText}>Add Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.shipButton]}
          onPress={handleShipGoods}
        >
          <Text style={styles.buttonText}>Ship Goods</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={groupedStands}
        renderItem={renderRow}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item, index) => index.toString()}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_PADDING = 8;
const STANDS_GAP = 4;
const STAND_SIZE = Math.floor((SCREEN_WIDTH - (CONTENT_PADDING * 2) - (STANDS_GAP * 4)) / 5);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  legendInfo: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  legendWarning: {
    backgroundColor: '#f97316',
    borderColor: '#ea580c',
  },
  legendDanger: {
    backgroundColor: '#ef4444',
    borderColor: '#dc2626',
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    height: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
    color: '#111827',
  },
  button: {
    flex: 1,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: '#2563eb',
  },
  shipButton: {
    backgroundColor: '#4f46e5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
  },
  listContainer: {
    paddingHorizontal: CONTENT_PADDING,
  },
  rowScrollContent: {
    paddingHorizontal: CONTENT_PADDING,
  },
  rowContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: STANDS_GAP,
  },
  standWrapper: {
    width: STAND_SIZE,
    aspectRatio: 1,
  },
  lastStandInRow: {
    marginRight: 0,
  },
  sectionHeader: {
    backgroundColor: '#f9fafb',
    padding: 8,
    marginVertical: 4,
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  standCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
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
  selectedCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  standContent: {
    flex: 1,
    padding: 4,
    justifyContent: 'space-between',
  },
  emptyCard: {
    opacity: 0.7,
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  successCard: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  infoCard: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  warningCard: {
    backgroundColor: '#ffedd5',
    borderColor: '#ea580c',
  },
  dangerCard: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
  },
  standName: {
    fontSize: 12,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  capacityContainer: {
    alignItems: 'center',
  },
  capacityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  maxCapacity: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6b7280',
  },
  slabsText: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default FinishedGoodsScreen;