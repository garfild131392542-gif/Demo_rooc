/**
 * Limits for character stats inputs to prevent unrealistic values (e.g., 999999)
 * Tailored for Ragnarok Origin stats ranges.
 */
export const STAT_LIMITS = {
  hp: 999999,          // Max HP: 9,999,999
  sp: 20000,           // Max SP: 200,000
  p_atk: 20000,        // Max P.ATK: 200,000
  m_atk: 20000,        // Max M.ATK: 200,000
  p_def: 30000,        // Max P.DEF: 100,000
  m_def: 30000,        // Max M.DEF: 100,000
  ignore_pdef: 30000,     // Max Ignore P.DEF: 300%
  ignore_mdef: 30000,     // Max Ignore M.DEF: 300%
  p_dmg: 30000,           // Max P.DMG: 300%
  m_dmg: 3000,           // Max M.DMG: 300%
  p_reduc: 3000,         // Max P.Reduc: 300%
  m_reduc: 3000,         // Max M.Reduc: 300%
  pvp_dmg: 10000,      // Max PvP DMG: 100,000
  pvp_reduc: 10000,    // Max PvP Reduc: 100,000
  cri: 5000,            // Max Cri (flat): 5,000
  cri_dmg: 500,         // Max Cri Dam %: 500%
};

export type StatLimitsKey = keyof typeof STAT_LIMITS;
