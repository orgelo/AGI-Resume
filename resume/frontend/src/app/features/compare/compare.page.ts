import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ResumeApiService } from '../../core/services/resume-api.service';
import { AnalysisRecord, AnalysisResult } from '../../core/models/analysis.model';

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
    const ids = this.route.snapshot.params['ids'].split(',').map(Number);
    if (ids.length !== 2) {
      this.error = '无效的对比参数';
      this.loading = false;
      return;
    }

    this.api.getHistoryById(ids[0]).subscribe({
      next: (r) => {
        this.record1 = r;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = '加载记录1失败';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });

    this.api.getHistoryById(ids[1]).subscribe({
      next: (r) => {
        this.record2 = r;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = '加载记录2失败';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getScoreDiff(score1: number | undefined, score2: number | undefined): string {
    if (score1 === undefined || score2 === undefined) return '—';
    const diff = score1 - score2;
    if (diff > 0) return `+${diff.toFixed(1)}`;
    if (diff < 0) return diff.toFixed(1);
    return '0';
  }

  getScoreClass(score1: number | undefined, score2: number | undefined): string {
    if (score1 === undefined || score2 === undefined) return '';
    if (score1 > score2) return 'higher';
    if (score1 < score2) return 'lower';
    return 'equal';
  }

  getBetterRecord(score1: number | undefined, score2: number | undefined): number {
    if (score1 === undefined || score2 === undefined) return 0;
    if (score1 > score2) return 1;
    if (score1 < score2) return 2;
    return 0;
  }
}
