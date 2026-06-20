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

import { Alert, ToastAndroid, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import type { InferenceSession as InferenceSessionType, Tensor as TensorType } from "onnxruntime-react-native";
import { MODEL_FILES, getModelPath } from "./modelManager";

function ort(msg: string) {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.LONG);
}

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

  // Validate model files before touching ORT — gives a clear error instead of a
  // silent JNI crash if the download was incomplete or corrupt.
  const MIN_BYTES: Record<string, number> = { swin: 300_000_000, efficientnet: 30_000_000 };
  for (const m of MODEL_FILES) {
    const path = getModelPath(m.filename);
    const info = await FileSystem.getInfoAsync(path);
    ort(`ORT check: ${m.filename} exists=${info.exists} size=${info.exists ? (info.size / 1e6).toFixed(0) + "MB" : "N/A"}`);
    if (!info.exists) {
      const msg = `Model file missing: ${m.filename}. Go to Model Setup and re-download.`;
      Alert.alert("Model missing", msg);
      throw new Error(msg);
    }
    if (info.size < MIN_BYTES[m.key]) {
      const msg = `Model incomplete: ${m.filename} is ${(info.size / 1e6).toFixed(0)}MB, expected ≥${(MIN_BYTES[m.key] / 1e6).toFixed(0)}MB. Clear app data and re-download.`;
      Alert.alert("Model incomplete", msg);
      throw new Error(msg);
    }
  }

  const { InferenceSession } = getOnnx();

  const swinPath         = toNativePath(getModelPath(MODEL_FILES.find((m) => m.key === "swin")!.filename));
  const efficientnetPath = toNativePath(getModelPath(MODEL_FILES.find((m) => m.key === "efficientnet")!.filename));

  ort("ORT: loading Swin (336MB — may take 1–2 min)…");
  swintSession = await InferenceSession.create(swinPath);
  ort(`ORT: Swin ready inputs=${swintSession.inputNames} outputs=${swintSession.outputNames}`);

  ort("ORT: loading EfficientNet…");
  efficientnetSession = await InferenceSession.create(efficientnetPath);
  ort(`ORT: EfficientNet ready inputs=${efficientnetSession.inputNames} outputs=${efficientnetSession.outputNames}`);
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

  // DIAG A — confirm actual model I/O names (needed every run, not just first load)
  ort(`DIAG-A swin  in=${JSON.stringify(swintSession!.inputNames)} out=${JSON.stringify(swintSession!.outputNames)}`);
  ort(`DIAG-A effnt in=${JSON.stringify(efficientnetSession!.inputNames)} out=${JSON.stringify(efficientnetSession!.outputNames)}`);

  const inputData = await preprocessImage(imageUri);

  // DIAG B — sample 3 spread-out pixel values; should DIFFER between images
  ort(`DIAG-B tensor[0]=${inputData[0].toFixed(4)} [10000]=${inputData[10000].toFixed(4)} [100000]=${inputData[100000].toFixed(4)}`);

  const inputTensor: TensorType = new Tensor("float32", inputData, [1, 3, 224, 224]);
  const feeds = { image: inputTensor };

  const [swintOutput, efficientnetOutput] = await Promise.all([
    swintSession!.run(feeds),
    efficientnetSession!.run(feeds),
  ]);

  // DIAG C — raw logits before softmax; should DIFFER between images if models respond to input
  const swintRaw = swintOutput["logits"]?.data as Float32Array | undefined;
  const effRaw   = efficientnetOutput["logits"]?.data as Float32Array | undefined;
  ort(`DIAG-C swin logits=${swintRaw ? `[${swintRaw[0].toFixed(4)},${swintRaw[1].toFixed(4)}]` : "KEY MISSING"}`);
  ort(`DIAG-C effnt logits=${effRaw   ? `[${effRaw[0].toFixed(4)},${effRaw[1].toFixed(4)}]`   : "KEY MISSING"}`);

  if (!swintRaw || !effRaw) {
    const outKeys = `swin=${JSON.stringify(Object.keys(swintOutput))} effnt=${JSON.stringify(Object.keys(efficientnetOutput))}`;
    throw new Error(`Output key "logits" not found. Actual keys: ${outKeys}`);
  }

  const [, swintPos]        = softmax(swintRaw);
  const [, efficientnetPos] = softmax(effRaw);

  const fusedPositiveProb =
    PRIMARY_WEIGHT * swintPos + SECONDARY_WEIGHT * efficientnetPos;

  ort(`DIAG-D fused=${fusedPositiveProb.toFixed(4)} swinPos=${swintPos.toFixed(4)} effntPos=${efficientnetPos.toFixed(4)}`);

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
