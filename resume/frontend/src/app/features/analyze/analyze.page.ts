import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { timeout, catchError, throwError, finalize } from 'rxjs';
import { ResumeApiService } from '../../core/services/resume-api.service';
import { AnalysisResult } from '../../core/models/analysis.model';
import { ResultPanelComponent } from '../../shared/components/result-panel/result-panel.component';

@Component({
  selector: 'app-analyze-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ResultPanelComponent],
  templateUrl: './analyze.page.html',
  styleUrl: './analyze.page.scss',
})
export class AnalyzePage implements OnInit {
  private readonly api = inject(ResumeApiService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  file: File | null = null;
  jobTitle = '';
  jobDescription = '';
  loading = false;
  loadingHint = '';
  errorMessage = '';
  backendOk = false;
  analysis: AnalysisResult | null = null;

  ngOnInit() {
    this.http
      .get<{ ok: boolean }>('http://localhost:3000/health', { responseType: 'json' })
      .subscribe({
        next: () => (this.backendOk = true),
        error: () => {
          this.backendOk = false;
          this.errorMessage =
            '无法连接后端 http://localhost:3000 ，请先在 backend 目录执行 npm.cmd run dev';
        },
      });
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.length ? input.files[0] : null;
  }

  removeFile(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.file = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  onAnalyze() {
    this.errorMessage = '';
    this.analysis = null;
    if (!this.backendOk) {
      this.errorMessage = '后端未连接，请先启动 backend（npm.cmd run dev）';
      return;
    }
    if (!this.file) {
      this.errorMessage = '请选择简历文件（PDF 或 DOCX）';
      return;
    }
    if (!this.jobDescription.trim()) {
      this.errorMessage = '请粘贴岗位描述（JD）';
      return;
    }

    const isPdf = this.file.name.toLowerCase().endsWith('.pdf');
    this.loading = true;
    this.loadingHint = isPdf
      ? '扫描版 PDF 较慢（约 1～3 分钟），请耐心等待…'
      : '正在分析简历（约 10～30 秒）…';

    this.api
      .analyze(this.file, this.jobDescription, this.jobTitle)
      .pipe(
        timeout(190000),
        catchError((err) => {
          if (err?.name === 'TimeoutError') {
            return throwError(
              () =>
                new Error(
                  '请求超时。PDF 请改传 DOCX 试一次，或检查 backend 终端是否有报错。'
                )
            );
          }
          return throwError(() => err);
        }),
        finalize(() => {
          this.loading = false;
          this.loadingHint = '';
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.analysis = res;
          if (res?._parsed === false) {
            this.errorMessage = '分析结果格式异常，建议重试。';
          }
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.error ||
            err?.message ||
            '请求失败：请确认 backend 已启动且 API Key 有效';
        },
      });
  }
}