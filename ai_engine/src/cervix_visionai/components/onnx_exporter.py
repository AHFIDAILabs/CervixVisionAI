import torch
import timm
from pathlib import Path
from cervix_visionai.entity.config_entity import EnsembleConfig
from cervix_visionai.utils.logger import logger


def export_model_to_onnx(
    model_name: str,
    model_path: Path,
    onnx_path: Path,
    num_classes: int = 2,
    image_size: tuple = (224, 224),
    device: str = "cpu",
) -> None:
    """
    Loads a trained timm model and exports it to ONNX format for
    Edge AI / Android deployment via ONNX Runtime.

    Args:
        model_name:  timm model identifier (e.g. 'swin_base_patch4_window7_224')
        model_path:  path to the trained .pth state dict
        onnx_path:   destination .onnx file path
        num_classes: number of output classes
        image_size:  (height, width) used during training
        device:      'cpu' or 'cuda'
    """
    if not model_path.exists():
        raise FileNotFoundError(f"Trained model not found: {model_path}")

    onnx_path.parent.mkdir(parents=True, exist_ok=True)

    logger.info(f"Loading {model_name} weights from {model_path}")
    model = timm.create_model(model_name, pretrained=False, num_classes=num_classes)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval()

    dummy_input = torch.randn(1, 3, *image_size, device=device)

    logger.info(f"Exporting {model_name} → {onnx_path}")
    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={
            "image": {0: "batch_size"},
            "logits": {0: "batch_size"},
        },
    )
    logger.info(f"ONNX export complete: {onnx_path}")


def export_ensemble_to_onnx(config: EnsembleConfig, num_classes: int = 2, image_size: tuple = (224, 224)) -> None:
    """Exports both ensemble members to ONNX."""
    export_model_to_onnx(
        config.primary_model_name,
        config.primary_model_path,
        config.primary_onnx_path,
        num_classes,
        image_size,
    )
    export_model_to_onnx(
        config.secondary_model_name,
        config.secondary_model_path,
        config.secondary_onnx_path,
        num_classes,
        image_size,
    )
    logger.info("Both ensemble members exported to ONNX successfully.")
