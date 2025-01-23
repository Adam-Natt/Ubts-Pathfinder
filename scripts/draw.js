/**
 * Draws a marker on the map at the specified geolocation point.
 * @param {Array<number>} points - An array containing a single point [latitude, longitude].
 * @param {object} iconColor - The Leaflet icon object to style the marker.
 */
function drawMarker(points, iconColor) {
    L.marker(points, { icon: iconColor }).addTo(map);
}

/**
 * Draws a polyline on the map between the specified geolocation points.
 * @param {Array<Array<number>>} points - An array of points [[lat1, lng1], [lat2, lng2], ...].
 * @param {string} lineColor - The color of the polyline.
 */
function drawPolyline(points, lineColor) {
    L.polyline(points, {
        color: lineColor,
        weight: 5,
        opacity: 1,
    }).addTo(map);
}

/**
 * Draws a popup on the map at the specified geolocation point.
 * @param {object} coordinate - The coordinate object with `lat` and `lng` properties.
 */
function drawPopup(coordinate) {
    L.popup()
        .setLatLng([coordinate.lat, coordinate.lng])
        .setContent(String(coordinate))
        .addTo(map);
}

/**
 * (Private Function) Draws the entire road network as a polyline on the map.
 * @param {object} points - Object containing points to draw.
 */
async function drawRoadNetwork(points) {
    const arraysOfPoints = points.points.map(point =>
        Object.keys(point).map(strToArray) // Convert keys into geolocation arrays
    );
    drawPolyline(arraysOfPoints, 'blue'); // Draw the road network in blue
}

/**
 * Draws a route using the A* algorithm between two geolocation points.
 * Falls back to fetching remaining path from OneMap API if the complete route cannot be determined.
 * @param {object} data - The graph data for route calculation.
 * @param {Array<number>} start - Starting point [latitude, longitude].
 * @param {Array<number>} end - Ending point [latitude, longitude].
 */
async function drawRoute(data, start, end) {
    const graph = buildGraph(data); // Build the graph representation of the map
    const startPoint = start.join(', '); // Convert start point to string format
    const endPoint = end.join(', '); // Convert end point to string format

    const [path, pathExists] = aStar(graph, startPoint, endPoint); // Find path using A*
    const route = path.map(strToArray); // Convert string paths to arrays

    if (pathExists) {
        drawPolyline(route, "red"); // Draw the route in red if a path exists
    } else {
        drawPolyline(route, "red"); // Draw the partial route in red
        try {
            const remainingPath = await getRouteOneMap(strToArray(path[path.length - 1]), end); // Get remaining path from OneMap API
            const remainingRoute = [
                route[route.length - 1], 
                ...remainingPath.route_instructions.map(instruction => strToArray(instruction[3]))
            ];
            drawPolyline(remainingRoute, 'green'); // Draw the remaining route in green
        } catch (error) {
            console.error("Error getting remaining path:", error); // Log any errors
        }
    }
}

/**
 * Handles map click events to display a popup with the clicked location's coordinates.
 * @param {object} e - The Leaflet event object.
 */
function onMapClick(e) {
    L.popup()
        .setLatLng(e.latlng) // Set popup at clicked location
        .setContent(cutParenthesis(e.latlng.toString())) // Format and set the content
        .openOn(map); // Open the popup on the map
}
