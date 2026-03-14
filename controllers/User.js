const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone, mode, appleId } = req.body;

    if (mode === "apple") {
      const existing = await User.findOne({ appleId });
      if (existing) {
        const token = jwt.sign({ userId: existing._id }, process.env.CODETOKEN);
        return res.status(200).json({ status: 0, user: existing, token });
      }
      const user = new User({ name: name || "Utilisateur Apple", email: email || "", appleId });
      await user.save();
      const token = jwt.sign({ userId: user._id }, process.env.CODETOKEN);
      return res.status(201).json({ status: 0, user, token });
    }

    if (mode === "google") {
      const existing = await User.findOne({ email });
      if (existing) {
        if (!existing.userActive) {
          existing.userActive = true;
          await existing.save();
        }
        const token = jwt.sign({ userId: existing._id }, process.env.CODETOKEN);
        return res.status(200).json({ status: 0, user: existing, token });
      }
      const user = new User({ name, email });
      await user.save();
      const token = jwt.sign({ userId: user._id }, process.env.CODETOKEN);
      return res.status(201).json({ status: 0, user, token });
    }

    // Mode classique
    if (!name || !email || !password) {
      return res.status(400).json({ status: 1, message: "Champs requis manquants" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ status: 3, message: "Cet email est déjà utilisé" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hash, phone });
    await user.save();

    // Notifier les admins d'un nouveau client
    const io = req.app.get("io");
    if (io) {
      io.to("admin").emit("newClient", { name: user.name, email: user.email, date: user.date });
    }

    const token = jwt.sign({ userId: user._id }, process.env.CODETOKEN);
    res.status(201).json({ status: 0, user, token });
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password, mode, appleId } = req.body;

    if (mode === "apple") {
      const user = await User.findOne({ appleId });
      if (!user) return res.status(404).json({ status: 2, message: "Utilisateur non trouvé" });
      const token = jwt.sign({ userId: user._id }, process.env.CODETOKEN);
      return res.status(200).json({ status: 0, user, token });
    }

    if (mode === "google") {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ status: 2, message: "Utilisateur non trouvé" });
      if (!user.userActive) {
        user.userActive = true;
        await user.save();
      }
      const token = jwt.sign({ userId: user._id }, process.env.CODETOKEN);
      return res.status(200).json({ status: 0, user, token });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ status: 2, message: "Utilisateur non trouvé" });
    if (!user.userActive) return res.status(403).json({ status: 4, message: "Compte désactivé" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ status: 2, message: "Mot de passe incorrect" });

    const token = jwt.sign({ userId: user._id }, process.env.CODETOKEN);
    res.status(200).json({ status: 0, user, token });
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ status: 2, message: "Utilisateur non trouvé" });
    res.status(200).json({ status: 0, user });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const update = {};
    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (req.file) update.photo = req.file.path;

    await User.updateOne({ _id: req.auth.userId }, { $set: update });
    const user = await User.findById(req.auth.userId);
    res.status(200).json({ status: 0, user });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.updateOne({ _id: req.auth.userId }, { $set: { userActive: false } });
    res.status(200).json({ status: 0, message: "Compte supprimé" });
  } catch (err) {
    res.status(500).json({ status: 99, message: "Erreur serveur" });
  }
};
