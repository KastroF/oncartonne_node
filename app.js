const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const userRoutes = require("./routes/User");
const productRoutes = require("./routes/Product");
const categoryRoutes = require("./routes/Category");
const storeRoutes = require("./routes/Store");
const orderRoutes = require("./routes/Order");
const messageRoutes = require("./routes/Message");

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(
    `mongodb+srv://noreply_db_user:${process.env.MONGOPASS}@cluster0.wyznkxj.mongodb.net/oncartonne`
  )
  .then(() => console.log("Connexion à MongoDB réussie !"))
  .catch((err) => console.log("Connexion à MongoDB échouée !", err));

app.use("/api/user", userRoutes);
app.use("/api/product", productRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/message", messageRoutes);

module.exports = app;
