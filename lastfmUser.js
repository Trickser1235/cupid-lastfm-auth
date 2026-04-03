const mongoose = require("mongoose");

const LastfmUser = new mongoose.Schema({
    discordId: { type: String, required: true },
    username: { type: String, required: true },
    sessionKey: { type: String, required: true }
});

module.exports = mongoose.model("LastfmUser", LastfmUser);
