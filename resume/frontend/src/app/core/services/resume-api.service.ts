import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnalysisRecord, AnalysisResult, DashboardStats, LatestPreview, PaginatedResponse, ScoreTrendData, ChatMessage, InterviewStartResult, InterviewChatResult, InterviewEvaluateResult, CareerRoadmapResult, TailorResult } from '../models/analysis.model';

@Injectable({ providedIn: 'root' })
export class ResumeApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = 'http://localhost:3000';

  analyze(file: File, jobDescription: string, jobTitle = ''): Observable<AnalysisResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobDescription', jobDescription);
    formData.append('jobTitle', jobTitle);
    return this.http.post<AnalysisResult>(`${this.apiBaseUrl}/api/analyze`, formData);
  }

  getHistory(page = 1, pageSize = 10, favoritesOnly = false, search = '', minScore = 0, tagId?: number): Observable<PaginatedResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('favorites', favoritesOnly ? '1' : '0');
    if (search.trim()) params = params.set('search', search.trim());
    if (minScore > 0) params = params.set('minScore', minScore.toString());
    if (tagId) params = params.set('tagId', tagId.toString());
    return this.http.get<PaginatedResponse>(`${this.apiBaseUrl}/api/history`, { params });
  }

  getHistoryById(id: number): Observable<AnalysisRecord> {
    return this.http.get<AnalysisRecord>(`${this.apiBaseUrl}/api/history/${id}`);
  }

  deleteHistory(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiBaseUrl}/api/history/${id}`);
  }

  toggleFavorite(id: number): Observable<{ isFavorite: boolean }> {
    return this.http.post<{ isFavorite: boolean }>(`${this.apiBaseUrl}/api/history/${id}/favorite`, {}, { withCredentials: true });
  }

  getDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiBaseUrl}/api/dashboard`);
  }

  getScoreTrend(): Observable<ScoreTrendData[]> {
    return this.http.get<ScoreTrendData[]>(`${this.apiBaseUrl}/api/score-trend`);
  }

  getLatestPreview(): Observable<LatestPreview> {
    return this.http.get<LatestPreview>(`${this.apiBaseUrl}/api/preview/latest`);
  }

  getTags(): Observable<{ id: number; name: string; color: string }[]> {
    return this.http.get<{ id: number; name: string; color: string }[]>(`${this.apiBaseUrl}/api/tags`);
  }

  createTag(name: string, color?: string): Observable<{ id: number; name: string; color: string }> {
    return this.http.post<{ id: number; name: string; color: string }>(`${this.apiBaseUrl}/api/tags`, { name, color });
  }

  deleteTag(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiBaseUrl}/api/tags/${id}`);
  }

  getHistoryTags(id: number): Observable<{ id: number; name: string; color: string }[]> {
    return this.http.get<{ id: number; name: string; color: string }[]>(`${this.apiBaseUrl}/api/history/${id}/tags`);
  }

  setHistoryTags(id: number, tagIds: number[]): Observable<{ id: number; name: string; color: string }[]> {
    return this.http.post<{ id: number; name: string; color: string }[]>(`${this.apiBaseUrl}/api/history/${id}/tags`, { tagIds });
  }

  // ========== 面试模拟 ==========

  interviewStart(file: File | null, jobDescription: string, jobTitle = '', resumeText = ''): Observable<InterviewStartResult> {
    const formData = new FormData();
    if (file) formData.append('file', file);
    formData.append('jobDescription', jobDescription);
    formData.append('jobTitle', jobTitle);
    if (resumeText) formData.append('resumeText', resumeText);
    return this.http.post<InterviewStartResult>(`${this.apiBaseUrl}/api/interview/start`, formData);
  }

  interviewChat(messages: ChatMessage[], questionPool: any, focusAreas: string[]): Observable<InterviewChatResult> {
    return this.http.post<InterviewChatResult>(`${this.apiBaseUrl}/api/interview/chat`, { messages, questionPool, focusAreas });
  }

  interviewEvaluate(messages: ChatMessage[]): Observable<InterviewEvaluateResult> {
    return this.http.post<InterviewEvaluateResult>(`${this.apiBaseUrl}/api/interview/evaluate`, { messages });
  }

  // ========== 职业路线图 ==========
  careerRoadmap(file: File | null, targetRole: string, targetCompany: string, resumeText = ''): Observable<CareerRoadmapResult> {
    const formData = new FormData();
    if (file) formData.append('file', file);
    formData.append('targetRole', targetRole);
    formData.append('targetCompany', targetCompany);
    if (resumeText) formData.append('resumeText', resumeText);
    return this.http.post<CareerRoadmapResult>(`${this.apiBaseUrl}/api/career-roadmap`, formData);
  }

  // ========== 简历精修 ==========
  tailorResume(file: File | null, jobDescription: string, resumeText = ''): Observable<TailorResult> {
    const formData = new FormData();
    if (file) formData.append('file', file);
    formData.append('jobDescription', jobDescription);
    if (resumeText) formData.append('resumeText', resumeText);
    return this.http.post<TailorResult>(`${this.apiBaseUrl}/api/tailor`, formData);
  }

  exportTailoredResume(resumeText: string, format: 'pdf' | 'docx' | 'html', jobTitle = ''): Observable<Blob> {
    return this.http.post(`${this.apiBaseUrl}/api/tailor/export`, { resumeText, format, jobTitle }, { responseType: 'blob' });
  }
}
