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

    const jwt = "https://cdn.jsdelivr.net/npm/jsonwebtoken-esm@1.0.1/dist/jsonwebtoken-esm.min.js"; // Use the loaded library
    
    function openOAuthPopup() {
        const redirectUrl = "http://172.16.3.197:3000/blank";
        const authUrl = "https://formbeta.yorktechapps.com/oauth";
    //     jwt.verify(`-----BEGIN PUBLIC KEY----- 
    // MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArY7ATw0h8nGw97RGNyQu 
    // CjknRHvTejTfWsRX4gSCZg1WSptruk1l0LtYh3P+lA/ux2vDu50fzzub0+t97Ssl 
    // q2VCi+q25uEN5KUFX7hxxmwFvK/5GqsJ/NoM8LQXycnGVtaWZATaE58vLbdZ/nQK 
    // bPiqZ8GOKcvRbPVK9z/QMvuB6E6NOq9bRioQZeESDZP9uxiqQ7DT/1M275pFCcE3 
    // DYrw1aoRqQ9R9YrglsSAXuQcYphKr6O0b0OouokyUex/AyWa/GGQl8Ws1XIe2WZG 
    // UJV29AyzGGU1mSFJV563+N4o0cF/6tCUiy/mikPBVW08mUkPg9qjy/yd5cLChBi8 
    // ZwIDAQAB 
    // -----END PUBLIC KEY-----`, { algorithms: ['RS256'] })

        const popup = window.open(`${authUrl}?redirectURL=${redirectUrl}`, "OAuthPopup", "width=600,height=600");

        const interval = setInterval(() => {
            try {
                if (popup.location.href.startsWith(redirectUrl)) {
                    const urlParams = new URLSearchParams(popup.location.search);
                    const code = urlParams.get("code");
                    console.log("Authorization Code:", code);
                    popup.close();
                    clearInterval(interval);

                    // Exchange the code for an access token
                    exchangeAuthorizationCode(code);
                }
            } catch (e) {
                // Ignore cross-origin errors until redirected
            }
        }, 1000);
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