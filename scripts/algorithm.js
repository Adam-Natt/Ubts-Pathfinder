// CONSTANTS
const LOGISTIC_DRIVER_START_END_LOCATION = '1.3053692855071002, 103.73862158586589';
// Uncomment the line below if you want to reset to a default location
// const LOGISTIC_DRIVER_START_END_LOCATION = '0, 0';

/**
 * Haversine formula to calculate the great-circle distance between two points.
 * @param {number} lat1 - Latitude of the first point
 * @param {number} lon1 - Longitude of the first point
 * @param {number} lat2 - Latitude of the second point
 * @param {number} lon2 - Longitude of the second point
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Build a graph representation of the points and their distances.
 * @param {Object} data - Input data containing points
 * @returns {Object} Graph where keys are points and values are arrays of neighbors with distances
 */
function buildGraph(data) {
    const graph = {};
    data.points.forEach(segment => {
        const points = Object.keys(segment);
        for (let i = 0; i < points.length - 1; i++) {
            const [lat1, lon1] = points[i].split(', ').map(parseFloat);
            const [lat2, lon2] = points[i + 1].split(', ').map(parseFloat);
            const dist = haversineDistance(lat1, lon1, lat2, lon2);
            
            // Ensure both points exist in the graph
            graph[points[i]] = graph[points[i]] || [];
            graph[points[i + 1]] = graph[points[i + 1]] || [];
            
            // Add bidirectional edges with distances
            graph[points[i]].push({ distance: dist, point: points[i + 1] });
            graph[points[i + 1]].push({ distance: dist, point: points[i] });
        }
    });
    return graph;
}

/**
 * A* algorithm to find the shortest path between two points in the graph.
 * @param {Object} graph - Graph of points and distances
 * @param {string} start - Starting point as "lat, lon"
 * @param {string} end - Ending point as "lat, lon"
 * @returns {Array} The path and a boolean indicating if the path is complete
 */
function aStar(graph, start, end) {
    const openSet = [{ f: 0, g: 0, point: start }];
    const distances = {};
    const previous = {};
    const [latEnd, lonEnd] = end.split(', ').map(parseFloat);
    let closestPoint = start;
    let closestDistToEnd = haversineDistance(...start.split(', ').map(parseFloat), latEnd, lonEnd);

    // Initialize distances and previous points
    for (const point in graph) {
        distances[point] = Infinity;
        previous[point] = null;
    }
    distances[start] = 0;

    while (openSet.length > 0) {
        // Sort openSet by the f-score (estimated total cost)
        openSet.sort((a, b) => a.f - b.f);
        const { g: currentG, point: currentPoint } = openSet.shift();
        const currentDistToEnd = haversineDistance(...currentPoint.split(', ').map(parseFloat), latEnd, lonEnd);

        // Update closest point to the target
        if (currentDistToEnd < closestDistToEnd) {
            closestPoint = currentPoint;
            closestDistToEnd = currentDistToEnd;
        }

        // If we reach the target point, return the reconstructed path
        if (currentPoint === end) {
            return [reconstructPath(previous, currentPoint), true];
        }

        // Evaluate neighbors
        for (const neighbor of graph[currentPoint]) {
            const tentativeG = currentG + neighbor.distance;
            const h = haversineDistance(...neighbor.point.split(', ').map(parseFloat), latEnd, lonEnd);
            const f = tentativeG + h;

            // If a better path is found, update distances and add to openSet
            if (tentativeG < distances[neighbor.point]) {
                distances[neighbor.point] = tentativeG;
                previous[neighbor.point] = currentPoint;
                openSet.push({ f, g: tentativeG, point: neighbor.point });
            }
        }
    }

    // Return the closest incomplete path if the exact target is unreachable
    return [reconstructPath(previous, closestPoint), false];
}

/**
 * Reconstructs the path from the end point to the start point.
 * @param {Object} previous - Object mapping points to their previous points in the path
 * @param {string} currentPoint - The current end point
 * @returns {Array} Reconstructed path from start to currentPoint
 */
function reconstructPath(previous, currentPoint) {
    const path = [];
    let step = currentPoint;
    while (step !== null) {
        path.push(step);
        step = previous[step];
    }
    return path.reverse();
}

/**
 * Function to draw a user's route from a start destination to an end destination.
 * @param {string} start - Starting destination as a string (e.g., "lat, lon").
 * @param {string} end - Ending destination as a string (e.g., "lat, lon").
 */
