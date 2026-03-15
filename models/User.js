const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String },
  phone: { type: String },
  role: { type: String, default: "user", enum: ["user", "admin", "staff"] },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
  photo: { type: String },
  userActive: { type: Boolean, default: true },
  appleId: { type: String, unique: true, sparse: true },
  fcmToken: { type: Array, default: [] },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
