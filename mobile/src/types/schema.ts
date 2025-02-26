import { z } from "zod";

// Basic form field validation schemas
export const requiredString = z.string().min(1, "This field is required");
export const requiredNumber = z.number().min(0, "Must be a positive number");
export const optionalString = z.string().optional();

// Add Block and Machine interfaces here
export interface Block {
  id: number;
  blockNumber: string;
  blockType: string;
  dateReceived: string;
  marka?: string;
  color?: string;
  companyName?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  location?: string;
  blockWeight?: number;
  status?: ProductionStatus;
}

export interface Machine {
  id: number;
  name: string;
  type: string;
  status: string;
}

// Shared interfaces
export interface FormFieldProps {
  label: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  disabled?: boolean;
}

// Production types
export type ProductionStatus = 
  | "pending" 
  | "in_progress" 
  | "completed" 
  | "failed" 
  | "cancelled" 
  | "paused" 
  | "skipped" 
  | "defective";
export type QualityCheckStatus = "pending" | "passed" | "failed";
export type StoppageReason = "none" | "power_outage" | "maintenance";

// Update base measurements interface to support all measurement types
export interface BaseMeasurements {
  stoppageReason?: StoppageReason;
  maintenanceReason?: string | null;
  stoppageStartTime?: string | null;
  stoppageEndTime?: string | null;
  totalArea?: number | string;
}

// Update base production job to include stage
export interface BaseProductionJob {
  id?: number;
  blockId: number;
  machineId?: number | null;
  startTime: string;
  endTime?: string | null;
  status: ProductionStatus;
  stage?: 'cutting' | 'grinding' | 'chemical_conversion' | 'epoxy' | 'polishing';
  processedPieces?: number;
  qualityCheckStatus?: QualityCheckStatus;
  operatorNotes?: string | null;
  comments?: string | null;
  photos?: Array<{ url: string; name: string; }>;
  measurements?: BaseMeasurements | CuttingMeasurements | GrindingMeasurements | ChemicalMeasurements | EpoxyMeasurements | PolishingMeasurements;
}

// Update Polishing specific measurements
export interface PolishingMeasurements extends BaseMeasurements {
  polishingTime?: number;
  stoppageReason: StoppageReason;
  maintenanceReason?: string | null;
  stoppageStartTime?: string | null;
  stoppageEndTime?: string | null;
}

// Update Polishing Job interface
export interface PolishingJob extends BaseProductionJob {
  stage: 'polishing';
  measurements: PolishingMeasurements;
}

// Add Polishing job form data type
export type PolishingJobFormData = Omit<PolishingJob, 'id'>;

// Cutting specific measurements
export interface CuttingMeasurements extends BaseMeasurements {
  segmentHeights: Array<{ bladeId: number; height: number }>;
  brazingNumber?: number | null;
  trolleyNumber?: number;
}

// Grinding specific measurements
export interface GrindingMeasurements extends BaseMeasurements {
  finish: "Lappato" | "Normal";
  pieces?: number;
}

// Chemical specific measurements
export interface ChemicalMeasurements extends BaseMeasurements {
  solution: "Honed" | "Polished";
  pieces?: number;
}

// Update epoxy measurements to include all required fields
export interface EpoxyMeasurements extends BaseMeasurements {
  epoxyType: string;
  pieces?: number;
  chemicalName?: string;
  resinIssueQuantity?: number;
  resinReturnQuantity?: number;
  resinNetQuantity?: number;
  hardnerIssueQuantity?: number;
  hardnerReturnQuantity?: number;
  hardnerNetQuantity?: number;
  totalNetQuantity?: number;
}

// Job interfaces
export interface CuttingJob extends BaseProductionJob {
  stage: 'cutting';
  measurements: CuttingMeasurements;
  totalSlabs?: number;
}

export interface GrindingJob extends BaseProductionJob {
  stage: 'grinding';
  measurements: GrindingMeasurements;
}

export interface ChemicalJob extends BaseProductionJob {
  stage: 'chemical_conversion';
  measurements: ChemicalMeasurements;
}

export interface EpoxyJob extends BaseProductionJob {
  stage: 'epoxy';
  measurements: EpoxyMeasurements;
}

// Form data types
export type CuttingJobFormData = Omit<CuttingJob, 'id'>;
export type GrindingJobFormData = Omit<GrindingJob, 'id'>;
export type ChemicalJobFormData = Omit<ChemicalJob, 'id'>;
export type EpoxyJobFormData = Omit<EpoxyJob, 'id'>;

// Schema definitions
export const blockSchema = z.object({
  id: z.number(),
  blockNumber: z.string().min(1, "Block number is required"),
  blockType: z.string().min(1, "Block type is required"),
  marka: z.string().optional(),
  color: z.string().optional(),
  companyName: z.string().optional(),
  dimensions: z.object({
    length: z.number().min(0.1, "Length must be greater than 0"),
    width: z.number().min(0.1, "Width must be greater than 0"),
    height: z.number().min(0.1, "Height must be greater than 0"),
  }).optional(),
  blockWeight: z.number().min(0, "Weight must be 0 or greater").optional(),
  location: z.string().optional(),
  dateReceived: z.string().refine((value) => {
    try {
      new Date(value);
      return true;
    } catch (error) {
      return false;
    }
  }, { message: "Invalid date format" }),
  mineName: z.string().min(1, "Mine name is required"),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  comments: z.string().optional(),
});

