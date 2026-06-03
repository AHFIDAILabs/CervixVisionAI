import torch
import torch.nn as nn
import timm
from cervix_visionai.entity.config_entity import EnsembleConfig
from cervix_visionai.utils.logger import logger


class EnsembleModel(nn.Module):
    """
    Weighted-average ensemble of two timm models.
    Each member is loaded independently; inference fuses their
    softmax probabilities via configurable weights.
    """

    def __init__(self, config: EnsembleConfig, device: str = "cpu"):
        super().__init__()
        self.config = config
        self.device = device
        self.primary = self._load(config.primary_model_name, config.primary_model_path, config.num_classes if hasattr(config, "num_classes") else 2)
        self.secondary = self._load(config.secondary_model_name, config.secondary_model_path, 2)
        self.primary_weight = config.primary_weight
        self.secondary_weight = config.secondary_weight

    def _load(self, model_name: str, model_path, num_classes: int) -> nn.Module:
        logger.info(f"Loading ensemble member: {model_name} from {model_path}")
        model = timm.create_model(model_name, pretrained=False, num_classes=num_classes)
        model.load_state_dict(torch.load(model_path, map_location=self.device))
        model.to(self.device)
        model.eval()
        return model

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        with torch.no_grad():
            p_probs = torch.softmax(self.primary(x), dim=1)
            s_probs = torch.softmax(self.secondary(x), dim=1)
        return self.primary_weight * p_probs + self.secondary_weight * s_probs

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        """Returns fused probability tensor [batch, num_classes]."""
        return self.forward(x)
