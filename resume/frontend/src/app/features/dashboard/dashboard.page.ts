import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResumeApiService } from '../../core/services/resume-api.service';
import { DashboardStats, AnalysisRecord, ScoreTrendData } from '../../core/models/analysis.model';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage implements OnInit {
  private readonly api = inject(ResumeApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  loading = true;
  stats: DashboardStats | null = null;
  recentRecords: AnalysisRecord[] = [];

  weeklyData: { label: string; count: number }[] = [
    { label: '周五', count: 0 },
    { label: '周六', count: 1 },
    { label: '周日', count: 0 },
    { label: '周一', count: 3 },
    { label: '周二', count: 2 },
    { label: '周三', count: 0 },
    { label: '周四', count: 0 },
  ];

  scoreTrend: ScoreTrendData[] = [];

  // Donut
  readonly donutCircum = 2 * Math.PI * 36; // ≈ 226

  get maxDayCount(): number {
    return Math.max(...this.weeklyData.map(d => d.count), 1);
  }

  get avgMatchScoreDisplay(): string {
    return (this.stats?.avgMatchScore || 0).toFixed(0);
  }

  get avgStructureScoreDisplay(): string {
    return (this.stats?.avgStructureScore || 0).toFixed(0);
  }

  get donutOffset(): number {
    const score = this.stats?.avgMatchScore || 0;
    return this.donutCircum - (score / 100) * this.donutCircum;
  }

  get hasScoreData(): boolean {
    return this.scoreTrend.some(d => d.avgMatch !== null || d.avgStructure !== null);
  }

  get maxKwCount(): number {
    if (!this.stats?.topMissingKeywords?.length) return 1;
    return Math.max(...this.stats.topMissingKeywords.map(k => k.count || 1), 1);
  }

  getMatchLinePath(): string {
    return this.buildLinePath(this.scoreTrend, 'avgMatch');
  }

  getStructureLinePath(): string {
    return this.buildLinePath(this.scoreTrend, 'avgStructure');
  }

  private buildLinePath(data: ScoreTrendData[], field: 'avgMatch' | 'avgStructure'): string {
    if (!data.length) return '0,40 400,40';
    const valid = data.filter(d => d[field] !== null);
    if (valid.length < 2) return '0,40 400,40';
    return valid.map((d, i) => {
      const x = (i / Math.max(valid.length - 1, 1)) * 400;
      const y = 80 - ((d[field] || 0) / 100) * 80;
      return `${x},${y}`;
    }).join(' ');
  }

  ngOnInit() {
    this.api.getDashboard().subscribe({
      next: (s) => {
        this.stats = s;
        if (s.weeklyData && s.weeklyData.length > 0) {
          this.weeklyData = s.weeklyData;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });

    this.api.getHistory(1, 5).subscribe({
      next: (res) => {
        this.recentRecords = res.list;
        this.cdr.detectChanges();
      },
    });

    this.api.getScoreTrend().subscribe({
      next: (data) => {
        this.scoreTrend = data;
        this.cdr.detectChanges();
      },
    });
  }

  getScoreDisplay(score: number): string {
    return score.toFixed(0);
  }
}