async function createRoutes(start, end) {
    // Validate user input
    const startDestination = start;
    const endDestination = end;

    if (startDestination === "" || endDestination === "") {
        alert("Please input a destination!");
        return;
    }

    // Fetch road network data
    fetch('json/map/road_network_v2.json')
        .then(response => response.json())
        .then(async data => {
            const startCoords = strToArray(startDestination); // Convert start string to array
            const endCoords = strToArray(endDestination);     // Convert end string to array

            // Draw markers for start and end destinations
            drawMarker(startCoords, icons.blue);
            drawMarker(endCoords, icons.red);

            let smallestDistance = Number.MAX_VALUE;
            let closestPoint;

            // Find the closest point from the road network to the start destination
            for (const points of data.points) {
                for (let key in points) {
                    const pointCoords = strToArray(key);
                    const distance = haversineDistance(
                        startCoords[0], startCoords[1],
                        pointCoords[0], pointCoords[1]
                    );

                    if (distance < smallestDistance) {
                        smallestDistance = distance;
                        closestPoint = pointCoords;
                    }
                }
            }

            let startPath;
            try {
                // Get the route from the start point to the closest road network point
                startPath = await getRouteOneMap(startCoords, closestPoint);
            } catch (error) {
                console.error("Error getting route from OneMap:", error);
            }

            // Create the path from start to the closest point
            const startRoute = [startCoords];
            for (const instruction of startPath.route_instructions) {
                startRoute.push(strToArray(instruction[3]));
            }
            startRoute.push(closestPoint);

            // Draw the polyline for the start route
            drawPolyline(startRoute, 'green');

            // Draw the full route from the closest point to the end destination
            drawRoute(data, closestPoint, endCoords);
        })
        .catch(error => {
            console.error('Error fetching road network data:', error);
        });
}

/**
 * Function to create drivers based on the user-specified amount.
 */
function userCreateDriver() {
    const driverAmount = parseInt(document.getElementById('driver-amount').value);
    
    if (driverAmount < 1) {
        // console.log('Please enter the amount of drivers!');
    } else if (driverAmount > 0) {
        // Create the specified number of drivers
        for (let i = 1; i <= driverAmount; i++) {
            createDriver(i);
        }
    } else {
        // console.log("Creating Driver Amount Error!");
    }
}

/**
 * Function to create jobs for drivers.
 */
let jobCount = 1; // Initialize job counter
function userCreateJob() {
    createJob(jobCount);
    jobCount++; // Increment job counter for the next job
}

/**
 * Helper function to create a single driver element.
 * @param {number} driver_n - The driver number to create.
 */
function createDriver(driver_n) {
    const driverDiv = document.getElementById('driver-div');

    // Create driver container
    const driver = document.createElement('div');
    driver.setAttribute('id', 'driver-' + driver_n);

    // Create job element
    const driverJob = document.createElement('div');
    driverJob.setAttribute('id', 'D' + driver_n);
    driverJob.setAttribute('data-value', '1');

    // Create add button
    const driverAddButton = document.createElement('button');
    driverAddButton.setAttribute('class', 'add-btn');
    driverAddButton.setAttribute('onclick', 'addDriver(this)');
    driverAddButton.textContent = "+";

    // Create driver label
    const driverLabel = document.createElement('label');
    driverLabel.setAttribute('for', 'driver');
    driverLabel.setAttribute('class', 'driver-label');
    driverLabel.textContent = 'Driver ' + driver_n;

    // Create driver input field
    const driverInput = document.createElement('input');
    driverInput.setAttribute('type', 'text');
    driverInput.setAttribute('class', 'driver');
    driverInput.setAttribute('id', 'driver-' + driver_n);
    driverInput.setAttribute('name', 'D' + driver_n);
    driverInput.setAttribute('placeholder', 'Certificate...');

    // Append all elements to the driver container
    driver.appendChild(driverLabel);
    driver.appendChild(driverAddButton);
    driver.appendChild(driverInput);
    driver.appendChild(driverJob);

    // Append the driver container to the main driver-div
    driverDiv.appendChild(driver);
}

/**
 * Helper function to create a job entry with the given job number.
 * Dynamically generates HTML elements to represent a job with its details.
 * @param {number} job_n - The job number to be created.
 */
