import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { CuttingListScreen } from '../screens/cutting/cutting-list-screen';
import { CuttingFormScreen } from '../screens/cutting/cutting-form-screen';
import { GrindingFormScreen } from '../screens/grinding/grinding-form-screen';
import { GrindingListScreen } from '../screens/grinding/grinding-list-screen';
import { ChemicalListScreen } from '../screens/chemical/chemical-list-screen';
import { ChemicalFormScreen } from '../screens/chemical/chemical-form-screen';
import { EpoxyListScreen } from '../screens/epoxy/epoxy-list-screen';
import { EpoxyFormScreen } from '../screens/epoxy/epoxy-form-screen';
import { PolishListScreen } from '../screens/polish/polish-list-screen';
import { PolishFormScreen } from '../screens/polish/polish-form-screen';
import { FinishedGoodsScreen } from '../screens/FinishedGoodsScreen';
import { AddFinishedStockScreen } from '../screens/finished-goods/AddFinishedStockScreen';
import { ShipFinishedGoodsScreen } from '../screens/finished-goods/ShipFinishedGoodsScreen';
import { StandDetailsScreen } from '../screens/finished-goods/StandDetailsScreen';
import { ShippedGoodsScreen } from '../screens/finished-goods/ShippedGoodsScreen';
import { EditShipmentScreen } from '../screens/finished-goods/EditShipmentScreen';
import HomeScreen from '../screens/HomeScreen';
import ProductionScreen from '../screens/ProductionScreen';
import RawMaterialsScreen from '../screens/RawMaterialsScreen';
import AddBlockScreen from '../screens/AddBlockScreen';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Add navigation state listener for debugging
const navigationStateChange = (state: any) => {
  console.log('[Navigation] State changed:', {
    index: state?.index,
    routeNames: state?.routeNames,
    currentRoute: state?.routes?.[state?.index]
  });
};

export function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#F9FAFB',
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: Platform.select({ ios: '600', android: 'bold' }) ?? '600',
        },
      }}
      screenListeners={{
        state: (e) => {
          navigationStateChange(e.data);
        },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Facto',
        }}
      />
      <Stack.Screen
        name="Production"
        component={ProductionScreen}
        options={{
          title: 'Production',
        }}
      />
      <Stack.Screen
        name="RawMaterials"
        component={RawMaterialsScreen}
        options={{
          title: 'Raw Materials',
        }}
      />
      <Stack.Screen
        name="FinishedGoods"
        component={FinishedGoodsScreen}
        options={{
          title: 'Finished Goods',
        }}
      />
      <Stack.Screen
        name="AddFinishedStock"
        component={AddFinishedStockScreen}
        options={{
          title: 'Add Stock',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ShipFinishedGoods"
        component={ShipFinishedGoodsScreen}
        options={{
          title: 'Ship Goods',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="StandDetails"
        component={StandDetailsScreen}
        options={{
          title: 'Stand Details',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ShippedGoods"
        component={ShippedGoodsScreen}
        options={{
          title: 'Shipped Goods',
        }}
      />
      <Stack.Screen
        name="EditShipment"
        component={EditShipmentScreen}
        options={{
          title: 'Edit Shipment',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="AddBlock"
        component={AddBlockScreen}
        options={{
          title: 'New Block',
        }}
      />
      <Stack.Screen
        name="CuttingList"
        component={CuttingListScreen}
        options={{
          title: 'Cutting Jobs',
        }}
      />
      <Stack.Screen
        name="CuttingForm"
        component={CuttingFormScreen}
        options={{
          title: 'New Cutting Job',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="GrindingList"
        component={GrindingListScreen}
        options={{
          title: 'Grinding Jobs',
        }}
      />
      <Stack.Screen
        name="GrindingForm"
        component={GrindingFormScreen}
        options={{
          title: 'New Grinding Job',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ChemicalList"
        component={ChemicalListScreen}
        options={{
          title: 'Chemical Jobs',
        }}
      />
      <Stack.Screen
        name="ChemicalForm"
        component={ChemicalFormScreen}
        options={{
          title: 'New Chemical Job',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="EpoxyList"
        component={EpoxyListScreen}
        options={{
          title: 'Epoxy Jobs',
        }}
      />
      <Stack.Screen
        name="EpoxyForm"
        component={EpoxyFormScreen}
        options={{
          title: 'New Epoxy Job',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="PolishList"
        component={PolishListScreen}
        options={{
          title: 'Polish Jobs',
        }}
      />
      <Stack.Screen
        name="PolishForm"
        component={PolishFormScreen}
        options={{
          title: 'New Polish Job',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}