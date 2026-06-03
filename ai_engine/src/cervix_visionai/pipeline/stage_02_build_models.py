from pathlib import Path
from cervix_visionai.config.configuration import ConfigurationManager
from cervix_visionai.components.build_models import BuildModels
from cervix_visionai.utils.logger import logger

STAGE_NAME = "Build Ensemble Models"


class BuildModelsTrainingPipeline:
    def __init__(self):
        pass

    def main(self):
        config = ConfigurationManager()
        build_config = config.get_build_models_config()
        builder = BuildModels(config=build_config)

        both_exist = (
            build_config.primary_model_path.exists()
            and build_config.secondary_model_path.exists()
        )
        if both_exist:
            logger.info("Both base models already exist, skipping build stage.")
        else:
            logger.info("Building ensemble base models...")
            builder.build_all()
            logger.info("Both ensemble base models built and saved.")


if __name__ == "__main__":
    try:
        logger.info(f">>>>>> stage {STAGE_NAME} started <<<<<<")
        obj = BuildModelsTrainingPipeline()
        obj.main()
        logger.info(f">>>>>> stage {STAGE_NAME} completed <<<<<<\n\nx==========x")
    except Exception as e:
        logger.exception(e)
        raise e