const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

/**
 * Sends an image buffer to the ai_engine ensemble inference API.
 * Uses Node 18+ native fetch — no extra dependency required.
 *
 * @param {Buffer}  fileBuffer - raw image bytes
 * @param {string}  mimetype   - e.g. "image/jpeg"
 * @param {string}  filename   - original filename for multipart boundary
 * @returns {Promise<object>}  structured ML result from ai_engine
 */
const analyzeImage = async (fileBuffer, mimetype, filename) => {
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimetype });
  formData.append("file", blob, filename || "scan.jpg");

  const response = await fetch(`${ML_SERVICE_URL}/api/v1/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(`ML service ${response.status}: ${err.detail || "Unknown error"}`);
  }

  return response.json();
};

module.exports = { analyzeImage };
