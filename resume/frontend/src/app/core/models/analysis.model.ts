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

export interface LatestPreview {
  hasData: boolean;
  fileName?: string;
  jobTitle?: string;
  matchScore?: number;
  structureScore?: number;
  expressionScore?: number;
  atsScore?: number;
  keywordCoverage?: number;
  matchedKeywords?: string[];
  missingKeywords?: string[];
  partialKeywords?: string[];
  summary?: string;
}

export interface PaginatedResponse {
  list: AnalysisRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ========== 面试模拟模型 ==========

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface InterviewStartResult {
  greeting: string;
  firstQuestion: string;
  category: string;
  questionPool: {
    technical: string[];
    project: string[];
    behavioral: string[];
    hr: string[];
  };
  focusAreas: string[];
}

export interface InterviewChatResult {
  reply: string;
  category: string;
  isFollowUp: boolean;
  isComplete: boolean;
}

export interface InterviewEvaluateResult {
  technicalScore: number;
  communicationScore: number;
  starScore: number;
  riskAnalysis: string[];
  strengths: string[];
  suggestions: string[];
  overallComment: string;
  categoryScores: {
    technical: { score: number; comment: string };
    project: { score: number; comment: string };
    behavioral: { score: number; comment: string };
    hr: { score: number; comment: string };
  };
}

// ========== 职业路线图模型 ==========
export interface RoadmapMilestone {
  name: string;
  weeks: number;
  description: string;
}

export interface RoadmapPhase {
  title: string;
  milestones: RoadmapMilestone[];
  learning: string[];
  projects: string[];
  certifications: string[];
  books: string[];
  courses: string[];
}

export interface CareerRoadmapResult {
  currentLevel: string;
  skillGaps: string[];
  industryRequirements: string[];
  roadmap: {
    threeMonth: RoadmapPhase;
    sixMonth: RoadmapPhase;
    twelveMonth: RoadmapPhase;
  };
  overallAdvice: string;
}

// ========== 简历精修模型 ==========
export interface TailorChange {
  original: string;
  rewritten: string;
  reason: string;
  type: 'keyword' | 'expression' | 'structure' | 'order';
}

export interface TailorResult {
  jdKeywords: {
    mustHave: string[];
    niceToHave: string[];
    softSkills: string[];
  };
  matchAnalysis: {
    matched: string[];
    partialMatch: string[];
    missing: string[];
  };
  changes: TailorChange[];
  tailoredResume: string;
  summary: string;
}
