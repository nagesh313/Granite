import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CuttingJobFormData, GrindingJobFormData, ChemicalJobFormData, Machine, EpoxyJobFormData, BaseProductionJob } from './schema';

export type RootStackParamList = {
  Home: undefined;
  Production: undefined;
  RawMaterials: undefined;
  Machines: undefined;
  FinishedGoods: undefined;
  ShippedGoods: undefined;
  AddBlock: undefined;
  CuttingList: undefined;
  CuttingForm: {
    initialData?: Partial<CuttingJobFormData>;
    machines: Machine[];
  };
  Cutting: undefined;
  EditCuttingJob: {
    jobId: number;
  };
  NewCuttingJob: undefined;
  GrindingList: undefined;
  GrindingForm: {
    initialData?: Partial<GrindingJobFormData>;
    machines: Machine[];
  };
  Grinding: undefined;
  EditGrindingJob: {
    jobId: number;
  };
  NewGrindingJob: undefined;
  Polish: undefined;
  EditPolishJob: {
    jobId: number;
  };
  NewPolishJob: undefined;
  PolishList: undefined;
  PolishForm: {
    initialData?: Partial<BaseProductionJob> & {
      measurements?: {
        polishingTime?: number;
        stoppageReason?: 'none' | 'power_outage' | 'maintenance';
        maintenanceReason?: string;
        stoppageStartTime?: string | null;
        stoppageEndTime?: string | null;
      };
    };
    machines: Machine[];
  };
  ChemicalList: undefined;
  ChemicalForm: {
    initialData?: Partial<ChemicalJobFormData>;
    machines?: Machine[];
  };
  EpoxyList: undefined;
  EpoxyForm: {
    initialData?: Partial<EpoxyJobFormData>;
    machines: Machine[];
  };
  AddFinishedStock: {
    standId?: number;
  };
  ShipFinishedGoods: {
    standId?: number;
  };
  StandDetails: {
    standId: number;
  };
  EditShipment: {
    shipmentId: number;
  };
};

// Move these types to ProductionFilter since they're now defined there
export type { ProductionStatus, SortField, SortOrder } from '@/components/ui/ProductionFilter';

export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;