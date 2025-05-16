// Import required modules
const express = require("express"); // Web framework for building the server
const cors = require("cors"); // Middleware to enable Cross-Origin Resource Sharing
const ejs = require("ejs"); // Template engine for rendering views
const jwt = require('jsonwebtoken'); // Library for handling JSON Web Tokens
const session = require('express-session'); // Middleware for managing user sessions
const http = require("http"); // Core module for creating an HTTP server
const { WebSocketServer } = require("ws"); // WebSocket server for real-time communication

// OAuth and server configuration
const AUTH_URL = 'https://formbeta.yorktechapps.com/oauth'; // OAuth server URL
const THIS_URL = 'http://172.16.3.197:3000/login'; // URL of this application
const KEY = `-----BEGIN PUBLIC KEY----- 
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArY7ATw0h8nGw97RGNyQu 
CjknRHvTejTfWsRX4gSCZg1WSptruk1l0LtYh3P+lA/ux2vDu50fzzub0+t97Ssl 
q2VCi+q25uEN5KUFX7hxxmwFvK/5GqsJ/NoM8LQXycnGVtaWZATaE58vLbdZ/nQK 
bPiqZ8GOKcvRbPVK9z/QMvuB6E6NOq9bRioQZeESDZP9uxiqQ7DT/1M275pFCcE3 
DYrw1aoRqQ9R9YrglsSAXuQcYphKr6O0b0OouokyUex/AyWa/GGQl8Ws1XIe2WZG 
UJV29AyzGGU1mSFJV563+N4o0cF/6tCUiy/mikPBVW08mUkPg9qjy/yd5cLChBi8 
ZwIDAQAB 
-----END PUBLIC KEY-----`;

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

// Server port configuration
const PORT = 3000;

// Set up middleware and configurations
app.set("view engine", "ejs"); // Use EJS as the template engine
app.use(express.json()); // Parse incoming JSON requests
app.use(cors()); // Enable CORS for all routes
app.use(session({
    secret: 'mySeceretLittleKey', // Secret key for session encryption
    resave: false, // Do not save session if it hasn't been modified
    saveUninitialized: true // Save uninitialized sessions
}));

// In-memory storage for game data and user mappings
let gameData = { switches: {}, switchNames: [] }; // Global game data
const loggedInUsers = []; // List of logged-in users
let userGameData = {}; // Store game data for each user
const oauthToGameUsernameMap = {}; // Map OAuth usernames to game usernames

// Middleware to check if a user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.user) next(); // Proceed if user is authenticated
    else res.redirect('/login'); // Redirect to login if not authenticated
}

// WebSocket connection handler
wss.on("connection", (ws) => {
    console.log("A client connected via WebSocket.");

    // Handle incoming messages from WebSocket clients
    ws.on("message", (message) => {
        try {
            const parsedMessage = JSON.parse(message);

            if (parsedMessage.type === "updateSwitches") {
                // Handle switch updates from the client
                const { oauthUsername, switches, switchNames } = parsedMessage.data;

                if (!oauthUsername) {
                    console.error("Invalid OAuth username received:", { oauthUsername });
                    return;
                }

                console.log("Received updateSwitches message:", parsedMessage);

                // Map OAuth username to webpage username
                const webpageUsername = oauthToGameUsernameMap[oauthUsername];

                if (!webpageUsername) {
                    console.error(`No mapping found for OAuth username: ${oauthUsername}`);
                    return;
                }

                // Update game data for the user
                userGameData[webpageUsername] = {
                    switches: { ...switches },
                    switchNames: switchNames || userGameData[webpageUsername]?.switchNames || []
                };

                console.log(`Updated game data for user: ${webpageUsername}`, userGameData[webpageUsername]);

                // Broadcast updated game data to all connected clients
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: "update",
                            data: userGameData[webpageUsername],
                            username: webpageUsername
                        }));
                    }
                });
            }

            if (parsedMessage.type === "requestGameData") {
                // Handle game data requests from the client
                const { username: webpageUsername } = parsedMessage;

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

    // Handle WebSocket disconnection
    ws.on("close", () => {
        console.log("A client disconnected.");
    });
});

// Serve the main webpage
app.get("/", (req, res) => {
    try {
        res.render("index"); // Render the main page
    } catch (error) {
        res.send(error.message);
    }
});

// OAuth login endpoint
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

        req.session.token = tokenData; // Store token in session
        req.session.user = tokenData.username; // Store username in session

        // Add user to logged-in users list if not already present
        if (!loggedInUsers.includes(tokenData.username)) {
            loggedInUsers.push(tokenData.username);
        }

        // Initialize game data for the user if it doesn't exist
        if (!userGameData[tokenData.username]) {
            userGameData[tokenData.username] = { switches: {}, switchNames: [] };
            console.log(`Initialized game data for user: ${tokenData.username}`);
        }

        const oauthUsername = tokenData.username;
        const serverOAuthUsername = oauthToGameUsernameMap[oauthUsername] || oauthUsername;
        oauthToGameUsernameMap[oauthUsername] = serverOAuthUsername;

        console.log("Mapping stored:", oauthToGameUsernameMap);
        res.redirect('/blank'); // Redirect to a blank page after login
    } else {
        console.log("No token received. Redirecting to OAuth URL.");
        res.redirect(`${AUTH_URL}?redirectURL=${THIS_URL}`);
    }
});

// Endpoint to get the list of logged-in users
app.get('/logged-in-users', (req, res) => {
    const usersWithGameData = loggedInUsers.map(username => ({
        username,
        gameUsername: oauthToGameUsernameMap[username] || null,
        switches: userGameData[oauthToGameUsernameMap[username]]?.switches || {},
        switchNames: userGameData[oauthToGameUsernameMap[username]]?.switchNames || []
    }));

    console.log("Users with game data:", usersWithGameData);
    res.json({ users: usersWithGameData });
});

// Serve a blank page after login
app.get("/blank", isAuthenticated, (req, res) => {
    const username = req.session.user;
    console.log("Username retrieved from session:", username);

    if (!username) {
        console.error("No username found in session.");
        return res.redirect('/login');
    }

    res.render("blank", { username });
});

// Endpoint to store the mapping between OAuth and webpage usernames
app.post("/store-username", (req, res) => {
    const { username: webpageUsername } = req.body;
    const oauthUsername = req.session.user;

    console.log("Received data in /store-username:", { webpageUsername, oauthUsername });

    if (!webpageUsername || !oauthUsername) {
        console.error("Both webpage and OAuth usernames are required.");
        return res.status(400).send("Both webpage and OAuth usernames are required.");
    }

    oauthToGameUsernameMap[oauthUsername] = webpageUsername;

    console.log(`Mapped OAuth username (${oauthUsername}) to webpage username (${webpageUsername}).`);
    res.status(200).send("Username mapping stored successfully.");
});

// Endpoint to check if a user is authenticated
app.get("/check-auth", (req, res) => {
    if (req.session.user) {
        res.json({ isAuthenticated: true, username: req.session.user });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// Start the server
server.listen(PORT, () => console.log(`Server running on http://172.16.3.197:${PORT}`));