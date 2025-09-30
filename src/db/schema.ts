
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

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    logoUrl: text("logo_url"),
    tagline: text("tagline"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    const tenantMember = sql`EXISTS (
      SELECT 1
      FROM public.profiles AS member_profiles
      WHERE member_profiles.tenant_id = ${table.id}
        AND member_profiles.id = auth.uid()
    )` as const;

    return {
      slugUnique: uniqueIndex("tenants_slug_unique").on(table.slug),
      tenantsSelectOwn: pgPolicy("tenants_select_own", {
        for: "select",
        to: "authenticated",
        using: tenantMember,
      }),
    };
  },
).enableRLS();

export const appUsers = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    displayName: varchar("display_name", { length: 120 }),
    hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
    tenantIdIdx: index("users_tenant_id_idx").on(table.tenantId),
  }),
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .default(sql`auth.uid()`)
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 24 }).notNull(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    role: varchar("role", { length: 16 })
      .notNull()
      .default("user")
      .$type<"user" | "admin">(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    const tenantAdmin = sql`EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = ${table.tenantId}
        AND admin_profiles.role = 'admin'
    )` as const;

    const selfOrTenantAdmin = sql`auth.uid() = ${table.id} OR ${tenantAdmin}` as const;

    return {
      usernameLengthMin: check("profiles_username_length_min", sql`char_length(${table.username}) >= 3`),
      usernameUnique: uniqueIndex("profiles_username_unique").on(table.tenantId, table.username),
      tenantIdIdx: index("profiles_tenant_id_idx").on(table.tenantId),
      roleAllowed: check("profiles_role_allowed", sql`${table.role} in ('user', 'admin')`),
      profilesSelectOwn: pgPolicy("profiles_select_own", {
        for: "select",
        to: "authenticated",
        using: selfOrTenantAdmin,
      }),
      profilesInsertOwn: pgPolicy("profiles_insert_own", {
        for: "insert",
        to: "authenticated",
        withCheck: selfOrTenantAdmin,
      }),
      profilesUpdateOwn: pgPolicy("profiles_update_own", {
        for: "update",
        to: "authenticated",
        using: selfOrTenantAdmin,
        withCheck: selfOrTenantAdmin,
      }),
      profilesDeleteOwn: pgPolicy("profiles_delete_own", {
        for: "delete",
        to: "authenticated",
        using: selfOrTenantAdmin,
      }),
    };
  },
).enableRLS();

export const sessions = pgTable(
  "app_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    remember: boolean("remember").default(false).notNull(),
    userAgent: varchar("user_agent", { length: 256 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index("app_sessions_tenant_id_idx").on(table.tenantId),
    userIdIdx: index("app_sessions_user_id_idx").on(table.userId),
    tokenHashUnique: uniqueIndex("app_sessions_token_hash_unique").on(table.tokenHash),
  }),
);

export const tenantRelations = relations(tenants, ({ many }) => ({
  profiles: many(profiles),
  users: many(appUsers),
  sessions: many(sessions),
}));

export const userRelations = relations(appUsers, ({ many, one }) => ({
  tenant: one(tenants, {
    fields: [appUsers.tenantId],
    references: [tenants.id],
  }),
  sessions: many(sessions),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [sessions.tenantId],
    references: [tenants.id],
  }),
  user: one(appUsers, {
    fields: [sessions.userId],
    references: [appUsers.id],
  }),
}));

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof appUsers.$inferSelect;
export type NewUser = typeof appUsers.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Session = typeof sessions.$inferSelect;

export const users = appUsers;

