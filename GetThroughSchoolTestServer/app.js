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
                const { oauthUsername, gameUsername, switches, switchNames } = parsedMessage.data;

                if (!oauthUsername || !gameUsername) {
                    console.error("Invalid usernames received:", { oauthUsername, gameUsername });
                    return;
                }

                console.log("Received updateSwitches message:", parsedMessage);

                // Map the OAuth username (e.g., BryceL) to the game username (e.g., 25)
                const actualOAuthUsername = Object.keys(oauthToGameUsernameMap).find(
                    key => oauthToGameUsernameMap[key] === gameUsername
                ) || oauthUsername;

                oauthToGameUsernameMap[actualOAuthUsername] = gameUsername;

                // Update or initialize game data for the game username
                if (!userGameData[gameUsername]) {
                    userGameData[gameUsername] = { switches: {}, switchNames: [] };
                }

                // Update switches and switchNames
                userGameData[gameUsername].switches = { ...userGameData[gameUsername].switches, ...switches };
                userGameData[gameUsername].switchNames = switchNames || userGameData[gameUsername].switchNames;

                console.log(`Updated game data for user: ${actualOAuthUsername} (game username: ${gameUsername})`, userGameData[gameUsername]);
            }

            if (parsedMessage.type === "requestGameData") {
                const { username } = parsedMessage; // OAuth username

                // Use the mapping to find the corresponding game username
                const gameUsername = oauthToGameUsernameMap[username];

                if (!gameUsername || !userGameData[gameUsername]) {
                    console.log(`No game data found for user: ${username} (mapped to game username: ${gameUsername}).`);
                    ws.send(JSON.stringify({ type: "update", data: { switches: {}, switchNames: [] }, username }));
                    return;
                }

                console.log(`Sending game data for user: ${username} (mapped to game username: ${gameUsername})`, userGameData[gameUsername]);

                ws.send(JSON.stringify({ type: "update", data: userGameData[gameUsername], username }));
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
        let tokenData = jwt.verify(req.query.token, KEY, { algorithms: ['RS256'] });
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

        // Send the OAuth username to the game instance
        const oauthUsername = tokenData.username;
        const gameUsername = oauthToGameUsernameMap[oauthUsername] || null;

        if (gameUsername) {
            console.log(`Sending OAuth username (${oauthUsername}) to game instance for game username (${gameUsername}).`);
            // Use a mechanism to send this data to the game (e.g., WebSocket or HTTP request)
        }

        console.log("Mapping stored:", oauthToGameUsernameMap);
        res.redirect('/blank');
    } else {
        res.redirect(`${AUTH_URL}?redirectURL=${THIS_URL}`);
    }
});

// Endpoint to get the list of logged-in users
app.get('/logged-in-users', (req, res) => {
    const usersWithGameData = loggedInUsers.map((username) => ({
        username,
        switches: userGameData[username]?.switches || {},
        switchNames: userGameData[username]?.switchNames || []
    }));
    res.json({ users: usersWithGameData });
});

app.get("/blank", isAuthenticated, (req, res) => {
    const username = req.session.user;
    console.log("Username retrieved from session:", username); // Debugging log
    res.render("blank", { username });
});

app.post("/store-username", (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send("Username is required.");
    }

    // Store the username in the session
    req.session.username = username;
    console.log("Username stored in session:", username); // Debugging log

    res.status(200).send("Username stored successfully.");
});

app.get("/check-auth", (req, res) => {
    if (req.session.user) {
        res.json({ isAuthenticated: true, username: req.session.user });
    } else {
        res.json({ isAuthenticated: false });
    }
});

server.listen(PORT, () => console.log(`Server running on http://172.16.3.197:${PORT}`));