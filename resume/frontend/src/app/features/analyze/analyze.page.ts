import { Component, inject, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { timeout, catchError, throwError, finalize } from 'rxjs';
import { ResumeApiService } from '../../core/services/resume-api.service';
import { AnalysisResult, LatestPreview } from '../../core/models/analysis.model';
import { ResultPanelComponent } from '../../shared/components/result-panel/result-panel.component';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

@Component({
  selector: 'app-analyze-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ResultPanelComponent],
  templateUrl: './analyze.page.html',
  styleUrl: './analyze.page.scss',
})
export class AnalyzePage implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = inject(ResumeApiService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('resultSection') resultSection!: ElementRef;
  @ViewChild('particleCanvas') particleCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('streamEl') streamEl!: ElementRef;

  private animId = 0;
  private particles: Particle[] = [];
  private ctx: CanvasRenderingContext2D | null = null;

  file: File | null = null;
  jobTitle = '';
  jobDescription = '';
  loading = false;
  loadingHint = '';
  errorMessage = '';
  backendOk = false;
  analysis: AnalysisResult | null = null;
  isDragging = false;
  isScanning = false;
  preview: LatestPreview = { hasData: false };

  ngOnInit() {
    this.http.get<{ ok: boolean }>('http://localhost:3000/health').subscribe({
      next: () => (this.backendOk = true),
      error: () => {
        this.backendOk = false;
        this.errorMessage = '无法连接后端 http://localhost:3000 ，请先在 backend 目录执行 npm run dev';
      },
    });
    this.api.getLatestPreview().subscribe({
      next: (data) => {
        if (data.hasData) this.preview = data;
      },
    });
  }

  ngAfterViewInit() {
    this.initParticles();
    this.startStreamAnimation();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    if (this.streamTimer) clearTimeout(this.streamTimer);
  }

  private initParticles() {
    const canvas = this.particleCanvas?.nativeElement;
    if (!canvas) return;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = 60;
    const { width, height } = canvas;
    this.particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }));

    const animate = () => {
      const ctx = this.ctx!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of this.particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Dot — subtle violet
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(123,111,238,0.10)';
        ctx.fill();
      }

      // Lines between close particles — violet connections
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const a = this.particles[i];
          const b = this.particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(123,111,238,${0.05 * (1 - dist / 140)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      this.animId = requestAnimationFrame(animate);
    };
    animate();
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.length ? input.files[0] : null;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;

    const file = event.dataTransfer?.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.docx') || file.name.endsWith('.doc'))) {
      this.isScanning = true;
      setTimeout(() => {
        this.file = file;
        this.isScanning = false;
      }, 1500);
    }
  }

  removeFile(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.file = null;
  }

  private streamTimer: ReturnType<typeof setTimeout> | null = null;
  private streamIndex = 0;

  private startStreamAnimation() {
    const el = this.streamEl?.nativeElement;
    if (!el) return;

    const lines = [
      { cls: 'info', prefix: '→', msg: '正在解析文档结构...' },
      { cls: 'ok',   prefix: '✓', msg: '识别到工作经历 3 段' },
      { cls: 'ok',   prefix: '✓', msg: '技能列表提取完成' },
      { cls: 'info', prefix: '→', msg: '与 JD 进行语义比对...' },
      { cls: 'warn', prefix: '!', msg: '缺失关键词: 微前端' },
      { cls: 'warn', prefix: '!', msg: '缺失关键词: 低代码平台' },
      { cls: 'ok',   prefix: '✓', msg: 'React / TS 命中率 100%' },
      { cls: 'info', prefix: '→', msg: '量化指标分析中...' },
      { cls: 'ok',   prefix: '✓', msg: '发现 4 处可量化描述' },
      { cls: 'info', prefix: '→', msg: '生成优化建议报告...' },
    ];

    const addLine = () => {
      if (!el) return;
      if (this.streamIndex >= lines.length) {
        this.streamIndex = 0;
        el.innerHTML = '';
      }
      const l = lines[this.streamIndex++];
      const div = document.createElement('div');
      div.className = `stream-line ${l.cls}`;
      div.style.animationDelay = '0s';
      div.innerHTML = `<span class="prefix">${l.prefix}</span><span class="msg">${l.msg}</span>`;
      el.appendChild(div);
      el.scrollTop = el.scrollHeight;
      this.streamTimer = setTimeout(addLine, 600 + Math.random() * 400);
    };

    this.streamTimer = setTimeout(addLine, 800);
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
      this.errorMessage = '后端未连接，请先启动 backend（npm run dev）';
      return;
    }
    if (!this.file) {
      this.errorMessage = '请选择简历文件（PDF 或 DOCX）';
      return;
    }

    const isPdf = this.file.name.toLowerCase().endsWith('.pdf');
    this.loading = true;
    this.loadingHint = isPdf ? '扫描版 PDF 较慢（约 1～3 分钟），请耐心等待…' : '正在分析简历（约 10～30 秒）…';

    this.api.analyze(this.file, this.jobDescription, this.jobTitle).pipe(
      timeout(190000),
      catchError((err) => {
        if (err?.name === 'TimeoutError') {
          return throwError(() => new Error('请求超时。PDF 请改传 DOCX 重试。'));
        }
        return throwError(() => err);
      }),
      finalize(() => {
        this.loading = false;
        this.loadingHint = '';
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (res) => {
        this.analysis = res;
        if (res?._parsed === false) {
          this.errorMessage = '分析结果格式异常，建议重试。';
        }
        setTimeout(() => {
          if (this.resultSection) {
            this.resultSection.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 200);
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || err?.message || '请求失败：请确认 backend 已启动且 API Key 有效';
      },
    });
  }
}
