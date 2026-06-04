import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResumeApiService } from '../../core/services/resume-api.service';
import { CareerRoadmapResult, RoadmapPhase, RoadmapMilestone } from '../../core/models/analysis.model';

type Phase = 'setup' | 'result';

@Component({
  selector: 'app-career-roadmap-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './career-roadmap.page.html',
  styleUrl: './career-roadmap.page.scss',
})
export class CareerRoadmapPage {
  private readonly api = inject(ResumeApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  phase: Phase = 'setup';
  file: File | null = null;
  targetRole = '';
  targetCompany = '';
  errorMessage = '';
  loading = false;
  result: CareerRoadmapResult | null = null;

  // Gantt: scale weeks → pixels
  readonly weekWidth = 36;
  activeTab: 'threeMonth' | 'sixMonth' | 'twelveMonth' = 'threeMonth';
  readonly phaseKeys: readonly ('threeMonth' | 'sixMonth' | 'twelveMonth')[] = ['threeMonth', 'sixMonth', 'twelveMonth'];

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.length ? input.files[0] : null;
  }

  removeFile(event?: Event) {
    event?.preventDefault();
    this.file = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  generate() {
    this.errorMessage = '';
    if (!this.file) {
      this.errorMessage = '请上传简历文件';
      return;
    }
    if (!this.targetRole.trim()) {
      this.errorMessage = '请输入目标岗位';
      return;
    }

    this.loading = true;
    this.api.careerRoadmap(this.file, this.targetRole, this.targetCompany).subscribe({
      next: (result: CareerRoadmapResult) => {
        this.result = result;
        this.phase = 'result';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || err?.message || '生成失败';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  reset() {
    this.phase = 'setup';
    this.result = null;
    this.errorMessage = '';
    this.file = null;
    this.targetRole = '';
    this.targetCompany = '';
    this.activeTab = 'threeMonth';
  }

  getPhaseLabel(key: string): string {
    const map: Record<string, string> = {
      threeMonth: '3个月',
      sixMonth: '6个月',
      twelveMonth: '12个月',
    };
    return map[key] || key;
  }

  getPhaseClass(key: string): string {
    return key === 'threeMonth'
      ? 'phase-3m'
      : key === 'sixMonth'
        ? 'phase-6m'
        : 'phase-12m';
  }

  getMilestoneStyle(startWeek: number, weeks: number): Record<string, string> {
    return {
      left: startWeek * this.weekWidth + 'px',
      width: weeks * this.weekWidth + 'px',
    };
  }

  getTotalWeeks(milestones: RoadmapMilestone[]): number {
    return milestones.reduce((sum, m) => sum + m.weeks, 0);
  }

  getGanttWidth(phase: RoadmapPhase): number {
    return Math.max(this.getTotalWeeks(phase.milestones) * this.weekWidth + 80, 600);
  }

  getMilestoneStart(index: number, milestones: RoadmapMilestone[]): string {
    let offset = 20;
    for (let i = 0; i < index; i++) {
      offset += milestones[i].weeks * this.weekWidth + 40;
    }
    return offset + 'px';
  }

  getWeekLabels(milestones: RoadmapMilestone[]): number[] {
    const total = this.getTotalWeeks(milestones);
    return Array.from({ length: Math.ceil(total) }, (_, i) => i);
  }

  getGanttBarStyle(milestones: RoadmapMilestone[], index: number): Record<string, string> {
    let left = 0;
    for (let i = 0; i < index; i++) {
      left += milestones[i].weeks;
    }
    const width = milestones[index].weeks;
    return {
      left: left * this.weekWidth + 'px',
      width: width * this.weekWidth + 'px',
    };
  }

  readonly Math = Math;

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.file = files[0];
    }
  }
}
