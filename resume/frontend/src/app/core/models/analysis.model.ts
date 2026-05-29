export interface DiagnosisResult {
  structureScore?: number;
  expressionScore?: number;
  quantScore?: number;
  missingSections?: string[];
  weakVerbs?: string[];
  missingMetrics?: string[];
  recommendations?: {
    structure?: string[];
    expression?: string[];
    quant?: string[];
  };
}

export interface MatchingResult {
  matchScore?: number;
  matchedKeywords?: string[];
  partialKeywords?: string[];
  missingKeywords?: string[];
  targetedAdvice?: string[];
}

export interface OptimizationResult {
  rewrittenHighlights?: string[];
  beforeAfter?: { before: string; after: string; reason: string }[];
  fullDraft?: string;
}

export interface AnalysisResult {
  diagnosis?: DiagnosisResult;
  matching?: MatchingResult;
  optimization?: OptimizationResult;
  notes?: string[];
  _raw?: string;
  _parsed?: boolean;
}

export interface AnalysisRecord {
  id: number;
  fileName: string;
  jobTitle: string;
  matchScore: number;
  structureScore: number;
  isFavorite?: boolean;
  createdAt: string;
  result?: AnalysisResult;
}

export interface DashboardStats {
  totalAnalyses: number;
  avgMatchScore: number;
  avgStructureScore: number;
  recentCount: number;
  weeklyData?: { label: string; count: number }[];
}

export interface PaginatedResponse {
  list: AnalysisRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