function createJob(job_n) {
    const jobDiv = document.getElementById('job-div');

    // Create main job container
    const job = document.createElement('div');
    job.setAttribute('id', 'job' + job_n);

    // Create jobsite container
    const jobsite = document.createElement('div');
    jobsite.setAttribute('id', 'job-' + job_n);
    jobsite.setAttribute('data-value', '1');

    // Create button to add job
    const jobAddButton = document.createElement('button');
    jobAddButton.setAttribute('class', 'add-btn');
    jobAddButton.setAttribute('onclick', 'addJob(this)');
    jobAddButton.textContent = "+";

    // Create label for jobsite
    const jobLabel = document.createElement('label');
    jobLabel.setAttribute('for', 'job');
    jobLabel.setAttribute('class', 'driver-label');
    jobLabel.textContent = 'Jobsite ' + job_n;

    // Create input for jobsite coordinates
    const jobsiteCoordinate = document.createElement('input');
    jobsiteCoordinate.setAttribute('type', 'text');
    jobsiteCoordinate.setAttribute('class', 'jobsite-coordinate-class');
    jobsiteCoordinate.setAttribute('id', 'jobsite-coordinate-id-' + job_n);
    jobsiteCoordinate.setAttribute('name', 'jobsite-coordinate-name-' + job_n);
    jobsiteCoordinate.setAttribute('placeholder', 'Enter Jobsite Coordinate');

    // Create input for job certificate (driver's certificate)
    const jobInput = document.createElement('input');
    jobInput.setAttribute('type', 'text');
    jobInput.setAttribute('class', 'driver');
    jobInput.setAttribute('id', 'job-' + job_n);
    jobInput.setAttribute('name', 'job-' + job_n);
    jobInput.setAttribute('placeholder', 'Certificate...');

    // Append all elements to the job container
    job.appendChild(jobLabel);
    job.appendChild(jobAddButton);
    job.appendChild(jobsiteCoordinate);
    job.appendChild(jobInput);
    job.appendChild(jobsite);

    // Append the job container to the job-div
    jobDiv.appendChild(job);
}

/**
 * Helper function to transform driver data into a structured object.
 * @param {Array} input - Array of driver data where each item is a [driver, certificate] pair.
 * @returns {Object} - Object mapping each driver to an array of their certificates.
 */
function transformDriverData(input) {
    // Dynamically determine unique drivers
    const uniqueDrivers = [...new Set(input.map(([driver]) => driver))];
  
    // Transform the input data into an object with drivers as keys and their certificates as values
    return uniqueDrivers.reduce((acc, driver) => {
        acc[driver] = input
            .filter(([d]) => d === driver) // Filter entries for the current driver
            .map(([, cert]) => cert); // Map to just the certificates
        return acc;
    }, {});
}

/**
 * Helper function to transform jobsite data into a structured object.
 * @param {Array} input - Array of jobsite data where each item contains coordinates and associated jobs.
 * @returns {Object} - Object mapping coordinates to arrays of associated jobs.
 */
function transformJobsiteData(input) {
    return Object.fromEntries(
        input.slice(1).map(group => { // Start from index 1 to skip the first element
            const coordinates = group[0][1]; // First item in group is coordinates
            const jobs = group.slice(1).map(item => item[1]); // Extract jobs from the rest of the group
            return [coordinates, jobs]; // Return a tuple of coordinates and jobs
        })
    );
}

/**
 * Main function to show the job distribution.
 * This function organizes driver and jobsite data and generates the job assignments.
 * @param {Event} button - The button that triggered the job generation.
 */
