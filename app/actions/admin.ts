"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSession } from "./auth";
import { revalidatePath } from "next/cache";
import { Profile } from "@/types/database";
import { STAT_LIMITS } from "@/lib/stat-limits";

/**
 * [LAYER A] สำหรับ Super Admin (ผู้ดูแลระบบสูงสุดของเว็บ)
 * ใช้ตรวจสอบสิทธิ์ในการ อนุมัติ/ปฏิเสธ การสร้างกิลด์ในระบบ
 */
async function checkSuperAdmin() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized: No session found");
  }

  const supabase = await createClient();
  const { data: admin, error } = await supabase
    .from("admins")
    .select("id, role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !admin) {
    throw new Error("Unauthorized: Super Admin access required");
  }

  return admin;
}

/**
 * [LAYER B] สำหรับ Guild Admin (หัวหน้ากิลด์แต่ละกิลด์) - ตรวจสอบหลายชั้น (Multi-layered)
 * ป้องกันไม่ให้ Member ทั่วไปเข้าถึง และจำกัดให้แอดมินเห็นเฉพาะข้อมูลภายในกิลด์ของตนเองเท่านั้น
 */
async function checkGuildAdmin() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized: No session found");
  }

  const supabase = await createClient();
  const { data: profile, error } = (await supabase
    .from("profiles")
    .select("id, guild_id, role")
    .eq("id", session.user.id)
    .maybeSingle()) as {
    data: Pick<Profile, "id" | "guild_id" | "role"> | null;
    error: any;
  };

  if (error || !profile || profile.role !== "admin" || !profile.guild_id) {
    throw new Error(
      "Unauthorized: Guild Admin access denied or missing guild assignment",
    );
  }

  return profile;
}

// ==========================================
// ---- Guild Members CRUD (สิทธิ์ Guild Admin) ----
// ==========================================

