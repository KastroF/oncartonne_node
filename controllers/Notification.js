const Notification = require("../models/Notification");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.auth.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ status: 0, notifications });
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.auth.userId, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ status: 0, message: "Notifications marquées comme lues" });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.auth.userId, read: false });
    res.status(200).json({ status: 0, count });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};
