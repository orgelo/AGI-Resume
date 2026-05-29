import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnalysisRecord, AnalysisResult, DashboardStats, PaginatedResponse } from '../models/analysis.model';

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

  getHistory(page = 1, pageSize = 10, favoritesOnly = false): Observable<PaginatedResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('favorites', favoritesOnly ? '1' : '0');
    return this.http.get<PaginatedResponse>(`${this.apiBaseUrl}/api/history`, { params });
  }

  getHistoryById(id: number): Observable<AnalysisRecord> {
    return this.http.get<AnalysisRecord>(`${this.apiBaseUrl}/api/history/${id}`);
  }

  deleteHistory(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiBaseUrl}/api/history/${id}`);
  }

  toggleFavorite(id: number): Observable<{ isFavorite: boolean }> {
    return this.http.post<{ isFavorite: boolean }>(
      `${this.apiBaseUrl}/api/history/${id}/favorite`,
      {},
      { withCredentials: true }
    );
  }

  getDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiBaseUrl}/api/dashboard`);
  }
}
