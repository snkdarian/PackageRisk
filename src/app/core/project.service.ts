import { Injectable, computed, signal } from '@angular/core';
import { DEMO_PROJECTS } from './mock-data';
import { PackageManager, Project } from './models';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  readonly projects = signal<Project[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasRealBackend = computed(() => Boolean(this.supabase.client));

  constructor(private readonly supabase: SupabaseService) {
    if (!this.supabase.client) this.projects.set([...DEMO_PROJECTS]);
  }

  async loadProjects() {
    this.loading.set(true);
    this.error.set(null);
    try {
      if (!this.supabase.client) return this.projects();
      const { data, error } = await this.supabase.client.from('projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      this.projects.set((data ?? []).map(mapProject));
      return this.projects();
    } catch (error: any) {
      this.error.set(error.message ?? 'Could not load projects.');
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  getProjectById(id: string) {
    return this.projects().find((project) => project.id === id);
  }

  async createProject(input: { name: string; description?: string; packageManager: PackageManager; scheduleType: Project['scheduleType'] }) {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      userId: 'demo-user',
      name: input.name,
      description: input.description,
      packageManager: input.packageManager,
      scheduleType: input.scheduleType,
      createdAt: now,
      updatedAt: now,
    };
    if (!this.supabase.client) {
      this.projects.update((projects) => [project, ...projects]);
      return project;
    }
    const { data, error } = await this.supabase.client
      .from('projects')
      .insert({
        name: input.name,
        description: input.description,
        package_manager: input.packageManager,
        schedule_type: input.scheduleType,
      })
      .select()
      .single();
    if (error) throw error;
    await this.loadProjects();
    return mapProject(data);
  }

  async updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'packageManager' | 'scheduleType' | 'packageJson' | 'lockFileContent'>>) {
    if (!this.supabase.client) {
      this.projects.update((projects) => projects.map((project) => project.id === id ? { ...project, ...updates, updatedAt: new Date().toISOString() } : project));
      return this.getProjectById(id);
    }
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload['name'] = updates.name;
    if (updates.description !== undefined) payload['description'] = updates.description;
    if (updates.packageManager !== undefined) payload['package_manager'] = updates.packageManager;
    if (updates.scheduleType !== undefined) payload['schedule_type'] = updates.scheduleType;
    if (updates.packageJson !== undefined) payload['package_json'] = updates.packageJson;
    if (updates.lockFileContent !== undefined) payload['lock_file_content'] = updates.lockFileContent;
    const { data, error } = await this.supabase.client.from('projects').update(payload).eq('id', id).select().single();
    if (error) throw error;
    const mapped = mapProject(data);
    this.projects.update((projects) => projects.map((project) => project.id === id ? mapped : project));
    return mapped;
  }

  updateProjectSchedule(id: string, scheduleType: Project['scheduleType']) {
    return this.updateProject(id, { scheduleType });
  }

  async deleteProject(id: string) {
    if (!this.supabase.client) {
      this.projects.update((projects) => projects.filter((project) => project.id !== id));
      return;
    }
    const { error } = await this.supabase.client.from('projects').delete().eq('id', id);
    if (error) throw error;
    await this.loadProjects();
  }
}

function mapProject(row: any): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    packageManager: row.package_manager,
    packageJson: row.package_json,
    lockFileContent: row.lock_file_content,
    scheduleType: row.schedule_type,
    lastScanAt: row.last_scan_at,
    lastHealthScore: row.last_health_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
