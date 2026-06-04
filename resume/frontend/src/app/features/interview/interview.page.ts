import { Component, inject, ChangeDetectorRef, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResumeApiService } from '../../core/services/resume-api.service';
import { ChatMessage, InterviewStartResult, InterviewChatResult, InterviewEvaluateResult } from '../../core/models/analysis.model';

type Phase = 'setup' | 'chat' | 'evaluate';

@Component({
  selector: 'app-interview-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interview.page.html',
  styleUrl: './interview.page.scss',
})
export class InterviewPage implements AfterViewChecked {
  private readonly api = inject(ResumeApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('inputArea') inputArea!: ElementRef;

  phase: Phase = 'setup';
  file: File | null = null;
  jobTitle = '';
  jobDescription = '';
  errorMessage = '';
  loading = false;

  // Chat state
  messages: ChatMessage[] = [];
  userInput = '';
  questionPool: any = null;
  focusAreas: string[] = [];
  currentCategory = '';

  // Evaluate result
  evaluation: InterviewEvaluateResult | null = null;

  // Score ring helper
  circumference = 2 * Math.PI * 45;

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

  startInterview() {
    this.errorMessage = '';
    if (!this.file) {
      this.errorMessage = '请上传简历文件';
      return;
    }
    if (!this.jobDescription.trim()) {
      this.errorMessage = '请输入岗位描述（JD）';
      return;
    }

    this.loading = true;
    this.api.interviewStart(this.file, this.jobDescription, this.jobTitle).subscribe({
      next: (result: InterviewStartResult) => {
        this.questionPool = result.questionPool;
        this.focusAreas = result.focusAreas;
        this.currentCategory = result.category;
        this.messages = [
          { role: 'assistant', content: result.greeting },
          { role: 'assistant', content: result.firstQuestion },
        ];
        this.phase = 'chat';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || err?.message || '启动面试失败';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text || this.loading) return;

    this.messages.push({ role: 'user', content: text });
    this.userInput = '';
    this.loading = true;
    this.cdr.detectChanges();

    this.api.interviewChat(this.messages, this.questionPool, this.focusAreas).subscribe({
      next: (result: InterviewChatResult) => {
        this.messages.push({ role: 'assistant', content: result.reply });
        this.currentCategory = result.category;
        this.loading = false;
        if (result.isComplete) {
          this.endInterview();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || err?.message || '对话失败';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  endInterview() {
    this.loading = true;
    this.phase = 'evaluate';
    this.cdr.detectChanges();

    this.api.interviewEvaluate(this.messages).subscribe({
      next: (result: InterviewEvaluateResult) => {
        this.evaluation = result;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || err?.message || '评估失败';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  resetInterview() {
    this.phase = 'setup';
    this.messages = [];
    this.userInput = '';
    this.questionPool = null;
    this.focusAreas = [];
    this.evaluation = null;
    this.errorMessage = '';
    this.file = null;
    this.jobTitle = '';
    this.jobDescription = '';
  }

  getScoreColor(score: number): string {
    if (score >= 90) return 'var(--success-color)';
    if (score >= 75) return 'var(--primary-color)';
    if (score >= 60) return 'var(--accent-color)';
    return 'var(--error-color)';
  }

  getDashOffset(score: number): number {
    const s = Math.min(100, Math.max(0, score));
    return 283 - (283 * s) / 100;
  }

  getCategoryLabel(cat: string): string {
    const map: Record<string, string> = {
      technical: '技术问题',
      project: '项目问题',
      behavioral: '行为问题',
      hr: 'HR问题',
    };
    return map[cat] || cat;
  }

  get categoryEntries(): { label: string; score: number; comment: string }[] {
    if (!this.evaluation?.categoryScores) return [];
    const map: Record<string, string> = {
      technical: '技术问题',
      project: '项目问题',
      behavioral: '行为问题',
      hr: 'HR问题',
    };
    return Object.entries(this.evaluation.categoryScores).map(([key, val]) => ({
      label: map[key] || key,
      score: val.score,
      comment: val.comment,
    }));
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.file = files[0];
    }
  }

  ngAfterViewChecked() {
    if (this.chatContainer) {
      const el = this.chatContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
