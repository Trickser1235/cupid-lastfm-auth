const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const LastfmUser = require("./LastfmUser");

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------------
// CONFIG
// -------------------------------
const API_KEY = process.env.LASTFM_API_KEY;
const API_SECRET = process.env.LASTFM_SECRET;
const MONGO = process.env.MONGO_URI;
const BOT_REDIRECT = process.env.BOT_REDIRECT; 
// Example: https://discord.com/channels/@me

mongoose.connect(MONGO)
    .then(() => console.log("OAuth MongoDB Connected"))
    .catch(err => console.log("OAuth MongoDB Error:", err));

// -------------------------------
// LOGIN ROUTE
// -------------------------------
app.get("/lastfm/login", (req, res) => {
    const discordId = req.query.id;
    if (!discordId) return res.send("Missing Discord ID.");

    const callback = `${process.env.OAUTH_DOMAIN}/lastfm/callback?i=${discordId}`;

    const url =
        `https://www.last.fm/api/auth?api_key=${API_KEY}&cb=${encodeURIComponent(callback)}`;

    return res.redirect(url);
});

// -------------------------------
// CALLBACK ROUTE
// -------------------------------
app.get("/lastfm/callback", async (req, res) => {
    const token = req.query.token;
    const discordId = req.query.i;

    if (!token || !discordId)
        return res.send("Missing token or Discord ID.");

    try {
        const sessionURL =
            `https://ws.audioscrobbler.com/2.0/?method=auth.getSession&api_key=${API_KEY}&token=${token}&api_sig=${API_SECRET}&format=json`;

        const { data } = await axios.get(sessionURL);

        if (!data.session)
            return res.send("Failed to get session.");

        const username = data.session.name;
        const sessionKey = data.session.key;

        await LastfmUser.findOneAndUpdate(
            { discordId },
            { username, sessionKey },
            { upsert: true }
        );

        return res.send(`
            <h2>Last.fm account linked!</h2>
            <p>You can close this page and return to Discord.</p>
        `);

    } catch (err) {
        console.log(err);
        return res.send("Error linking account.");
    }
});

// -------------------------------
app.listen(3000, () => console.log("OAuth server running on port 3000"));
