const express = require("express");
const router = express.Router();
const controller = require("../controllers/chat.controller");

const chatMiddleware = require("../middlewares/chat.middleware");
router.get("/:roomChatId", chatMiddleware.isAccess, controller.index);

module.exports = router;