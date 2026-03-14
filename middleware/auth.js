const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.CODETOKEN);
    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user || !user.userActive) {
      return res.status(401).json({ status: 5, message: "Utilisateur déconnecté" });
    }

    req.auth = { userId };
    next();
  } catch (err) {
    res.status(401).json({ status: 505, message: "Authentification échouée" });
  }
};
