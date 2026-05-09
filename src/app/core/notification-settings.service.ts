import { Injectable, signal } from '@angular/core';
import { NotificationSettings } from './models';
import { SupabaseService } from './supabase.service';

const DEMO_SETTINGS: NotificationSettings = {
  emailEnabled: false,
  emailAddress: '',
  discordEnabled: false,
  discordWebhookUrl: '',
  slackEnabled: false,
  slackWebhookUrl: '',
};

@Injectable({ providedIn: 'root' })
export class NotificationSettingsService {
  readonly settings = signal<NotificationSettings>({ ...DEMO_SETTINGS });
  readonly loading = signal(false);
  readonly saving = signal(false);

  constructor(private readonly supabase: SupabaseService) {}

  async load() {
    if (!this.supabase.client) return this.settings();
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client.from('notification_settings').select('*').maybeSingle();
      if (error) throw error;
      if (data) this.settings.set(mapNotificationSettings(data));
      return this.settings();
    } finally {
      this.loading.set(false);
    }
  }

  async save(input: NotificationSettings) {
    this.settings.set(input);
    if (!this.supabase.client) return input;
    this.saving.set(true);
    try {
      const { data: userData, error: userError } = await this.supabase.client.auth.getUser();
      if (userError) throw userError;
      const userId = userData.user?.id;
      if (!userId) throw new Error('No authenticated user.');
      const { data, error } = await this.supabase.client
        .from('notification_settings')
        .upsert({
          user_id: userId,
          email_enabled: input.emailEnabled,
          email_address: input.emailAddress || null,
          discord_enabled: input.discordEnabled,
          discord_webhook_url: input.discordWebhookUrl || null,
          slack_enabled: input.slackEnabled,
          slack_webhook_url: input.slackWebhookUrl || null,
        }, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      const mapped = mapNotificationSettings(data);
      this.settings.set(mapped);
      return mapped;
    } finally {
      this.saving.set(false);
    }
  }
}

function mapNotificationSettings(row: any): NotificationSettings {
  return {
    emailEnabled: row.email_enabled,
    emailAddress: row.email_address ?? '',
    discordEnabled: row.discord_enabled,
    discordWebhookUrl: row.discord_webhook_url ?? '',
    slackEnabled: row.slack_enabled,
    slackWebhookUrl: row.slack_webhook_url ?? '',
  };
}
