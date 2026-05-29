import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResult } from '../../../core/models/analysis.model';
import { ScoreRingComponent } from '../score-ring/score-ring.component';
import { KeywordCountPipe } from '../../pipes/keyword-highlight.pipe';

@Component({
  selector: 'app-result-panel',
  standalone: true,
  imports: [CommonModule, ScoreRingComponent, KeywordCountPipe],
  templateUrl: './result-panel.component.html',
  styleUrl: './result-panel.component.scss',
})
export class ResultPanelComponent {
  @Input() analysis: AnalysisResult | null = null;
  @Input() loading = false;
  @Input() loadingHint = '';
  @Input() errorMessage = '';
}
