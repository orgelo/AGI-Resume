import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResult } from '../../../core/models/analysis.model';

interface RadarDim {
  label: string;
  score: number;
  key: string;
}

interface InsightCard {
  role: string;
  roleIcon: string;
  color: string;
  items: string[];
}

@Component({
  selector: 'app-result-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './result-panel.component.html',
  styleUrl: './result-panel.component.scss',
})
export class ResultPanelComponent implements OnChanges {
  @Input() analysis: AnalysisResult | null = null;
  @Input() loading = false;
  @Input() loadingHint = '';
  @Input() errorMessage = '';

  overallScore = 0;
  gradeLabel = '';
  gradeColor = '';
  radarDimensions: RadarDim[] = [];
  // Size of the SVG viewBox
  readonly rSize = 200;
  readonly rCenter = 100;
  readonly rMax = 85;
  readonly ringCircum = 2 * Math.PI * 45;
  insightCards: InsightCard[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['analysis'] && this.analysis) {
      this.compute();
    }
  }

  compute() {
    const a = this.analysis;
    if (!a) return;

    const d = a.diagnosis || {} as any;
    const m = a.matching || {} as any;

    // Overall score = weighted average
    const struct = d.structureScore || 0;
    const expr = d.expressionScore || 0;
    const match = m.matchScore || 0;
    const ats = d.atsScore || 0;
    const complete = d.completenessScore || 0;

    this.overallScore = Math.round(
      (struct * 0.2 + expr * 0.15 + match * 0.35 + ats * 0.15 + complete * 0.15)
    );

    if (this.overallScore >= 90) {
      this.gradeLabel = 'Excellent';
      this.gradeColor = 'var(--success-color)';
    } else if (this.overallScore >= 75) {
      this.gradeLabel = 'Great';
      this.gradeColor = 'var(--primary-color)';
    } else if (this.overallScore >= 60) {
      this.gradeLabel = 'Good';
      this.gradeColor = 'var(--accent-color)';
    } else {
      this.gradeLabel = 'Needs Work';
      this.gradeColor = 'var(--error-color)';
    }

    // Radar dimensions
    this.radarDimensions = [
      { label: '结构', score: struct, key: '结构' },
      { label: '表达', score: expr, key: '表达' },
      { label: '匹配度', score: match, key: '匹配度' },
      { label: 'ATS', score: ats, key: 'ATS' },
      { label: '完整性', score: complete, key: '完整性' },
    ];

    // Insight cards
    this.insightCards = [];

    if (d.recommendations) {
      const recs = d.recommendations;
      if (recs.structure?.length) {
        this.insightCards.push({
          role: '结构诊断',
          roleIcon: '📐',
          color: '#6366f1',
          items: recs.structure,
        });
      }
      if (recs.expression?.length) {
        this.insightCards.push({
          role: '表达优化',
          roleIcon: '✍️',
          color: '#8b5cf6',
          items: recs.expression,
        });
      }
      if (recs.quant?.length) {
        this.insightCards.push({
          role: '量化建议',
          roleIcon: '📊',
          color: '#06b6d4',
          items: recs.quant,
        });
      }
      if (recs.ats?.length) {
        this.insightCards.push({
          role: 'ATS 优化',
          roleIcon: '🤖',
          color: '#f59e0b',
          items: recs.ats,
        });
      }
    }

    if (m.targetedAdvice?.length) {
      this.insightCards.push({
        role: '岗位匹配',
        roleIcon: '🎯',
        color: '#10b981',
        items: m.targetedAdvice,
      });
    }

    if (a.optimization?.rewrittenHighlights?.length) {
      this.insightCards.push({
        role: '亮点重写',
        roleIcon: '✨',
        color: '#ec4899',
        items: a.optimization.rewrittenHighlights.slice(0, 4),
      });
    }

    if (d.riskWarnings?.length) {
      this.insightCards.push({
        role: '风险提醒',
        roleIcon: '⚠️',
        color: '#ef4444',
        items: d.riskWarnings,
      });
    }
  }

  getRadarPoints(): string {
    const dims = this.radarDimensions;
    if (!dims.length) return '';
    const n = dims.length;
    return dims
      .map((d, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const r = (d.score / 100) * this.rMax;
        const x = this.rCenter + r * Math.cos(angle);
        const y = this.rCenter + r * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');
  }

  getRadarGridPoints(level: number): string {
    const dims = this.radarDimensions;
    if (!dims.length) return '';
    const n = dims.length;
    const r = (level / 5) * this.rMax;
    return dims
      .map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = this.rCenter + r * Math.cos(angle);
        const y = this.rCenter + r * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');
  }

  getRadarLabelX(i: number): number {
    const angle = (Math.PI * 2 * i) / this.radarDimensions.length - Math.PI / 2;
    return this.rCenter + (this.rMax + 18) * Math.cos(angle);
  }

  getRadarLabelY(i: number): number {
    const angle = (Math.PI * 2 * i) / this.radarDimensions.length - Math.PI / 2;
    return this.rCenter + (this.rMax + 18) * Math.sin(angle);
  }

  getRadarDotX(i: number, score: number): number {
    const angle = (Math.PI * 2 * i) / this.radarDimensions.length - Math.PI / 2;
    return this.rCenter + ((score / 100) * this.rMax) * Math.cos(angle);
  }

  getRadarDotY(i: number, score: number): number {
    const angle = (Math.PI * 2 * i) / this.radarDimensions.length - Math.PI / 2;
    return this.rCenter + ((score / 100) * this.rMax) * Math.sin(angle);
  }

  ringDashOffset(score: number): number {
    const s = Math.min(100, Math.max(0, score || 0));
    return 283 - (283 * s) / 100;
  }

  ringColor(score: number): string {
    if (score >= 90) return 'var(--success-color)';
    if (score >= 75) return 'var(--primary-color)';
    if (score >= 60) return 'var(--accent-color)';
    return 'var(--error-color)';
  }

  get dashScoreOffset(): number {
    return this.ringDashOffset(this.overallScore);
  }

  get hasMissingKeywords(): boolean {
    return !!(this.analysis?.matching?.missingKeywords?.length);
  }

  get missingKeywords(): string[] {
    return this.analysis?.matching?.missingKeywords || [];
  }

  get matchedKeywords(): string[] {
    return this.analysis?.matching?.matchedKeywords || [];
  }

  get hasBeforeAfter(): boolean {
    return !!(this.analysis?.optimization?.beforeAfter?.length);
  }

  get beforeAfterItems() {
    return (this.analysis?.optimization?.beforeAfter || []).slice(0, 4);
  }

  get hasFullDraft(): boolean {
    return !!(this.analysis?.optimization?.fullDraft);
  }

  get fullDraft(): string {
    return this.analysis?.optimization?.fullDraft || '';
  }

  get hasInterviewQuestions(): boolean {
    const i = this.analysis?.interview;
    return !!(i?.technicalQuestions?.length || i?.projectQuestions?.length || i?.behaviorQuestions?.length);
  }

  get hasCareerAdvice(): boolean {
    return !!(this.analysis?.career?.recommendedRoles?.length || this.analysis?.career?.skillGaps?.length);
  }

  get careerData() {
    return this.analysis?.career || {};
  }

  get interviewData() {
    return this.analysis?.interview || {};
  }

  get technicalQuestions() {
    return this.analysis?.interview?.technicalQuestions || [];
  }

  get projectQuestions() {
    return this.analysis?.interview?.projectQuestions || [];
  }

  get behaviorQuestions() {
    return this.analysis?.interview?.behaviorQuestions || [];
  }

  get recommendedRoles() {
    return this.analysis?.career?.recommendedRoles || [];
  }

  get levelAssessment() {
    return this.analysis?.career?.levelAssessment || '';
  }

  get skillGaps() {
    return this.analysis?.career?.skillGaps || [];
  }
}
