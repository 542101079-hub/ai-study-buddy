from pathlib import Path

schema_path = Path(r"C:\Users\54210\ai-study-buddy\src\db\schema.ts")
types_path = Path(r"C:\Users\54210\ai-study-buddy\src\db\types.ts")

schema_text = schema_path.read_text(encoding="utf-8")
schema_text = schema_text.replace('pgTable(\n  "app_users",', 'pgTable(\n  "users",', 1)
schema_text = schema_text.replace('uniqueIndex("app_users_email_unique")', 'uniqueIndex("users_email_unique")', 1)
schema_text = schema_text.replace('index("app_users_tenant_id_idx")', 'index("users_tenant_id_idx")', 1)
schema_text = schema_text.replace('export const users = pgTable', 'export const appUsers = pgTable', 1)
schema_text = schema_text.replace('export const userRelations = relations(users,', 'export const userRelations = relations(appUsers,', 1)
schema_text = schema_text.replace('fields: [users.tenantId],\n    references: [tenants.id],', 'fields: [appUsers.tenantId],\n    references: [tenants.id],', 1)
schema_text = schema_text.replace('tenant: one(tenants, {\n    fields: [users.tenantId],\n    references: [tenants.id],\n  }),', 'tenant: one(tenants, {\n    fields: [appUsers.tenantId],\n    references: [tenants.id],\n  }),', 1)
schema_text = schema_text.replace('user: one(users, {\n    fields: [sessions.userId],\n    references: [users.id],\n  }),', 'user: one(appUsers, {\n    fields: [sessions.userId],\n    references: [appUsers.id],\n  }),', 1)
schema_text = schema_text.replace('export type User = typeof users.$inferSelect;', 'export type User = typeof appUsers.$inferSelect;', 1)
schema_text = schema_text.replace('export type NewUser = typeof users.$inferInsert;', 'export type NewUser = typeof appUsers.$inferInsert;', 1)
schema_path.write_text(schema_text, encoding="utf-8")

types_text = types_path.read_text(encoding="utf-8")
types_text = types_text.replace('app_users', 'users')
types_text = types_text.replace('"app_users_tenant_id_tenants_id_fk"', '"users_tenant_id_tenants_id_fk"')
types_text = types_text.replace('"app_users_email_unique"', '"users_email_unique"')
types_text = types_text.replace('"app_users_tenant_id_idx"', '"users_tenant_id_idx"')
types_path.write_text(types_text, encoding="utf-8")
