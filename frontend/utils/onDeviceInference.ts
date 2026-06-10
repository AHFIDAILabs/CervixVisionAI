/**
 * On-device ensemble inference using downloaded ONNX models.
 *
 * Mirrors the server-side inference pipeline (Swin + EfficientNet-B3 weighted
 * average) but runs entirely on the Android device via ONNX Runtime.
 *
 * Models are downloaded once on first launch (see utils/modelManager.ts and
 * ModelDownloadScreen) and cached in the document directory — they are NOT
 * bundled in the APK, since files >100MB break Android's resource packager.
 */

import * as ImageManipulator from "expo-image-manipulator";
import { InferenceSession, Tensor } from "onnxruntime-react-native";
import { MODEL_FILES, getModelPath } from "./modelManager";

// ImageNet normalisation constants — must match ai_engine training transforms
const MEAN = [0.485, 0.456, 0.406];
const STD  = [0.229, 0.224, 0.225];

// Ensemble fusion weights — must match ensemble_config.yaml
const PRIMARY_WEIGHT   = 0.55;  // Swin (cpu config) or 0.60 (gpu config)
const SECONDARY_WEIGHT = 0.45;  // EfficientNet-B3

// Inference threshold — matches params.yaml INFERENCE_THRESHOLD
const INFERENCE_THRESHOLD = 0.3;

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

// Sessions are lazy-loaded and cached after first use
let swintSession: InferenceSession | null = null;
let efficientnetSession: InferenceSession | null = null;

// ONNX Runtime's native loader expects a plain filesystem path (no "file://" scheme)
function toNativePath(uri: string): string {
  return uri.startsWith("file://") ? uri.slice("file://".length) : uri;
}

async function loadSessions(): Promise<void> {
  if (swintSession && efficientnetSession) return;

  const swinPath         = toNativePath(getModelPath(MODEL_FILES.find((m) => m.key === "swin")!.filename));
  const efficientnetPath = toNativePath(getModelPath(MODEL_FILES.find((m) => m.key === "efficientnet")!.filename));

  swintSession        = await InferenceSession.create(swinPath);
  efficientnetSession = await InferenceSession.create(efficientnetPath);
}

/**
 * Resize and preprocess an image URI into an NCHW Float32Array.
 * Steps: resize → decode base64 → normalise with ImageNet mean/std → NCHW reshape.
 */
async function preprocessImage(imageUri: string): Promise<Float32Array> {
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 224, height: 224 } }],
    { base64: true, format: ImageManipulator.SaveFormat.JPEG }
  );

  if (!resized.base64) throw new Error("Image manipulation failed — no base64 output.");

  // Decode base64 JPEG bytes
  const raw = atob(resized.base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

  // Extract RGB channels from raw bytes (JPEG decoded as interleaved RGB)
  // ONNX Runtime expects NCHW: [1, 3, 224, 224]
  const pixels = 224 * 224;
  const tensor = new Float32Array(3 * pixels);

  for (let i = 0; i < pixels; i++) {
    const r = bytes[i * 3]     / 255;
    const g = bytes[i * 3 + 1] / 255;
    const b = bytes[i * 3 + 2] / 255;

    tensor[i]               = (r - MEAN[0]) / STD[0]; // R channel
    tensor[pixels + i]      = (g - MEAN[1]) / STD[1]; // G channel
    tensor[pixels * 2 + i]  = (b - MEAN[2]) / STD[2]; // B channel
  }

  return tensor;
}

function softmax(logits: Float32Array): [number, number] {
  const max = Math.max(logits[0], logits[1]);
  const e0  = Math.exp(logits[0] - max);
  const e1  = Math.exp(logits[1] - max);
  const sum = e0 + e1;
  return [e0 / sum, e1 / sum];
}

function buildResult(fusedPositiveProb: number): OnDeviceResult {
  const prob       = fusedPositiveProb;
  const prediction = prob > INFERENCE_THRESHOLD ? "Positive" : "Negative";
  const confidence = Math.min(Math.max(
    prediction === "Positive" ? prob : 1 - prob,
    0.01
  ), 0.95);
  const uncertainty_score = 1 - 2 * Math.abs(prob - 0.5);
  const uncertainty_level = uncertainty_score > 0.4 ? "High" : "Low";

  let risk_level: string;
  let recommendation: string;

  if (prediction === "Positive") {
    risk_level = confidence >= 0.8 && uncertainty_level === "Low"
      ? "High Risk"
      : confidence >= 0.6 ? "Moderate Risk" : "Uncertain Risk";
    recommendation = confidence >= 0.8
      ? "Immediate review by a qualified specialist is strongly recommended."
      : "Consult a healthcare professional — further evaluation recommended.";
  } else {
    risk_level = confidence >= 0.8 && uncertainty_level === "Low"
      ? "Low Risk" : "Moderate Risk";
    recommendation =
      "Continue routine screening as per standard clinical guidelines.";
  }

  return {
    prediction,
    confidence,
    risk_score:       prob,
    uncertainty_score,
    uncertainty_level,
    risk_level,
    lesion_class: prediction === "Positive" ? "acetowhite_positive" : "acetowhite_negative",
    recommendation,
    source: "on_device",
  };
}

/**
 * Run on-device ensemble inference on a local image URI.
 * Call this when the server is unreachable.
 *
 * @param imageUri  local file URI from expo-image-picker
 * @returns structured inference result
 */
export async function runOnDeviceInference(imageUri: string): Promise<OnDeviceResult> {
  await loadSessions();

  const inputData = await preprocessImage(imageUri);
  const inputTensor = new Tensor("float32", inputData, [1, 3, 224, 224]);
  const feeds = { image: inputTensor };

  const [swintOutput, efficientnetOutput] = await Promise.all([
    swintSession!.run(feeds),
    efficientnetSession!.run(feeds),
  ]);

  const [, swintPos]        = softmax(swintOutput["logits"].data as Float32Array);
  const [, efficientnetPos] = softmax(efficientnetOutput["logits"].data as Float32Array);

  const fusedPositiveProb =
    PRIMARY_WEIGHT * swintPos + SECONDARY_WEIGHT * efficientnetPos;

  return buildResult(fusedPositiveProb);
}

/**
 * Release ONNX sessions to free memory. Call when the user logs out.
 */
export async function releaseOnDeviceModels(): Promise<void> {
  await swintSession?.release();
  await efficientnetSession?.release();
  swintSession        = null;
  efficientnetSession = null;
}
