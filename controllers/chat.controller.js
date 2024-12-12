module.exports.index = async (req, res) => {
    res.render("pages/chat/index", {
        pageTitle: "Chat",
    });
};