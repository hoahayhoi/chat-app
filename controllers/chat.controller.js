module.exports.index = async (req, res) => {
    _io.on("connection", (socket) => {
        console.log("Có 1 user kết nối!", socket.id);
    });

    res.render("pages/chat/index", {
        pageTitle: "Chat",
    });
};