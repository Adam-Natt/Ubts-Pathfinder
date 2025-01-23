// Global variable to hold the markers from the jobsite when the checkbox is checked
let job_markers = []
// Draw the jobsite markers
function drawJobMarker(points, iconColor) {
    const marker = L.marker(points, { icon: iconColor }).addTo(map);
    job_markers.push(marker)
}

// Removes the existing drawed job markers 
function removeJobMarker(latLng) {
    const targetLatLng = L.latLng(latLng[0], latLng[1]); // Create a LatLng object

    // Loop through the markers array to find the marker with matching coordinates
    job_markers.forEach((marker, index) => {
        if (marker.getLatLng().equals(targetLatLng)) {
            map.removeLayer(marker); // Remove the marker from the map
            job_markers.splice(index, 1); // Remove the marker from the array
        }
    });
}

let job_polylines = []

function drawJobPolyline(points, lineColor, driverId) {
    let job_polyline = [driverId, L.polyline(points, {color: lineColor, weight: 5, opacity: 1}).addTo(map)]
    job_polylines.push(job_polyline)
}

function removeJobPolyline(driverId){
    for(let i=0; i<job_polylines.length; i++){
        if(job_polylines[i][0] == driverId){
            console.log(job_polylines[i])
            job_polylines[i][1].remove();
        }
    }
}

// Draw route using the A* algorithm
async function drawJobRoute(data, start, end, driverId) {
    const graph = buildGraph(data);
    const startPoint = start.join(', ');
    const endPoint = end.join(', ');

    const [path, pathExists] = aStar(graph, startPoint, endPoint);
    const route = path.map(strToArray);

    if (pathExists) {
        drawJobPolyline(route, "red", driverId);
    } else {
        drawJobPolyline(route, "red", driverId);
        try {
            const remainingPath = await getRouteOneMap(strToArray(path[path.length - 1]), end);
            const remainingRoute = [route[route.length - 1], ...remainingPath.route_instructions.map(instruction => strToArray(instruction[3]))];
            drawJobPolyline(remainingRoute, 'green', driverId);
        } catch (error) {
            console.error("Error getting remaining path:", error);
        }
    }
}

// Function to draw user's route from a start destination to an end destination
async function createJobRoutes(start, end, driverId) {
    // Get the value of the user input
    const startDestination = start;  // String
    const endDestination = end;      // String

    if (!startDestination || !endDestination) {
        alert("Please input a destination!");
        return;
    }

    try {
        const response = await fetch('json/map/road_network_v2.json');
        const data = await response.json();

        const startCoords = strToArray(startDestination);
        const endCoords = strToArray(endDestination);

        let smallestDistance = Number.MAX_VALUE;
        let closestPoint;

        // Find the closest point from the road network to the start destination
        data.points.forEach(points => {
            Object.keys(points).forEach(key => {
                const pointCoords = strToArray(key);
                const distance = haversineDistance(startCoords[0], startCoords[1], pointCoords[0], pointCoords[1]);

                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    closestPoint = pointCoords;
                }
            });
        });

        // Get the route from the start point to the closest road network point
        let startPath;
        try {
            startPath = await getRouteOneMap(startCoords, closestPoint);
        } catch (error) {
            console.error("Error getting route from OneMap:", error);
        }

        // Create the path from start to closest point
        const startRoute = [startCoords];
        startPath?.route_instructions.forEach(instruction => {
            startRoute.push(strToArray(instruction[3]));
        });
        startRoute.push(closestPoint);

        // Draw the polyline for the start route
        drawJobPolyline(startRoute, 'green', driverId);

        // Draw the full route from the closest point to the end destination
        drawJobRoute(data, closestPoint, endCoords, driverId);
    } catch (error) {
        console.error('Error fetching road network data:', error);
    }
}
