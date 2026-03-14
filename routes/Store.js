const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { handleUpload } = require("../middleware/multer");
const storeCtrl = require("../controllers/Store");

// Public
router.get("/getstores", storeCtrl.getStores);

// Admin
router.post("/add", auth, handleUpload, storeCtrl.addStore);
router.post("/update/:id", auth, handleUpload, storeCtrl.updateStore);
router.delete("/delete/:id", auth, storeCtrl.deleteStore);
router.get("/getall", auth, storeCtrl.getAllStores);

module.exports = router;
