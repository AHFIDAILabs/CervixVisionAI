export interface Centre {
  code: string;      // e.g. "X3K2-M9PQ"
  name: string;
  createdAt: string; // ISO string
}

export interface LocalAnalysis {
  id: string;                          // UUID
  centreCode: string;
  imagePath: string;                   // local file:// URI
  prediction: "Positive" | "Negative";
  confidence: number;
  risk_score: number;
  risk_level: string;
  uncertainty_score: number;
  uncertainty_level: "High" | "Low";
  lesion_class: string;
  recommendation: string;
  source: "on_device";
  createdAt: string;                   // ISO string
  synced: boolean;
}

export type CentreStackParamList = {
  home: undefined;
  CentreRegisterScreen: undefined;
  CentreLoginScreen: undefined;
};
