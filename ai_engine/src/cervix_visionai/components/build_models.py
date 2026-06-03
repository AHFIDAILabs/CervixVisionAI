import torch
import timm
from pathlib import Path
from cervix_visionai.entity.config_entity import BuildModelsConfig
from cervix_visionai.utils.logger import logger


class BuildModels:
    """
    Initialises and saves both ensemble member architectures:
    primary (Swin Transformer) and secondary (EfficientNet-B3).
    """

    def __init__(self, config: BuildModelsConfig):
        self.config = config
        self.primary_model = None
        self.secondary_model = None

    def _build_single(self, model_name: str, save_path: Path) -> torch.nn.Module:
        if save_path.exists():
            logger.info(f"Model already exists at {save_path}, loading existing weights.")
            model = timm.create_model(
                model_name,
                pretrained=False,
                num_classes=self.config.params_num_classes,
            )
            model.load_state_dict(torch.load(save_path, map_location="cpu"))
            return model

        logger.info(f"Building '{model_name}' from timm (pretrained={self.config.params_pretrained})...")
        model = timm.create_model(
            model_name,
            pretrained=self.config.params_pretrained,
            num_classes=self.config.params_num_classes,
        )
        torch.save(model.state_dict(), save_path)
        logger.info(f"Saved initial weights → {save_path}")
        return model

    def build_all(self):
        self.primary_model = self._build_single(
            self.config.primary_model_name,
            self.config.primary_model_path,
        )
        self.secondary_model = self._build_single(
            self.config.secondary_model_name,
            self.config.secondary_model_path,
        )
        logger.info("Both ensemble members built successfully.")
        return self.primary_model, self.secondary_model
