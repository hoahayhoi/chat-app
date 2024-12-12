const chatRoute = require("./chat.route");
const userMiddleware = require("../middlewares/user.middleware");
const homeRoute = require("./home.route");
const userRoute = require("./user.route")

module.exports = (app) => {
    app.use(userMiddleware.infoUser);

    app.use("/", homeRoute);

    app.use("/user", userRoute);

    app.use(
        "/chat",
        userMiddleware.requireAuth,
        chatRoute
    );
}