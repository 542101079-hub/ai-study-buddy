export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          hashed_password: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          hashed_password: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          hashed_password?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string | null;
          avatar_url?: string | null;
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
        ];
      };
      app_sessions: {
        Row: {
          id: string;
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
            foreignKeyName: "app_sessions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "app_users";
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
