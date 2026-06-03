from dataclasses import dataclass
from pathlib import Path


@dataclass
class DataIngestionConfig:
    root_dir: Path
    hf_repo_id: str
    hf_filename: str
    local_archive_file: Path
    unzip_dir: Path
    final_data_dir: Path


@dataclass(frozen=True)
class BuildModelsConfig:
    root_dir: Path
    # Primary: Swin Transformer
    primary_model_path: Path
    primary_model_name: str
    # Secondary: EfficientNet-B3
    secondary_model_path: Path
    secondary_model_name: str
    # Shared
    params_image_size: list
    params_learning_rate: float
    params_pretrained: bool
    params_num_classes: int


@dataclass(frozen=True)
class TrainingConfig:
    root_dir: Path
    # Output model paths
    primary_trained_model_path: Path
    secondary_trained_model_path: Path
    # Input base model paths
    primary_base_model_path: Path
    secondary_base_model_path: Path
    training_data: Path
    params_epochs: int
    params_batch_size: int
    params_image_size: list
    params_learning_rate: float
    params_primary_model_name: str
    params_secondary_model_name: str
    params_classes: int


@dataclass(frozen=True)
class EnsembleConfig:
    primary_model_name: str
    primary_model_path: Path
    primary_onnx_path: Path
    primary_weight: float
    secondary_model_name: str
    secondary_model_path: Path
    secondary_onnx_path: Path
    secondary_weight: float
    fusion_method: str
    onnx_export: bool


@dataclass(frozen=True)
class EvaluationConfig:
    root_dir: Path
    primary_model_path: Path
    secondary_model_path: Path
    training_data: Path
    all_params: dict
    params_image_size: list
    params_batch_size: int
    ensemble_weights: list
