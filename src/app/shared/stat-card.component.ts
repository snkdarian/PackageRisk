import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stat-card',
  imports: [MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card [class]="'stat-card ' + tone()">
      <div class="icon"><mat-icon>{{ icon() }}</mat-icon></div>
      <div class="stat-body">
        <p>{{ label() }}</p>
        <strong>{{ value() }}</strong>
        <small>{{ trend() }}</small>
      </div>
    </mat-card>
  `,
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  icon = input('analytics');
  trend = input('');
  tone = input<'blue' | 'teal' | 'amber' | 'red' | 'violet' | 'good' | 'warn' | 'bad'>('blue');
}
