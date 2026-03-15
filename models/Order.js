const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: { type: String },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
  storeName: { type: String },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  amountPaid: { type: Number },
  paymentMethod: { type: String, enum: ["airtel", "moov", "carte", "cash"] },
  paymentType: { type: String, default: "full", enum: ["full", "advance"] },
  paymentId: { type: String },
  paymentStatus: { type: String, default: "pending", enum: ["pending", "confirmed", "failed"] },
  telephone: { type: String },
  status: {
    type: String,
    default: "en_attente",
    enum: ["brouillon", "en_attente", "en_preparation", "prete", "recuperee", "annulee"],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
