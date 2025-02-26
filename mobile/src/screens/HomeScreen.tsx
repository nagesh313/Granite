import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import type { RootStackScreenProps } from '@/types/navigation';

export const HomeScreen = ({ navigation }: RootStackScreenProps<'Home'>) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Facto Mobile</Text>
        <Text style={styles.subtitle}>Manufacturing Process Management</Text>

        <View style={styles.cardsContainer}>
          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('RawMaterials')}
          >
            <Text style={styles.cardTitle}>Raw Materials</Text>
            <Text style={styles.cardText}>
              Manage granite block inventory.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('Production')}
          >
            <Text style={styles.cardTitle}>Production</Text>
            <Text style={styles.cardText}>
              Monitor granite processing.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('FinishedGoods')}
          >
            <Text style={styles.cardTitle}>Finished Goods</Text>
            <Text style={styles.cardText}>
              Track finished granite stands.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('ShippedGoods')}
          >
            <Text style={styles.cardTitle}>Shipped Goods</Text>
            <Text style={styles.cardText}>
              View and track shipped inventory.
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: Platform.select({ ios: '700', android: 'bold' }),
    marginBottom: 8,
    color: '#2563eb',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: Platform.select({ ios: '600', android: 'bold' }),
    marginBottom: 8,
    color: '#1f2937',
  },
  cardText: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default HomeScreen;