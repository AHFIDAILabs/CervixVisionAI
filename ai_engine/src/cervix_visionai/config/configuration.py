from pathlib import Path
from cervix_visionai.constants import (
    CONFIG_FILE_PATH,
    PARAMS_FILE_PATH,
    ENSEMBLE_CONFIG_FILE_PATH,
)
from cervix_visionai.utils.common import read_yaml, create_directories
from cervix_visionai.entity.config_entity import (
    DataIngestionConfig,
    BuildModelsConfig,
    TrainingConfig,
    EnsembleConfig,
    EvaluationConfig,
)
from cervix_visionai.utils.logger import logger


class ConfigurationManager:
    def __init__(
        self,
        config_filepath=CONFIG_FILE_PATH,
        params_filepath=PARAMS_FILE_PATH,
        ensemble_config_filepath=ENSEMBLE_CONFIG_FILE_PATH,
    ):
        self.config = read_yaml(config_filepath)
        self.params = read_yaml(params_filepath)
        self.ensemble_cfg = read_yaml(ensemble_config_filepath)
        create_directories([self.config.artifacts_root])

    def get_params_config(self):
        return self.params

    def get_data_ingestion_config(self) -> DataIngestionConfig:
        config = self.config.data_ingestion
        create_directories([config.root_dir])
        return DataIngestionConfig(
            root_dir=Path(config.root_dir),
            hf_repo_id=config.hf_repo_id,
            hf_filename=config.hf_filename,
            local_archive_file=Path(config.local_archive_file),
            unzip_dir=Path(config.unzip_dir),
            final_data_dir=Path(config.final_data_dir),
        )

    def get_build_models_config(self) -> BuildModelsConfig:
        config = self.config.build_models
        create_directories([config.root_dir])
        return BuildModelsConfig(
            root_dir=Path(config.root_dir),
            primary_model_path=Path(config.primary_model_path),
            primary_model_name=self.params.PRIMARY_MODEL_NAME,
            secondary_model_path=Path(config.secondary_model_path),
            secondary_model_name=self.params.SECONDARY_MODEL_NAME,
            params_image_size=self.params.IMAGE_SIZE,
            params_learning_rate=self.params.LEARNING_RATE,
            params_pretrained=self.params.PRETRAINED,
            params_num_classes=self.params.NUM_CLASSES,
        )

    def get_model_trainer_config(self) -> TrainingConfig:
        config = self.config.training
        build_config = self.config.build_models
        create_directories([config.root_dir])
        return TrainingConfig(
            root_dir=Path(config.root_dir),
            primary_trained_model_path=Path(config.primary_trained_model_path),
            secondary_trained_model_path=Path(config.secondary_trained_model_path),
            primary_base_model_path=Path(build_config.primary_model_path),
            secondary_base_model_path=Path(build_config.secondary_model_path),
            training_data=Path(self.config.data_ingestion.final_data_dir),
            params_epochs=self.params.EPOCHS,
            params_batch_size=self.params.BATCH_SIZE,
            params_image_size=self.params.IMAGE_SIZE,
            params_learning_rate=self.params.LEARNING_RATE,
            params_primary_model_name=self.params.PRIMARY_MODEL_NAME,
            params_secondary_model_name=self.params.SECONDARY_MODEL_NAME,
            params_classes=self.params.NUM_CLASSES,
        )

    def get_ensemble_config(self) -> EnsembleConfig:
        ec = self.ensemble_cfg.ensemble
        create_directories([self.config.onnx.root_dir])
        return EnsembleConfig(
            primary_model_name=ec.primary_model.name,
            primary_model_path=Path(ec.primary_model.model_path),
            primary_onnx_path=Path(ec.primary_model.onnx_path),
            primary_weight=float(ec.primary_model.weight),
            secondary_model_name=ec.secondary_model.name,
            secondary_model_path=Path(ec.secondary_model.model_path),
            secondary_onnx_path=Path(ec.secondary_model.onnx_path),
            secondary_weight=float(ec.secondary_model.weight),
            fusion_method=ec.fusion_method,
            onnx_export=bool(ec.onnx_export),
        )

    def get_evaluation_config(self) -> EvaluationConfig:
        config = self.config.evaluation
        training_config = self.config.training
        root_dir = Path(config.root_dir)
        create_directories([root_dir])
        return EvaluationConfig(
            root_dir=root_dir,
            primary_model_path=Path(training_config.primary_trained_model_path),
            secondary_model_path=Path(training_config.secondary_trained_model_path),
            training_data=Path(config.training_data),
            all_params=self.params,
            params_image_size=self.params.IMAGE_SIZE,
            params_batch_size=self.params.BATCH_SIZE,
            ensemble_weights=list(self.params.ENSEMBLE_WEIGHTS),
        )
