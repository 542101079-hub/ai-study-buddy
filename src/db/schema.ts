
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
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
  "app_users",
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
      .$type<"user" | "admin" | "editor" | "viewer">(),
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
      roleAllowed: check("profiles_role_allowed", sql`${table.role} in ('user', 'admin', 'editor', 'viewer')`),
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


export const learningGoals = pgTable(
  "learning_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    type: varchar("type", { length: 20 }).notNull(),
    currentLevel: integer("current_level").notNull().default(1),
    targetLevel: integer("target_level").notNull().default(10),
    targetDate: timestamp("target_date", { withTimezone: true }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
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

    const selfOrAdmin = sql`auth.uid() = ${table.userId} OR ${tenantAdmin}` as const;

    return {
      typeAllowed: check(
        "learning_goals_type_allowed",
        sql`${table.type} IN ('exam', 'skill', 'career')`,
      ),
      currentLevelRange: check(
        "learning_goals_current_level_range",
        sql`${table.currentLevel} BETWEEN 1 AND 10`,
      ),
      targetLevelRange: check(
        "learning_goals_target_level_range",
        sql`${table.targetLevel} BETWEEN 1 AND 10`,
      ),
      statusAllowed: check(
        "learning_goals_status_allowed",
        sql`${table.status} IN ('active', 'completed', 'paused', 'cancelled')`,
      ),
      userTenantIdx: index("idx_learning_goals_user_tenant").on(
        table.userId,
        table.tenantId,
      ),
      statusIdx: index("idx_learning_goals_status").on(table.status),
      learningGoalsPolicy: pgPolicy("learning_goals_tenant_access", {
        for: "all",
        to: "authenticated",
        using: selfOrAdmin,
        withCheck: selfOrAdmin,
      }),
    };
  },
).enableRLS();

export const learningPlans = pgTable(
  "learning_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => learningGoals.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    planData: jsonb("plan_data").notNull().default(sql`'{}'::jsonb`),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    startDate: timestamp("start_date", { withTimezone: true }).defaultNow().notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
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

    const selfOrAdmin = sql`auth.uid() = ${table.userId} OR ${tenantAdmin}` as const;

    return {
      statusAllowed: check(
        "learning_plans_status_allowed",
        sql`${table.status} IN ('active', 'completed', 'paused', 'cancelled')`,
      ),
      userGoalIdx: index("idx_learning_plans_user_goal").on(table.userId, table.goalId),
      statusIdx: index("idx_learning_plans_status").on(table.status),
      learningPlansPolicy: pgPolicy("learning_plans_tenant_access", {
        for: "all",
        to: "authenticated",
        using: selfOrAdmin,
        withCheck: selfOrAdmin,
      }),
    };
  },
).enableRLS();

export const learningTasks = pgTable(
  "learning_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => learningPlans.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id").references(() => learningGoals.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    type: varchar("type", { length: 20 }).notNull().default("study"),
    difficulty: integer("difficulty").notNull().default(5),
    estimatedMinutes: integer("estimated_minutes").notNull().default(60),
    actualMinutes: integer("actual_minutes").default(0),
    resources: text("resources").array().default(sql`'{}'::text[]`),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
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

    const selfOrAdmin = sql`auth.uid() = ${table.userId} OR ${tenantAdmin}` as const;

    return {
      typeAllowed: check(
        "learning_tasks_type_allowed",
        sql`${table.type} IN ('study', 'reading', 'practice', 'quiz', 'project', 'review', 'coding')`,
      ),
      difficultyRange: check(
        "learning_tasks_difficulty_range",
        sql`${table.difficulty} BETWEEN 1 AND 10`,
      ),
      estimatedMinutesRange: check(
        "learning_tasks_estimated_minutes_range",
        sql`${table.estimatedMinutes} BETWEEN 5 AND 480`,
      ),
      statusAllowed: check(
        "learning_tasks_status_allowed",
        sql`${table.status} IN ('pending', 'in_progress', 'completed', 'skipped')`,
      ),
      planStatusIdx: index("idx_learning_tasks_plan_status").on(
        table.planId,
        table.status,
      ),
      userDueIdx: index("idx_learning_tasks_user_due").on(table.userId, table.dueDate),
      learningTasksPolicy: pgPolicy("learning_tasks_tenant_access", {
        for: "all",
        to: "authenticated",
        using: selfOrAdmin,
        withCheck: selfOrAdmin,
      }),
    };
  },
).enableRLS();

