/**
 * ROOC Discord Bot Service (Multi-Tenant Version)
 * Integrates Discord with Next.js/Supabase Guild Management System.
 * 
 * Features:
 * 1. !link <code> - Links Discord account to website profile.
 * 2. Class Channel - Updates user class/job name (configured in Guild settings).
 * 3. Name Channel - Updates user display name (configured in Guild settings).
 * 4. Reserve Channel - Places item reservation slots (configured in Guild settings).
 */

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// 1. LOAD ENVIRONMENT VARIABLES FROM .env.local
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    console.log('[Bot] Loading environment variables from .env.local...');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const cleanLine = line.split('#')[0].trim();
      if (!cleanLine) return;
      const match = cleanLine.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value.trim();
      }
    });
  } else {
    console.warn('[Bot] Warning: .env.local file not found. Using system env variables.');
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must use service role to bypass RLS for bot updates
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Validate essential keys
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[Bot ERROR] Supabase URL or Service Role Key is missing. Check .env.local.');
  process.exit(1);
}
if (!DISCORD_TOKEN) {
  console.error('[Bot ERROR] DISCORD_BOT_TOKEN is missing in .env.local.');
  process.exit(1);
}

// 2. INITIALIZE SUPABASE CLIENT
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

// 3. INITIALIZE DISCORD CLIENT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [
    Partials.Channel // Required to receive DMs in v14+
  ]
});

// ROOC Valid Classes
const VALID_CLASSES = [
  'Lord Knight', 'Paladin', 'Biochemist', 'Mastersmith', 
  'Bard', 'Gypsy', 'Sniper', 'Champion', 'Priest', 
  'Assassin', 'Rogue', 'Wizard', 'Sage', 'Summoner', 'Rebellion'
];

// Helper to match input string to valid class (case-insensitive)
function matchClass(input) {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, '');
  for (const className of VALID_CLASSES) {
    const classNormalized = className.toLowerCase().replace(/\s+/g, '');
    if (normalized === classNormalized) {
      return className;
    }
  }
  return null;
}

// Helper to parse item reservation text
function parseItemReservation(text) {
  text = text.toLowerCase().trim();
  const numMatch = text.match(/\d+/);
  const qty = numMatch ? parseInt(numMatch[0]) : 1;
  const cleanText = text.replace(/\d+/, "").trim();

  let itemType = null;
  if (cleanText.includes("สมุด") || cleanText.includes("album") || cleanText.includes("card")) {
    itemType = "Album";
  } else if (cleanText.includes("เศษ") || cleanText.includes("puppet") || cleanText.includes("บอส") || cleanText.includes("ตุ๊กตา")) {
    itemType = "Puppet";
  } else if (cleanText.includes("ขาว") || cleanText.includes("white")) {
    itemType = "White";
  } else if (cleanText.includes("ดำ") || cleanText.includes("แดง") || cleanText.includes("black") || cleanText.includes("red")) {
    itemType = "RedBlack";
  }

  return { itemType, qty };
}

// 4. BOT EVENTS
client.once('ready', () => {
  console.log(`[Bot] Connected to Discord successfully! Logged in as: ${client.user.tag}`);
  console.log(`[Bot] Running in Multi-Tenant Mode. Channel IDs will be fetched dynamically from Guild configurations.`);
});

