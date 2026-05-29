import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResumeApiService } from '../../core/services/resume-api.service';
import { DashboardStats, AnalysisRecord } from '../../core/models/analysis.model';

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
  stats: DashboardStats | null = null;
  recentRecords: AnalysisRecord[] = [];

  weeklyData: { label: string; count: number }[] = [
    { label: '周一', count: 0 },
    { label: '周二', count: 0 },
    { label: '周三', count: 0 },
    { label: '周四', count: 0 },
    { label: '周五', count: 0 },
    { label: '周六', count: 0 },
    { label: '周日', count: 0 },
  ];

  circumference = 2 * Math.PI * 52;

  get progressOffset(): number {
    const score = this.stats?.avgMatchScore || 0;
    return this.circumference - (score / 100) * this.circumference;
  }

  get maxDayCount(): number {
    return Math.max(...this.weeklyData.map((d) => d.count), 1);
  }

  get avgMatchScoreDisplay(): string {
    return (this.stats?.avgMatchScore || 0).toFixed(0);
  }

  get avgStructureScoreDisplay(): string {
    return (this.stats?.avgStructureScore || 0).toFixed(0);
  }

  ngOnInit() {
    this.api.getDashboard().subscribe({
      next: (s) => {
        this.stats = s;
        if (s.weeklyData && s.weeklyData.length > 0) {
          this.weeklyData = s.weeklyData;
        }
        this.cdr.detectChanges();
      },
    });

    this.api.getHistory(1, 5).subscribe({
      next: (res) => {
        this.recentRecords = res.list;
        this.cdr.detectChanges();
      },
    });
  }

  getScoreClass(score: number): string {
    if (score >= 75) return 'item-score high';
    if (score >= 60) return 'item-score mid';
    return 'item-score low';
  }

  getScoreDisplay(score: number): string {
    return score.toFixed(0);
  }
}