export const dailyPlans = pgTable(
  "daily_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => learningPlans.id, { onDelete: "set null" }),
    date: date("date", { mode: "date" }).notNull(),
    targetMinutes: integer("target_minutes").notNull().default(120),
    actualMinutes: integer("actual_minutes").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
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

    const selfOrAdmin = sql`auth.uid() = ${table.userId} OR ${tenantAdmin}` as const;

    return {
      statusAllowed: check(
        "daily_plans_status_allowed",
        sql`${table.status} IN ('draft', 'in_progress', 'completed', 'skipped')`,
      ),
      targetMinutesRange: check(
        "daily_plans_target_minutes_range",
        sql`${table.targetMinutes} BETWEEN 0 AND 1440`,
      ),
      actualMinutesRange: check(
        "daily_plans_actual_minutes_range",
        sql`${table.actualMinutes} BETWEEN 0 AND 1440`,
      ),
      userDateUnique: uniqueIndex("daily_plans_user_date_unique").on(
        table.userId,
        table.date,
      ),
      userDateIdx: index("idx_daily_plans_user_date").on(table.userId, table.date),
      tenantDateIdx: index("idx_daily_plans_tenant_date").on(table.tenantId, table.date),
      dailyPlansPolicy: pgPolicy("daily_plans_tenant_access", {
        for: "all",
        to: "authenticated",
        using: selfOrAdmin,
        withCheck: selfOrAdmin,
      }),
    };
  },
).enableRLS();

export const dailyPlanReflections = pgTable(
  "daily_plan_reflections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dailyPlanId: uuid("daily_plan_id")
      .notNull()
      .references(() => dailyPlans.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
    moodScore: integer("mood_score"),
    energyScore: integer("energy_score"),
    summary: text("summary"),
    blockers: text("blockers"),
    wins: text("wins"),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    const tenantAdmin = sql`EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = ${table.tenantId}
        AND admin_profiles.role = 'admin'
    )` as const;

    const selfOrAdmin = sql`auth.uid() = ${table.userId} OR ${tenantAdmin}` as const;

    return {
      moodScoreRange: check(
        "daily_plan_reflections_mood_score_range",
        sql`${table.moodScore} BETWEEN 1 AND 5`,
      ),
      energyScoreRange: check(
        "daily_plan_reflections_energy_score_range",
        sql`${table.energyScore} BETWEEN 1 AND 5`,
      ),
      planRecordedIdx: index("idx_daily_plan_reflections_plan").on(
        table.dailyPlanId,
        table.recordedAt,
      ),
      dailyPlanReflectionsPolicy: pgPolicy("daily_plan_reflections_tenant_access", {
        for: "all",
        to: "authenticated",
        using: selfOrAdmin,
        withCheck: selfOrAdmin,
      }),
    };
  },
).enableRLS();

export const dailyTasks = pgTable(
  "daily_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    dailyPlanId: uuid("daily_plan_id")
      .notNull()
      .references(() => dailyPlans.id, { onDelete: "cascade" }),
    phaseId: uuid("phase_id"),
    topic: text("topic").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull().default(30),
    actualMinutes: integer("actual_minutes").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    orderNum: integer("order_num").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    const tenantScope = sql`EXISTS (
      SELECT 1
      FROM daily_plans dp
      WHERE dp.id = ${table.dailyPlanId}
        AND (
          dp.user_id = auth.uid() OR
          EXISTS (
            SELECT 1
            FROM public.profiles AS admin_profiles
            WHERE admin_profiles.id = auth.uid()
              AND admin_profiles.tenant_id = dp.tenant_id
              AND admin_profiles.role = 'admin'
          )
        )
    )` as const;

    return {
      estimatedMinutesRange: check(
        "daily_tasks_estimated_minutes_range",
        sql`${table.estimatedMinutes} BETWEEN 5 AND 480`,
      ),
      actualMinutesRange: check(
        "daily_tasks_actual_minutes_range",
        sql`${table.actualMinutes} BETWEEN 0 AND 1440`,
      ),
      statusAllowed: check(
        "daily_tasks_status_allowed",
        sql`${table.status} IN ('pending', 'in_progress', 'completed', 'skipped')`,
      ),
      orderUnique: uniqueIndex("daily_tasks_plan_order_unique").on(
        table.dailyPlanId,
        table.orderNum,
      ),
      planOrderIdx: index("idx_daily_tasks_plan_order").on(
        table.dailyPlanId,
        table.orderNum,
      ),
      statusIdx: index("idx_daily_tasks_status").on(table.status),
      dailyTasksPolicy: pgPolicy("daily_tasks_tenant_access", {
        for: "all",
        to: "authenticated",
        using: tenantScope,
        withCheck: tenantScope,
      }),
    };
  },
).enableRLS();

