/**
 * Supabase Database Type Definitions
 * Auto-generated style type definitions for the Supabase schema
 * 
 * In production, you would generate this using:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
 * 
 * For now, this is a manual definition matching migrations/003_saas_schema_update.sql
 */

export type Database = {
  public: {
    Tables: {
      profile: {
        Row: {
          id: string
          uid_game: string
          email: string | null
          display_name: string
          job_name: string
          role: 'admin' | 'member'
          guild_id: string | null
          avatar_url: string
          p_atk: number
          m_atk: number
          p_def: number
          m_def: number
          p_dmg: number
          m_dmg: number
          p_reduc: number
          m_reduc: number
          pvp_dmg: number
          pvp_reduc: number
          party_id: number | null
          slot_index: number | null
          is_on_leave: boolean
          created_at: string
          updated_at: string
          last_stat_update: string | null
        }
        Insert: {
          id: string
          uid_game: string
          email?: string | null
          display_name: string
          job_name: string
          role?: 'admin' | 'member'
          guild_id?: string | null
          avatar_url?: string
          p_atk?: number
          m_atk?: number
          p_def?: number
          m_def?: number
          p_dmg?: number
          m_dmg?: number
          p_reduc?: number
          m_reduc?: number
          pvp_dmg?: number
          pvp_reduc?: number
          party_id?: number | null
          slot_index?: number | null
          is_on_leave?: boolean
          created_at?: string
          updated_at?: string
          last_stat_update?: string | null
        }
        Update: {
          id?: string
          uid_game?: string
          email?: string | null
          display_name?: string
          job_name?: string
          role?: 'admin' | 'member'
          guild_id?: string | null
          avatar_url?: string
          p_atk?: number
          m_atk?: number
          p_def?: number
          m_def?: number
          p_dmg?: number
          m_dmg?: number
          p_reduc?: number
          m_reduc?: number
          pvp_dmg?: number
          pvp_reduc?: number
          party_id?: number | null
          slot_index?: number | null
          is_on_leave?: boolean
          created_at?: string
          updated_at?: string
          last_stat_update?: string | null
        }
      }
      guilds: {
        Row: {
          id: string
          owner_id: string
          name: string
          server_name: string
          status: 'pending' | 'approved' | 'rejected'
          guild_url: string | null
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          server_name: string
          status?: 'pending' | 'approved' | 'rejected'
          guild_url?: string | null
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          server_name?: string
          status?: 'pending' | 'approved' | 'rejected'
          guild_url?: string | null
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      admins: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          role: 'admin' | 'super_admin'
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          role?: 'admin' | 'super_admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          role?: 'admin' | 'super_admin'
          created_at?: string
          updated_at?: string
        }
      }
      guild_owners: {
        Row: {
          id: string
          email: string | null
          first_name: string
          last_name: string
          phone_number: string
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          first_name: string
          last_name: string
          phone_number: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          first_name?: string
          last_name?: string
          phone_number?: string
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      profile_role: 'admin' | 'member'
      guild_status: 'pending' | 'approved' | 'rejected'
      admin_role: 'admin' | 'super_admin'
    }
    CompositeTypes: {}
  }
}
