import { Component, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { RiskLevel } from '../core/models';
import { I18nService } from '../core/i18n.service';

@Component({
  selector: 'app-risk-badge',
  imports: [MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'risk ' + level()">{{ i18n.t('risk.' + level()) }}</span>`,
  styles: `
    .risk { display: inline-flex; min-width: 76px; justify-content: center; border: 1px solid currentColor; border-radius: 999px; padding: 6px 11px; font-size: .76rem; font-weight: 900; text-transform: capitalize; box-shadow: 0 8px 20px color-mix(in srgb, currentColor 16%, transparent); }
    .none { background: color-mix(in srgb, #64748b 12%, transparent); color: #94a3b8; }
    .low { background: color-mix(in srgb, #16a34a 16%, transparent); color: #22c55e; }
    .medium { background: color-mix(in srgb, #f59e0b 18%, transparent); color: #f59e0b; }
    .high { background: color-mix(in srgb, #f97316 22%, transparent); color: #fb923c; }
    .critical { background: color-mix(in srgb, #ef4444 24%, transparent); color: #ff5d73; }
  `,
})
export class RiskBadgeComponent {
  readonly i18n = inject(I18nService);
  level = input.required<RiskLevel>();
}
