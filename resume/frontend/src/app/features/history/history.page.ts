import { Component, inject, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ResumeApiService } from '../../core/services/resume-api.service';
import { AnalysisRecord, PaginatedResponse } from '../../core/models/analysis.model';
import { TruncatePipe } from '../../shared/pipes/truncate.pipe';
import { CustomSelectComponent, SelectOption } from '../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TruncatePipe, CustomSelectComponent],
  templateUrl: './history.page.html',
  styleUrl: './history.page.scss',
})
export class HistoryPage implements OnInit {
  private readonly api = inject(ResumeApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  records: AnalysisRecord[] = [];
  error = '';
  loading = false;
  searchText = '';
  minScore = 0;

  currentPage = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;
  favoritesOnly = false;
  selectedIds: number[] = [];

  tags: { id: number; name: string; color: string }[] = [];
  selectedTagId = 0;
  showTagManager = false;
  newTagName = '';
  newTagColor = '#3b82f6';
  editingRecord: AnalysisRecord | null = null;
  editingTagIds: number[] = [];

  scoreOptions: SelectOption[] = [
    { value: 0, label: '全部分数' },
    { value: 60, label: '60 分及以上' },
    { value: 75, label: '75 分及以上' },
    { value: 90, label: '90 分及以上' },
  ];

  get tagOptions(): SelectOption[] {
    return [{ value: 0, label: '全部标签' }, ...this.tags.map((t) => ({ value: t.id, label: t.name }))];
  }

  @HostListener('document:click')
  onDocumentClick() {}

  ngOnInit() {
    this.loadHistory();
    this.loadTags();
  }

  loadTags() {
    this.api.getTags().subscribe({
      next: (tags) => {
        this.tags = tags;
        this.cdr.detectChanges();
      },
    });
  }

  loadHistory(page = 1) {
    this.loading = true;
    this.currentPage = page;
    const minScore = this.selectedTagId > 0 ? 0 : this.minScore;
    this.api.getHistory(page, this.pageSize, this.favoritesOnly, this.searchText, minScore, this.selectedTagId || undefined).subscribe({
      next: (res: PaginatedResponse) => {
        this.records = res.list;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.selectedIds = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = '加载历史记录失败，请确认后端已启动';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleFavorite(record: AnalysisRecord, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.api.toggleFavorite(record.id).subscribe({
      next: (res) => {
        record.isFavorite = res.isFavorite;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = '操作失败';
        this.cdr.detectChanges();
      },
    });
  }

  toggleSelect(id: number, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const idx = this.selectedIds.indexOf(id);
    if (idx >= 0) {
      this.selectedIds.splice(idx, 1);
    } else if (this.selectedIds.length < 5) {
      this.selectedIds.push(id);
    }
    this.cdr.detectChanges();
  }

  compare() {
    if (this.selectedIds.length >= 2) {
      this.router.navigate(['/compare', this.selectedIds.join(',')]);
    }
  }

  toggleFavoritesFilter() {
    this.favoritesOnly = !this.favoritesOnly;
    this.loadHistory();
  }

  deleteRecord(id: number, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm('确定要删除这条记录吗？')) return;

    this.api.deleteHistory(id).subscribe({
      next: () => {
        this.loadHistory(this.currentPage);
      },
      error: () => {
        this.error = '删除失败';
        this.cdr.detectChanges();
      },
    });
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadHistory(page);
    }
  }

  get pages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  createTag() {
    if (!this.newTagName.trim()) return;
    this.api.createTag(this.newTagName.trim(), this.newTagColor).subscribe({
      next: (tag) => {
        this.tags.push(tag);
        this.newTagName = '';
        this.cdr.detectChanges();
      },
    });
  }

  deleteTag(id: number) {
    if (!confirm('确定要删除这个标签吗？')) return;
    this.api.deleteTag(id).subscribe({
      next: () => {
        this.tags = this.tags.filter((t) => t.id !== id);
        this.cdr.detectChanges();
      },
    });
  }

  editRecordTags(record: AnalysisRecord, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.editingRecord = record;
    this.editingTagIds = (record.tags || []).map((t) => t.id);
    this.cdr.detectChanges();
  }

  isTagSelected(tagId: number): boolean {
    return this.editingTagIds.includes(tagId);
  }

  toggleTag(tagId: number) {
    const idx = this.editingTagIds.indexOf(tagId);
    if (idx >= 0) {
      this.editingTagIds.splice(idx, 1);
    } else {
      this.editingTagIds.push(tagId);
    }
  }

  toggleTagAndSave(tagId: number) {
    this.toggleTag(tagId);
    this.saveRecordTags();
  }

  saveRecordTags() {
    if (!this.editingRecord) return;
    this.api.setHistoryTags(this.editingRecord.id, this.editingTagIds).subscribe({
      next: (tags) => {
        this.editingRecord!.tags = tags;
        this.editingRecord = null;
        this.cdr.detectChanges();
      },
    });
  }
}
