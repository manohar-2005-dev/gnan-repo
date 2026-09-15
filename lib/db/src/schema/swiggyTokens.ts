import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { userProfilesTable } from "./profile";

export const swiggyTokensTable = pgTable("swiggy_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => userProfilesTable.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  tokenType: text("token_type").notNull().default("Bearer"),
  scope: text("scope"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  swiggyClientId: text("swiggy_client_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const insertSwiggyTokenSchema = createInsertSchema(swiggyTokensTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSwiggyToken = z.infer<typeof insertSwiggyTokenSchema>;
export type SwiggyToken = typeof swiggyTokensTable.$inferSelect;
