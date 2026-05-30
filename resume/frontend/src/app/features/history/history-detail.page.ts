import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ResumeApiService } from '../../core/services/resume-api.service';
import { AnalysisRecord } from '../../core/models/analysis.model';
import { ResultPanelComponent } from '../../shared/components/result-panel/result-panel.component';

@Component({
  selector: 'app-history-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ResultPanelComponent],
  templateUrl: './history-detail.page.html',
  styleUrl: './history-detail.page.scss',
})
export class HistoryDetailPage implements OnInit {
  private readonly api = inject(ResumeApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  record: AnalysisRecord | null = null;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getHistoryById(id).subscribe({
      next: (r) => {
        this.record = r;
        this.cdr.detectChanges();
      },
    });
  }

  private buildReportMarkdown(): string {
    if (!this.record?.result) return '';
    const result = this.record.result;
    const d = result.diagnosis || {};
    const m = result.matching || {};
    const o = result.optimization || {};
    const i = result.interview || {};
    const c = result.career || {};

    let content = `# 简历分析报告\n\n`;
    content += `**文件**: ${this.record.fileName}\n`;
    content += `**岗位**: ${this.record.jobTitle || '未填写'}\n`;
    content += `**时间**: ${new Date(this.record.createdAt).toLocaleString()}\n\n`;
    content += `## 核心分数\n\n`;
    content += `- 匹配度得分: ${this.record.matchScore}%\n`;
    content += `- 结构得分: ${this.record.structureScore}%\n`;
    content += `- ATS 兼容: ${d.atsScore ?? '—'}\n`;
    content += `- 完整性: ${d.completenessScore ?? '—'}\n\n`;

    content += `## 简历诊断\n\n`;
    content += `- 结构建议: ${(d.recommendations?.structure || []).join('；') || '—'}\n`;
    content += `- 表达建议: ${(d.recommendations?.expression || []).join('；') || '—'}\n`;
    content += `- 量化建议: ${(d.recommendations?.quant || []).join('；') || '—'}\n`;
    content += `- ATS 建议: ${(d.recommendations?.ats || []).join('；') || '—'}\n`;
    content += `- 缺失部分: ${(d.missingSections || []).join('、') || '—'}\n`;
    content += `- 风险提示: ${(d.riskWarnings || []).join('；') || '—'}\n\n`;

    content += `## 岗位匹配\n\n`;
    content += `- 匹配得分: ${m.matchScore ?? 0}%\n`;
    content += `- 已匹配关键词: ${(m.matchedKeywords || []).join('、') || '—'}\n`;
    content += `- 缺失关键词: ${(m.missingKeywords || []).join('、') || '—'}\n`;
    content += `- 目标建议: ${(m.targetedAdvice || []).join('；') || '—'}\n\n`;

    content += `## 优化建议\n\n`;
    (o.rewrittenHighlights || []).forEach((h, i2) => { content += `${i2 + 1}. ${h}\n`; });
    content += `\n`;
    if (o.beforeAfter?.length) {
      content += `### 改写前后对比\n\n`;
      o.beforeAfter.forEach((item, i2) => {
        content += `**${i2 + 1}.** 原文：${item.before}\n`;
        content += `改写：${item.after}\n`;
        content += `原因：${item.reason}\n\n`;
      });
    }
    if (o.fullDraft) content += `### 完整草稿\n\n${o.fullDraft}\n\n`;

    content += `## 面试题建议\n\n`;
    content += `- 技术题: ${(i.technicalQuestions || []).join('；') || '—'}\n`;
    content += `- 项目题: ${(i.projectQuestions || []).join('；') || '—'}\n`;
    content += `- 行为题: ${(i.behaviorQuestions || []).join('；') || '—'}\n`;
    content += `- 追问风险: ${(i.riskQuestions || []).join('；') || '—'}\n\n`;

    content += `## 职业建议\n\n`;
    content += `- 推荐岗位: ${(c.recommendedRoles || []).join('、') || '—'}\n`;
    content += `- 等级判断: ${c.levelAssessment || '—'}\n`;
    content += `- 技能缺口: ${(c.skillGaps || []).join('、') || '—'}\n\n`;

    if (result.notes?.length) {
      content += `## 备注\n\n`;
      result.notes.forEach((note) => { content += `- ${note}\n`; });
    }

    return content;
  }

  exportMarkdown() {
    const content = this.buildReportMarkdown();
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `简历分析报告_${this.record?.fileName.replace(/\.[^.]+$/, '')}_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportPdf() {
    const content = this.buildReportMarkdown();
    if (!content) return;
    const win = window.open('', '_blank', 'width=1200,height=900');
    if (!win) return;
    const html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
    win.document.write(`<html><head><title>简历分析报告</title><style>body{font-family:Arial,sans-serif;padding:32px;line-height:1.7;color:#111827}button{margin-bottom:16px}</style></head><body><button onclick="window.print()">打印 / 另存为 PDF</button><div>${html}</div></body></html>`);
    win.document.close();
    win.focus();
  }
}
