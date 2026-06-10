"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSession } from "./auth";
import { revalidatePath } from "next/cache";
import { Profile } from "@/types/database";

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

    const pvp_reduc = parseInt(formData.get("pvp_reduc") as string) || 0;
    const pvp_dmg = parseInt(formData.get("pvp_dmg") as string) || 0;
    const p_def = parseInt(formData.get("p_def") as string) || 0;
    const m_def = parseInt(formData.get("m_def") as string) || 0;

    const p_atk = parseInt(formData.get("p_atk") as string) || 0;
    const m_atk = parseInt(formData.get("m_atk") as string) || 0;
    const p_dmg = parseInt(formData.get("p_dmg") as string) || 0;
    const m_dmg = parseInt(formData.get("m_dmg") as string) || 0;
    const p_reduc = parseInt(formData.get("p_reduc") as string) || 0;
    const m_reduc = parseInt(formData.get("m_reduc") as string) || 0;
    const hp = parseInt(formData.get("hp") as string) || 0;
    const sp = parseInt(formData.get("sp") as string) || 0;
    const ignore_pdef = parseInt(formData.get("ignore_pdef") as string) || 0;
    const ignore_mdef = parseInt(formData.get("ignore_mdef") as string) || 0;

    const { error } = await supabase.from("profiles").insert([
      {
        guild_id: admin.guild_id,
        uid_game,
        display_name,
        job_name,
        role,
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
        last_stat_update: new Date().toISOString(),
      },
    ] as any);

    if (error) return { success: false, error: error.message };

    revalidatePath("/guild-admin/credentials");
    revalidatePath("/members");
    revalidatePath("/");
    return { success: true };
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

    const pvp_reduc = parseInt(formData.get("pvp_reduc") as string) || 0;
    const pvp_dmg = parseInt(formData.get("pvp_dmg") as string) || 0;
    const p_def = parseInt(formData.get("p_def") as string) || 0;
    const m_def = parseInt(formData.get("m_def") as string) || 0;

    const p_atk = parseInt(formData.get("p_atk") as string) || 0;
    const m_atk = parseInt(formData.get("m_atk") as string) || 0;
    const p_dmg = parseInt(formData.get("p_dmg") as string) || 0;
    const m_dmg = parseInt(formData.get("m_dmg") as string) || 0;
    const p_reduc = parseInt(formData.get("p_reduc") as string) || 0;
    const m_reduc = parseInt(formData.get("m_reduc") as string) || 0;
    const hp = parseInt(formData.get("hp") as string) || 0;
    const sp = parseInt(formData.get("sp") as string) || 0;
    const ignore_pdef = parseInt(formData.get("ignore_pdef") as string) || 0;
    const ignore_mdef = parseInt(formData.get("ignore_mdef") as string) || 0;

    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        uid_game,
        display_name,
        job_name,
        role,
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
    const admin = await checkGuildAdmin();
    const supabase = await createAdminClient();

    const updateData: any = { is_on_leave };
    if (is_on_leave === true) {
      updateData.party_id = null;
      updateData.slot_index = null;
    }

    const { data, error } = await (supabase as any)
      .from("profiles")
      .update(updateData)
      .eq("id", id)
      .eq("guild_id", admin.guild_id!)
      .select();

    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) {
      return {
        success: false,
        error: "อัปเดตไม่สำเร็จ: ข้อมูลอยู่นอกเหนือสิทธิ์การจัดการของกิลด์คุณ",
      };
    }

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
