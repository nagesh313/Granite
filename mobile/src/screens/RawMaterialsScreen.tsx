import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import type { RootStackScreenProps } from '@/types/navigation';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '@/config/api';

interface Block {
  id: number;
  blockNumber: string;
  blockType: string;
  dateReceived: string;
  marka?: string;
  color?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  location?: string;
  blockWeight?: number;
  status: 'in_stock' | 'processing' | 'completed';
}

type SortField = 'dateReceived' | 'blockNumber' | 'blockType' | 'color' | 'marka';
type SortOrder = 'asc' | 'desc';

type DropdownOption = {
  label: string;
  value: string;
};

const statusOptions: DropdownOption[] = [
  { label: 'All Status', value: 'all' },
  { label: 'In Stock', value: 'in_stock' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
];

const sortOptions: DropdownOption[] = [
  { label: 'Sort by Date', value: 'dateReceived' },
  { label: 'Sort by Number', value: 'blockNumber' },
  { label: 'Sort by Type', value: 'blockType' },
  { label: 'Sort by Color', value: 'color' },
  { label: 'Sort by Company', value: 'marka' },
];

const CustomDropdown = ({
  options,
  selectedValue,
  onSelect,
  placeholder
}: {
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  placeholder: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const selectedOption = options.find(opt => opt.value === selectedValue);

  return (
    <>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.dropdownButtonText}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.modalContent}>
            <ScrollView>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.optionItem}
                  onPress={() => {
                    onSelect(option.value);
                    setIsVisible(false);
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    selectedValue === option.value && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export const RawMaterialsScreen = ({ navigation }: RootStackScreenProps<'RawMaterials'>) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAttemptedUrl, setLastAttemptedUrl] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('dateReceived');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchBlocks = async (isRetry = false) => {
    try {
      setError(null);
      if (!isRetry) {
        setLoading(true);
      }

      const apiUrl = getFullApiUrl(API_ENDPOINTS.blocks.list);
      console.log('[RawMaterials] Attempting to fetch blocks from:', apiUrl);
      setLastAttemptedUrl(apiUrl);
      setConnectionDetails('Connecting to server...');

      const data = await fetchWithRetry(apiUrl);
      console.log('[RawMaterials] Received response:', {
        dataType: typeof data,
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A',
      });

      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected an array of blocks');
      }

      setBlocks(data);
      setConnectionDetails(null);
    } catch (error) {
      console.error('[RawMaterials] Error fetching blocks:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);

      Alert.alert(
        'Connection Error',
        `Unable to load blocks. ${errorMessage}\n\nTried connecting to: ${lastAttemptedUrl}`,
        [
          {
            text: 'Retry',
            onPress: () => fetchBlocks(true)
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchBlocks();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchBlocks();
    });

    return unsubscribe;
  }, [navigation]);

  const filteredAndSortedBlocks = useMemo(() => {
    return blocks
      .filter(block => {
        const matchesSearch =
          block.blockNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (block.marka || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (block.color || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          block.blockType.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || block.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'dateReceived':
            comparison = new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime();
            break;
          case 'blockNumber':
            comparison = a.blockNumber.localeCompare(b.blockNumber);
            break;
          case 'blockType':
            comparison = a.blockType.localeCompare(b.blockType);
            break;
          case 'color':
            comparison = (a.color || '').localeCompare(b.color || '');
            break;
          case 'marka':
            comparison = (a.marka || '').localeCompare(b.marka || '');
            break;
          default:
            comparison = 0;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [blocks, searchTerm, statusFilter, sortField, sortOrder]);

  if (loading && blocks.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading blocks...</Text>
        {connectionDetails && (
          <Text style={styles.debugText}>{connectionDetails}</Text>
        )}
      </View>
    );
  }

  if (error && blocks.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        {connectionDetails && (
          <Text style={styles.debugText}>{connectionDetails}</Text>
        )}
        {lastAttemptedUrl && (
          <Text style={styles.debugText}>Last attempted URL: {lastAttemptedUrl}</Text>
        )}
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchBlocks(true)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderSearchAndFilterSection = () => (
    <View style={styles.searchFilterContainer}>
      <View style={styles.searchInputContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search blocks..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#6b7280"
        />
        {searchTerm ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchTerm('')}
          >
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <View style={[styles.dropdownContainer, statusFilter !== 'all' && styles.activeFilter]}>
          <CustomDropdown
            options={statusOptions}
            selectedValue={statusFilter}
            onSelect={setStatusFilter}
            placeholder="Select Status"
          />
        </View>

        <View style={styles.dropdownContainer}>
          <CustomDropdown
            options={sortOptions}
            selectedValue={sortField}
            onSelect={(value) => setSortField(value as SortField)}
            placeholder="Sort by"
          />
        </View>

        <TouchableOpacity
          style={[styles.sortOrderButton, { opacity: loading ? 0.5 : 1 }]}
          onPress={() => setSortOrder(current => current === 'asc' ? 'desc' : 'asc')}
          disabled={loading}
        >
          <Text style={styles.sortOrderButtonText}>
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Text>
        </TouchableOpacity>
      </View>

      {(searchTerm || statusFilter !== 'all') && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>
            Active Filters: {searchTerm ? 'Search ' : ''}{statusFilter !== 'all' ? `Status: ${statusFilter} ` : ''}
          </Text>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
          >
            <Text style={styles.clearFiltersButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderSearchAndFilterSection()}

      <FlatList
        data={filteredAndSortedBlocks}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.blockCard}
            onPress={() => {
              Alert.alert(
                'Block Details',
                `Number: ${item.blockNumber}\n` +
                `Type: ${item.blockType}\n` +
                `Company: ${item.marka || 'N/A'}\n` +
                `Color: ${item.color || 'N/A'}\n` +
                `Location: ${item.location || 'N/A'}\n` +
                `Weight: ${item.blockWeight ? `${item.blockWeight} T` : 'N/A'}\n` +
                `Dimensions: ${item.dimensions ?
                  `${item.dimensions.length}x${item.dimensions.width}x${item.dimensions.height}` :
                  'N/A'}\n` +
                `Date: ${new Date(item.dateReceived).toLocaleDateString()}`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Edit',
                    onPress: () => {
                      console.log('Edit block:', item.id);
                      // Edit functionality to be implemented
                    }
                  }
                ]
              );
            }}
          >
            <View style={styles.cardContent}>
              <View style={styles.headerRow}>
                <Text style={styles.blockNumber}>{item.blockNumber}</Text>
                <Text style={styles.marka}>{item.marka || 'N/A'}</Text>
              </View>
              <View style={styles.details}>
                <View style={styles.detailColumn}>
                  <Text style={styles.label}>Type:</Text>
                  <Text style={styles.value}>{item.blockType}</Text>
                </View>
                <View style={styles.detailColumn}>
                  <Text style={styles.label}>Color:</Text>
                  <Text style={styles.value}>{item.color || 'N/A'}</Text>
                </View>
              </View>
              <Text style={styles.date}>
                Received: {new Date(item.dateReceived).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchBlocks()} />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No blocks found</Text>
            {lastAttemptedUrl && (
              <Text style={styles.debugText}>Connected to: {lastAttemptedUrl}</Text>
            )}
          </View>
        }
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddBlock')}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  searchFilterContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    color: '#1f2937',
    flex:1,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownContainer: {
    flex: 1,
  },
  dropdownButton: {
    height: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  dropdownButtonText: {
    color: '#1f2937',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '50%',
  },
  optionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  optionText: {
    color: '#1f2937',
    fontSize: 16,
  },
  selectedOptionText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  sortOrderButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  sortOrderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    padding: 16,
  },
  blockCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
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
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockNumber: {
    fontSize: 16,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
    color: '#2563eb',
  },
  marka: {
    fontSize: 14,
    color: '#6b7280',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailColumn: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#374151',
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
  },
  debugText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  addButtonText: {
    fontSize: 28,
    color: '#fff',
    marginTop: -2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  activeFilter: {
    borderColor: '#2563eb',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  activeFiltersText: {
    fontSize: 12,
    color: '#6b7280',
  },
  clearFiltersButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  clearFiltersButtonText: {
    fontSize: 12,
    color: '#2563eb',
  },
});

export default RawMaterialsScreen;