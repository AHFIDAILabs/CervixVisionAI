"""
CervixVisionAI — FastAPI Ensemble Inference Service
Production API for mobile app integration via the Node.js backend gateway.
"""
import asyncio
import os
import uuid
import shutil
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from cervix_visionai.pipeline.inference import PredictionPipeline
from cervix_visionai.utils.logger import logger

app = FastAPI(
    title="CervixVisionAI — Ensemble ML Service",
    description="Swin Transformer + EfficientNet-B3 ensemble API for cervical cancer screening",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

_ALLOWED_ORIGIN = os.getenv("BACKEND_ALLOWED_ORIGIN", "http://localhost:5000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_ALLOWED_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=4)
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


class PredictionResponse(BaseModel):
    analysis_id: str = Field(..., description="Unique analysis identifier")
    prediction: str = Field(..., description="Positive or Negative")
    confidence: float = Field(..., ge=0, le=1)
    confidence_percentage: str
    uncertainty_score: float = Field(..., ge=0, le=1)
    uncertainty_level: str
    risk_score: float = Field(..., ge=0, le=1, description="Raw fused probability of positive class")
    lesion_class: str = Field(..., description="acetowhite_positive | acetowhite_negative")
    risk_level: str
    timestamp: str
    clinical_report: str
    recommendation: str
    xai_output: Optional[str] = Field(None, description="Base64 Grad-CAM overlay")


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    service: str
    version: str
    models_loaded: bool


def run_ml_inference(image_path: Path) -> dict:
    try:
        pipeline = PredictionPipeline(filename=image_path)
        return pipeline.predict_with_explanation()
    except Exception as e:
        logger.error(f"ML inference error: {e}", exc_info=True)
        return {"error": str(e)}


@app.get("/", tags=["Root"])
async def root():
    return {"service": "CervixVisionAI ML Service", "version": "2.0.0", "status": "running", "docs": "/api/docs"}


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    try:
        from cervix_visionai.config.configuration import ConfigurationManager
        cfg = ConfigurationManager()
        ensemble_cfg = cfg.get_ensemble_config()
        models_loaded = (
            ensemble_cfg.primary_model_path.exists()
            and ensemble_cfg.secondary_model_path.exists()
        )
        return HealthResponse(
            status="healthy",
            timestamp=datetime.now().isoformat(),
            service="CervixVisionAI Ensemble ML Service",
            version="2.0.0",
            models_loaded=models_loaded,
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@app.post("/api/v1/analyze", response_model=PredictionResponse, tags=["Analysis"])
async def analyze_image(file: UploadFile = File(...)):
    analysis_id = str(uuid.uuid4())

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image (JPEG or PNG)",
        )

    file_extension = Path(file.filename or "upload").suffix
    temp_filepath = UPLOAD_DIR / f"{analysis_id}{file_extension}"

    try:
        with temp_filepath.open("wb") as buf:
            shutil.copyfileobj(file.file, buf)
        logger.info(f"Analysis {analysis_id}: saved, starting ensemble inference")

        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(executor, run_ml_inference, temp_filepath)

        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Inference failed: {result['error']}",
            )

        prediction = result.get("prediction", "Unknown")
        confidence = result.get("confidence", 0.0)
        uncertainty_score = result.get("uncertainty_score", 0.0)
        uncertainty_level = result.get("uncertainty_classification", "Unknown")
        risk_score = result.get("risk_score", confidence if prediction == "Positive" else 1.0 - confidence)
        lesion_class = result.get("lesion_class", "unknown")
        risk_level = _determine_risk_level(prediction, confidence, uncertainty_level)
        recommendation = _generate_recommendation(prediction, confidence, uncertainty_level)

        logger.info(f"Analysis {analysis_id}: {prediction} (confidence={confidence:.2%})")
        return PredictionResponse(
            analysis_id=analysis_id,
            prediction=prediction,
            confidence=confidence,
            confidence_percentage=f"{confidence * 100:.2f}%",
            uncertainty_score=uncertainty_score,
            uncertainty_level=uncertainty_level,
            risk_score=risk_score,
            lesion_class=lesion_class,
            risk_level=risk_level,
            timestamp=datetime.now().isoformat(),
            clinical_report=result.get("clinical_report", ""),
            recommendation=recommendation,
            xai_output=result.get("grad_cam_image_b64"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis {analysis_id} failed: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        try:
            if temp_filepath.exists():
                temp_filepath.unlink()
        except Exception as e:
            logger.warning(f"Cleanup failed for {temp_filepath}: {e}")


@app.post("/api/v1/batch-analyze", tags=["Analysis"])
async def batch_analyze_images(files: list[UploadFile] = File(...)):
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 images per batch",
        )
    results = await asyncio.gather(
        *[analyze_image(f) for f in files],
        return_exceptions=True,
    )
    output = []
    for f, r in zip(files, results):
        if isinstance(r, Exception):
            output.append({"filename": f.filename, "status": "failed", "error": str(r)})
        else:
            output.append(r.dict())
    return {"batch_results": output, "total": len(files)}


def _determine_risk_level(prediction: str, confidence: float, uncertainty: str) -> str:
    if prediction == "Positive":
        if confidence >= 0.8 and uncertainty == "Low":
            return "High Risk"
        elif confidence >= 0.6:
            return "Moderate Risk"
        return "Uncertain Risk"
    if confidence >= 0.8 and uncertainty == "Low":
        return "Low Risk"
    return "Moderate Risk"


def _generate_recommendation(prediction: str, confidence: float, uncertainty: str) -> str:
    if prediction == "Positive":
        if confidence >= 0.8:
            return "Immediate review by a qualified colposcopist is strongly recommended. Schedule colposcopy and biopsy for definitive diagnosis."
        return "Consult a healthcare professional. Further evaluation recommended."
    if uncertainty == "High" or confidence < 0.7:
        return "Continue routine screening. Consider repeat testing or expert review if symptoms present."
    return "Continue routine screening as per standard clinical guidelines. No immediate action required."


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "detail": str(exc), "timestamp": datetime.now().isoformat()},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.api:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
