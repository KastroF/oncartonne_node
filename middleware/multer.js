const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("./cloudinaryConfig");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "oncartonne",
    resource_type: "image",
    transformation: [
      { width: 1440, height: 1440, crop: "limit" },
      { quality: "auto:good", fetch_format: "auto" },
      { flags: "strip_profile" },
    ],
  },
});

const handleUpload = multer({ storage }).single("image");

const handleMultipleImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).array("images", 15);

module.exports = { handleUpload, handleMultipleImages };
