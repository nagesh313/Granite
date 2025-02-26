import { pgTable, text, serial, integer, timestamp, boolean, decimal, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Import finished goods schema
import { stands, finishedGoods, shipments, standRelations, finishedGoodsRelations } from "./schema/finished-goods";

// Re-export finished goods schemas
export { 
  stands, 
  finishedGoods, 
  shipments,
  standRelations,
  finishedGoodsRelations
};

// User Management Tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  hashedPassword: text("hashed_password").notNull(),
  role: text("role").notNull().default("employee"),
  department: text("department").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  theme: text("theme").notNull().default("light"),
  notifications: jsonb("notifications").default('{"email": true, "push": true}'),
  defaultView: text("default_view").notNull().default("dashboard"),
  preferences: jsonb("preferences").default('{}'),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  lastModifiedBy: integer("last_modified_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  permissionId: integer("permission_id").notNull().references(() => permissions.id),
  grantedBy: integer("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
});

// User Relations
export const userRelations = relations(users, ({ many, one }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  permissions: many(userPermissions),
  modifiedSettings: many(systemSettings),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const permissionRelations = relations(permissions, ({ many }) => ({
  userPermissions: many(userPermissions),
}));

export const userPermissionRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
  permission: one(permissions, {
    fields: [userPermissions.permissionId],
    references: [permissions.id],
  }),
  grantedByUser: one(users, {
    fields: [userPermissions.grantedBy],
    references: [users.id],
  }),
}));

// Production Management Tables
export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  blockNumber: text("block_number").notNull(),
  dateReceived: timestamp("date_received").notNull().defaultNow(),
  marka: text("marka").notNull(),
  length: decimal("length", { precision: 10, scale: 2 }).notNull(),
  width: decimal("width", { precision: 10, scale: 2 }).notNull(),
  height: decimal("height", { precision: 10, scale: 2 }).notNull(),
  density: decimal("density", { precision: 10, scale: 2 }).notNull().default("2.7"),
  netWeight: decimal("net_weight", { precision: 10, scale: 2 }).notNull(),
  blockWeight: decimal("block_weight", { precision: 10, scale: 2 }).notNull(),
  blockType: text("block_type").notNull(),
  color: text("color").notNull(),
  mineName: text("mine_name").notNull(),
  vehicleNumber: text("vehicle_number").notNull(),
  vehicleId: text("vehicle_id"),
  photoFrontUrl: text("photo_front_url"),
  photoBackUrl: text("photo_back_url"),
  photoFrontName: text("photo_front_name"),
  photoBackName: text("photo_back_name"),
  comments: text("comments"),
  status: text("status", { enum: ["in_stock", "processing", "completed"] })
    .notNull()
    .default("in_stock"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("idle"),
  maintenanceInterval: integer("maintenance_interval"),
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date"),
  currentTrolleyCount: integer("current_trolley_count").default(0),
  segmentChangesCount: integer("segment_changes_count").default(0),
  totalSegmentChanges: integer("total_segment_changes").default(0),
  lastSegmentChangeDate: timestamp("last_segment_change_date"),
  bladeChangesCount: integer("blade_changes_count").default(0),
  lastBladeChangeDate: timestamp("last_blade_change_date"),
  nextSegmentChangeDue: boolean("next_segment_change_due").default(false),
  nextBladeChangeDue: boolean("next_blade_change_due").default(false),
});

export const trolleys = pgTable("trolleys", {
  id: serial("id").primaryKey(),
  number: text("number").unique().notNull(),
  status: text("status").notNull().default("available"),
  currentBlockId: integer("current_block_id").references(() => blocks.id),
});

export const blades = pgTable("blades", {
  id: serial("id").primaryKey(),
  serialNumber: text("serial_number").unique().notNull(),
  machineId: integer("machine_id").references(() => machines.id),
  installationDate: timestamp("installation_date").notNull(),
  totalCutArea: decimal("total_cut_area", { precision: 10, scale: 2 }).default("0"),
  status: text("status").notNull().default("active"),
  currentSegmentHeight: decimal("current_segment_height", { precision: 5, scale: 2 }),
  segmentsReplaced: integer("segments_replaced").default(0),
  lastBrazingDate: timestamp("last_brazing_date"),
});

export const productionJobs = pgTable("production_jobs", {
  id: serial("id").primaryKey(),
  blockId: integer("block_id").references(() => blocks.id),
  machineId: integer("machine_id").references(() => machines.id),
  trolleyId: integer("trolley_id").references(() => trolleys.id),
  stage: text("stage").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: text("status").notNull().default("in_progress"),
  photos: jsonb("photos").default('[]'),
  measurements: jsonb("measurements").default('{}'),
  totalSlabs: integer("total_slabs"),
  processedPieces: integer("processed_pieces"),
  qualityCheckStatus: text("quality_check_status"),
  operatorNotes: text("operator_notes"),
  comments: text("comments"),
  brazingNumber: integer("brazing_number"),
});

export const machineDowntime = pgTable("machine_downtime", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").notNull().references(() => machines.id),
  productionJobId: integer("production_job_id").references(() => productionJobs.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  reason: text("reason").notNull(),
  comments: text("comments"),
});