export const assistantSessions = pgTable(
  "assistant_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("新的对话"),
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

    const selfOnly = sql`auth.uid() = ${table.userId}` as const;

    return {
      tenantUserIdx: index("idx_assistant_sessions_tenant_user").on(
        table.tenantId,
        table.userId,
        table.createdAt,
      ),
      assistantSessionsSelfPolicy: pgPolicy("assistant_sessions_rw_self", {
        for: "all",
        to: "authenticated",
        using: selfOnly,
        withCheck: selfOnly,
      }),
      assistantSessionsAdminPolicy: pgPolicy("assistant_sessions_r_admin", {
        for: "select",
        to: "authenticated",
        using: tenantAdmin,
      }),
    };
  },
).enableRLS();

export const assistantMessages = pgTable(
  "assistant_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => assistantSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role")
      .notNull()
      .$type<"user" | "assistant" | "system">(),
    content: jsonb("content").notNull(),
    tokens: integer("tokens").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    orderNum: integer("order_num").generatedAlwaysAsIdentity(),
  },
  (table) => {
    const tenantAdmin = sql`EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = ${table.tenantId}
        AND admin_profiles.role = 'admin'
    )` as const;

    const ownsSession = sql`EXISTS (
      SELECT 1
      FROM public.assistant_sessions AS user_sessions
      WHERE user_sessions.id = ${table.sessionId}
        AND user_sessions.user_id = auth.uid()
    )` as const;

    return {
      roleAllowed: check(
        "assistant_messages_role_allowed",
        sql`${table.role} IN ('user', 'assistant', 'system')`,
      ),
      sessionOrderIdx: index("idx_assistant_messages_session").on(
        table.sessionId,
        table.orderNum,
      ),
      assistantMessagesSelfPolicy: pgPolicy("assistant_messages_rw_self", {
        for: "all",
        to: "authenticated",
        using: ownsSession,
        withCheck: ownsSession,
      }),
      assistantMessagesAdminPolicy: pgPolicy("assistant_messages_r_admin", {
        for: "select",
        to: "authenticated",
        using: tenantAdmin,
      }),
    };
  },
).enableRLS();

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    mood: text("mood")
      .$type<"positive" | "neutral" | "anxious" | "down">(),
    tone: text("tone")
      .$type<"strict" | "healer" | "social">(),
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

    const selfOnly = sql`auth.uid() = ${table.userId}` as const;

    return {
      moodAllowed: check(
        "journal_entries_mood_allowed",
        sql`${table.mood} IS NULL OR ${table.mood} IN ('positive','neutral','anxious','down')`,
      ),
      toneAllowed: check(
        "journal_entries_tone_allowed",
        sql`${table.tone} IS NULL OR ${table.tone} IN ('strict','healer','social')`,
      ),
      journalEntriesSelfPolicy: pgPolicy("journal_entries_self_rw", {
        for: "all",
        to: "authenticated",
        using: selfOnly,
        withCheck: selfOnly,
      }),
      journalEntriesAdminPolicy: pgPolicy("journal_entries_admin_r", {
        for: "select",
        to: "authenticated",
        using: tenantAdmin,
      }),
    };
  },
).enableRLS();

