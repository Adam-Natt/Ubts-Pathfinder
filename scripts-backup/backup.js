// Draws a marker on the map using geolocation points
// points : array of one point e.g. [123.123123, 123.1231231]
function drawMarker(points, iconColor) {
    L.marker(points, {icon: iconColor}).addTo(map);
}

// Draws the polyline on the map between 2 geolocation points
function drawPolyline(points, lineColor) {
    L.polyline(points, {
        color: lineColor,
        weight: 5,
        opacity: 1
    }).addTo(map);
}

// Draws popups with geolocation points
function drawPopup(coordinate) {
    L.popup()
    .setLatLng([coordinate.lat, coordinate.lng])
    .setContent(String(coordinate))
    .addTo(map);
}

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

// Remove parenthesis from the string
function cutParenthesis(s) {
    const match = s.match(/\(([^)]+)\)/);
    return match ? match[1] : "No match found";
}

// Returns a geolocation point when clicking on the map
function onMapClick(e) {
    L.popup()
    .setLatLng(e.latlng)
    .setContent(cutParenthesis(e.latlng.toString()))
    .openOn(map);
}

// Split the string by commas and convert the string array to a number array
function strToArray(str) {
    return str.replace(/\s+/g, '').split(',').map(Number);
}

// Haversine formula to calculate the great-circle distance between two points
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Build the graph from the given data
function buildGraph(data) {
    const graph = {};
    data.points.forEach(segment => {
        const points = Object.keys(segment);
        for (let i = 0; i < points.length - 1; i++) {
            const [lat1, lon1] = points[i].split(', ').map(parseFloat);
            const [lat2, lon2] = points[i + 1].split(', ').map(parseFloat);
            const dist = haversineDistance(lat1, lon1, lat2, lon2);
            graph[points[i]] = graph[points[i]] || [];
            graph[points[i + 1]] = graph[points[i + 1]] || [];
            graph[points[i]].push({ distance: dist, point: points[i + 1] });
            graph[points[i + 1]].push({ distance: dist, point: points[i] });
        }
    });
    return graph;
}

// A* algorithm to find the shortest paths
function aStar(graph, start, end) {
    const openSet = [{ f: 0, g: 0, point: start }];
    const distances = {};
    const previous = {};
    const [latEnd, lonEnd] = end.split(', ').map(parseFloat);
    let closestPoint = start;
    let closestDistToEnd = haversineDistance(...start.split(', ').map(parseFloat), latEnd, lonEnd);

    for (const point in graph) {
        distances[point] = Infinity;
        previous[point] = null;
    }
    distances[start] = 0;

    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const { g: currentG, point: currentPoint } = openSet.shift();
        const currentDistToEnd = haversineDistance(...currentPoint.split(', ').map(parseFloat), latEnd, lonEnd);

        if (currentDistToEnd < closestDistToEnd) {
            closestPoint = currentPoint;
            closestDistToEnd = currentDistToEnd;
        }

        if (currentPoint === end) {
            return [reconstructPath(previous, currentPoint), true];
        }

        for (const neighbor of graph[currentPoint]) {
            const tentativeG = currentG + neighbor.distance;
            const h = haversineDistance(...neighbor.point.split(', ').map(parseFloat), latEnd, lonEnd);
            const f = tentativeG + h;

            if (tentativeG < distances[neighbor.point]) {
                distances[neighbor.point] = tentativeG;
                previous[neighbor.point] = currentPoint;
                openSet.push({ f, g: tentativeG, point: neighbor.point });
            }
        }
    }

    return [reconstructPath(previous, closestPoint), false];
}

// Helper function to return incomplete path if path is not found
function reconstructPath(previous, currentPoint) {
    const path = [];
    let step = currentPoint;
    while (step !== null) {
        path.push(step);
        step = previous[step];
    }
    return path.reverse();
}

// Draw the road network
async function drawRoadNetwork(points) {
    const arraysOfPoints = points.points.map(point => 
        Object.keys(point).map(strToArray)
    );
    drawPolyline(arraysOfPoints, 'blue');
}

// Draw route using the A* algorithm
async function drawRoute(data, start, end) {
    const graph = buildGraph(data);
    const startPoint = start.join(', ');
    const endPoint = end.join(', ');

    const [path, pathExists] = aStar(graph, startPoint, endPoint);
    const route = path.map(strToArray);

    if (pathExists) {
        drawPolyline(route, "red");
    } else {
        drawPolyline(route, "red");
        try {
            const remainingPath = await getRouteOneMap(strToArray(path[path.length - 1]), end);
            const remainingRoute = [route[route.length - 1], ...remainingPath.route_instructions.map(instruction => strToArray(instruction[3]))];
            drawPolyline(remainingRoute, 'green');
        } catch (error) {
            console.error("Error getting remaining path:", error);
        }
    }
}

function userRouteInput() {
    // Get all inputs with the name 'destination'
    const userDestinations = document.querySelectorAll('input[name="destination"]');
    let destinations = [];

    userDestinations.forEach(points => {
        destinations.push(points.value);
    });

    for(let i=0; i<destinations.length; i+=2){
        console.log(destinations[i],destinations[i+1])
        createRoutes(destinations[i],destinations[i+1])
    }
}

