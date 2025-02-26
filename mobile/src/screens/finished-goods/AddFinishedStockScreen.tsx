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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootStackScreenProps } from '@/types/navigation';
import { getFullApiUrl, API_ENDPOINTS, fetchWithRetry } from '@/config/api';

interface Block {
  id: number;
  blockNumber: string;
  blockType: string;
  color: string;
}

// Change to named export
export const AddFinishedStockScreen: React.FC<RootStackScreenProps<'AddFinishedStock'>> = ({ 
  navigation,
  route 
}) => {
  console.log('[AddFinishedStock] Mounted with params:', route.params);

  const queryClient = useQueryClient();
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [slabCount, setSlabCount] = useState('1');

  const { data: blocks = [] } = useQuery<Block[]>({
    queryKey: ['blocks'],
    queryFn: async () => {
      const response = await fetchWithRetry(getFullApiUrl(API_ENDPOINTS.blocks.list));
      return response || [];
    }
  });

  const addStockMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBlock) {
        throw new Error('Please select a block');
      }

      const response = await fetchWithRetry(
        getFullApiUrl(API_ENDPOINTS.finishedGoods.add),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            standId: route.params?.standId,
            blockId: selectedBlock.id,
            slabCount: parseInt(slabCount),
            stockAddedAt: new Date().toISOString(),
          }),
        }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stands'] });
      Alert.alert('Success', 'Stock added successfully');
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Finished Stock</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Block</Text>
            <ScrollView style={styles.blockList}>
              {blocks.map((block) => (
                <TouchableOpacity
                  key={block.id}
                  style={[
                    styles.blockItem,
                    selectedBlock?.id === block.id && styles.selectedBlock
                  ]}
                  onPress={() => setSelectedBlock(block)}
                >
                  <Text style={styles.blockNumber}>Block {block.blockNumber}</Text>
                  <View style={styles.blockDetails}>
                    <Text style={styles.blockInfo}>Type: {block.blockType}</Text>
                    <Text style={styles.blockInfo}>Color: {block.color}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Number of Slabs</Text>
            <TextInput
              style={styles.input}
              value={slabCount}
              onChangeText={setSlabCount}
              keyboardType="numeric"
              placeholder="Enter number of slabs"
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
                styles.addButton,
                (!selectedBlock || !slabCount) && styles.disabledButton
              ]}
              onPress={() => addStockMutation.mutate()}
              disabled={!selectedBlock || !slabCount}
            >
              <Text style={styles.addButtonText}>Add Stock</Text>
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
  blockList: {
    maxHeight: 300,
  },
  blockItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedBlock: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  blockNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  blockDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  blockInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
  addButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#93c5fd',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Change to named export
export default AddFinishedStockScreen;