export async function createMember(formData: FormData) {
  try {
    const admin = await checkGuildAdmin();
    const supabase = await createAdminClient();

    const uid_game = formData.get("uid_game") as string;
    const display_name = formData.get("display_name") as string;
    const job_name = formData.get("job_name") as string;
    const role = formData.get("role") as "admin" | "member";

    const cp = parseInt(formData.get("cp") as string) || 0;
    const pvp_reduc = parseInt(formData.get("pvp_reduc") as string) || 0;
    const pvp_dmg = parseInt(formData.get("pvp_dmg") as string) || 0;
    const p_def = parseInt(formData.get("p_def") as string) || 0;
    const m_def = parseInt(formData.get("m_def") as string) || 0;

    const p_atk = parseInt(formData.get("p_atk") as string) || 0;
    const m_atk = parseInt(formData.get("m_atk") as string) || 0;
    const p_dmg = parseFloat(formData.get("p_dmg") as string) || 0;
    const m_dmg = parseFloat(formData.get("m_dmg") as string) || 0;
    const p_reduc = parseFloat(formData.get("p_reduc") as string) || 0;
    const m_reduc = parseFloat(formData.get("m_reduc") as string) || 0;
    const hp = parseInt(formData.get("hp") as string) || 0;
    const sp = parseInt(formData.get("sp") as string) || 0;
    const ignore_pdef = parseInt(formData.get("ignore_pdef") as string) || 0;
    const ignore_mdef = parseInt(formData.get("ignore_mdef") as string) || 0;
    const cri = parseInt(formData.get("cri") as string) || 0;
    const cri_dmg = parseFloat(formData.get("cri_dmg") as string) || 0;

    // ตรวจสอบลิมิตของสเตตัสป้องกันการป้อนค่าปลอม (เช่น 999999)
    const statsObj = { cp, hp, sp, p_atk, m_atk, p_def, m_def, p_dmg, m_dmg, p_reduc, m_reduc, pvp_dmg, pvp_reduc, ignore_pdef, ignore_mdef, cri, cri_dmg };
    const statLabels: Record<string, string> = {
      cp: "CP", hp: "Max HP", sp: "Max SP", p_atk: "P.ATK", m_atk: "M.ATK",
      p_def: "P.DEF", m_def: "M.DEF", ignore_pdef: "Ignore P.DEF", ignore_mdef: "Ignore M.DEF",
      p_dmg: "P.DMG (%)", m_dmg: "M.DMG (%)", p_reduc: "P.Reduc (%)", m_reduc: "M.Reduc (%)",
      pvp_dmg: "PvP DMG", pvp_reduc: "PvP Reduc", cri: "Cri", cri_dmg: "Cri Dam (%)"
    };

    for (const key of Object.keys(STAT_LIMITS) as (keyof typeof STAT_LIMITS)[]) {
      const val = statsObj[key];
      const maxVal = STAT_LIMITS[key];
      if (val > maxVal) {
        const label = statLabels[key] || key;
        return { success: false, error: `ค่า ${label} ต้องไม่เกิน ${maxVal.toLocaleString()}` };
      }
    }

    // 1. สร้างเมลเสมือนโดยอิงจาก UID Game
    if (!uid_game || !uid_game.trim()) {
      return { success: false, error: "กรุณาระบุ UID Game" };
    }
    const finalEmail = `${uid_game.trim().toLowerCase()}@member.rooc`;

    // 2. สุ่มสร้างรหัสผ่านเริ่มต้นความยาว 8 หลัก
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let generatedPassword = '';
    for (let i = 0; i < 8; i++) {
      generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // 3. ลงทะเบียน Auth User ในระบบ
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: finalEmail,
      password: generatedPassword,
      email_confirm: true,
    });

    if (authError) {
      return { success: false, error: `ไม่สามารถลงทะเบียนผู้ใช้ได้: ${authError.message}` };
    }

    const newUserId = authData.user?.id;
    if (!newUserId) {
      return { success: false, error: "ไม่สามารถรับรหัส ID ผู้ใช้ใหม่ได้" };
    }

    // 4. บันทึกข้อมูลโปรไฟล์สมาชิกใหม่ในตาราง profiles
    const { error: profileError } = await supabase.from("profiles").insert([
      {
        id: newUserId,
        guild_id: admin.guild_id,
        uid_game: uid_game.trim(),
        display_name: display_name?.trim() || uid_game.trim(),
        job_name,
        role,
        cp,
        p_atk,
        m_atk,
        p_def,
        m_def,
        p_dmg,
        m_dmg,
        p_reduc,
        m_reduc,
        pvp_reduc,
        pvp_dmg,
        hp, sp, ignore_pdef, ignore_mdef,
        cri, cri_dmg,
        last_stat_update: new Date().toISOString(),
      },
    ] as any);

    if (profileError) {
      // Rollback: ลบ Auth User ทิ้งเพื่อหลีกเลี่ยงบัญชีกำพร้าที่ไม่มีโปรไฟล์
      await supabase.auth.admin.deleteUser(newUserId);
      return { success: false, error: `ไม่สามารถบันทึกโปรไฟล์สมาชิกได้: ${profileError.message}` };
    }

    revalidatePath("/guild-admin/credentials");
    revalidatePath("/members");
    revalidatePath("/");
    
    return { success: true, password: generatedPassword };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMember(id: string, formData: FormData) {
  try {
    const admin = await checkGuildAdmin();
    const supabase = await createAdminClient();

    const { data: targetMember } = (await supabase
      .from("profiles")
      .select("guild_id")
      .eq("id", id)
      .single()) as { data: Pick<Profile, "guild_id"> };
    if (!targetMember || targetMember.guild_id !== admin.guild_id) {
      return {
        success: false,
        error: "คุณไม่มีสิทธิ์แก้ไขข้อมูลสมาชิกข้ามกิลด์",
      };
    }

    const uid_game = formData.get("uid_game") as string;
    const display_name = formData.get("display_name") as string;
    const job_name = formData.get("job_name") as string;
    const role = formData.get("role") as "admin" | "member";

    const cp = parseInt(formData.get("cp") as string) || 0;
    const pvp_reduc = parseInt(formData.get("pvp_reduc") as string) || 0;
    const pvp_dmg = parseInt(formData.get("pvp_dmg") as string) || 0;
    const p_def = parseInt(formData.get("p_def") as string) || 0;
    const m_def = parseInt(formData.get("m_def") as string) || 0;

    const p_atk = parseInt(formData.get("p_atk") as string) || 0;
    const m_atk = parseInt(formData.get("m_atk") as string) || 0;
    const p_dmg = parseFloat(formData.get("p_dmg") as string) || 0;
    const m_dmg = parseFloat(formData.get("m_dmg") as string) || 0;
    const p_reduc = parseFloat(formData.get("p_reduc") as string) || 0;
    const m_reduc = parseFloat(formData.get("m_reduc") as string) || 0;
    const hp = parseInt(formData.get("hp") as string) || 0;
    const sp = parseInt(formData.get("sp") as string) || 0;
    const ignore_pdef = parseInt(formData.get("ignore_pdef") as string) || 0;
    const ignore_mdef = parseInt(formData.get("ignore_mdef") as string) || 0;
    const cri = parseInt(formData.get("cri") as string) || 0;
    const cri_dmg = parseFloat(formData.get("cri_dmg") as string) || 0;

    const statsObj = { cp, hp, sp, p_atk, m_atk, p_def, m_def, p_dmg, m_dmg, p_reduc, m_reduc, pvp_dmg, pvp_reduc, ignore_pdef, ignore_mdef, cri, cri_dmg };
    const statLabels: Record<string, string> = {
      cp: "CP", hp: "Max HP", sp: "Max SP", p_atk: "P.ATK", m_atk: "M.ATK",
      p_def: "P.DEF", m_def: "M.DEF", ignore_pdef: "Ignore P.DEF", ignore_mdef: "Ignore M.DEF",
      p_dmg: "P.DMG (%)", m_dmg: "M.DMG (%)", p_reduc: "P.Reduc (%)", m_reduc: "M.Reduc (%)",
      pvp_dmg: "PvP DMG", pvp_reduc: "PvP Reduc", cri: "Cri", cri_dmg: "Cri Dam (%)"
    };

    for (const key of Object.keys(STAT_LIMITS) as (keyof typeof STAT_LIMITS)[]) {
      const val = statsObj[key];
      const maxVal = STAT_LIMITS[key];
      if (val > maxVal) {
        const label = statLabels[key] || key;
        return { success: false, error: `ค่า ${label} ต้องไม่เกิน ${maxVal.toLocaleString()}` };
      }
    }

    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        uid_game,
        display_name,
        job_name,
        role,
        cp,
        p_atk,
        m_atk,
        p_def,
        m_def,
        p_dmg,
        m_dmg,
        p_reduc,
        m_reduc,
        pvp_reduc,
        pvp_dmg,
        hp, sp, ignore_pdef, ignore_mdef,
        cri, cri_dmg,
        last_stat_update: new Date().toISOString(),
      } as any)
      .eq("id", id)
      .eq("guild_id", admin.guild_id!);

    if (error) return { success: false, error: error.message };

    revalidatePath("/guild-admin/credentials");
    revalidatePath("/members");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMember(id: string) {
  try {
    const admin = await checkGuildAdmin();
    const supabase = await createAdminClient();

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id)
      .eq("guild_id", admin.guild_id!);

    if (error) return { success: false, error: error.message };

    revalidatePath("/guild-admin/credentials");
    revalidatePath("/members");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// 🌟 [RE-ADDED] ฟังก์ชันสลับสิทธิ์ผู้ใช้งานภายในกิลด์ (สิทธิ์ Guild Admin)
export async function changeMemberRole(
  id: string,
  newRole: "admin" | "member",
) {
  try {
    const admin = await checkGuildAdmin();
    const supabase = await createAdminClient();

    // ป้องกันสิทธิ์: เช็คว่าสมาชิกที่แอดมินจะกดยกสิทธิ์ อยู่ในกิลด์ของตนเองจริงไหม
    const { data: targetMember } = (await supabase
      .from("profiles")
      .select("guild_id")
      .eq("id", id)
      .maybeSingle()) as { data: Pick<Profile, "guild_id"> | null };
    if (!targetMember || targetMember.guild_id !== admin.guild_id) {
      return {
        success: false,
        error: "คุณไม่มีอำนาจแก้ไขสิทธิ์ของสมาชิกกิลด์อื่น",
      };
    }

    const { error } = await (supabase as any)
      .from("profiles")
      .update({ role: newRole } as any)
      .eq("id", id)
      .eq("guild_id", admin.guild_id!);

    if (error) return { success: false, error: error.message };

    revalidatePath("/guild-admin/credentials");
    revalidatePath("/members");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// ---- ระบบบริหารรหัสผ่านกิลด์ (สิทธิ์ Guild Admin) ----
// ==========================================

export async function resetMemberPassword(userId: string, newPassword: string) {
  try {
    const admin = await checkGuildAdmin();
    const supabase = await createAdminClient();

    const { data: targetMember } = (await supabase
      .from("profiles")
      .select("guild_id")
      .eq("id", userId)
      .maybeSingle()) as { data: Pick<Profile, "guild_id"> | null };

    if (!targetMember || targetMember.guild_id !== admin.guild_id) {
      return {
        success: false,
        error: "ปฏิเสธสิทธิ์: คุณไม่มีอำนาจจัดการรหัสผ่านของสมาชิกกิลด์อื่น",
      };
    }

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/guild-admin/credentials");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "เกิดข้อผิดพลาดในการประมวลผล",
    };
  }
}

export async function toggleMemberLeave(id: string, is_on_leave: boolean) {
  try {
    const supabase = await createAdminClient();
    
    // 1. ดึงข้อมูล User ปัจจุบันที่กำลังกดปุ่มก่อน (ต้องเช็กว่าเป็นเจ้าของ ID ไหม)
    const { data: { user } } = await supabase.auth.getUser(); 
    if (!user) return { success: false, error: "ไม่พบเซสชันผู้ใช้งาน" };

    const currentUserId = user.id;
    let hasPermission = false;
    let targetGuildId = null;

    // 2. เช็กเงื่อนไขสิทธิ์การเข้าถึง
    if (currentUserId === id) {
      // กรณีที่ 1: สิทธิ์ของ Member (กดลาให้ตัวเอง) -> ให้ผ่านได้เลย
      hasPermission = true;
    } else {
      // กรณีที่ 2: คนกดไม่ใช่เจ้าของ ID -> ต้องเช็กว่าเป็น Admin ของกิลด์นั้นไหม
      try {
        const admin = await checkGuildAdmin();
        if (admin) {
          hasPermission = true;
          targetGuildId = admin.guild_id; // เก็บค่า guild_id ของแอดมินไว้ใช้คิวรี
        }
      } catch (adminError) {
        // ถ้าไม่ใช่ Admin และไม่ใช่เจ้าของ ID ก็ปัดตกไป
        return { success: false, error: "คุณไม่มีสิทธิ์จัดการข้อมูลนี้" };
      }
    }

    if (!hasPermission) {
      return { success: false, error: "คุณไม่มีสิทธิ์เข้าถึงฟังก์ชันนี้" };
    }

    // 3. เตรียมข้อมูลที่จะอัปเดต
    const updateData: any = { is_on_leave };
    if (is_on_leave === true) {
      updateData.party_id = null;
      updateData.slot_index = null;
    }

    // 4. สั่งอัปเดตข้อมูลลงฐานข้อมูล
    let query: any = (supabase as any).from("profiles").update(updateData).eq("id", id);

    // ถ้าเป็นแอดมินจัดการ ให้ล็อกคิวรีเพิ่มเพื่อความปลอดภัยว่าต้องเป็นคนในกิลด์เดียวกัน
    if (currentUserId !== id && targetGuildId) {
      query = query.eq("guild_id", targetGuildId);
    }

    const { data, error } = await query.select();

    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) {
      return {
        success: false,
        error: "อัปเดตไม่สำเร็จ: ไม่พบข้อมูลหรืออยู่นอกเหนือสิทธิ์การจัดการของคุณ",
      };
    }

    // เคลียร์แคชหน้าเว็บเพื่อให้เห็นข้อมูลอัปเดตล่าสุด
    revalidatePath("/guild-admin/credentials");
    revalidatePath("/");
    return { success: true };
    
  } catch (e: any) {
    return {
      success: false,
      error: e.message || "เกิดข้อผิดพลาดในระบบหลังบ้าน",
    };
  }
}

// ==========================================
// ---- Guild Approval System (สิทธิ์ Super Admin เท่านั้น) ----
// ==========================================

export async function getPendingGuilds() {
  await checkSuperAdmin();
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("guilds")
    .select(
      "id, name, server_name, owner_id, status, created_at, profiles:owner_id(display_name, email)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending guilds:", error);
    return { success: false, error: error.message, guilds: [] };
  }

  return { success: true, guilds: data || [] };
}

export async function approveGuild(guildId: string) {
  try {
    await checkSuperAdmin();
    const supabase = await createAdminClient();

    const { data: guild, error: fetchError } = await (supabase as any)
      .from("guilds")
      .select("id, owner_id, status")
      .eq("id", guildId)
      .single();

    if (fetchError || !guild) {
      return { success: false, error: "กิลด์ไม่พบ" };
    }

    if (guild.status !== "pending") {
      return {
        success: false,
        error: `กิลด์มีสถานะ ${guild.status} ไม่สามารถอนุมัติได้`,
      };
    }

    const { error: updateError } = await (supabase as any)
      .from("guilds")
      .update({
        status: "active",
        approved_at: new Date().toISOString(),
      } as any)
      .eq("id", guildId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const { error: profileError } = await (supabase as any)
      .from("profiles")
      .update({ guild_id: (guild as any).id, role: "admin" } as any)
      .eq("id", guild.owner_id);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    revalidatePath("/admin/");
    return { success: true, message: "อนุมัติกิลด์สำเร็จ" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function rejectGuild(guildId: string, reason?: string) {
  try {
    await checkSuperAdmin();
    const supabase = await createAdminClient();

    const { data: guild, error: fetchError } = await (supabase as any)
      .from("guilds")
      .select("id, status")
      .eq("id", guildId)
      .single();

    if (fetchError || !guild) {
      return { success: false, error: "กิลด์ไม่พบ" };
    }

    if (guild.status !== "pending") {
      return {
        success: false,
        error: `กิลด์มีสถานะ ${guild.status} ไม่สามารถปฏิเสธได้`,
      };
    }

    const { error: updateError } = await (supabase as any)
      .from("guilds")
      .update({
        status: "rejected",
        rejection_reason: reason || "ไม่ระบุเหตุผล",
        rejected_at: new Date().toISOString(),
      })
      .eq("id", guildId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/admin");
    return { success: true, message: "ปฏิเสธกิลด์สำเร็จ" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
