const Message = require("../models/Message");

exports.sendMessage = async (req, res) => {
  try {
    const { orderId, text } = req.body;
    if (!orderId || !text) {
      return res.status(400).json({ status: 1, message: "orderId et text requis" });
    }

    const user = await require("../models/User").findById(req.auth.userId);
    const message = new Message({
      orderId,
      senderId: req.auth.userId,
      senderRole: user.role,
      text,
    });
    await message.save();

    // Émettre via socket
    const io = req.app.get("io");
    if (io) {
      io.to(`order_${orderId}`).emit("newMessage", {
        ...message.toObject(),
        senderName: user.name,
      });
    }

    res.status(201).json({ status: 0, message });
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { orderId } = req.params;
    const messages = await Message.find({ orderId })
      .populate("senderId", "name role photo")
      .sort({ createdAt: 1 });

    res.status(200).json({ status: 0, messages });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { orderId } = req.params;
    await Message.updateMany(
      { orderId, senderId: { $ne: req.auth.userId }, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ status: 0 });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};
