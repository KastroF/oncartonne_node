const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { sendNotificationToUser } = require("../utils/fcm");

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
    const { storeId, storeName, items, total, amountPaid, paymentMethod, paymentType, telephone } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ status: 1, message: "Le panier est vide" });
    }

    // Vérifier et ajuster les stocks
    const adjustedItems = [];
    const adjustments = [];
    let newTotal = 0;

    for (const item of items) {
      if (item.productId) {
        const product = await Product.findById(item.productId);
        if (!product || product.stock <= 0) {
          adjustments.push({ name: item.name, requested: item.quantity, available: 0 });
          continue; // Produit hors stock, on le retire
        }
        const available = product.stock;
        const qty = Math.min(item.quantity, available);
        if (qty < item.quantity) {
          adjustments.push({ name: item.name, requested: item.quantity, available: qty });
        }
        adjustedItems.push({ ...item, quantity: qty });
        newTotal += item.price * qty;
      } else {
        adjustedItems.push(item);
        newTotal += item.price * item.quantity;
      }
    }

    if (adjustedItems.length === 0) {
      return res.status(400).json({ status: 1, message: "Tous les produits sont en rupture de stock" });
    }

    // Mobile money = brouillon (en attente de paiement), sinon = en_attente
    const isMobileMoney = paymentMethod === "airtel" || paymentMethod === "moov";

    const order = new Order({
      orderNumber: generateOrderNumber(),
      userId: req.auth.userId,
      storeId,
      storeName,
      items: adjustedItems,
      total: newTotal,
      amountPaid: paymentType === "advance" ? Math.ceil(newTotal * 0.3) : newTotal,
      paymentMethod,
      paymentType,
      telephone: telephone || "",
      status: isMobileMoney ? "brouillon" : "en_attente",
    });

    await order.save();

    // Décrémenter le stock seulement si ce n'est pas un brouillon
    if (!isMobileMoney) {
      for (const item of adjustedItems) {
        if (item.productId) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { stock: -item.quantity } }
          );
        }
      }

      const user = await User.findById(req.auth.userId);

      // Notifier les admins via socket seulement pour les commandes confirmées
      const io = req.app.get("io");
      if (io) {
        io.to("admin").emit("newOrder", {
          ...order.toObject(),
          customerName: user?.name || "Client",
        });
      }
    }

    res.status(201).json({ status: 0, order, adjustments: adjustments.length > 0 ? adjustments : undefined });
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { startAt } = req.body;
    const filter = { userId: req.auth.userId };
    const limit = req.body.limit || 10;

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

// Admin : toutes les commandes (exclure les brouillons)
exports.getAllOrders = async (req, res) => {
  try {
    const { status, storeId } = req.query;
    const filter = { status: { $ne: "brouillon" } };
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

    const orderBefore = await Order.findById(req.params.id);

    await Order.updateOne(
      { _id: req.params.id },
      { $set: { status, updatedAt: Date.now() } }
    );

    // Si annulation, remettre le stock
    if (status === "annulee" && orderBefore.status !== "annulee") {
      for (const item of orderBefore.items) {
        if (item.productId) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { stock: item.quantity } }
          );
        }
      }
    }

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

    // Notification push FCM au client
    try {
      const statusLabels = {
        en_preparation: "Votre commande est en cours de préparation",
        prete: "Votre commande est prête ! Venez la récupérer",
        recuperee: "Commande récupérée. Merci !",
        annulee: "Votre commande a été annulée",
      };
      if (statusLabels[status]) {
        await sendNotificationToUser(
          order.userId.toString(),
          "OnCartonne - Commande " + order.orderNumber,
          statusLabels[status],
          1,
          { orderId: order._id.toString(), type: "order_status" }
        );
      }
    } catch (pushErr) {
      console.log("Erreur push notification:", pushErr.message);
    }

    res.status(200).json({ status: 0, order });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

// Callback paiement mobile money (appelé par la gateway)
exports.paymentCallback = async (req, res) => {
  try {
    const { paymentId, status, client_phone, amount } = req.body;

    // Trouver la commande la plus récente avec ce numéro de téléphone en attente
    const order = await Order.findOne({
      telephone: client_phone,
      paymentStatus: "pending",
    }).sort({ createdAt: -1 });

    if (!order) {
      return res.status(404).json({ status: 1, message: "Commande non trouvée" });
    }

    if (status === "success" || status === 0 || status === "0") {
      order.paymentId = paymentId || "";
      order.paymentStatus = "confirmed";
      order.status = "en_attente"; // Brouillon → en attente (visible pour les admins)
      await order.save();

      // Décrémenter le stock maintenant que le paiement est confirmé
      for (const item of order.items) {
        if (item.productId) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { stock: -item.quantity } }
          );
        }
      }

      // Notifier les admins de la nouvelle commande
      const io = req.app.get("io");
      const connectedUsers = req.app.get("connectedUsers");

      if (io) {
        const user = await User.findById(order.userId);
        io.to("admin").emit("newOrder", {
          ...order.toObject(),
          customerName: user?.name || "Client",
        });

        // Notifier le client via socket
        const clientSocket = connectedUsers?.get(order.userId.toString());
        if (clientSocket) {
          io.to(clientSocket.socketId).emit("paymentConfirmed", {
            orderId: order._id,
            orderNumber: order.orderNumber,
            amount: order.total,
          });
        }
      }

      // Push notification
      try {
        await sendNotificationToUser(
          order.userId.toString(),
          "Paiement confirmé",
          `Votre paiement de ${order.total.toLocaleString()} F pour la commande ${order.orderNumber} a été confirmé.`,
          1,
          { orderId: order._id.toString(), type: "payment_confirmed" }
        );
      } catch (pushErr) {
        console.log("Erreur push payment callback:", pushErr.message);
      }

      return res.status(200).json({ status: 0, message: "Paiement confirmé" });
    } else {
      order.paymentStatus = "failed";
      order.status = "annulee"; // Paiement échoué = commande annulée
      await order.save();
      return res.status(200).json({ status: 1, message: "Paiement échoué" });
    }
  } catch (err) {
    console.log("Erreur payment callback:", err);
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

// Admin : dashboard stats
exports.getStats = async (req, res) => {
  try {
    const excludeBrouillon = { status: { $ne: "brouillon" } };
    const totalOrders = await Order.countDocuments(excludeBrouillon);
    const pendingOrders = await Order.countDocuments({ status: "en_attente" });
    const preparingOrders = await Order.countDocuments({ status: "en_preparation" });
    const readyOrders = await Order.countDocuments({ status: "prete" });

    const revenueResult = await Order.aggregate([
      { $match: { status: { $nin: ["annulee", "brouillon"] } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    const recentOrders = await Order.find(excludeBrouillon)
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
