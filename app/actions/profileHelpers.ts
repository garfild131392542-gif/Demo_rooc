export type ProfileUpdatePayload = {
  display_name: string;
  job_name: string;
  pvp_reduc: number;
  pvp_dmg: number;
  p_def: number;
  m_def: number;
  p_atk: number;
  m_atk: number;
  p_dmg: number;
  m_dmg: number;
  p_reduc: number;
  m_reduc: number;
  hp: number;
  sp: number;
  ignore_pdef: number;
  ignore_mdef: number;
  cri: number;
  cri_dmg: number;
  character_showcase_url: string;
  updated_at: string;
};

export const normalizeString = (value: FormDataEntryValue | null): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

export const parseIntegerField = (value: FormDataEntryValue | null): number => {
  const formatted = normalizeString(value);
  const parsed = parseInt(formatted, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const parseFloatField = (value: FormDataEntryValue | null): number => {
  const formatted = normalizeString(value);
  const parsed = parseFloat(formatted);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const buildProfileUpdatePayload = (formData: FormData): ProfileUpdatePayload => {
  return {
    display_name: normalizeString(formData.get("display_name")),
    job_name: normalizeString(formData.get("job_name")),
    pvp_reduc: parseIntegerField(formData.get("pvp_reduc")),
    pvp_dmg: parseIntegerField(formData.get("pvp_dmg")),
    p_def: parseIntegerField(formData.get("p_def")),
    m_def: parseIntegerField(formData.get("m_def")),
    p_atk: parseIntegerField(formData.get("p_atk")),
    m_atk: parseIntegerField(formData.get("m_atk")),
    p_dmg: parseFloatField(formData.get("p_dmg")),
    m_dmg: parseFloatField(formData.get("m_dmg")),
    p_reduc: parseFloatField(formData.get("p_reduc")),
    m_reduc: parseFloatField(formData.get("m_reduc")),
    hp: parseIntegerField(formData.get("hp")),
    sp: parseIntegerField(formData.get("sp")),
    ignore_pdef: parseIntegerField(formData.get("ignore_pdef")),
    ignore_mdef: parseIntegerField(formData.get("ignore_mdef")),
    cri: parseIntegerField(formData.get("cri")),
    cri_dmg: parseFloatField(formData.get("cri_dmg")),
    character_showcase_url: normalizeString(formData.get("character_showcase_url")),
    updated_at: new Date().toISOString(),
  };
};
