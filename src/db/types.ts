type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type AppUsersTable = {
  Row: {
    id: string;
    tenant_id: string;
    email: string;
    display_name: string | null;
    hashed_password: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    tenant_id: string;
    email: string;
    display_name?: string | null;
    hashed_password: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    tenant_id?: string;
    email?: string;
    display_name?: string | null;
    hashed_password?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "users_tenant_id_tenants_id_fk";
      columns: ["tenant_id"];
      referencedRelation: "tenants";
      referencedColumns: ["id"];
    },
  ];
};

export type Database = {
  public: {
    Tables: {
      app_users: AppUsersTable;
      users: AppUsersTable;
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          tagline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          tagline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          tagline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          role: 'user' | 'admin' | 'editor' | 'viewer';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          username: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'user' | 'admin' | 'editor' | 'viewer';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          username?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'user' | 'admin' | 'editor' | 'viewer';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_tenant_id_tenants_id_fk";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      app_sessions: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          token_hash: string;
          remember: boolean;
          user_agent: string | null;
          ip_address: string | null;
          created_at: string;
          last_used_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          token_hash: string;
          remember?: boolean;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
          last_used_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          token_hash?: string;
          remember?: boolean;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
          last_used_at?: string;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "app_sessions_tenant_id_tenants_id_fk";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
      {
        foreignKeyName: "app_sessions_user_id_fkey";
        columns: ["user_id"];
        referencedRelation: "users";
        referencedColumns: ["id"];
      },
    ];
  };
      assistant_sessions: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assistant_sessions_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assistant_sessions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assistant_messages: {
        Row: {
          id: string;
          tenant_id: string;
          session_id: string;
          user_id: string;
          role: "user" | "assistant" | "system";
          content: Json;
          tokens: number | null;
          created_at: string;
          order_num: number;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          session_id: string;
          user_id: string;
          role: "user" | "assistant" | "system";
          content: Json;
          tokens?: number | null;
          created_at?: string;
          order_num?: number;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          session_id?: string;
          user_id?: string;
          role?: "user" | "assistant" | "system";
          content?: Json;
          tokens?: number | null;
          created_at?: string;
          order_num?: number;
        };
        Relationships: [
          {
            foreignKeyName: "assistant_messages_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assistant_messages_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "assistant_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assistant_messages_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      journal_entries: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          content: string;
          mood: "positive" | "neutral" | "anxious" | "down" | null;
          tone: "strict" | "healer" | "social" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          content: string;
          mood?: "positive" | "neutral" | "anxious" | "down" | null;
          tone?: "strict" | "healer" | "social" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          content?: string;
          mood?: "positive" | "neutral" | "anxious" | "down" | null;
          tone?: "strict" | "healer" | "social" | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journal_entries_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_entries_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mood_events: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          source: string;
          mood: "positive" | "neutral" | "anxious" | "down";
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          source: string;
          mood: "positive" | "neutral" | "anxious" | "down";
          payload?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          source?: string;
          mood?: "positive" | "neutral" | "anxious" | "down";
          payload?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mood_events_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mood_events_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      motivation_stats: {
        Row: {
          user_id: string;
          tenant_id: string;
          streak_days: number;
          level: number;
          last_checkin: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          tenant_id: string;
          streak_days?: number;
          level?: number;
          last_checkin?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          tenant_id?: string;
          streak_days?: number;
          level?: number;
          last_checkin?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "motivation_stats_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "motivation_stats_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      badges: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          code: string;
          name: string;
          acquired_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          code: string;
          name: string;
          acquired_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          code?: string;
          name?: string;
          acquired_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "badges_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "badges_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      habit_runs: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          habit_code: string;
          date: string;
          planned_minutes: number;
          actual_minutes: number;
          status: "pending" | "doing" | "done" | "skipped";
          started_at: string | null;
          completed_at: string | null;
          meta: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          habit_code: string;
          date: string;
          planned_minutes: number;
          actual_minutes?: number;
          status?: "pending" | "doing" | "done" | "skipped";
          started_at?: string | null;
          completed_at?: string | null;
          meta?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          habit_code?: string;
          date?: string;
          planned_minutes?: number;
          actual_minutes?: number;
          status?: "pending" | "doing" | "done" | "skipped";
          started_at?: string | null;
          completed_at?: string | null;
          meta?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "habit_runs_tenant_id_tenants_id_fk";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "habit_runs_user_id_users_id_fk";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
