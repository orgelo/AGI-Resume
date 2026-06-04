import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResumeApiService } from '../../core/services/resume-api.service';
import { TailorResult, TailorChange } from '../../core/models/analysis.model';

type Phase = 'setup' | 'result';
type ViewTab = 'diff' | 'preview';

@Component({
  selector: 'app-tailor-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tailor.page.html',
  styleUrl: './tailor.page.scss',
})
export class TailorPage {
  private readonly api = inject(ResumeApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  phase: Phase = 'setup';
  file: File | null = null;
  jobTitle = '';
  jobDescription = '';
  errorMessage = '';
  loading = false;
  result: TailorResult | null = null;

  viewTab: ViewTab = 'diff';
  changeFilter: string = 'all';

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

  tailor() {
    this.errorMessage = '';
    if (!this.file) {
      this.errorMessage = '请上传简历文件';
      return;
    }
    if (!this.jobDescription.trim()) {
      this.errorMessage = '请粘贴岗位描述（JD）';
      return;
    }

    this.loading = true;
    this.api.tailorResume(this.file, this.jobDescription, this.jobTitle).subscribe({
      next: (result: TailorResult) => {
        this.result = result;
        this.phase = 'result';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || err?.message || '精修失败';
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
    this.jobTitle = '';
    this.jobDescription = '';
    this.viewTab = 'diff';
    this.changeFilter = 'all';
  }

  getFilteredChanges(): TailorChange[] {
    if (!this.result) return [];
    if (this.changeFilter === 'all') return this.result.changes;
    return this.result.changes.filter(c => c.type === this.changeFilter);
  }

  getChangeTypeLabel(type: string): string {
    const map: Record<string, string> = {
      keyword: '关键词',
      expression: '表达',
      structure: '结构',
      order: '排序',
    };
    return map[type] || type;
  }

  getChangeCount(type: string): number {
    if (!this.result) return 0;
    return this.result.changes.filter(c => c.type === type).length;
  }

  exportFormat(format: 'pdf' | 'docx') {
    if (!this.result?.tailoredResume) return;
    this.api.exportTailoredResume(this.result.tailoredResume, format, this.jobTitle).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tailored-resume.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.errorMessage = '导出失败: ' + (err?.message || err);
        this.cdr.detectChanges();
      },
    });
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.file = files[0];
    }
  }
}
