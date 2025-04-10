/*:
 * @target MZ
 * @plugindesc Syncs game switches with an external server using WebSockets and handles FormBeta OAuth authentication.
 * @author Bryce Lynd
 * 
 * @help
 * This plugin uses WebSockets to sync the list of switches with a locally hosted
 * server, allowing external modification.
 */

(() => {
    const SERVER_URL = "ws://172.16.3.197:3000";
    const OAUTH_URL = "https://formbeta.yorktechapps.com/oauth";
    const CLIENT_ID = "your-client-id"; // Replace with your FormBeta OAuth client ID
    const REDIRECT_URI = "http://localhost:3000/oauth/callback"; // Replace with your server's callback URL
    const RESPONSE_TYPE = "token"; // Or "code" depending on the OAuth flow
    const SCOPE = "profile"; // Replace with the required scope(s)

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

            if (message.type === "update") {
                const gameData = message.data;
                console.log("Received game data from server:", gameData);

                if (gameData.switches) {
                    Object.keys(gameData.switches).forEach((id) => {
                        console.log(`Setting switch ${id} to ${gameData.switches[id]}`);
                        $gameSwitches.setValue(Number(id), gameData.switches[id]);
                    });
                }
            }
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

        const data = { type: "updateSwitches", data: { switches, switchNames } };
        console.log("Sending game data to server:", data);

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        } else {
            console.error("WebSocket is not open. Cannot send game data.");
        }
    }

    function openOAuthPopup() {
        const authUrl = `${OAUTH_URL}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
            REDIRECT_URI
        )}&response_type=${RESPONSE_TYPE}&scope=${encodeURIComponent(SCOPE)}`;

        const popup = window.open(
            authUrl,
            "OAuthPopup",
            "width=500,height=600,scrollbars=yes,resizable=yes"
        );

        if (!popup) {
            console.error("Failed to open OAuth popup. Please allow popups in your browser.");
            return;
        }

        const interval = setInterval(() => {
            try {
                if (popup.closed) {
                    clearInterval(interval);
                    console.log("OAuth popup closed.");
                }

                // Check if the popup redirected to the callback URL
                if (popup.location.href.startsWith(REDIRECT_URI)) {
                    const urlParams = new URLSearchParams(popup.location.hash.substring(1));
                    const accessToken = urlParams.get("access_token"); // For implicit flow

                    if (accessToken) {
                        console.log("Access token received:", accessToken);
                        popup.close();
                        handleOAuthSuccess(accessToken);
                    }
                }
            } catch (error) {
                // Ignore cross-origin errors until the popup redirects to the same origin
            }
        }, 500);
    }

    function handleOAuthSuccess(token) {
        console.log("OAuth successful. Token:", token);

        // Send the token to the server to check permissions
        fetch("http://localhost:3000/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        })
            .then((response) => response.json())
            .then((data) => {
                console.log("Server response:", data);

                if (data.success && data.permissions >= 4) {
                    console.log("Access granted. Opening index.html...");
                    window.open("http://localhost:3000", "_blank");
                } else {
                    console.log("Access denied. Closing popup.");
                    alert("You do not have sufficient permissions to access this feature.");
                }
            })
            .catch((error) => {
                console.error("Error sending token to server:", error);
            });
    }

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function () {
        _Scene_Boot_start.call(this);

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