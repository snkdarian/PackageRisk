import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<{ id: string; email?: string } | null>(null);
  readonly initialized = signal(false);
  readonly ready: Promise<void>;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly router: Router,
  ) {
    const client = this.supabase.client;
    if (!client) {
      this.initialized.set(true);
      this.ready = Promise.resolve();
      return;
    }

    this.ready = client.auth.getUser().then(({ data }) => {
      this.user.set(data.user ? { id: data.user.id, email: data.user.email } : null);
      this.initialized.set(true);
    }).catch(() => {
      this.user.set(null);
      this.initialized.set(true);
    });
    client.auth.onAuthStateChange((_event, session) => {
      this.user.set(session?.user ? { id: session.user.id, email: session.user.email } : null);
      this.initialized.set(true);
    });
  }

  async login(email: string, password: string, redirectTo = '/dashboard') {
    if (!this.supabase.client) {
      this.user.set({ id: 'demo-user', email });
      await this.router.navigateByUrl(redirectTo);
      return;
    }
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await this.router.navigateByUrl(redirectTo);
  }

  async register(email: string, password: string) {
    if (!this.supabase.client) {
      this.user.set({ id: 'demo-user', email });
      await this.router.navigateByUrl('/dashboard');
      return { requiresEmailConfirmation: false };
    }
    const { data, error } = await this.supabase.client.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session?.user) {
      this.user.set({ id: data.session.user.id, email: data.session.user.email });
      await this.router.navigateByUrl('/dashboard');
      return { requiresEmailConfirmation: false };
    }
    return { requiresEmailConfirmation: true };
  }

  async logout() {
    if (this.supabase.client) await this.supabase.client.auth.signOut();
    this.user.set(null);
    await this.router.navigateByUrl('/login');
  }
}
