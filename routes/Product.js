const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { handleUpload } = require("../middleware/multer");
const productCtrl = require("../controllers/Product");

// Public
router.get("/getproducts", productCtrl.getProducts);
router.get("/getproduct/:id", productCtrl.getProduct);

// Admin
router.post("/add", auth, handleUpload, productCtrl.addProduct);
router.post("/update/:id", auth, handleUpload, productCtrl.updateProduct);
router.delete("/delete/:id", auth, productCtrl.deleteProduct);
router.get("/getall", auth, productCtrl.getAllProducts);
router.post("/togglevisibility/:id", auth, productCtrl.toggleVisibility);
router.post("/updatestock/:id", auth, productCtrl.updateStock);

module.exports = router;
