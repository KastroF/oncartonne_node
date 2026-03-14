const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { handleUpload } = require("../middleware/multer");
const userCtrl = require("../controllers/User");

router.post("/signup", userCtrl.signup);
router.post("/signin", userCtrl.signin);
router.get("/getuser", auth, userCtrl.getUser);
router.post("/update", auth, handleUpload, userCtrl.updateUser);
router.get("/deleteuser", auth, userCtrl.deleteUser);

module.exports = router;
