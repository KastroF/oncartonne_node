const Category = require("../models/Category");

exports.addCategory = async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ status: 1, message: "Nom requis" });

    const category = new Category({
      name,
      icon,
      image: req.file ? req.file.path : null,
    });
    await category.save();
    res.status(201).json({ status: 0, category });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.file) update.image = req.file.path;

    await Category.updateOne({ _id: req.params.id }, { $set: update });
    const category = await Category.findById(req.params.id);
    res.status(200).json({ status: 0, category });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await Category.deleteOne({ _id: req.params.id });
    res.status(200).json({ status: 0, message: "Catégorie supprimée" });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({ status: 0, categories });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};
