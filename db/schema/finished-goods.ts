import { integer, pgTable, text, timestamp, uuid, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from "drizzle-orm";

// Forward declaration of blocks table
const blocksRef = pgTable("blocks", {
  id: serial("id").primaryKey(),
});

export const stands = pgTable("stands", {
  id: serial("id").primaryKey(),
  rowNumber: integer("row_number").notNull(),
  position: integer("position").notNull(),
  maxCapacity: integer("max_capacity").default(200).notNull(),
});

export const finishedGoods = pgTable("finished_goods", {
  id: serial("id").primaryKey(),
  standId: integer("stand_id").references(() => stands.id).notNull(),
  blockId: integer("block_id").references(() => blocksRef.id).notNull(),
  quality: text("quality").notNull(),
  slabCount: integer("slab_count").notNull(),
  media: text("media").array().default([]),
  stock_added_at: timestamp("stock_added_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  finishedGoodId: integer("finished_good_id").references(() => finishedGoods.id).notNull(),
  slabsShipped: integer("slabs_shipped").notNull(),
  shippedAt: timestamp("shipped_at").defaultNow().notNull(),
  shippingCompany: text("shipping_company").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const standRelations = relations(stands, ({ many }) => ({
  finishedGoods: many(finishedGoods),
}));

export const finishedGoodsRelations = relations(finishedGoods, ({ one }) => ({
  stand: one(stands, {
    fields: [finishedGoods.standId],
    references: [stands.id],
  }),
  block: one(blocksRef, {
    fields: [finishedGoods.blockId],
    references: [blocksRef.id],
  }),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  finishedGood: one(finishedGoods, {
    fields: [shipments.finishedGoodId],
    references: [finishedGoods.id],
  }),
}));

export const insertStandSchema = createInsertSchema(stands);
export const selectStandSchema = createSelectSchema(stands);

export const insertFinishedGoodSchema = createInsertSchema(finishedGoods);
export const selectFinishedGoodSchema = createSelectSchema(finishedGoods);

export const insertShipmentSchema = createInsertSchema(shipments);
export const selectShipmentSchema = createSelectSchema(shipments);