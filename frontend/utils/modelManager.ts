/**
 * Manages download and local storage of the ONNX inference models.
 *
 * The models (~377MB combined) are too large to bundle in the APK — Android's
 * resource packager corrupts/fails on individual resources over ~100MB, which
 * caused "keeps stopping" crashes on launch. Instead, the models are hosted as
 * GitHub Release assets and downloaded once on first app launch, then cached
 * in the app's document directory for fully offline use afterwards.
 */

import * as FileSystem from "expo-file-system/legacy";

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;

export interface ModelFile {
  key: "swin" | "efficientnet";
  filename: string;
  url: string;
  sizeBytes: number; // approximate, used for combined progress weighting
}

// Update these URLs after publishing the GitHub Release containing the .onnx files.
// Example: https://github.com/AHFIDAILabs/CervixVisionAI/releases/download/models-v1/swin_model.onnx
export const MODEL_FILES: ModelFile[] = [
  {
    key: "swin",
    filename: "swin_model.onnx",
    url: "https://github.com/AHFIDAILabs/CervixVisionAI/releases/download/models-v1/swin_model.onnx",
    sizeBytes: 336_300_000,
  },
  {
    key: "efficientnet",
    filename: "efficientnet_model.onnx",
    url: "https://github.com/AHFIDAILabs/CervixVisionAI/releases/download/models-v1/efficientnet_model.onnx",
    sizeBytes: 40_700_000,
  },
];

export function getModelPath(filename: string): string {
  return `${MODELS_DIR}${filename}`;
}

export async function areModelsDownloaded(): Promise<boolean> {
  for (const model of MODEL_FILES) {
    const info = await FileSystem.getInfoAsync(getModelPath(model.filename));
    if (!info.exists || info.size < 1_000_000) return false;
  }
  return true;
}

export interface DownloadProgress {
  fraction: number; // 0..1 combined progress across all files
  fileIndex: number; // 0-based index of file currently downloading
  fileCount: number;
}

/**
 * Downloads all model files sequentially, reporting combined progress.
 * Safe to call again after a partial failure — completed files are skipped.
 */
export async function downloadModels(
  onProgress: (progress: DownloadProgress) => void
): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(MODELS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
  }

  const totalSize = MODEL_FILES.reduce((sum, m) => sum + m.sizeBytes, 0);
  let completedSize = 0;

  for (let i = 0; i < MODEL_FILES.length; i++) {
    const model = MODEL_FILES[i];
    const dest = getModelPath(model.filename);

    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists && info.size >= 1_000_000) {
      completedSize += model.sizeBytes;
      onProgress({ fraction: completedSize / totalSize, fileIndex: i, fileCount: MODEL_FILES.length });
      continue;
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      model.url,
      dest,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        const expected = totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : model.sizeBytes;
        const fileFraction = Math.min(totalBytesWritten / expected, 1);
        const fraction = (completedSize + fileFraction * model.sizeBytes) / totalSize;
        onProgress({ fraction, fileIndex: i, fileCount: MODEL_FILES.length });
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result) throw new Error(`Download failed for ${model.filename}`);

    completedSize += model.sizeBytes;
    onProgress({ fraction: completedSize / totalSize, fileIndex: i, fileCount: MODEL_FILES.length });
  }
}