export const moodEvents = pgTable(
  "mood_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    mood: text("mood")
      .notNull()
      .$type<"positive" | "neutral" | "anxious" | "down">(),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    const tenantAdmin = sql`EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = ${table.tenantId}
        AND admin_profiles.role = 'admin'
    )` as const;

    const selfOnly = sql`auth.uid() = ${table.userId}` as const;

    return {
      moodAllowed: check(
        "mood_events_mood_allowed",
        sql`${table.mood} IN ('positive','neutral','anxious','down')`,
      ),
      moodEventsSelfPolicy: pgPolicy("mood_events_self_rw", {
        for: "all",
        to: "authenticated",
        using: selfOnly,
        withCheck: selfOnly,
      }),
      moodEventsAdminPolicy: pgPolicy("mood_events_admin_r", {
        for: "select",
        to: "authenticated",
        using: tenantAdmin,
      }),
    };
  },
).enableRLS();

export const motivationStats = pgTable(
  "motivation_stats",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    streakDays: integer("streak_days").notNull().default(0),
    level: integer("level").notNull().default(1),
    lastCheckin: date("last_checkin"),
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

    const selfOnly = sql`auth.uid() = ${table.userId}` as const;

    return {
      streakNonNegative: check(
        "motivation_stats_streak_days_non_negative",
        sql`${table.streakDays} >= 0`,
      ),
      levelPositive: check(
        "motivation_stats_level_positive",
        sql`${table.level} >= 1`,
      ),
      motivationStatsSelfPolicy: pgPolicy("motivation_stats_self_rw", {
        for: "all",
        to: "authenticated",
        using: selfOnly,
        withCheck: selfOnly,
      }),
      motivationStatsAdminPolicy: pgPolicy("motivation_stats_admin_r", {
        for: "select",
        to: "authenticated",
        using: tenantAdmin,
      }),
    };
  },
).enableRLS();

