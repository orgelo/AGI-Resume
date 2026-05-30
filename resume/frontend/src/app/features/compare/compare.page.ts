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

  records: AnalysisRecord[] = [];
  loading = true;
  error = '';

  get record1(): AnalysisRecord | null {
    return this.records[0] || null;
  }

  get record2(): AnalysisRecord | null {
    return this.records[1] || null;
  }

  ngOnInit() {
    const ids = String(this.route.snapshot.params['ids'] || '')
      .split(',')
      .map((id) => Number(id))
      .filter(Boolean);

    if (ids.length < 2) {
      this.error = '请选择至少2条记录进行对比';
      this.loading = false;
      return;
    }

    if (ids.length > 5) {
      this.error = '最多支持5条记录同时对比';
      this.loading = false;
      return;
    }

    let loadedCount = 0;
    ids.forEach((id) => {
      this.api.getHistoryById(id).subscribe({
        next: (r) => {
          this.records.push(r);
          loadedCount++;
          if (loadedCount === ids.length) {
            this.loading = false;
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.error = '加载记录失败';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
    });
  }

  getWinner(): string {
    if (this.records.length < 2) return '—';
    const scores = this.records.map((r) => r.matchScore || 0);
    const max = Math.max(...scores);
    const winnerIndex = scores.indexOf(max);
    return `版本 ${winnerIndex + 1} 最优`;
  }

  getBestRecord(): AnalysisRecord | null {
    if (this.records.length === 0) return null;
    return this.records.reduce((best, r) => ((r.matchScore || 0) > (best.matchScore || 0) ? r : best));
  }

  getSummaryItems() {
    const items = [
      { label: '匹配度', key: 'matchScore', format: (v: number) => `${v}%` },
      { label: '结构分', key: 'structureScore', path: 'result.diagnosis.structureScore', format: (v: number) => `${v}` },
      { label: '表达分', key: 'expressionScore', path: 'result.diagnosis.expressionScore', format: (v: number) => `${v}` },
      { label: 'ATS分', key: 'atsScore', path: 'result.diagnosis.atsScore', format: (v: number) => `${v}` },
    ];

    return items.map((item) => {
      const values = this.records.map((r) => {
        if (item.path) {
          const keys = item.path.split('.');
          let v: any = r;
          for (const k of keys) v = v?.[k];
          return v as number;
        }
        return (r as any)[item.key] as number;
      });
      const max = Math.max(...values.filter((v) => v != null));
      const min = Math.min(...values.filter((v) => v != null));
      return {
        label: item.label,
        values: values.map((v) => (v != null ? item.format(v) : '—')),
        bestIndex: values.indexOf(max),
        diff: max - min,
      };
    });
  }

  getCommonMatched(): string[] {
    if (this.records.length < 2) return [];
    const firstSet = new Set(this.records[0].result?.matching?.matchedKeywords || []);
    const common: string[] = [];
    for (const keyword of firstSet) {
      const isInAll = this.records.every((r) =>
        (r.result?.matching?.matchedKeywords || []).includes(keyword)
      );
      if (isInAll) common.push(keyword);
    }
    return common;
  }

  getAllMatched(): string[] {
    if (this.records.length === 0) return [];
    const all: string[] = [];
    this.records.forEach((r) => {
      all.push(...(r.result?.matching?.matchedKeywords || []));
    });
    return [...new Set(all)];
  }

  getAllMissing(): string[] {
    if (this.records.length === 0) return [];
    const all: string[] = [];
    this.records.forEach((r) => {
      all.push(...(r.result?.matching?.missingKeywords || []));
    });
    return [...new Set(all)];
  }
}
