import sys
import logging
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent / "src"))

from cervix_visionai.pipeline.stage_01_data_ingestion import DataIngestionTrainingPipeline
from cervix_visionai.pipeline.stage_02_build_models import BuildModelsTrainingPipeline
from cervix_visionai.pipeline.stage_03_train_ensemble import EnsembleTrainingPipeline
from cervix_visionai.pipeline.stage_04_model_evaluation import EvaluationPipeline
from cervix_visionai.pipeline.stage_05_onnx_export import OnnxExportPipeline
from cervix_visionai.utils.logger import logger

logging.basicConfig(
    filename="logfile.log",
    filemode="w",
    encoding="utf-8",
    level=logging.INFO,
    format="%(asctime)s: %(levelname)s: %(message)s",
)

STAGE_NAME = "Data Ingestion"
try:
    logger.info(f">>>>>> stage {STAGE_NAME} started <<<<<<")
    DataIngestionTrainingPipeline().main()
    logger.info(f">>>>>> stage {STAGE_NAME} completed <<<<<<\n\nx==========x")
except Exception as e:
    logger.exception(e)
    raise e

STAGE_NAME = "Build Ensemble Models"
try:
    logger.info(f">>>>>> stage {STAGE_NAME} started <<<<<<")
    BuildModelsTrainingPipeline().main()
    logger.info(f">>>>>> stage {STAGE_NAME} completed <<<<<<\n\nx==========x")
except Exception as e:
    logger.exception(e)
    raise e

STAGE_NAME = "Train Ensemble"
try:
    logger.info(f">>>>>> stage {STAGE_NAME} started <<<<<<")
    EnsembleTrainingPipeline().main()
    logger.info(f">>>>>> stage {STAGE_NAME} completed <<<<<<\n\nx==========x")
except Exception as e:
    logger.exception(e)
    raise e

STAGE_NAME = "Evaluation"
try:
    logger.info(f">>>>>> stage {STAGE_NAME} started <<<<<<")
    EvaluationPipeline().main()
    logger.info(f">>>>>> stage {STAGE_NAME} completed <<<<<<\n\nx==========x")
except Exception as e:
    logger.exception(e)
    raise e

STAGE_NAME = "ONNX Export"
try:
    logger.info(f">>>>>> stage {STAGE_NAME} started <<<<<<")
    OnnxExportPipeline().main()
    logger.info(f">>>>>> stage {STAGE_NAME} completed <<<<<<\n\nx==========x")
except Exception as e:
    logger.exception(e)
    raise e
