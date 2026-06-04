/**
 * Offline-first inference hook for low-connectivity environments.
 *
 * Primary path  (online):  upload scan to backend → server ensemble inference
 * Fallback path (offline): run on-device ONNX inference directly on the phone
 *
 * The app never blocks on connectivity — if the server is unreachable,
 * inference runs on the device and the result is stored locally.
 * When connectivity returns, local results can be synced to the server.
 */

import { useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { uploadScan } from "../Services/userService";
import { runOnDeviceInference, OnDeviceResult } from "../utils/onDeviceInference";
import { AnalysisResult } from "../types/common";

export type InferenceMode = "online" | "on_device";

interface UseOfflineInferenceResult {
  running:   boolean;
  mode:      InferenceMode | null;
  error:     string | null;
  analyse:   (imageUri: string, imageMime: string, scanType: string) => Promise<void>;
  result:    AnalysisResult | OnDeviceResult | null;
}

export function useOfflineInference(): UseOfflineInferenceResult {
  const [running, setRunning] = useState(false);
  const [mode,    setMode]    = useState<InferenceMode | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<AnalysisResult | OnDeviceResult | null>(null);

  const analyse = async (imageUri: string, imageMime: string, scanType: string) => {
    setRunning(true);
    setError(null);
    setResult(null);

    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable;

    if (isOnline) {
      // ── Online path — upload to backend ────────────────────────────────────
      try {
        setMode("online");
        const formData = new FormData();
        formData.append("scan", {
          uri:  imageUri,
          name: `scan_${Date.now()}.jpg`,
          type: imageMime,
        } as any);
        formData.append("type", scanType);

        const res = await uploadScan(formData);
        setResult(res.analysis);
      } catch (uploadErr) {
        // Server unavailable despite apparent connectivity — fall back to device
        console.warn("[inference] Server upload failed, falling back to on-device:", uploadErr);
        await runOffline(imageUri);
      }
    } else {
      // ── Offline path — on-device ONNX Runtime ──────────────────────────────
      await runOffline(imageUri);
    }

    setRunning(false);
  };

  const runOffline = async (imageUri: string) => {
    try {
      setMode("on_device");
      const offlineResult = await runOnDeviceInference(imageUri);
      setResult(offlineResult);
    } catch (offlineErr: any) {
      setError(offlineErr.message || "On-device inference failed.");
    }
  };

  return { running, mode, error, result, analyse };
}
