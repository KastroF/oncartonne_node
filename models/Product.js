const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  oldPrice: { type: Number },
  stock: { type: Number, default: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  unit: { type: String, default: "pièce", enum: ["kg", "litre", "pièce", "lot"] },
  image: { type: String },
  promotion: { type: Number, default: 0 },
  visible: { type: Boolean, default: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Product", productSchema);
