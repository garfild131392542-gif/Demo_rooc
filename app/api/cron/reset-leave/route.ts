import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // ตรวจสอบ Authorization header เพื่อความปลอดภัย (Vercel จะส่ง CRON_SECRET มาให้)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createAdminClient()

  // อัปเดตทุกคนที่ is_on_leave = true ให้กลายเป็น false
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ is_on_leave: false } as any)
    .eq('is_on_leave', true)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Leave status reset successfully' })
}