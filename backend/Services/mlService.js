const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ML_TIMEOUT_MS  = parseInt(process.env.ML_TIMEOUT_MS || "120000", 10); // 2 min default

/**
 * Sends an image buffer to the ai_engine ensemble inference API.
 * Uses Node 18+ native fetch with a configurable timeout.
 */
const analyzeImage = async (fileBuffer, mimetype, filename) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

  try {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimetype });
    formData.append("file", blob, filename || "scan.jpg");

    const response = await fetch(`${ML_SERVICE_URL}/api/v1/analyze`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`ML service ${response.status}: ${err.detail || "Unknown error"}`);
    }

    return response.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`ML service timed out after ${ML_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { analyzeImage };