export const bladeUsage = pgTable("blade_usage", {
  id: serial("id").primaryKey(),
  productionJobId: integer("production_job_id").notNull().references(() => productionJobs.id),
  bladeId: integer("blade_id").notNull().references(() => blades.id),
  segmentHeightStart: decimal("segment_height_start", { precision: 5, scale: 2 }).notNull(),
  segmentHeightEnd: decimal("segment_height_end", { precision: 5, scale: 2 }),
  cutArea: decimal("cut_area", { precision: 10, scale: 2 }),
});

// Production Relations
export const blockRelations = relations(blocks, ({ many }) => ({
  productionJobs: many(productionJobs),
  finishedGoods: many(finishedGoods),
}));

export const machineRelations = relations(machines, ({ many }) => ({
  productionJobs: many(productionJobs),
  blades: many(blades),
  downtimes: many(machineDowntime),
}));

export const trolleyRelations = relations(trolleys, ({ one }) => ({
  currentBlock: one(blocks, {
    fields: [trolleys.currentBlockId],
    references: [blocks.id],
  }),
}));

export const bladeRelations = relations(blades, ({ one, many }) => ({
  machine: one(machines, {
    fields: [blades.machineId],
    references: [machines.id],
  }),
  usageRecords: many(bladeUsage),
}));

export const productionJobRelations = relations(productionJobs, ({ one, many }) => ({
  block: one(blocks, {
    fields: [productionJobs.blockId],
    references: [blocks.id],
  }),
  machine: one(machines, {
    fields: [productionJobs.machineId],
    references: [machines.id],
  }),
  trolley: one(trolleys, {
    fields: [productionJobs.trolleyId],
    references: [trolleys.id],
  }),
  bladeUsages: many(bladeUsage),
  downtimes: many(machineDowntime),
}));

// Create schemas for the new tables
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertUserSettingsSchema = createInsertSchema(userSettings);
export const selectUserSettingsSchema = createSelectSchema(userSettings);

export const insertSystemSettingsSchema = createInsertSchema(systemSettings);
export const selectSystemSettingsSchema = createSelectSchema(systemSettings);

export const insertPermissionSchema = createInsertSchema(permissions);
export const selectPermissionSchema = createSelectSchema(permissions);

export const insertUserPermissionSchema = createInsertSchema(userPermissions);
export const selectUserPermissionSchema = createSelectSchema(userPermissions);

// Export types for the new tables
export type User = typeof users.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type SystemSettings = typeof systemSettings.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type UserPermission = typeof userPermissions.$inferSelect;


export const insertBlockSchema = createInsertSchema(blocks, {
  photoFrontUrl: z.string().optional(),
  photoBackUrl: z.string().optional(),
  photoFrontName: z.string().optional(),
  photoBackName: z.string().optional(),
  dateReceived: z.coerce.date(),
  length: z.coerce.number(),
  width: z.coerce.number(),
  height: z.coerce.number(),
  blockWeight: z.coerce.number(),
  density: z.coerce.number().default(2.7)
});

export const selectBlockSchema = createSelectSchema(blocks);

export const insertMachineSchema = createInsertSchema(machines);
export const selectMachineSchema = createSelectSchema(machines);

export const insertTrolleySchema = createInsertSchema(trolleys);
export const selectTrolleySchema = createSelectSchema(trolleys);

export const insertBladeSchema = createInsertSchema(blades);
export const selectBladeSchema = createSelectSchema(blades);

export const insertProductionJobSchema = createInsertSchema(productionJobs, {
  startTime: z.coerce.date({
    required_error: "Start time is required",
    invalid_type_error: "Start time must be a valid date",
  }),
  endTime: z.coerce.date().optional().nullable(),
  machineId: z.coerce.number().nullable().optional(),
  blockId: z.coerce.number(),
  totalSlabs: z.coerce.number().nullable().optional(),
  processedPieces: z.coerce.number().nullable().optional(),
  brazingNumber: z.coerce.number().nullable().optional(),
  measurements: z.object({
    blockPieces: z.array(z.object({
      blockId: z.coerce.number(),
      pieces: z.coerce.number(),
    })).optional(),
    finish: z.enum(["Lappato", "Normal"]).optional(),
    chemicalName: z.string().optional(),
    issueQuantity: z.coerce.number().nullable().optional(),
    returnQuantity: z.coerce.number().nullable().optional(),
    netQuantity: z.coerce.number().nullable().optional(),
    stoppageReason: z.enum(["none", "power_outage", "maintenance"]).optional(),
    maintenanceReason: z.string().optional(),
    stoppageStartTime: z.string().nullable().optional(),
    stoppageEndTime: z.string().nullable().optional(),
    photos: z.array(z.string()).optional(),
  }).optional(),
});

export const selectProductionJobSchema = createSelectSchema(productionJobs);

export const insertBladeUsageSchema = createInsertSchema(bladeUsage);
export const selectBladeUsageSchema = createSelectSchema(bladeUsage);

export type Block = typeof blocks.$inferSelect;
export type Machine = typeof machines.$inferSelect;
export type Trolley = typeof trolleys.$inferSelect;
export type Blade = typeof blades.$inferSelect;
export type ProductionJob = typeof productionJobs.$inferSelect;
export type BladeUsage = typeof bladeUsage.$inferSelect;
export type MachineDowntime = typeof machineDowntime.$inferSelect;