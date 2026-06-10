/**
 * On-device ensemble inference using downloaded ONNX models.
 *
 * TEMPORARILY DISABLED — onnxruntime-react-native has been removed as part of
 * an isolation test to determine whether its native module is causing the app
 * to crash on launch. This stub keeps the offline-inference call path intact
 * (see hooks/useOfflineInference.ts) while always reporting unavailable.
 */

export interface OnDeviceResult {
  prediction: "Positive" | "Negative";
  confidence: number;
  risk_score: number;
  uncertainty_score: number;
  uncertainty_level: "High" | "Low";
  risk_level: string;
  lesion_class: "acetowhite_positive" | "acetowhite_negative";
  recommendation: string;
  source: "on_device";
}

export async function runOnDeviceInference(_imageUri: string): Promise<OnDeviceResult> {
  throw new Error("On-device inference is temporarily unavailable.");
}

export async function releaseOnDeviceModels(): Promise<void> {
  // no-op
}
