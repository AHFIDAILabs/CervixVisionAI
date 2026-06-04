"""
CervixVisionAI — Training Orchestrator
Runs all 5 pipeline stages in sequence.

Usage:
    python train.py                          # GPU default (Swin Base)
    python train.py --config config/params_cpu.yaml  # CPU laptop (Swin Tiny)
"""
import sys
import logging
import argparse
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent / "src"))

from cervix_visionai.constants import PARAMS_FILE_PATH
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


def parse_args():
    parser = argparse.ArgumentParser(description="Train the CervixVisionAI ensemble model.")
    parser.add_argument(
        "--config",
        type=Path,
        default=PARAMS_FILE_PATH,
        help="Path to params YAML (default: config/params.yaml). "
             "Use config/params_cpu.yaml for laptop/CPU training.",
    )
    return parser.parse_args()


def run_stage(name: str, pipeline_class, **kwargs):
    try:
        logger.info(f">>>>>> stage {name} started <<<<<<")
        pipeline_class(**kwargs).main()
        logger.info(f">>>>>> stage {name} completed <<<<<<\n\nx==========x")
    except Exception as e:
        logger.exception(e)
        raise e


if __name__ == "__main__":
    args = parse_args()

    if args.config != PARAMS_FILE_PATH:
        logger.info(f"Using custom params config: {args.config}")
        # Override the module-level constant so ConfigurationManager picks it up
        import cervix_visionai.constants as _consts
        _consts.PARAMS_FILE_PATH = args.config

    run_stage("Data Ingestion",       DataIngestionTrainingPipeline)
    run_stage("Build Ensemble Models", BuildModelsTrainingPipeline)
    run_stage("Train Ensemble",        EnsembleTrainingPipeline)
    run_stage("Evaluation",            EvaluationPipeline)
    run_stage("ONNX Export",           OnnxExportPipeline)