async function userWorkInput(){
    const driverAmount = document.querySelectorAll('input[name="driver"]');
    let drivers = []
    driverAmount.forEach(driver => {
        drivers.push(driver.value)
    })

    console.log(drivers)
    
    const userWorkload = document.querySelectorAll('input[name="workload"]');
    let workload = []
    userWorkload.forEach(work => {
        workload.push(work.value)
    })

    console.log(workload)

    for (let i = 0; i < workload.length; i++) {
        for (let j = i + 1; j < workload.length; j++) {
            console.log(`(${workload[i]}, ${workload[j]})`);
            createRoutes(workload[i],workload[j])
        }
      }
}

async function createRoutes(start, end){
    // Get the value of the user input
    const startDestination = start
    const endDestination = end

    if (startDestination === "" || endDestination === "") {
        alert("Please input a destination!");
        return;
    }

    fetch('json/map/road_network_v2.json')
    .then(response => response.json())
    .then(async data => {
        const start = strToArray(startDestination);
        const end = strToArray(endDestination);

        // Draw markers for start and end destinations
        drawMarker(start, icons.blue);
        drawMarker(end, icons.red);

        let smallestDistance = Number.MAX_VALUE;
        let closestPoint;

        // Find the closest point from the road network to the start destination
        for (const points of data.points) {
            for (let key in points) {
                const pointCoords = strToArray(key);
                const distance = haversineDistance(start[0], start[1], pointCoords[0], pointCoords[1]);

                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    closestPoint = pointCoords;
                }
            }
        }

        let startPath;
        try {
            // Get the route from the start point to the closest road network point
            startPath = await getRouteOneMap(start, closestPoint);
        } catch (error) {
            console.error("Error getting route from OneMap:", error);
        }

        // Create the path from start to closest point
        const startRoute = [start];
        for (const instruction of startPath.route_instructions) {
            startRoute.push(strToArray(instruction[3]));
        }
        startRoute.push(closestPoint);

        // Draw the polyline for the start route
        drawPolyline(startRoute, 'green');

        // Draw the full route from the closest point to the end destination
        drawRoute(data, closestPoint, end);
    })
    .catch(error => {
        console.error('Error fetching road network data:', error);
    });
}

function userCreateDriver(){
    const driverAmount = parseInt(document.getElementById('driver-amount').value)
    if(driverAmount < 1){
        console.log('Please enter the amount of drivers!')
    }else if(driverAmount > 0){
        for(let i=1; i<driverAmount+1; i++){
            createDriver(i)
        }
    }else{
        console.log("error: creating driver 404!")
    }
}

function userDriverInput(){
    const userDrivers = document.querySelectorAll('input[name="driver"]');
}

function createDriver(driver_n){
    const driverContainer = document.getElementById('driver-container');
    const driver = document.createElement('div');
    driver.setAttribute('id','driver' + driver_n);

    const driverJob = document.createElement('div');
    driverJob.setAttribute('id','driver-job'+driver_n)
    driverJob.setAttribute('data-value','1');

    const driverAddButton = document.createElement('button');
    driverAddButton.setAttribute('class','add-btn');
    driverAddButton.setAttribute('onclick','addDriver(this)');
    driverAddButton.textContent = "+";

    const driverLabel = document.createElement('label')
    driverLabel.setAttribute('for','driver');
    driverLabel.setAttribute('class','driver-label')
    driverLabel.textContent = 'Driver ' + driver_n;

    // Create the driver elements
    const driverInput = document.createElement('input');
    driverInput.setAttribute('type', 'text');
    driverInput.setAttribute('class','driver');
    driverInput.setAttribute('id', 'driver-' + driver_n);
    driverInput.setAttribute('name', 'driver');
    driverInput.setAttribute('placeholder', 'Certificate...');
    // driverInput.setAttribute('required');

    const driverSearchButton = document.createElement('button');
    driverSearchButton.setAttribute('class','search-driver-btn');
    driverSearchButton.setAttribute('type','submit');
    driverSearchButton.setAttribute('onclick','userDriverInput()');
    driverSearchButton.textContent = "Search";

    driver.appendChild(driverLabel)
    driver.appendChild(driverAddButton)
    driver.appendChild(driverInput)
    driver.appendChild(driverJob)
    // driver.appendChild(driverSearchButton)
    driverContainer.appendChild(driver)
}

// Helper function to remove whitespaces from a string
function removeWhitespace(str){
    let result = str.replace(/\s+/g, '');
    return result
}


// const theNumberOfDrivers = {
//     'D1' : [],
//     'D2' : ['Hazard Cert','Clean Cert','Chemical Cert','Heavy Duty Cert'],
//     'D3' : ['Weapon Cert','Hazard Cert']
// };

// const theNumberOfJobs = {
//     "1, 2" : [],
//     "3, 4" : ['Hazard Cert','Clean Cert','Chemical Cert','Heavy Duty Cert'],
//     "5, 6" : [],
//     "7, 8" : ['Weapon Cert'],
//     "9, 10" : ['Hazard Cert','Weapon Cert'],
//     "11, 12" : [],
//     "13, 14" : []
// }

