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

  exportResult() {
    if (!this.record?.result) return;

    const result = this.record.result;
    const d = result.diagnosis || {};
    const m = result.matching || {};
    const o = result.optimization || {};

    let content = `# 简历分析报告\n\n`;
    content += `**文件**: ${this.record.fileName}\n`;
    content += `**岗位**: ${this.record.jobTitle || '未填写'}\n`;
    content += `**时间**: ${new Date(this.record.createdAt).toLocaleString()}\n\n`;

    content += `## 匹配度评分\n\n`;
    content += `- 匹配度得分: ${this.record.matchScore}%\n`;
    content += `- 结构得分: ${this.record.structureScore}%\n\n`;

    if (d.structureScore) {
      content += `## 简历诊断\n\n`;
      content += `- 结构得分: ${d.structureScore}\n`;
      content += `- 表达得分: ${d.expressionScore || 0}\n`;
      content += `- 数据量化得分: ${d.quantScore || 0}\n\n`;
      if (d.missingSections?.length) {
        content += `**缺失部分**: ${d.missingSections.join('、')}\n`;
      }
      if (d.weakVerbs?.length) {
        content += `**弱动词**: ${d.weakVerbs.join('、')}\n`;
      }
      if (d.missingMetrics?.length) {
        content += `**缺失数据**: ${d.missingMetrics.join('、')}\n`;
      }
      content += `\n`;
    }

    if (m.matchScore !== undefined) {
      content += `## 岗位匹配\n\n`;
      content += `- 匹配得分: ${m.matchScore}%\n`;
      if (m.matchedKeywords?.length) {
        content += `- 已匹配关键词: ${m.matchedKeywords.join('、')}\n`;
      }
      if (m.missingKeywords?.length) {
        content += `- 缺失关键词: ${m.missingKeywords.join('、')}\n`;
      }
      if (m.targetedAdvice?.length) {
        content += `\n**优化建议**:\n`;
        m.targetedAdvice.forEach((advice, i) => {
          content += `${i + 1}. ${advice}\n`;
        });
      }
      content += `\n`;
    }

    if (o.rewrittenHighlights?.length) {
      content += `## 优化建议\n\n`;
      o.rewrittenHighlights.forEach((h, i) => {
        content += `${i + 1}. ${h}\n`;
      });
      content += `\n`;
    }

    if (o.beforeAfter?.length) {
      content += `### 改写前后对比\n\n`;
      o.beforeAfter.forEach((item, i) => {
        content += `**${i + 1}.**\n`;
        content += `- 原文: ${item.before}\n`;
        content += `- 改后: ${item.after}\n`;
        content += `- 原因: ${item.reason}\n\n`;
      });
    }

    if (result.notes?.length) {
      content += `## 备注\n\n`;
      result.notes.forEach((note) => {
        content += `- ${note}\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `简历分析报告_${this.record.fileName.replace(/\.[^.]+$/, '')}_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}