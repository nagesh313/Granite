import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';

export type ProductionStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'skipped' | 'defective';
export type SortField = 'startTime' | 'endTime' | 'blockNumber' | 'totalSlabs';
export type SortOrder = 'asc' | 'desc';

export type DropdownOption = {
  label: string;
  value: string;
};

interface ProductionFilterProps {
  searchTerm: string;
  onSearchChange: (text: string) => void;
  statusFilter: ProductionStatus;
  onStatusChange: (status: ProductionStatus) => void;
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
  additionalFilters?: DropdownOption[];
  onAdditionalFilterChange?: (value: string) => void;
  selectedAdditionalFilter?: string;
  searchPlaceholder?: string;
}

const defaultStatusOptions: DropdownOption[] = [
  { label: 'All Status', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Skipped', value: 'skipped' },
  { label: 'Defective', value: 'defective' },
];

const defaultSortOptions: DropdownOption[] = [
  { label: 'Sort by Start Time', value: 'startTime' },
  { label: 'Sort by End Time', value: 'endTime' },
  { label: 'Sort by Block Number', value: 'blockNumber' },
  { label: 'Sort by Total Slabs', value: 'totalSlabs' },
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

export const ProductionFilter: React.FC<ProductionFilterProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
  additionalFilters,
  onAdditionalFilterChange,
  selectedAdditionalFilter,
  searchPlaceholder = 'Search jobs...',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.searchInputContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChangeText={onSearchChange}
          placeholderTextColor="#6b7280"
        />
        {searchTerm ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onSearchChange('')}
          >
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <View style={[styles.dropdownContainer, statusFilter !== 'all' && styles.activeFilter]}>
          <CustomDropdown
            options={defaultStatusOptions}
            selectedValue={statusFilter}
            onSelect={(value) => onStatusChange(value as ProductionStatus)}
            placeholder="Select Status"
          />
        </View>

        <View style={styles.dropdownContainer}>
          <CustomDropdown
            options={defaultSortOptions}
            selectedValue={sortField}
            onSelect={(value) => onSortFieldChange(value as SortField)}
            placeholder="Sort by"
          />
        </View>

        <TouchableOpacity
          style={styles.sortOrderButton}
          onPress={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          <Text style={styles.sortOrderButtonText}>
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Text>
        </TouchableOpacity>
      </View>

      {additionalFilters && (
        <View style={[styles.dropdownContainer, styles.additionalFilterContainer]}>
          <CustomDropdown
            options={additionalFilters}
            selectedValue={selectedAdditionalFilter || ''}
            onSelect={(value) => onAdditionalFilterChange?.(value)}
            placeholder="Additional Filters"
          />
        </View>
      )}

      {(searchTerm || statusFilter !== 'all' || selectedAdditionalFilter) && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>
            Active Filters: 
            {searchTerm ? 'Search ' : ''}
            {statusFilter !== 'all' ? `Status: ${statusFilter} ` : ''}
            {selectedAdditionalFilter ? `Filter: ${selectedAdditionalFilter} ` : ''}
          </Text>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              onSearchChange('');
              onStatusChange('all');
              if (onAdditionalFilterChange) {
                onAdditionalFilterChange('');
              }
            }}
          >
            <Text style={styles.clearFiltersButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    color: '#1f2937',
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownContainer: {
    flex: 1,
  },
  additionalFilterContainer: {
    marginTop: 8,
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

export default ProductionFilter;