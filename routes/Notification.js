const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const notifCtrl = require("../controllers/Notification");

router.get("/list", auth, notifCtrl.getNotifications);
router.post("/markread", auth, notifCtrl.markAsRead);
router.get("/unread", auth, notifCtrl.getUnreadCount);

module.exports = router;
