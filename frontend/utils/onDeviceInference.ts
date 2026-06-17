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
import type { InferenceSession as InferenceSessionType, Tensor as TensorType } from "onnxruntime-react-native";
import { MODEL_FILES, getModelPath } from "./modelManager";

// onnxruntime-react-native runs Module.install() as a side effect of being
// imported (see its lib/binding.ts). If that native module isn't linked,
// importing it eagerly crashes the whole app at startup — even on screens
// that never run inference, because this file is statically imported by the
// navigation tree. Load it lazily, only when inference actually runs.
function getOnnx(): typeof import("onnxruntime-react-native") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("onnxruntime-react-native");
}

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
let swintSession: InferenceSessionType | null = null;
let efficientnetSession: InferenceSessionType | null = null;

// ONNX Runtime's native loader expects a plain filesystem path (no "file://" scheme)
function toNativePath(uri: string): string {
  return uri.startsWith("file://") ? uri.slice("file://".length) : uri;
}

async function loadSessions(): Promise<void> {
  if (swintSession && efficientnetSession) return;

  const { InferenceSession } = getOnnx();

  const swinPath         = toNativePath(getModelPath(MODEL_FILES.find((m) => m.key === "swin")!.filename));
  const efficientnetPath = toNativePath(getModelPath(MODEL_FILES.find((m) => m.key === "efficientnet")!.filename));

  console.log("[ORT] Loading Swin from:", swinPath);
  swintSession = await InferenceSession.create(swinPath);
  console.log("[ORT] Swin ready — inputs:", swintSession.inputNames, "outputs:", swintSession.outputNames);

  console.log("[ORT] Loading EfficientNet from:", efficientnetPath);
  efficientnetSession = await InferenceSession.create(efficientnetPath);
  console.log("[ORT] EfficientNet ready — inputs:", efficientnetSession.inputNames, "outputs:", efficientnetSession.outputNames);
}

/**
 * Resize and preprocess an image URI into an NCHW Float32Array.
 * Steps: resize to 224×224 JPEG → base64-decode to JPEG bytes → JPEG-decode to
 * raw RGBA pixels (via jpeg-js) → ImageNet normalise → NCHW reshape.
 */
async function preprocessImage(imageUri: string): Promise<Float32Array> {
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 224, height: 224 } }],
    { base64: true, format: ImageManipulator.SaveFormat.JPEG }
  );

  if (!resized.base64) throw new Error("Image manipulation failed — no base64 output.");

  // base64 → raw JPEG file bytes
  const b64 = resized.base64;
  const raw  = atob(b64);
  const jpegBytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) jpegBytes[i] = raw.charCodeAt(i);

  // Decode JPEG file bytes → raw RGBA pixels (useTArray avoids Buffer dependency)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { decode } = require("jpeg-js") as {
    decode: (data: Uint8Array, opts: { useTArray: boolean }) => {
      data: Uint8Array; width: number; height: number;
    };
  };
  const { data: rgba, width, height } = decode(jpegBytes, { useTArray: true });

  // RGBA → NCHW Float32Array with ImageNet normalisation
  // ONNX Runtime expects NCHW: [1, 3, 224, 224]
  const pixels = width * height;
  const tensor = new Float32Array(3 * pixels);

  for (let i = 0; i < pixels; i++) {
    const r = rgba[i * 4]     / 255;
    const g = rgba[i * 4 + 1] / 255;
    const b = rgba[i * 4 + 2] / 255;

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
  const { Tensor } = getOnnx();

  const inputData = await preprocessImage(imageUri);
  const inputTensor: TensorType = new Tensor("float32", inputData, [1, 3, 224, 224]);
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
