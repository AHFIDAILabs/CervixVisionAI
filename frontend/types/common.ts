export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface MlResults {
  prediction: "Positive" | "Negative";
  confidence: number;
  risk_score: number;
  lesion_class: "acetowhite_positive" | "acetowhite_negative";
  uncertainty_score: number;
  uncertainty_level: "High" | "Low";
  risk_level: string;
  recommendation: string;
  clinical_report: string;
  xai_output?: string;
  analysed_at?: string;
}

export interface AnalysisResult {
  _id: string;
  type: string;
  status: "pending" | "in_progress" | "completed" | "reviewed" | "delivered";
  createdAt: string;
  results?: {
    summary?: string;
    attachments?: Array<{ url: string; type: string }>;
  };
  ml_results?: MlResults;
}
