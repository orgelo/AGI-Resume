import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScoreColorPipe } from '../../pipes/score-color.pipe';

@Component({
  selector: 'app-score-ring',
  standalone: true,
  imports: [CommonModule, ScoreColorPipe],
  templateUrl: './score-ring.component.html',
  styleUrl: './score-ring.component.scss',
})
export class ScoreRingComponent {
  @Input() label = '得分';
  @Input() score: number | null | undefined = 0;

  get dashOffset(): number {
    const s = Math.min(100, Math.max(0, Number(this.score ?? 0)));
    return 283 - (283 * s) / 100;
  }
}
