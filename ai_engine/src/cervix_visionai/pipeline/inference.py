import base64
import numpy as np
import torch
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import timm
from PIL import Image
from torchvision import transforms
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

from cervix_visionai.utils.logger import logger
from cervix_visionai.config.configuration import ConfigurationManager


class PredictionPipeline:
    """
    Ensemble inference pipeline: Swin Transformer + EfficientNet-B3,
    weighted-average fusion, Grad-CAM on the primary model.
    """

    def __init__(self, filename: Path):
        self.filename = filename
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        config_manager = ConfigurationManager()
        self.params = config_manager.get_params_config()
        self.ensemble_config = config_manager.get_ensemble_config()

        self.primary_model = self._load_model(
            self.ensemble_config.primary_model_name,
            self.ensemble_config.primary_model_path,
        )
        self.secondary_model = self._load_model(
            self.ensemble_config.secondary_model_name,
            self.ensemble_config.secondary_model_path,
        )
        self.transform = self._get_transform()

    def _load_model(self, model_name: str, model_path: Path) -> torch.nn.Module:
        try:
            logger.info(f"Loading {model_name} from {model_path}")
            checkpoint = torch.load(model_path, map_location=self.device)
            if "classifier.weight" in checkpoint:
                num_classes = checkpoint["classifier.weight"].shape[0]
            elif "fc.weight" in checkpoint:
                num_classes = checkpoint["fc.weight"].shape[0]
            elif "head.fc.weight" in checkpoint:
                num_classes = checkpoint["head.fc.weight"].shape[0]
            else:
                num_classes = self.params.NUM_CLASSES
            model = timm.create_model(model_name, pretrained=False, num_classes=num_classes)
            model.load_state_dict(checkpoint)
            model.to(self.device)
            model.eval()
            return model
        except Exception as e:
            logger.error(f"Failed to load {model_name}: {e}")
            raise

    def _get_transform(self) -> transforms.Compose:
        return transforms.Compose([
            transforms.Resize(self.params.IMAGE_SIZE[:-1]),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def _preprocess_image(self) -> Tuple[torch.Tensor, np.ndarray]:
        img = Image.open(self.filename).convert("RGB")
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        input_tensor = transform(img).unsqueeze(0).to(self.device)
        original_image_rgb = np.array(img.resize((224, 224))) / 255.0
        return input_tensor, original_image_rgb

    def _ensemble_predict(self, input_tensor: torch.Tensor) -> Tuple[str, float, float]:
        with torch.no_grad():
            p_probs = torch.softmax(self.primary_model(input_tensor), dim=1)
            s_probs = torch.softmax(self.secondary_model(input_tensor), dim=1)

        w1 = self.ensemble_config.primary_weight
        w2 = self.ensemble_config.secondary_weight
        fused_probs = w1 * p_probs + w2 * s_probs

        prob = fused_probs[0, 1].item()
        prediction = "Positive" if prob > self.params.INFERENCE_THRESHOLD else "Negative"
        confidence = prob if prediction == "Positive" else 1.0 - prob
        confidence = max(min(confidence, 0.95), 0.01)
        return prediction, confidence, prob

    def _calculate_uncertainty(self, prob: float) -> Tuple[float, str]:
        uncertainty_score = 1 - (2 * abs(prob - 0.5))
        uncertainty_class = "High" if uncertainty_score > 0.4 else "Low"
        return uncertainty_score, uncertainty_class

    def _get_target_layer(self, model: torch.nn.Module, model_name: str) -> List[torch.nn.Module]:
        name = model_name.lower()
        if "swin" in name:
            try:
                return [model.layers[-1].blocks[-1].norm1]
            except Exception:
                pass
        if "efficientnet" in name:
            return [model.blocks[-1][-1]]
        if "convnext" in name:
            return [model.stages[-1].blocks[-1]]
        if "resnet" in name:
            return [model.layer4[-1]]
        for _, module in reversed(list(model.named_modules())):
            if isinstance(module, torch.nn.Conv2d):
                return [module]
        return [model]

    def _generate_grad_cam(self, input_tensor: torch.Tensor, original_image: np.ndarray) -> Optional[str]:
        try:
            target_layers = self._get_target_layer(
                self.primary_model, self.ensemble_config.primary_model_name
            )
            cam = GradCAM(model=self.primary_model, target_layers=target_layers)
            targets = [ClassifierOutputTarget(1)]
            grayscale_cam = cam(input_tensor=input_tensor, targets=targets)[0, :]
            visualization = show_cam_on_image(original_image, grayscale_cam, use_rgb=True)
            is_success, buffer = cv2.imencode(".jpg", visualization)
            if not is_success:
                raise RuntimeError("cv2.imencode failed")
            return base64.b64encode(buffer).decode("utf-8")
        except Exception as e:
            logger.error(f"Grad-CAM generation failed: {e}", exc_info=True)
            return None

    def _generate_clinical_report(self, prediction: str, confidence: float, uncertainty: str) -> str:
        if confidence >= 0.90:
            confidence_text = "high confidence"
        elif confidence >= 0.75:
            confidence_text = "moderate confidence"
        else:
            confidence_text = "low confidence"

        uncertainty_text = (
            "However, the ensemble shows some uncertainty; findings should be interpreted cautiously."
            if uncertainty.lower() == "high"
            else "The ensemble demonstrates consistent certainty in this prediction."
        )

        recommendations = {
            "Positive": (
                "Immediate review by a qualified specialist is strongly recommended. "
                "The finding suggests the potential presence of acetowhite changes warranting "
                "colposcopy and biopsy to confirm the diagnosis. If a precancerous lesion is "
                "identified, cryotherapy or thermal ablation may be performed, often during the "
                "same visit. For suspected invasive cancer, immediate referral to a specialised "
                "facility is essential."
            ),
            "Negative": (
                "Routine follow-up is advised. While the AI ensemble did not detect significant "
                "acetowhite features, this result should not replace a comprehensive clinical "
                "evaluation. Continued surveillance and adherence to local screening protocols "
                "are encouraged."
            ),
        }
        recommendation = recommendations.get(prediction, "No recommendation available.")

        return f"""
CERVIXVISIONAI — ENSEMBLE CLINICAL ANALYSIS REPORT
---------------------------------------------------
Patient ID:      [Not Provided]
Image:           {self.filename.name}
Date Analysed:   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Models:          {self.ensemble_config.primary_model_name} ({self.ensemble_config.primary_weight:.0%}) +
                 {self.ensemble_config.secondary_model_name} ({self.ensemble_config.secondary_weight:.0%})
---------------------------------------------------

FINDING:
========
Ensemble prediction: {prediction.upper()} with {confidence_text}.
{uncertainty_text}

CONFIDENCE & UNCERTAINTY:
=========================
- Confidence:        {confidence:.2%}
- Uncertainty Level: {uncertainty.upper()}

RECOMMENDATION:
===============
{recommendation}

DISCLAIMER:
===========
This is an AI-generated screening report only. It is not a diagnosis.
All findings must be correlated with clinical history and confirmed by
a qualified medical professional.
""".strip()

    def predict_with_explanation(self) -> Dict:
        try:
            input_tensor, original_image_rgb = self._preprocess_image()
            prediction, confidence, prob = self._ensemble_predict(input_tensor)
            uncertainty_score, uncertainty_class = self._calculate_uncertainty(prob)
            grad_cam_b64 = self._generate_grad_cam(input_tensor, original_image_rgb)
            report = self._generate_clinical_report(prediction, confidence, uncertainty_class)
            return {
                "prediction": prediction,
                "confidence": confidence,
                "uncertainty_score": uncertainty_score,
                "uncertainty_classification": uncertainty_class,
                "risk_score": float(prob),
                "lesion_class": "acetowhite_positive" if prediction == "Positive" else "acetowhite_negative",
                "grad_cam_image_b64": grad_cam_b64,
                "clinical_report": report,
            }
        except Exception as e:
            logger.error(f"Prediction pipeline failed: {e}", exc_info=True)
            return {"error": str(e)}