// Job schemas
export const cuttingJobSchema = z.object({
  blockId: z.number(),
  machineId: z.number(),
  startTime: z.string(),
  endTime: z.string().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled", "paused", "skipped", "defective"]),
  stage: z.literal("cutting"),
  totalSlabs: z.number().min(1, "Must have at least 1 slab"),
  processedPieces: z.number().min(0).optional(),
  qualityCheckStatus: z.enum(["pending", "passed", "failed"]).optional(),
  comments: z.string().optional(),
  photos: z.array(z.object({
    url: z.string(),
    name: z.string()
  })).optional(),
  measurements: z.object({
    segmentHeights: z.array(z.object({
      bladeId: z.number(),
      height: z.number()
    })),
    stoppageReason: z.enum(["none", "power_outage", "maintenance"]),
    maintenanceReason: z.string().optional(),
    stoppageStartTime: z.string().optional(),
    stoppageEndTime: z.string().optional(),
    brazingNumber: z.number().optional(),
    trolleyNumber: z.number(),
    totalArea: z.union([z.number(), z.string()]).optional(),
  }),
});

export const grindingJobSchema = z.object({
  blockId: z.number(),
  machineId: z.number(),
  startTime: z.string(),
  endTime: z.string().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled", "paused", "skipped", "defective"]),
  stage: z.literal("grinding"),
  processedPieces: z.number().min(0).optional(),
  qualityCheckStatus: z.enum(["pending", "passed", "failed"]).optional(),
  comments: z.string().optional(),
  photos: z.array(z.object({
    url: z.string(),
    name: z.string()
  })).optional(),
  measurements: z.object({
    stoppageReason: z.enum(["none", "power_outage", "maintenance"]),
    maintenanceReason: z.string().optional(),
    stoppageStartTime: z.string().optional(),
    stoppageEndTime: z.string().optional(),
    finish: z.enum(["Lappato", "Normal"]),
    pieces: z.number().optional(),
    totalArea: z.union([z.number(), z.string()]).optional(),
  }),
});

export const chemicalJobSchema = z.object({
  blockId: z.number(),
  machineId: z.number().optional(), 
  startTime: z.string(),
  endTime: z.string().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled", "paused", "skipped", "defective"]),
  stage: z.literal("chemical_conversion"),
  processedPieces: z.number().min(0).optional(),
  qualityCheckStatus: z.enum(["pending", "passed", "failed"]).optional(),
  comments: z.string().optional(),
  photos: z.array(z.object({
    url: z.string(),
    name: z.string()
  })).optional(),
  measurements: z.object({
    stoppageReason: z.enum(["none", "power_outage", "maintenance"]),
    maintenanceReason: z.string().optional(),
    stoppageStartTime: z.string().optional(),
    stoppageEndTime: z.string().optional(),
    solution: z.enum(["Honed", "Polished"]),
    pieces: z.number().optional(),
    totalArea: z.union([z.number(), z.string()]).optional(),
  }),
});

// Update epoxy job schema
export const epoxyJobSchema = z.object({
  blockId: z.number(),
  machineId: z.number().optional(),
  startTime: z.string(),
  endTime: z.string().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled", "paused", "skipped", "defective"]),
  stage: z.literal("epoxy"),
  processedPieces: z.number().min(0).optional(),
  qualityCheckStatus: z.enum(["pending", "passed", "failed"]).optional(),
  comments: z.string().optional(),
  photos: z.array(z.object({
    url: z.string(),
    name: z.string()
  })).optional(),
  measurements: z.object({
    stoppageReason: z.enum(["none", "power_outage", "maintenance"]),
    maintenanceReason: z.string().optional(),
    stoppageStartTime: z.string().nullable(),
    stoppageEndTime: z.string().nullable(),
    epoxyType: z.string(),
    pieces: z.number(),
    totalArea: z.union([z.number(), z.string()]).optional(),
    chemicalName: z.string().optional(),
    resinIssueQuantity: z.number().optional(),
    resinReturnQuantity: z.number().optional(),
    resinNetQuantity: z.number().optional(),
    hardnerIssueQuantity: z.number().optional(),
    hardnerReturnQuantity: z.number().optional(),
    hardnerNetQuantity: z.number().optional(),
    totalNetQuantity: z.number().optional()
  }),
});

// Update polishing job schema
export const polishingJobSchema = z.object({
  blockId: z.number(),
  machineId: z.number().optional(),
  startTime: z.string(),
  endTime: z.string().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled", "paused", "skipped", "defective"]),
  stage: z.literal("polishing"),
  processedPieces: z.number().min(0).optional(),
  qualityCheckStatus: z.enum(["pending", "passed", "failed"]).optional(),
  comments: z.string().optional(),
  photos: z.array(z.object({
    url: z.string(),
    name: z.string()
  })).optional(),
  measurements: z.object({
    polishingTime: z.number().optional(),
    stoppageReason: z.enum(["none", "power_outage", "maintenance"]),
    maintenanceReason: z.string().optional().nullable(),
    stoppageStartTime: z.string().optional().nullable(),
    stoppageEndTime: z.string().optional().nullable(),
    totalArea: z.union([z.number(), z.string()]).optional(),
  }),
});