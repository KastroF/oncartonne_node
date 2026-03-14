const Order = require("../models/Order");
const User = require("../models/User");

function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const r = Math.floor(1000 + Math.random() * 9000);
  return `OC-${y}${m}${d}-${r}`;
}

exports.addOrder = async (req, res) => {
  try {
    const { storeId, storeName, items, total, amountPaid, paymentMethod, paymentType } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ status: 1, message: "Le panier est vide" });
    }

    const order = new Order({
      orderNumber: generateOrderNumber(),
      userId: req.auth.userId,
      storeId,
      storeName,
      items,
      total,
      amountPaid: paymentType === "advance" ? Math.ceil(total * 0.3) : total,
      paymentMethod,
      paymentType,
    });

    await order.save();

    const user = await User.findById(req.auth.userId);

    // Notifier les admins via socket
    const io = req.app.get("io");
    if (io) {
      io.to("admin").emit("newOrder", {
        ...order.toObject(),
        customerName: user?.name || "Client",
      });
    }

    res.status(201).json({ status: 0, order });
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { startAt } = req.body;
    const filter = { userId: req.auth.userId };
    const limit = 10;

    let query = Order.find(filter).sort({ createdAt: -1 }).limit(limit);
    if (startAt) {
      query = Order.find({ ...filter, createdAt: { $lt: new Date(startAt) } })
        .sort({ createdAt: -1 })
        .limit(limit);
    }

    const orders = await query;
    const nextStartAt = orders.length === limit ? orders[orders.length - 1].createdAt : null;

    res.status(200).json({ status: 0, orders, nextStartAt });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ status: 2, message: "Commande non trouvée" });
    res.status(200).json({ status: 0, order });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

// Admin : toutes les commandes
exports.getAllOrders = async (req, res) => {
  try {
    const { status, storeId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (storeId) filter.storeId = storeId;

    const orders = await Order.find(filter)
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ status: 0, orders });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

// Admin : mettre à jour le statut
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["en_attente", "en_preparation", "prete", "recuperee", "annulee"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ status: 1, message: "Statut invalide" });
    }

    await Order.updateOne(
      { _id: req.params.id },
      { $set: { status, updatedAt: Date.now() } }
    );

    const order = await Order.findById(req.params.id);

    const io = req.app.get("io");
    const connectedUsers = req.app.get("connectedUsers");

    if (io) {
      // Notifier le client de la mise à jour
      const statusLabels = {
        en_preparation: "Votre commande est en cours de préparation",
        prete: "Votre commande est prête ! Venez la récupérer",
        recuperee: "Commande récupérée. Merci !",
        annulee: "Votre commande a été annulée",
      };

      const clientSocket = connectedUsers?.get(order.userId.toString());
      if (clientSocket) {
        io.to(clientSocket.socketId).emit("orderStatusChanged", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status,
          message: statusLabels[status] || "Statut mis à jour",
        });
      }

      // Notifier tous les admins
      io.to("admin").emit("orderUpdated", order);
    }

    res.status(200).json({ status: 0, order });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

// Admin : dashboard stats
exports.getStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "en_attente" });
    const preparingOrders = await Order.countDocuments({ status: "en_preparation" });
    const readyOrders = await Order.countDocuments({ status: "prete" });

    const revenueResult = await Order.aggregate([
      { $match: { status: { $ne: "annulee" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    const recentOrders = await Order.find()
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      status: 0,
      stats: { totalOrders, pendingOrders, preparingOrders, readyOrders, revenue, recentOrders },
    });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};
