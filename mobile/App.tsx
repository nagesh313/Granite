import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppNavigator } from './src/navigation/app-navigator';
import { Platform } from 'react-native';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer>
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}