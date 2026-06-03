from pathlib import Path
from cervix_visionai.config.configuration import ConfigurationManager
from cervix_visionai.components.train_ensemble import EnsembleTrainer
from cervix_visionai.utils.logger import logger

STAGE_NAME = "Train Ensemble"


class EnsembleTrainingPipeline:
    def __init__(self):
        pass

    def main(self):
        try:
            config = ConfigurationManager()
            training_config = config.get_model_trainer_config()
            both_trained = (
                training_config.primary_trained_model_path.exists()
                and training_config.secondary_trained_model_path.exists()
            )
            if both_trained:
                logger.info("Both trained models already exist, skipping training stage.")
            else:
                logger.info("Starting ensemble training...")
                trainer = EnsembleTrainer(config=training_config)
                trainer.train()
                logger.info("Ensemble training completed.")
        except Exception as e:
            logger.error(f"Ensemble training pipeline failed: {e}")
            raise


if __name__ == "__main__":
    try:
        logger.info(f">>>>>> stage {STAGE_NAME} started <<<<<<")
        obj = EnsembleTrainingPipeline()
        obj.main()
        logger.info(f">>>>>> stage {STAGE_NAME} completed <<<<<<\n\nx==========x")
    except Exception as e:
        logger.exception(e)
        raise e