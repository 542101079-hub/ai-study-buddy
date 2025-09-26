import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgPolicy,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const auth = pgSchema("auth");

export const authUsers = auth.table("users", {
  id: uuid("id").notNull(),
});

export const users = pgTable(
  "app_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    displayName: varchar("display_name", { length: 120 }),
    hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex("app_users_email_unique").on(table.email),
  }),
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .default(sql`auth.uid()`)
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 24 }).notNull(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    usernameLengthMin: check("profiles_username_length_min", sql`char_length(${table.username}) >= 3`),
    usernameUnique: uniqueIndex("profiles_username_unique").on(table.username),
    profilesSelectOwn: pgPolicy("profiles_select_own", {
      for: "select",
      to: "authenticated",
      using: sql`auth.uid() = ${table.id}`,
    }),
    profilesInsertOwn: pgPolicy("profiles_insert_own", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`auth.uid() = ${table.id}`,
    }),
    profilesUpdateOwn: pgPolicy("profiles_update_own", {
      for: "update",
      to: "authenticated",
      using: sql`auth.uid() = ${table.id}`,
      withCheck: sql`auth.uid() = ${table.id}`,
    }),
    profilesDeleteOwn: pgPolicy("profiles_delete_own", {
      for: "delete",
      to: "authenticated",
      using: sql`auth.uid() = ${table.id}`,
    }),
  }),
).enableRLS();

export const sessions = pgTable(
  "app_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    remember: boolean("remember").default(false).notNull(),
    userAgent: varchar("user_agent", { length: 256 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index("app_sessions_user_id_idx").on(table.userId),
    tokenHashUnique: uniqueIndex("app_sessions_token_hash_unique").on(table.tokenHash),
  }),
);

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Session = typeof sessions.$inferSelect;

