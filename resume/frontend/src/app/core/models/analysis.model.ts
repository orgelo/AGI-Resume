export interface DiagnosisResult {
  structureScore?: number;
  expressionScore?: number;
  quantScore?: number;
  atsScore?: number;
  completenessScore?: number;
  missingSections?: string[];
  riskWarnings?: string[];
  recommendations?: {
    structure?: string[];
    expression?: string[];
    quant?: string[];
    ats?: string[];
  };
}

export interface MatchingResult {
  matchScore?: number;
  jdKeywords?: {
    required?: string[];
    bonus?: string[];
    responsibilities?: string[];
    seniority?: string[];
  };
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

export interface InterviewResult {
  technicalQuestions?: string[];
  projectQuestions?: string[];
  behaviorQuestions?: string[];
  riskQuestions?: string[];
}

export interface CareerResult {
  recommendedRoles?: string[];
  levelAssessment?: string;
  skillGaps?: string[];
}

export interface AnalysisResult {
  diagnosis?: DiagnosisResult;
  matching?: MatchingResult;
  optimization?: OptimizationResult;
  interview?: InterviewResult;
  career?: CareerResult;
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
  tags?: { id: number; name: string; color: string }[];
}

export interface DashboardStats {
  totalAnalyses: number;
  avgMatchScore: number;
  avgStructureScore: number;
  recentCount: number;
  weeklyData?: { label: string; count: number }[];
  bestAnalysis?: { id: number; fileName: string; jobTitle: string; matchScore: number } | null;
  topMissingKeywords?: { keyword: string; count: number }[];
}

export interface ScoreTrendData {
  date: string;
  label: string;
  avgMatch: number | null;
  avgStructure: number | null;
}

export interface PaginatedResponse {
  list: AnalysisRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
