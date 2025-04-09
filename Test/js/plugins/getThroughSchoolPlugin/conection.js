/*:
 * @target MZ
 * @plugindesc Syncs game switches with an external server using WebSockets
 * @author Bryce Lynd
 * @help
 * This plugin uses WebSockets to sync the list of switches with a locally hosted
 * server, allowing external modification.
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