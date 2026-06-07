/**
 * Database Type Definitions
 * These types represent the exact schema in Supabase after Phase 2
 * Keep in sync with migrations/003_saas_schema_update.sql
 */

/**
 * Profile Type
 * Represents a user profile in the system
 * Linked to auth.users(id) for Supabase Auth
 */
export type Profile = {
  // Authentication & Identity
  id: string; // UUID, FK to auth.users(id)
  uid_game: string; // Game username, UNIQUE
  email?: string | null;
  display_name: string;
  
  // Job & Role
  job_name: string;
  role: 'admin' | 'member';
  
  // Game Stats
  p_atk: number;
  m_atk: number;
  p_def: number;
  m_def: number;
  p_dmg: number;
  m_dmg: number;
  p_reduc: number;
  m_reduc: number;
  pvp_dmg: number;
  pvp_reduc: number;
  
  // Guild & Multi-Tenancy
  guild_id?: string | null; // UUID, FK to guilds(id)
  
  // Avatar & Presentation
  avatar_url?: string;
  
  // Party & Availability
  party_id?: number | null;
  slot_index?: number | null;
  is_on_leave?: boolean;
  
  // Timestamps
  created_at?: string; // ISO 8601
  updated_at?: string; // ISO 8601 (auto-updated)
  last_stat_update?: string; // ISO 8601
};

export type GuildOwner = {
  id: string; // UUID, FK to auth.users(id)
  email?: string | null;
  first_name: string;
  last_name: string;
  phone_number: string;
  created_at?: string; // ISO 8601
};



/**
 * Guild Type
 * Represents a gaming guild/community
 * Owned by a user and contains multiple members (profiles)
 */
export type Guild = {
  // Identity
  id: string; // UUID, PK
  name: string;
  server_name: string;
  owner_id: string; // UUID, FK to auth.users(id)
  
  // SaaS Specific
  guild_url?: string | null; // Custom invite link URL (UNIQUE)
  trial_ends_at?: string | null; // TIMESTAMP WITH TIME ZONE
  description?: string | null; // Guild description
  invite_code?: string | null; // Invite code for guild
  
  // Status
  status: 'pending' | 'approved' | 'rejected';
  
  // Timestamps
  created_at?: string; // ISO 8601
  updated_at?: string; // ISO 8601 (auto-updated)
  
  // Relations (optional, included when selected)
  profiles?: Profile | Profile[];
};

/**
 * Admin Type
 * Represents system-wide admin privileges
 * Separate from guild-level admin role in profiles
 */
export type Admin = {
  id: string; // UUID, FK to auth.users(id)
  email?: string;
  display_name?: string;
  role: 'admin' | 'super_admin';
  created_at?: string;
  updated_at?: string;
};

/**
 * Session Type
 * Represents the current authenticated user's session
 * Used after Phase 3 when Supabase Auth is fully implemented
 */
export type Session = {
  id: string; // User ID from auth.users(id)
  email?: string;
  display_name?: string;
  guild_id?: string | null;
  role: 'member' | 'admin';
  is_admin: boolean; // Whether user has admin privileges
  admin_role?: 'admin' | 'super_admin' | null;
};

/**
 * Party Type (Inferred from profiles table)
 * Represents a party formed from members in a guild
 */
export type Party = {
  id: number;
  guild_id: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
};

/**
 * Leaderboard Profile Type
 * A subset of Profile used for leaderboards/rankings
 */
export type LeaderboardProfile = {
  id: string;
  uid_game: string;
  display_name: string;
  job_name: string;
  guild_id?: string | null;
  avatar_url?: string;
  p_atk: number;
  m_atk: number;
  p_def: number;
  m_def: number;
};