client.on('messageCreate', async (message) => {
  // Ignore bots
  if (message.author.bot) return;

  try {
    const content = message.content.trim();
    const channelId = message.channel.id;

    // ─── COMMAND: !link <code> (Can run anywhere, including DMs or any channel) ───
    if (content.startsWith('!link ')) {
      const code = content.substring(6).trim();
      if (!/^\d{6}$/.test(code)) {
        return message.reply('❌ รหัสยืนยันตัวตนต้องเป็นตัวเลข 6 หลักครับ เช่น `!link 123456`');
      }

      console.log(`[Bot] Link attempt from Discord User ID: ${message.author.id} (@${message.author.username}) with code: ${code}`);

      // Search profile with valid code
      const { data: profile, error: searchError } = await supabase
        .from('profiles')
        .select('id, display_name, uid_game, discord_user_id')
        .eq('discord_link_code', code)
        .gt('discord_link_expires', new Date().toISOString())
        .maybeSingle();

      if (searchError) {
        console.error('[Bot] Database error searching link code:', searchError);
        return message.reply('❌ เกิดข้อผิดพลาดของฐานข้อมูล กรุณาลองใหม่อีกครั้ง');
      }

      if (!profile) {
        return message.reply('❌ ไม่พบรหัสยืนยันตัวตนนี้ หรือรหัสอาจหมดอายุแล้ว (อายุ 15 นาที) กรุณาสร้างรหัสเชื่อมต่อใหม่จากหน้าเว็บโปรไฟล์แล้วลองใหม่อีกครั้งครับ');
      }

      // Check if this Discord user is already linked to another profile
      const { data: existingLink } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('discord_user_id', message.author.id)
        .maybeSingle();

      if (existingLink) {
        return message.reply(`❌ บัญชี Discord นี้ถูกใช้เชื่อมต่อกับตัวละคร **${existingLink.display_name}** ไปแล้วครับ กรุณากด "ยกเลิกการเชื่อมต่อ" ตัวละครเดิมบนเว็บไซต์ก่อน`);
      }

      // Perform link
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          discord_user_id: message.author.id,
          discord_username: message.author.username,
          discord_link_code: null,
          discord_link_expires: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error('[Bot] Database error linking profile:', updateError);
        return message.reply('❌ เกิดข้อผิดพลาดขณะเชื่อมข้อมูลโปรไฟล์ กรุณาลองใหม่อีกครั้ง');
      }

      return message.reply(`✅ เชื่อมต่อบัญชีสำเร็จ! ยินดีต้อนรับคุณ **${profile.display_name}** (${profile.uid_game}) เข้าสู่ระบบเชื่อมต่อข้อมูล Discord บอทครับ 🎉`);
    }

    // ─── DYNAMIC MULTI-TENANT CHANNEL CHECKS ───
    // Query guilds to see if this channelId is registered under any guild settings
    const { data: guild, error: guildFetchError } = await supabase
      .from('guilds')
      .select('id, name, discord_class_channel_id, discord_name_channel_id, discord_reserve_channel_id, discord_leave_channel_id')
      .or(`discord_class_channel_id.eq.${channelId},discord_name_channel_id.eq.${channelId},discord_reserve_channel_id.eq.${channelId},discord_leave_channel_id.eq.${channelId}`)
      .maybeSingle();

    if (guildFetchError) {
      console.error('[Bot] Failed to lookup guild settings for channel:', channelId, guildFetchError);
      return;
    }

    // If channel is not registered to any guild, just ignore it
    if (!guild) return;

    // Check link status of the message sender
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, job_name, guild_id, is_on_leave')
      .eq('discord_user_id', message.author.id)
      .maybeSingle();

    if (profileError) {
      console.error('[Bot] Database error fetching user profile:', profileError);
      return message.reply('❌ เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์ของคุณ กรุณาลองใหม่อีกครั้ง');
    }

    if (!profile) {
      return message.reply('🔒 บัญชี Discord ของคุณยังไม่ได้เชื่อมต่อกับข้อมูลในระบบ กรุณาเข้าเว็บไซต์ ไปที่หน้าโปรไฟล์เพื่อสร้างโค้ดเชื่อมต่อ แล้วนำมาพิมพ์ `!link <รหัส>` ก่อนครับ');
    }

    // Security check: Ensure user belongs to the guild that owns this Discord channel
    if (profile.guild_id !== guild.id) {
      return message.reply(`❌ คุณเป็นสมาชิกของกิลด์อื่น ไม่สามารถสั่งการเปลี่ยนข้อมูลผ่านห้องดิสคอร์ดของกิลด์ **${guild.name}** ได้ครับ`);
    }

    // 1. CLASS/JOB CHANGE CHANNEL ACTION
    if (channelId === guild.discord_class_channel_id) {
      // Find target class. Message pattern: "Priest -> Bard" or just "Bard"
      let targetClassInput = content;
      if (content.includes('->')) {
        targetClassInput = content.split('->').pop();
      } else if (content.includes('—>')) {
        targetClassInput = content.split('—>').pop();
      }

      const matchedClass = matchClass(targetClassInput);
      if (!matchedClass) {
        return message.reply(`❌ ชื่ออาชีพไม่ถูกต้องครับ \nอาชีพที่รองรับ: ${VALID_CLASSES.join(', ')}`);
      }

      if (profile.job_name === matchedClass) {
        return message.reply(`ℹ️ สายอาชีพของคุณเป็น **${matchedClass}** อยู่แล้วครับ`);
      }

      const oldJob = profile.job_name || 'ไม่ระบุ';
      
      // Update class
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          job_name: matchedClass,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error('[Bot] Failed to update class:', updateError);
        return message.reply('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
      }

      return message.reply(`✅ อัปเดตข้อมูลของ **${profile.display_name}** สำเร็จ! \nเปลี่ยนอาชีพจาก: \`${oldJob}\` ➡️ **${matchedClass}** เรียบร้อยครับ ⚔️`);
    }

    // 2. NAME CHANGE CHANNEL ACTION
    if (channelId === guild.discord_name_channel_id) {
      const newName = content.trim();
      
      if (newName.length < 2 || newName.length > 24) {
        return message.reply('❌ ชื่อตัวละครต้องมีความยาวระหว่าง 2 ถึง 24 ตัวอักษรครับ');
      }

      if (profile.display_name === newName) {
        return message.reply(`ℹ️ ชื่อตัวละครของคุณเป็น **${newName}** อยู่แล้วครับ`);
      }

      const oldName = profile.display_name;

      // Update Name
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: newName,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error('[Bot] Failed to update name:', updateError);
        return message.reply('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
      }

      return message.reply(`✅ เปลี่ยนชื่อตัวละครสำเร็จ! \nเปลี่ยนชื่อจาก: \`${oldName}\` ➡️ **${newName}** เรียบร้อยครับ 🎉`);
    }

    // 3. ITEM RESERVATION CHANNEL ACTION
    if (channelId === guild.discord_reserve_channel_id) {
      const { itemType, qty } = parseItemReservation(content);

      if (!itemType) {
        return message.reply('❌ ไม่สามารถระบุประเภทไอเทมได้ครับ \nไอเทมที่จองได้: `สมุดการ์ด` (Album), `เศษการ์ดบอส` (Puppet), `ขนขาว` (White), `ขนดำ/แดง` (RedBlack) \nตัวอย่างการจอง: `ขนขาว 5` หรือ `White 5`');
      }

      if (qty < 1 || qty > 10) {
        return message.reply('❌ จำนวนที่จองต้องมีค่าตั้งแต่ 1 ถึง 10 ชิ้นครับ');
      }

      const ITEM_LABELS = {
        Album: 'สมุดการ์ด',
        Puppet: 'เศษการ์ดบอส',
        White: 'ขนขาว',
        RedBlack: 'ขนดำ/แดง'
      };
      const itemLabel = ITEM_LABELS[itemType];

      // Check existing count in queue (status waiting, partial, completed)
      const { data: existingQueues, error: fetchCountError } = await supabase
        .from('auction_queues')
        .select('id')
        .eq('user_id', profile.id)
        .eq('item_name', itemType)
        .in('status', ['waiting', 'partial', 'completed']);

      if (fetchCountError) {
        console.error('[Bot] Failed to fetch existing queues:', fetchCountError);
        return message.reply('❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่อีกครั้ง');
      }

      const currentCount = existingQueues ? existingQueues.length : 0;
      if (currentCount + qty > 10) {
        return message.reply(`❌ ท่านสามารถจอง ${itemLabel} ได้ไม่เกิน 10 ชิ้น (ปัจจุบันในระบบคุณจองไว้แล้ว ${currentCount} ชิ้น) ไม่สามารถจองเพิ่มอีก ${qty} ชิ้นได้ครับ`);
      }

      // Find max slot_number
      const { data: existingSlots } = await supabase
        .from('auction_queues')
        .select('slot_number')
        .eq('user_id', profile.id)
        .eq('item_name', itemType)
        .order('slot_number', { ascending: false })
        .limit(1);

      const maxSlotNumber = (existingSlots && existingSlots[0]) ? existingSlots[0].slot_number : 0;

      // Insert new rows
      const inserts = [];
      for (let i = 0; i < qty; i++) {
        inserts.push({
          guild_id: profile.guild_id,
          user_id: profile.id,
          item_name: itemType,
          requested_qty: 1,
          received_qty: 0,
          status: 'waiting',
          slot_number: maxSlotNumber + i + 1,
          queue_timestamp: new Date().toISOString()
        });
      }

      const { error: insertError } = await supabase
        .from('auction_queues')
        .insert(inserts);

      if (insertError) {
        console.error('[Bot] Failed to save reservations:', insertError);
        return message.reply('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลการจองคิว กรุณาลองใหม่อีกครั้ง');
      }

      return message.reply(`✅ จองคิวสำเร็จ! \nสมาชิก: **${profile.display_name}** \nไอเทม: **${itemLabel}** จำนวน: **${qty}** ชิ้น (รวมจองไอเทมนี้ทั้งหมด ${currentCount + qty}/10 ชิ้น) 📦`);
    }

    // 4. LEAVE CHANNEL ACTION
    if (channelId === guild.discord_leave_channel_id) {
      const lowerContent = content.toLowerCase();
      let newLeaveStatus = null;
      let statusText = "";

      if (lowerContent.includes("ยกเลิก") || lowerContent.includes("ปกติ") || lowerContent.includes("กลับมา") || lowerContent.includes("ยกเลิกลา")) {
        newLeaveStatus = false;
        statusText = "ปกติ (พร้อมเข้าร่วมวอร์)";
      } else if (lowerContent.includes("ลา") || lowerContent.includes("ลากิจ") || lowerContent.includes("ขอลากิจ")) {
        newLeaveStatus = true;
        statusText = "ลากิจกรรม (กรอบสีแดงในระบบ)";
      }

      if (newLeaveStatus === null) {
        return message.reply("❓ ไม่เข้าใจความประสงค์ครับ \n* หากต้องการแจ้งลา: พิมพ์ `ลา`, `ลากิจ` หรือ `ขอลากิจ` \n* หากต้องการยกเลิกการลา: พิมพ์ `ยกเลิกลา` หรือ `ยกเลิก` ครับ");
      }

      if (profile.is_on_leave === newLeaveStatus) {
        return message.reply(`ℹ️ สถานะของคุณเป็น **${statusText}** อยู่แล้วครับ`);
      }

      // Update Leave Status in DB
      const updateData = {
        is_on_leave: newLeaveStatus,
        updated_at: new Date().toISOString()
      };
      if (newLeaveStatus === true) {
        updateData.party_id = null;
        updateData.slot_index = null;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);

      if (updateError) {
        console.error('[Bot] Failed to update leave status:', updateError);
        return message.reply('❌ เกิดข้อผิดพลาดในการบันทึกสถานะการลา กรุณาลองใหม่อีกครั้ง');
      }

      if (newLeaveStatus === true) {
        return message.reply(`✅ แจ้งลากิจกรรมสำเร็จ! \nสมาชิก: **${profile.display_name}** ได้รับการปรับสถานะเป็น **ลากิจกรรม** เรียบร้อยครับ (ระบบจะนำชื่อออกจากปาร์ตี้กิจกรรมชั่วคราว) 🛌`);
      } else {
        return message.reply(`✅ ยกเลิกการลากิจกรรมสำเร็จ! \nสมาชิก: **${profile.display_name}** ได้รับการปรับสถานะเป็น **ปกติ** พร้อมจัดปาร์ตี้ร่วมกิจกรรมแล้วครับ ⚔️`);
      }
    }

  } catch (error) {
    console.error('[Bot ERROR] Unexpected error in message handler:', error);
  }
});

// 5. START BOT & WEBSERVER (For keeping alive on Render free tier)
const http = require('http');
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ROOC Discord Bot is Online!');
}).listen(PORT, () => {
  console.log(`[Bot] Keep-alive web server is listening on port ${PORT}`);
});

console.log('[Bot] Connecting to Discord...');
client.login(DISCORD_TOKEN).catch(err => {
  console.error('[Bot ERROR] Failed to login to Discord:', err);
});
