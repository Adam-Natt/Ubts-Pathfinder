/**
 * Fetches an access token from OneMap's API using stored credentials.
 * @returns {Promise<string>} - A promise that resolves to the access token.
 */
function getToken() {
    return new Promise((resolve, reject) => {
        // Load credentials from a local JSON file
        fetch('json/credentials.json')
            .then(response => response.json())
            .then(credentials => {
                const { email, password } = credentials; // Extract email and password
                const data = JSON.stringify({ email, password }); // Prepare the payload for the request

                const xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function () {
                    if (this.readyState === XMLHttpRequest.DONE) {
                        if (this.status === 200) {
                            try {
                                const response = JSON.parse(this.responseText); // Parse the response
                                resolve(response.access_token); // Resolve the access token
                            } catch (e) {
                                console.error("Failed to parse response:", e);
                                reject("Error: Failed to parse response"); // Reject on parsing failure
                            }
                        } else {
                            console.error("Error:", this.status, this.statusText);
                            reject(`Error Status: ${this.status} ${this.statusText}`); // Reject on HTTP error
                        }
                    }
                };

                // Configure and send the POST request to OneMap's API
                xhr.open("POST", "https://www.onemap.gov.sg/api/auth/post/getToken");
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.send(data); // Send the credentials as JSON payload
            })
            .catch(error => console.error('Error fetching credentials:', error)); // Handle file loading error
    });
}

/**
 * Fetches route information between two points from OneMap's API.
 * @param {string} startCoordinate - The starting point as a string (e.g., "1.3521,103.8198").
 * @param {string} endCoordinate - The ending point as a string (e.g., "1.290270,103.851959").
 * @returns {Promise<object>} - A promise that resolves to the route information.
 */
async function getRouteOneMap(startCoordinate, endCoordinate) {
    try {
        const token = await getToken(); // Retrieve the API token
        const routeType = "drive"; // Define the route type (e.g., "drive", "walk", etc.)
        const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${encodeURIComponent(startCoordinate)}&end=${encodeURIComponent(endCoordinate)}&routeType=${routeType}`;
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (this.readyState === XMLHttpRequest.DONE) {
                    if (this.status === 200) {
                        try {
                            const response = JSON.parse(this.responseText); // Parse the API response
                            resolve(response); // Resolve with the parsed route information
                        } catch (e) {
                            console.error("Failed to parse response:", e);
                            reject("Error: Failed to parse response"); // Reject on parsing failure
                        }
                    } else {
                        console.error("Error:", this.status, this.statusText);
                        reject(`Error Status: ${this.status} ${this.statusText}`); // Reject on HTTP error
                    }
                }
            };

            // Configure and send the GET request to OneMap's API
            xhr.open("GET", url);
            xhr.setRequestHeader("Authorization", token); // Include the token in the request header
            xhr.send(); // Send the request
        });
    } catch (error) {
        console.error("Error getting token:", error); // Log errors during token retrieval
    }
}
