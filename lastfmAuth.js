const express = require("express");
const axios = require("axios");
const LastfmUser = require("./LastfmUser");
const crypto = require("crypto");

const app = express();

const API_KEY = process.env.LASTFM_API_KEY;
const SECRET = process.env.LASTFM_SECRET;

// Correct callback URL — must match Last.fm app settings
const CALLBACK = "https://cupid-lastfm-auth-1.onrender.com/lastfm/callback";

// Render requires dynamic port binding
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Last.fm OAuth server running on port ${PORT}`);
});

// STEP 1 — Redirect user to Last.fm login
app.get("/lastfm/login", (req, res) => {
    const discordId = req.query.id;
    if (!discordId) return res.send("Missing Discord ID.");

    const url = `http://www.last.fm/api/auth/?api_key=${API_KEY}&cb=${encodeURIComponent(CALLBACK + "?id=" + discordId)}`;
    res.redirect(url);
});

// STEP 2 — Callback from Last.fm
app.get("/lastfm/callback", async (req, res) => {
    const token = req.query.token;

    // Accept BOTH ?id= and ?i= because Last.fm sometimes uses "i"
    const discordId = req.query.id || req.query.i;

    if (!token || !discordId)
        return res.send("Missing token or Discord ID.");

    try {
        // Generate API signature
        const sig = crypto.createHash("md5")
            .update(`api_key${API_KEY}methodauth.getSessiontoken${token}${SECRET}`)
            .digest("hex");

        // Exchange token for session key
        const { data } = await axios.get(
            `http://ws.audioscrobbler.com/2.0/?method=auth.getSession&api_key=${API_KEY}&token=${token}&api_sig=${sig}&format=json`
        );

        if (!data.session)
            return res.send("Failed to authenticate with Last.fm.");

        const username = data.session.name;
        const sessionKey = data.session.key;

        // Save to MongoDB
        await LastfmUser.findOneAndUpdate(
            { discordId },
            { username, sessionKey },
            { upsert: true }
        );

        // Success page
        res.send(`
            <h2>Last.fm account linked!</h2>
            <p>You can now return to Discord.</p>
        `);

    } catch (err) {
        console.error(err);
        res.send("Error completing authentication.");
    }
});

module.exports = app;
