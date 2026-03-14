const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const messageCtrl = require("../controllers/Message");

router.post("/send", auth, messageCtrl.sendMessage);
router.get("/get/:orderId", auth, messageCtrl.getMessages);
router.post("/read/:orderId", auth, messageCtrl.markAsRead);

module.exports = router;