// const theNumberOfDrivers = {
//     'D1' : [],
//     'D2' : ['Hazard Cert','Heavy Duty Cert'],
//     'D3' : [],
// };

// const theNumberOfJobs = {
//     "1.335834, 103.639269" : [],
//     "1.319487, 103.677506" : ['Heavy Duty Cert'],
//     "1.320646, 103.702526" : [],
//     "1.31125, 103.70935" : [],
//     "1.309576, 103.677077" : []
// }

// const theNumberOfJobs = {
//     "1.335834, 103.639269" : ['Simple Cert'],
//     "1.319487, 103.677506" : ['Hazard Cert','Clean Cert','Chemical Cert','Heavy Duty Cert'],
//     "1.320646, 103.702526" : ['Animal Cert','Military Cert'],
//     "1.31125, 103.70935" : ['Weapon Cert'],
//     "1.309576, 103.677077" : ['Resource Cert','Gold Cert']
// }

// const theDriversAndJobs = distributeJobAmount(theNumberOfJobs, theNumberOfDrivers)

// distributeJobs(theNumberOfJobs,theDriversAndJobs)


// MAIN CODE BELOW

// Load icons for drawing markers
const icons = {
    red: L.icon({ iconUrl: 'marker/red_marker.png', iconSize: [32, 32] }),
    blue: L.icon({ iconUrl: 'marker/blue_marker.png', iconSize: [32, 32] }),
    green: L.icon({ iconUrl: 'marker/green_marker.png', iconSize: [32, 32] }),
    orange: L.icon({ iconUrl: 'marker/orange_marker.png', iconSize: [32, 32] }),
};

// Initialize the map with Singapore coordinates and zoom level 13
const map = L.map('map').setView([1.366295, 103.802261], 11);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Add geocoding control
L.Control.geocoder().addTo(map);

// Fetch and draw markers from jobsites data
fetch('json/map/jobsites_v1.json')
    .then(response => response.json())
    .then(data => {
        data.endpoints.forEach(endpoint => drawMarker(endpoint, icons.green));
    })
    .catch(error => console.error('Error fetching jobsites data:', error));

// Fetch and draw road network
fetch('json/map/road_network_v2.json')
    .then(response => response.json())
    .then(async data =>{ 
        drawRoadNetwork(data)
    })
    .catch(error => console.error('Error fetching road network data:', error));

map.on('click', onMapClick);

// Function for HTML
let count = 1
function addDestination(){
    count++;
    const destinationContainer = document.getElementById('destination-container');

    // Create the start destination elements
    const startLabel = document.createElement('label');
    startLabel.setAttribute('for', 'start-destination-' + count);

    const startInput = document.createElement('input');
    startInput.setAttribute('type', 'text');
    startInput.setAttribute('class','start-destination');
    startInput.setAttribute('id', 'start-destination-' + count);
    startInput.setAttribute('name', 'destination');
    startInput.setAttribute('placeholder', 'Start destination...');
    startInput.setAttribute('required', true);


    // Create the end destination elements
    const endLabel = document.createElement('label');
    endLabel.setAttribute('for', 'end-destination-' + count);

    const endInput = document.createElement('input');
    endInput.setAttribute('type', 'text');
    endInput.setAttribute('class','end-destination');
    endInput.setAttribute('id', 'end-destination-' + count);
    endInput.setAttribute('name', 'destination');
    endInput.setAttribute('placeholder', 'End destination...');
    endInput.setAttribute('required', true);

    const lineSplit = document.createElement('div');
    lineSplit.setAttribute('class','line-split');

    // Append elements to the parent container
    destinationContainer.appendChild(startLabel);
    destinationContainer.appendChild(startInput);

    destinationContainer.appendChild(endLabel);
    destinationContainer.appendChild(endInput);
}

let workload_count = 1
function addWork(){
    workload_count++;
    const workloadContainer = document.getElementById('workload-container');

    // Create the work elements
    const workloadInput = document.createElement('input');
    workloadInput.setAttribute('type', 'text');
    workloadInput.setAttribute('class','workload');
    workloadInput.setAttribute('id', 'workload-' + workload_count);
    workloadInput.setAttribute('name', 'workload');
    workloadInput.setAttribute('placeholder', 'Jobsite...');

    // Append elements to the parent container
    workloadContainer.appendChild(workloadInput);
}

function addDriver(button){
    const driverContainer = button.parentElement.querySelector('div');
    console.log(driverContainer)
    let driverValue = parseInt(driverContainer.dataset.value) + 1;
    

    // Create the driver elements
    const driverInput = document.createElement('input');
    driverInput.setAttribute('type', 'text');
    driverInput.setAttribute('class','driver');
    driverInput.setAttribute('id', 'driver' + driverValue);
    driverInput.setAttribute('name', 'driver');
    driverInput.setAttribute('placeholder', 'Certificate...');

    driverContainer.appendChild(driverInput);
    driverContainer.setAttribute('data-value',driverValue)
}