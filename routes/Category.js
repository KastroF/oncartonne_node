const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { handleUpload } = require("../middleware/multer");
const categoryCtrl = require("../controllers/Category");

router.get("/getcategories", categoryCtrl.getCategories);
router.post("/add", auth, handleUpload, categoryCtrl.addCategory);
router.post("/update/:id", auth, handleUpload, categoryCtrl.updateCategory);
router.delete("/delete/:id", auth, categoryCtrl.deleteCategory);

module.exports = router;
