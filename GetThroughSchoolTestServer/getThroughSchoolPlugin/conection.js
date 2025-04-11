/*:
 * @target MZ
 * @plugindesc Syncs game switches with an external server using WebSockets and requires FormBeta OAuth authentication.
 */

(() => {
    const SERVER_URL = "ws://172.16.3.197:3000";
    const OAUTH_URL = "https://formbeta.yorktechapps.com/oauth";
    const CLIENT_ID = "your-client-id"; // Replace with your FormBeta OAuth client ID
    const REDIRECT_URI = "http://localhost:3000/oauth/callback"; // Replace with your server's callback URL
    const RESPONSE_TYPE = "token"; // Use "token" for implicit flow
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