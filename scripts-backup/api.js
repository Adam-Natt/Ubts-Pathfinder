// Get Token Key to access OneMap's API
function getToken() {
    return new Promise((resolve, reject) => {
        fetch('json/credentials.json')
        .then(response => response.json())
        .then(credentials => {
            const {email, password} = credentials;
            const data = JSON.stringify({email, password});
            
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (this.readyState === XMLHttpRequest.DONE) {
                    if (this.status === 200) {
                        try {
                            const response = JSON.parse(this.responseText);
                            resolve(response.access_token);
                        } catch (e) {
                            console.error("Failed to parse response:", e);
                            reject("Error: Failed to parse response");
                        }
                    } else {
                        console.error("Error:", this.status, this.statusText);
                        reject(`Error Status: ${this.status} ${this.statusText}`);
                    }
                }
            };
            xhr.open("POST", "https://www.onemap.gov.sg/api/auth/post/getToken");
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(data);
        })
        .catch(error => console.error('Error fetching credentials:', error));
    });
}

// Get route information between 2 points using OneMap's API
async function getRouteOneMap(startCoordinate, endCoordinate) {
    try {
        const token = await getToken();
        const routeType = "drive";
        const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${encodeURIComponent(startCoordinate)}&end=${encodeURIComponent(endCoordinate)}&routeType=${routeType}`;
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (this.readyState === XMLHttpRequest.DONE) {
                    if (this.status === 200) {
                        try {
                            const response = JSON.parse(this.responseText);
                            resolve(response);
                        } catch (e) {
                            console.error("Failed to parse response:", e);
                            reject("Error: Failed to parse response");
                        }
                    } else {
                        console.error("Error:", this.status, this.statusText);
                        reject(`Error Status: ${this.status} ${this.statusText}`);
                    }
                }
            };
            xhr.open("GET", url);
            xhr.setRequestHeader("Authorization", token);
            xhr.send();
        });
    } catch (error) {
        console.error("Error getting token:", error);
    }
}