function generateJob(button) {
    event.preventDefault(); // Prevent form submission
    const form = document.getElementById('driver-form');
    const inputs = form.getElementsByTagName('input');
    
    // Collect all input values and their names into an array
    const values = Array.from(inputs).map(input => [input.name, input.value]);

    let groupedArrays = [];
    let currentGroup = [];

    // Group inputs based on jobsite coordinates
    values.forEach(item => {
        if (item[0].startsWith("jobsite-coordinate-name")) {
            if (currentGroup.length > 0) {
                groupedArrays.push(currentGroup); // Push current group if it has elements
            }
            currentGroup = [item]; // Start a new group with the current jobsite item
        } else {
            currentGroup.push(item); // Add the item to the current group
        }
    });

    // Push the last group if it has elements
    if (currentGroup.length > 0) {
        groupedArrays.push(currentGroup);
    }

    // Transform the grouped arrays into structured jobsite and driver data
    let param_1 = transformJobsiteData(groupedArrays); // Jobsite & Cert
    for (let key in param_1) {
        if (param_1[key].length === 1 && param_1[key][0] === "") {
            param_1[key] = []; // Remove empty job entries
        }
    }

    let param_2 = transformDriverData(groupedArrays[0]); // Driver & Cert

    // 1.417542, 103.87702  1
    // 1.354711, 103.891611 2
    // 1.347418, 103.898563 3
    // 1.366595, 103.909464 4
    // 1.381268, 103.93237  5
    // 1.338043, 103.964117 6
    // 1.331125, 103.953216 7
    // 1.316436, 103.933218 8
    // 1.337507, 103.885152 9
    // 1.347525, 103.637354 10

    // param_1 = {
    //     "1.417542, 103.87702": [
    //         "A"
    //     ],
    //     "1.354711, 103.891611": [
    //         "F"
    //     ],
    //     "1.347418, 103.898563": [
    //         "B"
    //     ],
    //     "1.366595, 103.909464": [
    //         ""
    //     ],
    //     "1.381268, 103.93237": [
    //         "C"
    //     ],
    //     "1.338043, 103.964117": [
    //         ""
    //     ],
    //     "1.331125, 103.953216": [
    //         "D"
    //     ],
    //     "1.316436, 103.933218": [
    //         ""
    //     ],
    //     "1.337507, 103.885152": [
    //         "E"
    //     ],
    //     "1.347525, 103.637354": [
    //         ""
    //     ]
    // }

    // param_1 = {
    //     "1, 2": [
    //         "A"
    //     ],
    //     "3, 4": [
    //         "F"
    //     ],
    //     "5, 6": [
    //         "B"
    //     ],
    //     "7, 8": [
    //         ""
    //     ],
    //     "9, 10": [
    //         "C"
    //     ],
    //     "11, 12": [
    //         ""
    //     ],
    //     "13, 14": [
    //         "D"
    //     ],
    //     "15, 16": [
    //         ""
    //     ],
    //     "17, 18": [
    //         "E"
    //     ],
    //     "19 ,20": [
    //         ""
    //     ]
    // }
    
    // param_2 = {
    //     "D1": [
    //         "A","D"
    //     ],
    //     "D2": [
    //         "B","E"
    //     ],
    //     "D3": [
    //         "C","F"
    //     ]
    // }

    // Log the transformed data for debugging
    // console.log("Param 1 (Jobsite & Certificates):");
    // console.log(param_1);
    // console.log("Param 2 (Driver & Certificates):");
    // console.log(param_2);

    // Perform the job distribution logic
    // console.log("Job Distribution:");
    let matchedDriversAndJobs = matchDriversAndJobsites(param_2, param_1); // Match drivers with jobsites
    
    console.log("Match Driver and Job Cert")
    console.log(matchedDriversAndJobs)
    let todaysJob = balanceValuesAcrossKeys(matchedDriversAndJobs); // Balance the distribution across keys

    console.log("Distribution Of Remaining Job")
    console.log(todaysJob)
    
    // Add origin location to the start and end of each job list
    for (const jobs in todaysJob) {
        todaysJob[jobs].unshift(LOGISTIC_DRIVER_START_END_LOCATION); // Add start location
        todaysJob[jobs].push(LOGISTIC_DRIVER_START_END_LOCATION);  // Add end location
    }

    // Log the final job distribution
    console.log("Today's Job Distribution:");
    console.log(todaysJob);

    // Generate HTML for the daily driver job assignments
    createDailyDriverJobHtml(todaysJob);
}

/**
 * Helper function to add a new driver input field.
 * This function creates a new input field for a driver certificate and appends it to the driver container.
 * @param {Event} button - The button that was clicked to add a new driver.
 */
function addDriver(button) {
    event.preventDefault(); // Prevent default form submission
    const driverContainer = button.parentElement.querySelector('div'); // Find the container of the driver input field
    
    // Increment the driver value for the new driver
    let driverValue = parseInt(driverContainer.dataset.value) + 1;
    const driverName = driverContainer.getAttribute('id'); // Get the ID of the driver container
    
    // Create a new input field for the driver certificate
    const driverInput = document.createElement('input');
    driverInput.setAttribute('type', 'text');
    driverInput.setAttribute('class', 'driver');
    driverInput.setAttribute('id', 'driver-' + driverValue);
    driverInput.setAttribute('name', driverName);
    driverInput.setAttribute('placeholder', 'Certificate...');

    // Append the newly created input field to the driver container
    driverContainer.appendChild(driverInput);
    
    // Update the container's data-value to reflect the new driver count
    driverContainer.setAttribute('data-value', driverValue);
}

/**
 * Helper function to add a new job input field.
 * This function creates a new input field for a job certificate and appends it to the job container.
 * @param {Event} button - The button that was clicked to add a new job.
 */
function addJob(button) {
    event.preventDefault(); // Prevent default form submission
    const jobContainer = button.parentElement.querySelector('div'); // Find the container of the job input field

    // Increment the job value for the new job
    let jobValue = parseInt(jobContainer.dataset.value) + 1;
    const jobName = jobContainer.getAttribute('id'); // Get the ID of the job container

    // Create a new input field for the job certificate
    const jobInput = document.createElement('input');
    jobInput.setAttribute('type', 'text');
    jobInput.setAttribute('class', 'driver');
    jobInput.setAttribute('id', 'job-' + jobValue);
    jobInput.setAttribute('name', jobName);
    jobInput.setAttribute('placeholder', 'Certificate...');

    // Append the newly created input field to the job container
    jobContainer.appendChild(jobInput);
    
    // Update the container's data-value to reflect the new job count
    jobContainer.setAttribute('data-value', jobValue);
}