export const badges = pgTable(
  "badges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    const tenantAdmin = sql`EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.tenant_id = ${table.tenantId}
        AND admin_profiles.role = 'admin'
    )` as const;

    const selfOnly = sql`auth.uid() = ${table.userId}` as const;

    return {
      userBadgeUnique: uniqueIndex("badges_user_code_unique").on(
        table.userId,
        table.code,
      ),
      badgesSelfPolicy: pgPolicy("badges_self_rw", {
        for: "all",
        to: "authenticated",
        using: selfOnly,
        withCheck: selfOnly,
      }),
      badgesAdminPolicy: pgPolicy("badges_admin_r", {
        for: "select",
        to: "authenticated",
        using: tenantAdmin,
      }),
    };
  },
).enableRLS();


export const learningGoalRelations = relations(learningGoals, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [learningGoals.tenantId],
    references: [tenants.id],
  }),
  user: one(authUsers, {
    fields: [learningGoals.userId],
    references: [authUsers.id],
  }),
  plans: many(learningPlans),
  tasks: many(learningTasks),
}));

export const learningPlanRelations = relations(learningPlans, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [learningPlans.tenantId],
    references: [tenants.id],
  }),
  user: one(authUsers, {
    fields: [learningPlans.userId],
    references: [authUsers.id],
  }),
  goal: one(learningGoals, {
    fields: [learningPlans.goalId],
    references: [learningGoals.id],
  }),
  tasks: many(learningTasks),
  dailyPlans: many(dailyPlans),
}));

export const learningTaskRelations = relations(learningTasks, ({ one }) => ({
  tenant: one(tenants, {
    fields: [learningTasks.tenantId],
    references: [tenants.id],
  }),
  user: one(authUsers, {
    fields: [learningTasks.userId],
    references: [authUsers.id],
  }),
  plan: one(learningPlans, {
    fields: [learningTasks.planId],
    references: [learningPlans.id],
  }),
  goal: one(learningGoals, {
    fields: [learningTasks.goalId],
    references: [learningGoals.id],
  }),
}));

export const dailyPlanRelations = relations(dailyPlans, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [dailyPlans.tenantId],
    references: [tenants.id],
  }),
  user: one(authUsers, {
    fields: [dailyPlans.userId],
    references: [authUsers.id],
  }),
  sourcePlan: one(learningPlans, {
    fields: [dailyPlans.planId],
    references: [learningPlans.id],
  }),
  reflections: many(dailyPlanReflections),
  tasks: many(dailyTasks),
}));

export const dailyPlanReflectionRelations = relations(dailyPlanReflections, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dailyPlanReflections.tenantId],
    references: [tenants.id],
  }),
  user: one(authUsers, {
    fields: [dailyPlanReflections.userId],
    references: [authUsers.id],
  }),
  dailyPlan: one(dailyPlans, {
    fields: [dailyPlanReflections.dailyPlanId],
    references: [dailyPlans.id],
  }),
}));

export const dailyTaskRelations = relations(dailyTasks, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dailyTasks.tenantId],
    references: [tenants.id],
  }),
  dailyPlan: one(dailyPlans, {
    fields: [dailyTasks.dailyPlanId],
    references: [dailyPlans.id],
  }),
}));

export const assistantSessionRelations = relations(assistantSessions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [assistantSessions.tenantId],
    references: [tenants.id],
  }),
  user: one(profiles, {
    fields: [assistantSessions.userId],
    references: [profiles.id],
  }),
  messages: many(assistantMessages),
}));

export const assistantMessageRelations = relations(assistantMessages, ({ one }) => ({
  tenant: one(tenants, {
    fields: [assistantMessages.tenantId],
    references: [tenants.id],
  }),
  session: one(assistantSessions, {
    fields: [assistantMessages.sessionId],
    references: [assistantSessions.id],
  }),
  user: one(profiles, {
    fields: [assistantMessages.userId],
    references: [profiles.id],
  }),
}));

export const journalEntryRelations = relations(journalEntries, ({ one }) => ({
  tenant: one(tenants, {
    fields: [journalEntries.tenantId],
    references: [tenants.id],
  }),
  user: one(authUsers, {
    fields: [journalEntries.userId],
    references: [authUsers.id],
  }),
}));

export const moodEventRelations = relations(moodEvents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [moodEvents.tenantId],
    references: [tenants.id],
  }),
  user: one(authUsers, {
    fields: [moodEvents.userId],
    references: [authUsers.id],
  }),
}));

export const motivationStatsRelations = relations(motivationStats, ({ one }) => ({
  tenant: one(tenants, {
    fields: [motivationStats.tenantId],
    references: [tenants.id],
  }),
  user: one(authUsers, {
    fields: [motivationStats.userId],
    references: [authUsers.id],
  }),
}));

export const badgeRelations = relations(badges, ({ one }) => ({
  tenant: one(tenants, {
    fields: [badges.tenantId],
    references: [tenants.id],
  }),
  user: one(authUsers, {
    fields: [badges.userId],
    references: [authUsers.id],
  }),
}));

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
export type LearningGoal = typeof learningGoals.$inferSelect;
export type NewLearningGoal = typeof learningGoals.$inferInsert;
export type LearningPlan = typeof learningPlans.$inferSelect;
export type NewLearningPlan = typeof learningPlans.$inferInsert;
export type LearningTask = typeof learningTasks.$inferSelect;
export type NewLearningTask = typeof learningTasks.$inferInsert;
export type DailyPlan = typeof dailyPlans.$inferSelect;
export type NewDailyPlan = typeof dailyPlans.$inferInsert;
export type DailyPlanReflection = typeof dailyPlanReflections.$inferSelect;
export type NewDailyPlanReflection = typeof dailyPlanReflections.$inferInsert;
export type DailyTask = typeof dailyTasks.$inferSelect;
export type NewDailyTask = typeof dailyTasks.$inferInsert;
export type AssistantSession = typeof assistantSessions.$inferSelect;
export type NewAssistantSession = typeof assistantSessions.$inferInsert;
export type AssistantMessage = typeof assistantMessages.$inferSelect;
export type NewAssistantMessage = typeof assistantMessages.$inferInsert;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type MoodEvent = typeof moodEvents.$inferSelect;
export type NewMoodEvent = typeof moodEvents.$inferInsert;
export type MotivationStats = typeof motivationStats.$inferSelect;
export type NewMotivationStats = typeof motivationStats.$inferInsert;
export type Badge = typeof badges.$inferSelect;
export type NewBadge = typeof badges.$inferInsert;

export { appUsers as users };

