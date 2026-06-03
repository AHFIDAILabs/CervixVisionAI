import numpy as np
import timm
import torch
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from sklearn.metrics import confusion_matrix, classification_report, roc_curve, auc
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from tqdm import tqdm

from cervix_visionai.entity.config_entity import EvaluationConfig
from cervix_visionai.utils.common import save_json, create_directories
from cervix_visionai.utils.logger import logger


class Evaluation:
    """
    Evaluates the ensemble (Swin + EfficientNet-B3) via weighted-average
    fusion, producing standard medical AI metrics with confidence intervals.
    """

    def __init__(self, config: EvaluationConfig):
        self.config = config
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.eval_dir = Path(config.root_dir)
        create_directories([self.eval_dir])
        self.primary_model = self._load_model(
            config.all_params.PRIMARY_MODEL_NAME, config.primary_model_path
        )
        self.secondary_model = self._load_model(
            config.all_params.SECONDARY_MODEL_NAME, config.secondary_model_path
        )
        self.weights = config.ensemble_weights

    def _load_model(self, model_name: str, model_path: Path) -> torch.nn.Module:
        if not Path(model_path).exists():
            raise FileNotFoundError(f"Model not found: {model_path}")
        model = timm.create_model(
            model_name, pretrained=False, num_classes=self.config.all_params.NUM_CLASSES
        )
        model.load_state_dict(torch.load(model_path, map_location=self.device))
        model.to(self.device)
        model.eval()
        return model

    def _get_test_loader(self):
        transform = transforms.Compose([
            transforms.Resize(self.config.params_image_size[:-1]),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        base_dir = Path(self.config.training_data)
        test_path = next(
            (p for p in [base_dir / "labeled", base_dir / "Labeled"] if p.exists()),
            base_dir,
        )
        logger.info(f"Loading evaluation data from: {test_path}")
        dataset = datasets.ImageFolder(root=test_path, transform=transform)
        self.class_names = dataset.classes
        self.test_loader = DataLoader(dataset, batch_size=self.config.params_batch_size, shuffle=False)

    def evaluate(self):
        self._get_test_loader()
        self.y_true, self.y_pred_probs = [], []
        w1, w2 = self.weights[0], self.weights[1]

        with torch.no_grad():
            for inputs, labels in tqdm(self.test_loader, desc="Evaluating ensemble"):
                inputs = inputs.to(self.device)
                p_probs = torch.softmax(self.primary_model(inputs), dim=1).cpu()
                s_probs = torch.softmax(self.secondary_model(inputs), dim=1).cpu()
                fused = (w1 * p_probs + w2 * s_probs).numpy()
                self.y_true.extend(labels.numpy())
                self.y_pred_probs.extend(fused)

        self.y_true = np.array(self.y_true)
        self.y_pred_probs = np.array(self.y_pred_probs)
        self.y_pred = np.argmax(self.y_pred_probs, axis=1)

    def _calculate_metrics_with_ci(self):
        cm = confusion_matrix(self.y_true, self.y_pred, labels=[0, 1])
        tn, fp, fn, tp = (cm.ravel() if cm.shape == (2, 2) else (
            cm[0, 0] if cm.shape[0] > 0 else 0,
            cm[0, 1] if cm.shape[1] > 1 else 0,
            cm[1, 0] if cm.shape[0] > 1 else 0,
            cm[1, 1] if cm.shape[1] > 1 else 0,
        ))
        sensitivity = tp / (tp + fn + 1e-6)
        specificity = tn / (tn + fp + 1e-6)
        npv = tn / (tn + fn + 1e-6)
        accuracy = (tp + tn) / (tp + tn + fp + fn + 1e-6)

        def wilson_ci(p, n):
            if n == 0:
                return (0.0, 1.0)
            z = 1.96
            denom = 1 + z**2 / n
            center = (p + z**2 / (2 * n)) / denom
            margin = z * np.sqrt((p * (1 - p) + z**2 / (4 * n)) / n) / denom
            return max(0.0, center - margin), min(1.0, center + margin)

        self.metrics = {
            "accuracy": float(accuracy),
            "sensitivity": float(sensitivity),
            "sensitivity_ci": wilson_ci(sensitivity, tp + fn),
            "specificity": float(specificity),
            "specificity_ci": wilson_ci(specificity, tn + fp),
            "negative_predictive_value": float(npv),
            "npv_ci": wilson_ci(npv, tn + fn),
            "ensemble_weights": self.weights,
        }

    def _plot_roc_curve(self, path: Path):
        try:
            if self.y_pred_probs.shape[1] < 2:
                logger.warning("ROC curve skipped: single class predicted.")
                return
            fpr, tpr, _ = roc_curve(self.y_true, self.y_pred_probs[:, 1])
            roc_auc = auc(fpr, tpr)
            self.metrics["roc_auc"] = float(roc_auc)
            plt.figure(figsize=(8, 6))
            plt.plot(fpr, tpr, color="darkorange", lw=2, label=f"Ensemble ROC (AUC={roc_auc:.2f})")
            plt.plot([0, 1], [0, 1], color="navy", lw=2, linestyle="--")
            plt.title("Ensemble ROC Curve")
            plt.legend(loc="lower right")
            plt.savefig(path)
            plt.close()
            logger.info(f"ROC curve saved: {path}")
        except Exception as e:
            logger.warning(f"ROC curve generation failed: {e}")

    def save_evaluation_results(self):
        self._calculate_metrics_with_ci()
        save_json(path=self.eval_dir / "evaluation_metrics.json", data=self.metrics)
        self._plot_roc_curve(self.eval_dir / "roc_curve.png")

        report = classification_report(
            self.y_true, self.y_pred, target_names=self.class_names, output_dict=True
        )
        save_json(path=self.eval_dir / "classification_report.json", data=report)

        cm = confusion_matrix(self.y_true, self.y_pred)
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                    xticklabels=self.class_names, yticklabels=self.class_names)
        plt.title("Ensemble Confusion Matrix")
        plt.savefig(self.eval_dir / "confusion_matrix.png")
        plt.close()
        logger.info(f"Evaluation artifacts saved to {self.eval_dir}")

    def run_evaluation(self):
        try:
            self.evaluate()
            self.save_evaluation_results()
            logger.info("Ensemble evaluation completed successfully.")
        except Exception as e:
            logger.error(f"Evaluation failed: {e}", exc_info=True)
            raise
