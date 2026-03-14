const Store = require("../models/Store");

exports.addStore = async (req, res) => {
  try {
    const { name, address, phone, categoriesIds } = req.body;
    if (!name) return res.status(400).json({ status: 1, message: "Nom requis" });

    const store = new Store({
      name,
      address,
      phone,
      categoriesIds: categoriesIds || [],
      image: req.file ? req.file.path : null,
    });
    await store.save();
    res.status(201).json({ status: 0, store });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.updateStore = async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.file) update.image = req.file.path;
    if (update.categoriesIds && typeof update.categoriesIds === "string") {
      update.categoriesIds = JSON.parse(update.categoriesIds);
    }

    await Store.updateOne({ _id: req.params.id }, { $set: update });
    const store = await Store.findById(req.params.id).populate("categoriesIds");
    res.status(200).json({ status: 0, store });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.deleteStore = async (req, res) => {
  try {
    await Store.deleteOne({ _id: req.params.id });
    res.status(200).json({ status: 0, message: "Magasin supprimé" });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.getStores = async (req, res) => {
  try {
    const stores = await Store.find({ active: true }).populate("categoriesIds").sort({ name: 1 });
    res.status(200).json({ status: 0, stores });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.getAllStores = async (req, res) => {
  try {
    const stores = await Store.find().populate("categoriesIds").sort({ name: 1 });
    res.status(200).json({ status: 0, stores });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};
