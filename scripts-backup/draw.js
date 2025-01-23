
// Draws a marker on the map using geolocation points
// points : array of one point e.g. [123.123123, 123.1231231]
function drawMarker(points, iconColor) {
    L.marker(points, {icon: iconColor}).addTo(map)
}

// Draws the polyline on the map between 2 geolocation points
// Draws a line between 2 points
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

// Suppose to be private function
// Draw the entire road network
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

// Returns a geolocation point when clicking on the map
function onMapClick(e) {
    L.popup()
    .setLatLng(e.latlng)
    .setContent(cutParenthesis(e.latlng.toString()))
    .openOn(map);
}
