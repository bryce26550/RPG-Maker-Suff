/*:
 * @target MZ
 * @plugindesc Syncs game switches with an external server using WebSockets and requires FormBeta OAuth authentication.
 */

(() => {
    const SERVER_URL = "ws://172.16.3.197:3000";

    let ws;

    function connectWebSocket() {
        ws = new WebSocket(SERVER_URL);

        ws.onopen = () => {
            console.log("Connected to WebSocket server.");
            sendGameData(); // Send the initial state of switches when connected
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log("Received message from server:", message);
        };

        ws.onclose = () => {
            console.log("Disconnected from WebSocket server. Reconnecting in 5 seconds...");
            setTimeout(connectWebSocket, 5000); // Retry connection after 5 seconds
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
    }

    function sendGameData() {
        if (!$gameSwitches || !$gameSwitches._data || !$dataSystem || !$dataSystem.switches) {
            console.error("Switch data or switch names are not available.");
            return;
        }

        const switches = {};
        Object.keys($gameSwitches._data).forEach((id) => {
            switches[id] = $gameSwitches._data[id] ?? false; // Default to false if undefined
        });

        const switchNames = $dataSystem.switches; // Get the names of the switches

        // Retrieve the OAuth username from a game variable (set by the server)
        const oauthUsername = $gameVariables.value(2); // Assume variable 2 holds the OAuth username
        const gameUsername = $gameVariables.value(1); // Variable 1 holds the game username (e.g., 25)

        if (!oauthUsername || !gameUsername) {
            console.error("OAuth username or game username is not set. Cannot send game data.");
            return;
        }

        console.log("OAuth Username:", oauthUsername); // Debugging log
        console.log("Game Username:", gameUsername); // Debugging log

        const data = { 
            type: "updateSwitches", 
            data: { oauthUsername, gameUsername, switches, switchNames } 
        };

        console.log("Sending game data:", { oauthUsername, gameUsername, switches, switchNames });

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        } else {
            console.error("WebSocket is not open. Cannot send game data.");
        }
    }

    const jwt = "https://cdn.jsdelivr.net/npm/jsonwebtoken-esm@1.0.1/dist/jsonwebtoken-esm.min.js"; // Use the loaded library
    
    function openOAuthPopup() {
        const redirectUrl = "http://172.16.3.197:3000/login";
        const popup = window.open(`${redirectUrl}`, "OAuthPopup", "width=600,height=600");
    }

    function exchangeAuthorizationCode(code) {
        const data = {
            client_id: "YOUR_CLIENT_ID",
            client_secret: "YOUR_CLIENT_SECRET",
            code: code,
            redirect_url: "http://172.16.3.197:3000/blank",
            grant_type: "authorization_code"
        };

        fetch("https://formbeta.yorktechapps.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(tokenData => {
                console.log("Access Token:", tokenData.access_token);

                // Fetch the user's profile using the access token
                fetch("https://formbeta.yorktechapps.com/api/profile", {
                    method: "GET",
                    headers: { Authorization: `Bearer ${tokenData.access_token}` }
                })
                    .then(profileResponse => profileResponse.json())
                    .then(profileData => {
                        console.log("User Profile:", profileData);

                        // Send the username to the server
                        fetch("http://172.16.3.197:3000/store-username", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ username: profileData.username })
                        })
                            .then(() => {
                                console.log("Username sent to server:", profileData.username); // Debugging log
                                window.location.href = "http://172.16.3.197:3000/blank"; // Redirect to blank.ejs
                            })
                            .catch(error => console.error("Error sending username to server:", error));
                    })
                    .catch(error => console.error("Error fetching profile:", error));
            })
            .catch(error => console.error("Error fetching token:", error));
    }

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function () {
        _Scene_Boot_start.call(this);

        // Ensure $gameVariables is initialized before setting the value
        if ($gameVariables) {
            $gameVariables.setValue(1, 25); // Set the game username
            $gameVariables.setValue(2, "BryceL"); // Set the OAuth username
            console.log("Game Variables initialized:");
            console.log("Game Username:", $gameVariables.value(1));
            console.log("OAuth Username:", $gameVariables.value(2));
        } else {
            console.error("$gameVariables is not initialized.");
        }

        // Trigger the OAuth flow
        console.log("Starting OAuth flow...");
        openOAuthPopup();
    };

    // Periodically send the current state of switches to the server
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _Scene_Map_update.call(this);

        if (Graphics.frameCount % 120 === 0) { // Every 2 seconds
            console.log("Sending periodic game data...");
            sendGameData();
        }
    };

    connectWebSocket(); // Establish the WebSocket connection

})();