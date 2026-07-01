export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admins_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_queues: {
        Row: {
          guild_id: string | null
          id: string
          item_name: string
          queue_timestamp: string | null
          received_qty: number
          requested_qty: number
          slot_number: number
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          guild_id?: string | null
          id?: string
          item_name: string
          queue_timestamp?: string | null
          received_qty?: number
          requested_qty?: number
          slot_number?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          guild_id?: string | null
          id?: string
          item_name?: string
          queue_timestamp?: string | null
          received_qty?: number
          requested_qty?: number
          slot_number?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_queues_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_queues_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_sessions: {
        Row: {
          created_at: string | null
          guild_id: string | null
          id: string
          item_name: string
          item_priority: number
          personal_limit: number
          session_date: string
          status: string | null
          total_quantity: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          guild_id?: string | null
          id?: string
          item_name: string
          item_priority?: number
          personal_limit?: number
          session_date: string
          status?: string | null
          total_quantity?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          guild_id?: string | null
          id?: string
          item_name?: string
          item_priority?: number
          personal_limit?: number
          session_date?: string
          status?: string | null
          total_quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_sessions_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_history: {
        Row: {
          awarded_at: string
          created_at: string
          guild_id: string | null
          id: string
          item_name: string
          note: string | null
          awarded_qty: number
          requested_qty: number
          session_date: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          awarded_at?: string
          created_at?: string
          guild_id?: string | null
          id?: string
          item_name: string
          note?: string | null
          awarded_qty?: number
          requested_qty?: number
          session_date: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          awarded_at?: string
          created_at?: string
          guild_id?: string | null
          id?: string
          item_name?: string
          note?: string | null
          awarded_qty?: number
          requested_qty?: number
          session_date?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_history_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_owners: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone_number: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          id: string
          last_name: string
          phone_number: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone_number?: string
        }
        Relationships: []
      }
      guilds: {
        Row: {
          contact_email: string | null
          created_at: string | null
          description: string
          discord_link: string | null
          hall_of_fame_gold_uid: string | null
          hall_of_fame_silver_uid: string | null
          hall_of_fame_bronze_uid: string | null
          guild_url: string | null
          id: string
          invite_code: string
          logo_url: string | null
          name: string
          owner_id: string
          primary_color: string | null
          status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          discord_class_channel_id: string | null
          discord_name_channel_id: string | null
          discord_reserve_channel_id: string | null
          discord_leave_channel_id: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string | null
          description: string
          discord_link?: string | null
          hall_of_fame_gold_uid?: string | null
          hall_of_fame_silver_uid?: string | null
          hall_of_fame_bronze_uid?: string | null
          guild_url?: string | null
          id?: string
          invite_code: string
          logo_url?: string | null
          name: string
          owner_id: string
          primary_color?: string | null
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          discord_class_channel_id?: string | null
          discord_name_channel_id?: string | null
          discord_reserve_channel_id?: string | null
          discord_leave_channel_id?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string | null
          description?: string
          discord_link?: string | null
          hall_of_fame_gold_uid?: string | null
          hall_of_fame_silver_uid?: string | null
          hall_of_fame_bronze_uid?: string | null
          guild_url?: string | null
          id?: string
          invite_code?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          primary_color?: string | null
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          discord_class_channel_id?: string | null
          discord_name_channel_id?: string | null
          discord_reserve_channel_id?: string | null
          discord_leave_channel_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          guild_id: string | null
          cp: number | null
          hp: number | null
          id: string
          ignore_mdef: number | null
          ignore_pdef: number | null
          is_on_leave: boolean | null
          job_name: string | null
          last_stat_update: string | null
          m_atk: number | null
          m_def: number | null
          m_dmg: number | null
          m_reduc: number | null
          p_atk: number | null
          p_def: number | null
          p_dmg: number | null
          p_reduc: number | null
          party_id: number | null
          pvp_dmg: number | null
          pvp_reduc: number | null
          cri: number | null
          cri_dmg: number | null
          character_showcase_url: string | null
          role: string | null
          slot_index: number | null
          sp: number | null
          uid_game: string | null
          updated_at: string | null
          discord_user_id: string | null
          discord_username: string | null
          discord_link_code: string | null
          discord_link_expires: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          guild_id?: string | null
          cp?: number | null
          hp?: number | null
          id?: string
          ignore_mdef?: number | null
          ignore_pdef?: number | null
          is_on_leave?: boolean | null
          job_name?: string | null
          last_stat_update?: string | null
          m_atk?: number | null
          m_def?: number | null
          m_dmg?: number | null
          m_reduc?: number | null
          p_atk?: number | null
          p_def?: number | null
          p_dmg?: number | null
          p_reduc?: number | null
          party_id?: number | null
          pvp_dmg?: number | null
          pvp_reduc?: number | null
          cri?: number | null
          cri_dmg?: number | null
          character_showcase_url?: string | null
          role?: string | null
          slot_index?: number | null
          sp?: number | null
          uid_game?: string | null
          updated_at?: string | null
          discord_user_id?: string | null
          discord_username?: string | null
          discord_link_code?: string | null
          discord_link_expires?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          guild_id?: string | null
          cp?: number | null
          hp?: number | null
          id?: string
          ignore_mdef?: number | null
          ignore_pdef?: number | null
          is_on_leave?: boolean | null
          job_name?: string | null
          last_stat_update?: string | null
          m_atk?: number | null
          m_def?: number | null
          m_dmg?: number | null
          m_reduc?: number | null
          p_atk?: number | null
          p_def?: number | null
          p_dmg?: number | null
          p_reduc?: number | null
          party_id?: number | null
          pvp_dmg?: number | null
          pvp_reduc?: number | null
          cri?: number | null
          cri_dmg?: number | null
          character_showcase_url?: string | null
          role?: string | null
          slot_index?: number | null
          sp?: number | null
          uid_game?: string | null
          updated_at?: string | null
          discord_user_id?: string | null
          discord_username?: string | null
          discord_link_code?: string | null
          discord_link_expires?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_guild_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
