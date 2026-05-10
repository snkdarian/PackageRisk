import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-health-score',
  imports: [MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="score" [class]="tone()">
      <mat-progress-spinner mode="determinate" [value]="score()" [diameter]="size()" [strokeWidth]="8" />
      <div class="score-value">
        <strong>{{ score() }}</strong>
        <span>/100</span>
      </div>
    </div>
  `,
  styles: `
    .score { position: relative; display: grid; place-items: center; width: fit-content; min-width: var(--score-size, 70px); color: var(--primary); }
    .score-value { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 0; pointer-events: none; }
    .score strong { font-size: 1.25rem; line-height: 1; color: var(--text); }
    .score span { font-size: .68rem; line-height: 1; color: var(--muted); }
    .good { color: #22c55e; } .warn { color: #f59e0b; } .bad { color: #ff5d73; }
    :host ::ng-deep .score.good .mdc-circular-progress__determinate-circle { stroke: #22c55e !important; }
    :host ::ng-deep .score.warn .mdc-circular-progress__determinate-circle { stroke: #f59e0b !important; }
    :host ::ng-deep .score.bad .mdc-circular-progress__determinate-circle { stroke: #ff5d73 !important; }
    :host ::ng-deep .score.good .mdc-circular-progress__determinate-track,
    :host ::ng-deep .score.warn .mdc-circular-progress__determinate-track,
    :host ::ng-deep .score.bad .mdc-circular-progress__determinate-track { stroke: rgba(148, 163, 184, .18) !important; }
    .score.good .score-value strong { color: #dcfce7; }
    .score.warn .score-value strong { color: #fef3c7; }
    .score.bad .score-value strong { color: #ffe4e6; }
  `,
})
export class HealthScoreComponent {
  score = input.required<number>();
  size = input(96);
  tone = computed(() => (this.score() >= 75 ? 'good' : this.score() >= 50 ? 'warn' : 'bad'));
}
