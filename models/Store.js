const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String },
  phone: { type: String },
  image: { type: String },
  active: { type: Boolean, default: true },
  categoriesIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Store", storeSchema);
