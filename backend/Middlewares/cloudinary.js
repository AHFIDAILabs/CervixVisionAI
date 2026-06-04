const cloudinary = require("../configs/cloudinary");

const uploadToCloudinary = async (buffer, folder, mimetype = "image/jpeg") => {
  try {
    const base64 = buffer.toString("base64");
    const dataURI = `data:${mimetype};base64,${base64}`;
    const { secure_url, public_id } = await cloudinary.uploader.upload(dataURI, { folder });
    return { secure_url, public_id };
  } catch (error) {
    console.error("Cloudinary Upload Error (Image):", error.message);
    throw new Error("Error uploading image to Cloudinary");
  }
};

const uploadVideoToCloudinary = async (buffer, folderPath) => {
  try {
    const base64 = buffer.toString("base64");
    const dataURI = `data:video/mp4;base64,${base64}`;
    const { secure_url: videoUrl, public_id: videoCldId } = await cloudinary.uploader.upload(dataURI, {
      resource_type: "video",
      folder: folderPath,
    });
    return { videoUrl, videoCldId };
  } catch (error) {
    console.error("Cloudinary Upload Error (Video):", error.message);
    throw new Error("Error uploading video to Cloudinary");
  }
};

const uploadDocumentToCloudinary = async (buffer, folderPath, mimetype) => {
  try {
    const base64 = buffer.toString("base64");
    const dataURI = `data:${mimetype};base64,${base64}`;
    const { secure_url: fileUrl, public_id: fileCldId } = await cloudinary.uploader.upload(dataURI, {
      resource_type: "raw",
      folder: folderPath,
    });
    return { fileUrl, fileCldId };
  } catch (error) {
    console.error("Cloudinary Upload Error (Document):", error.message);
    throw new Error("Error uploading document to Cloudinary");
  }
};

const deleteFromCloudinary = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId);
};

module.exports = {
  uploadToCloudinary,
  uploadVideoToCloudinary,
  uploadDocumentToCloudinary,
  deleteFromCloudinary,
};
