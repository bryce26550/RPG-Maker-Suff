const express = require("express");
const cors = require("cors");
const ejs = require("ejs");
const jwt = require('jsonwebtoken');
const session = require('express-session');
const AUTH_URL = 'https://formbeta.yorktechapps.com/oauth'; // ... or the address to the instance of fbjs you wish to connect to
const THIS_URL = 'http://172.16.3.197:3000/login'; // ... or whatever the address to your application is
const KEY = `-----BEGIN PUBLIC KEY----- 
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArY7ATw0h8nGw97RGNyQu 
CjknRHvTejTfWsRX4gSCZg1WSptruk1l0LtYh3P+lA/ux2vDu50fzzub0+t97Ssl 
q2VCi+q25uEN5KUFX7hxxmwFvK/5GqsJ/NoM8LQXycnGVtaWZATaE58vLbdZ/nQK 
bPiqZ8GOKcvRbPVK9z/QMvuB6E6NOq9bRioQZeESDZP9uxiqQ7DT/1M275pFCcE3 
DYrw1aoRqQ9R9YrglsSAXuQcYphKr6O0b0OouokyUex/AyWa/GGQl8Ws1XIe2WZG 
UJV29AyzGGU1mSFJV563+N4o0cF/6tCUiy/mikPBVW08mUkPg9qjy/yd5cLChBi8 
ZwIDAQAB 
-----END PUBLIC KEY-----`
const http = require("http");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

app.set("view engine", "ejs");
app.use(express.json());
app.use(cors());
app.use(session({
    secret: 'mySeceretLittleKey',
    resave: false,
    saveUninitialized: true
}));

let gameData = { switches: {}, switchNames: [] }; // Add switchNames to gameData
const loggedInUsers = []; // Array to store logged-in users
let userGameData = {}; // Object to store game data for each user
const oauthToGameUsernameMap = {}; // Map OAuth usernames to game usernames

function isAuthenticated(req, res, next) {
    if (req.session.user) next()
    else res.redirect('/login')
};

// WebSocket connection handler
wss.on("connection", (ws) => {
    console.log("A client connected via WebSocket.");

    ws.on("message", (message) => {
        try {
            const parsedMessage = JSON.parse(message);

            if (parsedMessage.type === "updateSwitches") {
                const { oauthUsername, switches, switchNames } = parsedMessage.data;

                if (!oauthUsername) {
                    console.error("Invalid OAuth username received:", { oauthUsername });
                    return;
                }

                console.log("Received updateSwitches message:", parsedMessage);

                // Get the webpage username from the mapping
                const webpageUsername = oauthToGameUsernameMap[oauthUsername];

                if (!webpageUsername) {
                    console.error(`No mapping found for OAuth username: ${oauthUsername}`);
                    return;
                }

                // Store user-specific game data
                userGameData[webpageUsername] = {
                    switches: { ...switches },
                    switchNames: switchNames || userGameData[webpageUsername]?.switchNames || []
                };

                console.log(`Updated game data for user: ${webpageUsername}`, userGameData[webpageUsername]);

                // Broadcast the updated game data to all connected clients
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: "update",
                            data: userGameData[webpageUsername],
                            username: webpageUsername // Send the webpage username to the client
                        }));
                    }
                });
            }

            if (parsedMessage.type === "requestGameData") {
                const { username: webpageUsername } = parsedMessage; // Webpage username

                console.log("Received requestGameData for webpage username:", webpageUsername);

                const gameData = userGameData[webpageUsername];

                if (!gameData) {
                    console.log(`No game data found for user: ${webpageUsername}.`);
                    ws.send(JSON.stringify({ type: "update", data: { switches: {}, switchNames: [] }, username: webpageUsername }));
                    return;
                }

                console.log(`Sending game data for user: ${webpageUsername}`, gameData);

                ws.send(JSON.stringify({ type: "update", data: gameData, username: webpageUsername }));
            }
        } catch (error) {
            console.error("Error parsing message from client:", error);
        }
    });

    ws.on("close", () => {
        console.log("A client disconnected.");
    });
});

// Serve the webpage
app.get("/", (req, res) => {
    try {
        res.render("index"); // Pass the username to the template
    } catch (error) {
        res.send(error.message);
    }
});

app.get('/login', (req, res) => {
    if (req.query.token) {
        console.log("Received token:", req.query.token);

        let tokenData;
        try {
            tokenData = jwt.verify(req.query.token, KEY, { algorithms: ['RS256'] });
        } catch (error) {
            console.error("Failed to verify token:", error);
            return res.status(400).send("Invalid token.");
        }

        req.session.token = tokenData;
        req.session.user = tokenData.username;

        // Add the user to the logged-in users list if not already present
        if (!loggedInUsers.includes(tokenData.username)) {
            loggedInUsers.push(tokenData.username);
        }

        // Initialize game data for the user if it doesn't exist
        if (!userGameData[tokenData.username]) {
            userGameData[tokenData.username] = { switches: {}, switchNames: [] };
            console.log(`Initialized game data for user: ${tokenData.username}`);
        }

        const oauthUsername = tokenData.username; // Webpage OAuth username
        const serverOAuthUsername = oauthToGameUsernameMap[oauthUsername] || oauthUsername; // Server OAuth username
        oauthToGameUsernameMap[oauthUsername] = serverOAuthUsername;

        console.log("Mapping stored:", oauthToGameUsernameMap);
        res.redirect('/blank');
    } else {
        console.log("No token received. Redirecting to OAuth URL.");
        res.redirect(`${AUTH_URL}?redirectURL=${THIS_URL}`);
    }
});

// Endpoint to get the list of logged-in users
app.get('/logged-in-users', (req, res) => {
    const usersWithGameData = loggedInUsers.map(username => ({
        username, // OAuth username
        gameUsername: oauthToGameUsernameMap[username] || null, // Game username
        switches: userGameData[oauthToGameUsernameMap[username]]?.switches || {}, // Default to empty object if no data
        switchNames: userGameData[oauthToGameUsernameMap[username]]?.switchNames || [] // Default to empty array if no data
    }));

    console.log("Users with game data (including those without data):", usersWithGameData);
    res.json({ users: usersWithGameData });
});

app.get("/blank", isAuthenticated, (req, res) => {
    const username = req.session.user;
    console.log("Username retrieved from session:", username);

    if (!username) {
        console.error("No username found in session.");
        return res.redirect('/login');
    }

    res.render("blank", { username });
});

app.post("/store-username", (req, res) => {
    const { username: webpageUsername } = req.body; // Webpage username
    const oauthUsername = req.session.user; // OAuth username from the session

    console.log("Received data in /store-username:");
    console.log("Webpage Username:", webpageUsername);
    console.log("OAuth Username from session:", oauthUsername);

    if (!webpageUsername || !oauthUsername) {
        console.error("Both webpage and OAuth usernames are required.");
        return res.status(400).send("Both webpage and OAuth usernames are required.");
    }

    // Map the OAuth username to the webpage username
    oauthToGameUsernameMap[oauthUsername] = webpageUsername;

    console.log(`Mapped OAuth username (${oauthUsername}) to webpage username (${webpageUsername}).`);
    res.status(200).send("Username mapping stored successfully.");
});

app.get("/check-auth", (req, res) => {
    if (req.session.user) {
        res.json({ isAuthenticated: true, username: req.session.user });
    } else {
        res.json({ isAuthenticated: false });
    }
});

server.listen(PORT, () => console.log(`Server running on http://172.16.3.197:${PORT}`));