from cervix_visionai.config.configuration import ConfigurationManager
from cervix_visionai.components.onnx_exporter import export_ensemble_to_onnx
from cervix_visionai.utils.logger import logger

STAGE_NAME = "ONNX Export"


class OnnxExportPipeline:
    def __init__(self):
        pass

    def main(self):
        config = ConfigurationManager()
        ensemble_config = config.get_ensemble_config()
        params = config.get_params_config()

        if not ensemble_config.onnx_export:
            logger.info("ONNX export disabled in ensemble_config.yaml — skipping.")
            return

        both_exist = (
            ensemble_config.primary_onnx_path.exists()
            and ensemble_config.secondary_onnx_path.exists()
        )
        if both_exist:
            logger.info("Both ONNX models already exist, skipping export stage.")
            return

        logger.info("Exporting ensemble models to ONNX for Android deployment...")
        image_size = tuple(params.IMAGE_SIZE[:-1])  # (height, width)
        export_ensemble_to_onnx(
            config=ensemble_config,
            num_classes=params.NUM_CLASSES,
            image_size=image_size,
        )
        logger.info(
            f"ONNX export complete:\n"
            f"  Primary  -> {ensemble_config.primary_onnx_path}\n"
            f"  Secondary -> {ensemble_config.secondary_onnx_path}"
        )


if __name__ == "__main__":
    try:
        logger.info(f">>>>>> stage {STAGE_NAME} started <<<<<<")
        OnnxExportPipeline().main()
        logger.info(f">>>>>> stage {STAGE_NAME} completed <<<<<<\n\nx==========x")
    except Exception as e:
        logger.exception(e)
        raise e
