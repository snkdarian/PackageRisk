import { Injectable, computed } from '@angular/core';
import { UpdatePlan } from './models';
import { SupabaseService } from './supabase.service';

export interface SaveUpdatePlanInput {
  projectId: string;
  scanId: string;
  selectedItemIds: string[];
  packageJson: Record<string, unknown>;
  summary: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class UpdatePlanService {
  readonly hasRealBackend = computed(() => Boolean(this.supabase.client));

  constructor(private readonly supabase: SupabaseService) {}

  async getPlanForScan(scanId: string) {
    if (!this.supabase.client) return null;
    const { data, error } = await this.supabase.client
      .from('update_plans')
      .select('*')
      .eq('scan_id', scanId)
      .eq('status', 'draft')
      .maybeSingle();
    if (error) throw error;
    return data ? mapUpdatePlan(data) : null;
  }

  async saveDraft(input: SaveUpdatePlanInput) {
    if (!this.supabase.client) return null;
    const { data: userData, error: userError } = await this.supabase.client.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) throw new Error('No authenticated user found.');

    const { data, error } = await this.supabase.client
      .from('update_plans')
      .upsert({
        user_id: userId,
        project_id: input.projectId,
        scan_id: input.scanId,
        status: 'draft',
        selected_item_ids: input.selectedItemIds,
        package_json: input.packageJson,
        summary: input.summary,
      }, { onConflict: 'user_id,scan_id' })
      .select()
      .single();
    if (error) throw error;
    return mapUpdatePlan(data);
  }
}

function mapUpdatePlan(row: any): UpdatePlan {
  return {
    id: row.id,
    projectId: row.project_id,
    scanId: row.scan_id,
    userId: row.user_id,
    status: row.status,
    selectedItemIds: row.selected_item_ids ?? [],
    packageJson: row.package_json,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
