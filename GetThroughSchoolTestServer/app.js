const express = require("express");
const cors = require("cors");
const ejs = require("ejs");
const http = require("http");
const session = require("express-session");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

app.set("view engine", "ejs");
app.use(express.json());
app.use(cors());
app.use(session({
    secret: 'ohnose!',
    resave: false,
    saveUninitialized: true
}));

let gameData = { switches: {}, switchNames: [] }; // Add switchNames to gameData

function permCheck (req, res, next) {
    req.session.permisions = 4;
    if (req.session.permisions >= 4){
        next();
    } else {
        res.status(403).send("Permission denied: Insufficient permissions to access this resource.");
    }
}

// WebSocket connection handler
wss.on("connection", (ws) => {
    console.log("A client connected via WebSocket.");
    console.log("Current gameData:", gameData);

    // Send the current game data to the newly connected client
    ws.send(JSON.stringify({ type: "init", data: gameData }));

    // Handle incoming messages from clients
    ws.on("message", (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            console.log("Parsed message from client:", parsedMessage);

            if (parsedMessage.type === "updateSwitches") {
                const { switches, switchNames } = parsedMessage.data;

                // Update the gameData switches and switchNames
                if (switches) {
                    Object.keys(switches).forEach((switchId) => {
                        gameData.switches[switchId] = switches[switchId];
                    });
                }

                if (switchNames) {
                    gameData.switchNames = switchNames;
                }

                console.log("Updated gameData on server:", gameData);

                // Broadcast the updated gameData to all connected clients
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: "update", data: gameData }));
                    }
                });
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
    console.log("Serving webpage with gameData:", gameData);
    res.render("index", { gameData });
});

app.post("/oauth/token", (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: "Token is required" });
    }

    console.log("Received OAuth token:", token);

    // Simulate fetching user permissions from FormBeta
    fetch("https://formbeta.yorktechapps.com/api/permissions", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    })
        .then((response) => response.json())
        .then((data) => {
            console.log("User permissions:", data);

            if (data.permissions >= 4) {
                res.json({ success: true, permissions: data.permissions });
            } else {
                res.json({ success: false, permissions: data.permissions });
            }
        })
        .catch((error) => {
            console.error("Error validating token:", error);
            res.status(500).json({ error: "Failed to validate token" });
        });
});

server.listen(PORT, () => console.log(`Server running on http://172.16.3.197:${PORT}`));