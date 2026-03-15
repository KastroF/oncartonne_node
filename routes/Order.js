const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const orderCtrl = require("../controllers/Order");

// Client
router.post("/add", auth, orderCtrl.addOrder);
router.post("/getorders", auth, orderCtrl.getOrders);
router.get("/getorder/:id", auth, orderCtrl.getOrder);

// Payment callback (pas d'auth, appelé par la gateway)
router.post("/payment-callback", orderCtrl.paymentCallback);

// Admin
router.get("/getall", auth, orderCtrl.getAllOrders);
router.post("/updatestatus/:id", auth, orderCtrl.updateStatus);
router.get("/stats", auth, orderCtrl.getStats);

module.exports = router;
