import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ResumeApiService } from '../../core/services/resume-api.service';
import { AnalysisRecord } from '../../core/models/analysis.model';

@Component({
  selector: 'app-compare-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './compare.page.html',
  styleUrl: './compare.page.scss',
})
export class ComparePage implements OnInit {
  private readonly api = inject(ResumeApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  record1: AnalysisRecord | null = null;
  record2: AnalysisRecord | null = null;
  loading = true;
  error = '';

  ngOnInit() {
    const ids = String(this.route.snapshot.params['ids'] || '')
      .split(',')
      .map((id) => Number(id))
      .filter(Boolean);

    if (ids.length !== 2) {
      this.error = '无效的对比参数';
      this.loading = false;
      return;
    }

    this.api.getHistoryById(ids[0]).subscribe({
      next: (r) => {
        this.record1 = r;
        this.finishIfReady();
      },
      error: () => {
        this.error = '加载记录 1 失败';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });

    this.api.getHistoryById(ids[1]).subscribe({
      next: (r) => {
        this.record2 = r;
        this.finishIfReady();
      },
      error: () => {
        this.error = '加载记录 2 失败';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private finishIfReady() {
    if (this.record1 && this.record2) {
      this.loading = false;
    }
    this.cdr.detectChanges();
  }

  getScoreDiff(score1: number | undefined, score2: number | undefined): string {
    if (score1 === undefined || score2 === undefined) return '—';
    const diff = score1 - score2;
    return diff > 0 ? `+${diff.toFixed(1)}` : diff < 0 ? diff.toFixed(1) : '0';
  }

  getScoreClass(score1: number | undefined, score2: number | undefined): string {
    if (score1 === undefined || score2 === undefined) return '';
    if (score1 > score2) return 'higher';
    if (score1 < score2) return 'lower';
    return 'equal';
  }

  getWinner(score1: number | undefined, score2: number | undefined): string {
    if (score1 === undefined || score2 === undefined) return '—';
    if (score1 > score2) return '版本 1 更优';
    if (score1 < score2) return '版本 2 更优';
    return '平局';
  }

  getImprovement(score1: number | undefined, score2: number | undefined): string {
    if (score1 === undefined || score2 === undefined) return '—';
    const diff = score1 - score2;
    return diff > 0 ? `提升 ${diff.toFixed(1)} 分` : diff < 0 ? `下降 ${Math.abs(diff).toFixed(1)} 分` : '保持不变';
  }

  private unique(list: string[] = []): string[] {
    return [...new Set(list.filter(Boolean))];
  }

  getCommonMatched(): string[] {
    const left = this.record1?.result?.matching?.matchedKeywords || [];
    const right = this.record2?.result?.matching?.matchedKeywords || [];
    return left.filter((kw) => right.includes(kw));
  }

  getAddedKeywords(): string[] {
    const left = this.record1?.result?.matching?.matchedKeywords || [];
    const right = this.record2?.result?.matching?.matchedKeywords || [];
    return this.unique(right.filter((kw) => !left.includes(kw)));
  }

  getLostKeywords(): string[] {
    const left = this.record1?.result?.matching?.matchedKeywords || [];
    const right = this.record2?.result?.matching?.matchedKeywords || [];
    return this.unique(left.filter((kw) => !right.includes(kw)));
  }

  getBetterHighlights(): string[] {
    const a = this.record1?.result?.optimization?.rewrittenHighlights || [];
    const b = this.record2?.result?.optimization?.rewrittenHighlights || [];
    return b.filter((item) => !a.includes(item));
  }

  getSummaryCards() {
    return [
      {
        label: '匹配度',
        left: this.record1?.matchScore,
        right: this.record2?.matchScore,
        diff: this.getScoreDiff(this.record1?.matchScore, this.record2?.matchScore),
        className: this.getScoreClass(this.record1?.matchScore, this.record2?.matchScore),
      },
      {
        label: '结构分',
        left: this.record1?.result?.diagnosis?.structureScore,
        right: this.record2?.result?.diagnosis?.structureScore,
        diff: this.getScoreDiff(this.record1?.result?.diagnosis?.structureScore, this.record2?.result?.diagnosis?.structureScore),
        className: this.getScoreClass(this.record1?.result?.diagnosis?.structureScore, this.record2?.result?.diagnosis?.structureScore),
      },
      {
        label: '表达分',
        left: this.record1?.result?.diagnosis?.expressionScore,
        right: this.record2?.result?.diagnosis?.expressionScore,
        diff: this.getScoreDiff(this.record1?.result?.diagnosis?.expressionScore, this.record2?.result?.diagnosis?.expressionScore),
        className: this.getScoreClass(this.record1?.result?.diagnosis?.expressionScore, this.record2?.result?.diagnosis?.expressionScore),
      },
      {
        label: 'ATS 兼容',
        left: this.record1?.result?.diagnosis?.atsScore,
        right: this.record2?.result?.diagnosis?.atsScore,
        diff: this.getScoreDiff(this.record1?.result?.diagnosis?.atsScore, this.record2?.result?.diagnosis?.atsScore),
        className: this.getScoreClass(this.record1?.result?.diagnosis?.atsScore, this.record2?.result?.diagnosis?.atsScore),
      },
      {
        label: '完整性',
        left: this.record1?.result?.diagnosis?.completenessScore,
        right: this.record2?.result?.diagnosis?.completenessScore,
        diff: this.getScoreDiff(this.record1?.result?.diagnosis?.completenessScore, this.record2?.result?.diagnosis?.completenessScore),
        className: this.getScoreClass(this.record1?.result?.diagnosis?.completenessScore, this.record2?.result?.diagnosis?.completenessScore),
      },
    ];
  }
}
