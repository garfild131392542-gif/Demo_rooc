/**
 * Discord Webhook Notification Utility
 * Safely sends rich embed messages to a Discord Webhook channel.
 */
export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  timestamp?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string; icon_url?: string };
  thumbnail?: { url: string };
}

export interface DiscordPayload {
  content?: string;
  embeds?: DiscordEmbed[];
}

/**
 * Sends a rich embed payload to the specified Discord Webhook URL.
 * Bypasses throwing errors on failure to protect application logic.
 */
export async function sendDiscordNotification(
  webhookUrl: string | null | undefined,
  embedPayload: DiscordPayload
): Promise<void> {
  // Gracefully exit if webhook URL is not set or doesn't match standard Discord structure
  if (!webhookUrl || !webhookUrl.trim().startsWith('https://discord.com/api/webhooks/')) {
    return;
  }

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(embedPayload),
    });

    if (!response.ok) {
      const errorResponse = await response.text();
      console.error(
        `[Discord Webhook Error] Status ${response.status}: ${errorResponse}`
      );
    }
  } catch (error) {
    console.error('[Discord Webhook Exception] Failed to send notification:', error);
  }
}

/**
 * Sends a rich embed payload directly to a Discord channel using the Bot Token.
 */
export async function sendDiscordChannelMessage(
  channelId: string | null | undefined,
  embedPayload: DiscordPayload
): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !channelId) {
    return;
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId.trim()}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(embedPayload),
    });

    if (!response.ok) {
      const errorResponse = await response.text();
      console.error(
        `[Discord API Error] Status ${response.status}: ${errorResponse}`
      );
    }
  } catch (error) {
    console.error('[Discord API Exception] Failed to send bot notification:', error);
  }
}

