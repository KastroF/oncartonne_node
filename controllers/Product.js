const Product = require("../models/Product");

exports.addProduct = async (req, res) => {
  try {
    const { name, description, price, oldPrice, stock, category, unit, promotion, storeId, visible } = req.body;

    if (!name || !price) {
      return res.status(400).json({ status: 1, message: "Nom et prix requis" });
    }

    const product = new Product({
      name,
      description,
      price,
      oldPrice,
      stock,
      category,
      unit,
      promotion,
      storeId,
      visible,
      image: req.file ? req.file.path : null,
    });

    await product.save();
    res.status(201).json({ status: 0, product });
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const update = { ...req.body, updatedAt: Date.now() };
    if (req.file) update.image = req.file.path;

    await Product.updateOne({ _id: req.params.id }, { $set: update });
    const product = await Product.findById(req.params.id);
    res.status(200).json({ status: 0, product });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.deleteOne({ _id: req.params.id });
    res.status(200).json({ status: 0, message: "Produit supprimé" });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { storeId, category, page, limit, search } = req.query;
    const filter = { visible: true };
    if (storeId) filter.storeId = storeId;
    if (category) filter.category = category;
    if (search && search.trim().length > 0) {
      filter.name = { $regex: search.trim(), $options: "i" };
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate("category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      status: 0,
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: skip + products.length < total,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) return res.status(404).json({ status: 2, message: "Produit non trouvé" });
    res.status(200).json({ status: 0, product });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

// Admin : tous les produits (même non visibles)
exports.getAllProducts = async (req, res) => {
  try {
    const { storeId, category } = req.query;
    const filter = {};
    if (storeId) filter.storeId = storeId;
    if (category) filter.category = category;

    const products = await Product.find(filter).populate("category").sort({ createdAt: -1 });
    res.status(200).json({ status: 0, products });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.toggleVisibility = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ status: 2, message: "Produit non trouvé" });

    product.visible = !product.visible;
    product.updatedAt = Date.now();
    await product.save();
    res.status(200).json({ status: 0, product });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { stock } = req.body;
    await Product.updateOne({ _id: req.params.id }, { $set: { stock, updatedAt: Date.now() } });
    const product = await Product.findById(req.params.id);
    res.status(200).json({ status: 0, product });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};
