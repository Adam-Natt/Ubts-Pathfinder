// CONSTANTS
const LOGISTIC_DRIVER_START_END_LOCATION = '1.3053692855071002, 103.73862158586589';
// const LOGISTIC_DRIVER_START_END_LOCATION = '0, 0';

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

// Take user's start and end destination input
function userRouteInput() {
    // Get all inputs with the name 'destination'
    const userDestinations = document.querySelectorAll('input[name="destination"]');
    let destinations = [];

    userDestinations.forEach(points => {
        destinations.push(points.value);
    });

    for(let i=0; i<destinations.length; i+=2){
        createRoutes(destinations[i],destinations[i+1])
    }
}

// Function to draw user's route from a start destination to an end destiantion
async function createRoutes(start, end){
    // Get the value of the user input
    const startDestination = start  // String
    const endDestination = end      // String

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

async function userWorkInput(){
    const driverAmount = document.querySelectorAll('input[name="driver"]');
    let drivers = []
    driverAmount.forEach(driver => {
        drivers.push(driver.value)
    })
    
    const userWorkload = document.querySelectorAll('input[name="workload"]');
    let workload = []
    userWorkload.forEach(work => {
        workload.push(work.value)
    })

    for (let i = 0; i < workload.length; i++) {
        for (let j = i + 1; j < workload.length; j++) {
            console.log(`(${workload[i]}, ${workload[j]})`);
            createRoutes(workload[i],workload[j])
        }
      }
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
        console.log("Creating Driver Amount Error!")
    }
}

let jobCount = 1;
function userCreateJob(){
    createJob(jobCount)
    jobCount++;
}

function createDriver(driver_n){
    const driverDiv = document.getElementById('driver-div');
    const driver = document.createElement('div');
    driver.setAttribute('id','driver-' + driver_n);

    const driverJob = document.createElement('div');
    driverJob.setAttribute('id','D' + driver_n)
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
    driverInput.setAttribute('name', 'D' + driver_n);
    driverInput.setAttribute('placeholder', 'Certificate...');

    driver.appendChild(driverLabel)
    driver.appendChild(driverAddButton)
    driver.appendChild(driverInput)
    driver.appendChild(driverJob)
    driverDiv.appendChild(driver)
}

function createJob(job_n){
    const jobDiv = document.getElementById('job-div');
    const job = document.createElement('div');
    job.setAttribute('id','job' + job_n);

    const jobsite = document.createElement('div');
    jobsite.setAttribute('id','job-' + job_n)
    jobsite.setAttribute('data-value','1');

    const jobAddButton = document.createElement('button');
    jobAddButton.setAttribute('class','add-btn');
    jobAddButton.setAttribute('onclick','addJob(this)');
    jobAddButton.textContent = "+";

    const jobLabel = document.createElement('label')
    jobLabel.setAttribute('for','job');
    jobLabel.setAttribute('class','driver-label')
    jobLabel.textContent = 'Jobsite ' + job_n;

    const jobsiteCoordinate = document.createElement('input');
    jobsiteCoordinate.setAttribute('type', 'text');
    jobsiteCoordinate.setAttribute('class', 'jobsite-coordinate-class');
    jobsiteCoordinate.setAttribute('id', 'jobsite-coordinate-id-' + job_n);
    jobsiteCoordinate.setAttribute('name', 'jobsite-coordinate-name-' + job_n);
    jobsiteCoordinate.setAttribute('placeholder', 'Enter Jobsite Coordinate')

    const jobInput = document.createElement('input');
    jobInput.setAttribute('type', 'text');
    jobInput.setAttribute('class','driver');
    jobInput.setAttribute('id', 'job-' + job_n);
    jobInput.setAttribute('name', 'job-' + job_n);
    // jobInput.setAttribute('value','')
    jobInput.setAttribute('placeholder', 'Certificate...');

    job.appendChild(jobLabel)
    job.appendChild(jobAddButton)
    job.appendChild(jobsiteCoordinate)
    job.appendChild(jobInput)
    job.appendChild(jobsite)
    jobDiv.appendChild(job)
}

function transformDriverData(input) {
    // Dynamically determine unique drivers
    const uniqueDrivers = [...new Set(input.map(([driver]) => driver))];
  
    // Transform into desired structure
    return uniqueDrivers.reduce((acc, driver) => {
      acc[driver] = input
        .filter(([d]) => d === driver) // Filter entries for the current driver
        .map(([, cert]) => cert); // Map to just the certificates
      return acc;
    }, {});
}

function transformJobsiteData(input) {
    return Object.fromEntries(
        input.slice(1).map(group => { // Start from index 1
            const coordinates = group[0][1];
            const jobs = group.slice(1).map(item => item[1]);
            return [coordinates, jobs];
        })
    );
}

function generateJob(button){
    event.preventDefault();
    const form = document.getElementById('driver-form');
    const inputs = form.getElementsByTagName('input');
    const values = Array.from(inputs).map(input => [input.name, input.value]);

    let groupedArrays = [];
    let currentGroup = [];

    // Iterate over each element in the array
    values.forEach(item => {
        // Check if item contains "jobsite-coordinate-name"
        if (item[0].startsWith("jobsite-coordinate-name")) {
            // If currentGroup has elements, push it to groupedArrays
            if (currentGroup.length > 0) {
                groupedArrays.push(currentGroup);
            }
            // Start a new group with the current jobsite element
            currentGroup = [item];
        } else {
            // Add the item to the current group
            currentGroup.push(item);
        }
    });

    // Push the last group if it has elements
    if (currentGroup.length > 0) {
        groupedArrays.push(currentGroup);
    }

    let param_1 = transformJobsiteData(groupedArrays); // Jobsite & Cert
    for (let key in param_1) {
        if (param_1[key].length === 1 && param_1[key][0] === "") {
            param_1[key] = [];
        }
    }

    let param_2 = transformDriverData(groupedArrays[0]); // Driver & Cert
    // Job Distrubuted

    console.log("Param 1")
    console.log(param_1)

    console.log("Param 2")
    console.log(param_2)

    console.log("Job Distribution")
    let todaysJob = matchDriversAndJobsites(param_2,param_1)
    todaysJob = balanceValuesAcrossKeys(todaysJob)
    
    // Add origin location the start and end of the joblist
    for(const jobs in todaysJob){
        todaysJob[jobs].unshift(LOGISTIC_DRIVER_START_END_LOCATION)
        todaysJob[jobs].push(LOGISTIC_DRIVER_START_END_LOCATION)
    }

    console.log("Todays Job")
    console.log(todaysJob)

    createDailyDriverJobHtml(todaysJob)
}

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
    event.preventDefault();
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
    event.preventDefault();
    const driverContainer = button.parentElement.querySelector('div');
    
    let driverValue = parseInt(driverContainer.dataset.value) + 1;
    const driverName = driverContainer.getAttribute('id')
    
    // Create the driver elements
    const driverInput = document.createElement('input');
    driverInput.setAttribute('type', 'text');
    driverInput.setAttribute('class','driver');
    driverInput.setAttribute('id', 'driver-' + driverValue);
    driverInput.setAttribute('name', driverName);
    driverInput.setAttribute('placeholder', 'Certificate...');

    driverContainer.appendChild(driverInput);
    driverContainer.setAttribute('data-value',driverValue)
}

function addJob(button){
    event.preventDefault();
    const jobContainer = button.parentElement.querySelector('div');

    let jobValue = parseInt(jobContainer.dataset.value) + 1;
    const jobName = jobContainer.getAttribute('id')

    // Create the driver elements
    const jobInput = document.createElement('input');
    jobInput.setAttribute('type', 'text');
    jobInput.setAttribute('class','driver');
    jobInput.setAttribute('id', 'job-' + jobValue);
    jobInput.setAttribute('name', jobName);
    jobInput.setAttribute('placeholder', 'Certificate...');

    jobContainer.appendChild(jobInput);
    jobContainer.setAttribute('data-value',jobValue)
}

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
        // data.endpoints.forEach(endpoint => drawMarker(endpoint, icons.green));
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

function createDailyDriverJobHtml(theTodaysJob){
    const driverAndWorkContainer = document.getElementById('driver-and-work-container');
    const driverAndWorkDiv = document.createElement("div");

    for(const jobs in theTodaysJob){
        const worklist = document.createElement("ol")
        worklist.setAttribute('class', 'worklist')
        console.log(jobs)
        // worklist.textContent = 'Driver ' + (Number(jobs) + 1) + ':'
        worklist.textContent = 'Driver ' + (jobs) + ':'
        
        const workCheckbox = document.createElement("input")
        workCheckbox.setAttribute('id','driver-id-' + (Number(jobs) + 1))
        workCheckbox.setAttribute('type','checkbox')
        workCheckbox.setAttribute('name','option')
        workCheckbox.setAttribute('onclick', 'drawDriversJob(this)')
        workCheckbox.setAttribute('value', 'false')
    

        worklist.appendChild(workCheckbox)
        for(const job in theTodaysJob[jobs]){
            const work = document.createElement("li")
            work.setAttribute('class', 'work')
            work.setAttribute('value', String(theTodaysJob[jobs][job]))
            work.textContent = String(theTodaysJob[jobs][job])
            worklist.appendChild(work)
        }
        driverAndWorkDiv.appendChild(worklist)
    }
    driverAndWorkContainer.appendChild(driverAndWorkDiv)
}

// Draws all the driver's jobsite and remove when the checkbox is unchecked
function drawDriversJob(button){
    const driver = button.parentElement.querySelector('input')
    const jobs = button.parentElement.querySelectorAll('li')

    if(driver.value == 'false'){
        driver.value = 'true'

        for(let i=0; i<jobs.length; i++){
            drawJobMarker(strToArray(jobs[i].getAttribute('value')),icons.red)
        }

        for(let i=0; i<jobs.length; i+=2){
            createJobRoutes(jobs[i].getAttribute('value'),jobs[i+1].getAttribute('value'),driver.getAttribute('id'))
        }
        
    }
    else if( driver.value == 'true'){
        driver.value = 'false'
        for(const job of jobs){
            removeJobMarker(strToArray(job.getAttribute('value')))
        }
        removeJobPolyline(driver.getAttribute('id'))
    }
    else{
        console.log("Error in driver value")
    }

}

/* 
    Unit Test

    const theNumberOfDrivers = {
        'D1' : ['First Aid Cert'],
        'D2' : ['Clean Cert', 'Heavy Duty Cert'],
        'D3' : [],
        'D4' : ['Hazard Cert', 'Fire Safety Cert', 'Chemical Cert'],
        'D5' : ['Hazard Cert'],
        'D6' : []
    };

    const theNumberOfJobs = {
        "1.335834, 103.639269" : ['Clean Cert'],
        "1.319487, 103.677506" : [],
        "1.320646, 103.702526" : ['Chemical Cert', 'Fire Safety Cert'],
        "1.31125, 103.70935" : ['Hazard Cert', 'Weapon Cert'],
        "1.309576, 103.677077" : [],
        "1.321375, 103.644891" : ['Clean Cert', 'Heavy Duty Cert'],
        "1.454073, 103.794794" : ['Hazard Cert', 'First Aid Cert'],
        "1.336778, 103.897533" : []
    };

    const theNumberOfDrivers = {
        'D1' : [],
        'D2' : ['Hazard Cert','Clean Cert','Chemical Cert','Heavy Duty Cert'],
        'D3' : ['Weapon Cert','Hazard Cert']
    };

    const theNumberOfJobs = {
        "1, 2" : [],
        "3, 4" : ['Hazard Cert','Clean Cert','Chemical Cert','Heavy Duty Cert'],
        "5, 6" : [],
        "7, 8" : ['Weapon Cert'],
        "9, 10" : ['Hazard Cert','Weapon Cert'],
        "11, 12" : [],
        "13, 14" : []
    }

    const nDrivers = {
        'D1' : ['B'],
        'D2' : ['B','C'],
        'D3' : [],
        'D4' : ['D','E','F'],
        'D5' : ['D'],
        'D6' : [],
        'D7' : ['B','C','F','E','D','G','A'],
    }

    const nJobsites = {
        '1.0, 2.0' : ['B'],
        '3.0, 4.0' : [],
        '5.0, 6.0' : ['F','E'],
        '7.0, 8.0' : ['D','G'],
        '9.0, 10.0' : [],
        '11.0, 12.0' : ['B','C'],
        '13.0, 14.0' : ['D','A'],
    }
*/



    // const theNumberOfDrivers = {
    //     'D1' : ['First Aid Cert'],
    //     'D2' : ['Clean Cert', 'Heavy Duty Cert'],
    //     'D3' : [],
    //     'D4' : ['Hazard Cert', 'Fire Safety Cert', 'Chemical Cert'],
    //     'D5' : ['Hazard Cert'],
    //     'D6' : [],
    //     'D7' : ['Clean Cert', 'Heavy Duty Cert', 'Chemical Cert', 'Fire Safety Cert', 'Hazard Cert', 'Weapon Cert', 'First Aid Cert']
    //  };

    // const theNumberOfJobs = {
    //     "1.335834, 103.639269" : ['Clean Cert'],
    //     "1.319487, 103.677506" : [],
    //     "1.320646, 103.702526" : ['Chemical Cert', 'Fire Safety Cert'],
    //     "1.31125, 103.70935" : ['Hazard Cert', 'Weapon Cert'],
    //     "1.309576, 103.677077" : [],
    //     "1.321375, 103.644891" : ['Clean Cert', 'Heavy Duty Cert'],
    //     "1.454073, 103.794794" : ['Hazard Cert', 'First Aid Cert'],
    //     "1.336778, 103.897533" : []
    // };

    // const theNumberOfJobs = {
    //         "1, 2" : ['Clean Cert'],
    //         "3, 4" : [],
    //         "5, 6" : ['Chemical Cert', 'Fire Safety Cert'],
    //         "7, 8" : ['Hazard Cert', 'Weapon Cert'],
    //         "9, 10" : [],
    //         "11, 12" : ['Clean Cert', 'Heavy Duty Cert'],
    //         "13, 14" : ['Hazard Cert', 'First Aid Cert'],
    //         "15, 16" : []
    //     };

    // let todaysJob = distributeJobs(
    //         param_1,
    //         param_2, 
    //         param_3
    //     )
    
    // let todaysJob = distributeJobs(
    //     transformJobsiteData(groupedArrays),
    //     transformDriverData(groupedArrays[0]), 
    //     finalizeJobAmount(transformJobsiteData(groupedArrays), transformDriverData(groupedArrays[0]))
    // )

    // console.log("Todays Job")
    // console.log(todaysJob)


/*
    Things to note:
        - duplicated jobsite is not removed 
 */



/* 
    Unit Test

    const theNumberOfDrivers = {
        'D1' : ['First Aid Cert'],
        'D2' : ['Clean Cert', 'Heavy Duty Cert'],
        'D3' : [],
        'D4' : ['Hazard Cert', 'Fire Safety Cert', 'Chemical Cert'],
        'D5' : ['Hazard Cert'],
        'D6' : []
    };

    const theNumberOfJobs = {
        "1.335834, 103.639269" : ['Clean Cert'],
        "1.319487, 103.677506" : [],
        "1.320646, 103.702526" : ['Chemical Cert', 'Fire Safety Cert'],
        "1.31125, 103.70935" : ['Hazard Cert', 'Weapon Cert'],
        "1.309576, 103.677077" : [],
        "1.321375, 103.644891" : ['Clean Cert', 'Heavy Duty Cert'],
        "1.454073, 103.794794" : ['Hazard Cert', 'First Aid Cert'],
        "1.336778, 103.897533" : []
    };

    const theNumberOfDrivers = {
        'D1' : [],
        'D2' : ['Hazard Cert','Clean Cert','Chemical Cert','Heavy Duty Cert'],
        'D3' : ['Weapon Cert','Hazard Cert']
    };

    const theNumberOfJobs = {
        "1, 2" : [],
        "3, 4" : ['Hazard Cert','Clean Cert','Chemical Cert','Heavy Duty Cert'],
        "5, 6" : [],
        "7, 8" : ['Weapon Cert'],
        "9, 10" : ['Hazard Cert','Weapon Cert'],
        "11, 12" : [],
        "13, 14" : []
    }

    const nDrivers = {
        'D1' : ['B'],
        'D2' : ['B','C'],
        'D3' : [],
        'D4' : ['D','E','F'],
        'D5' : ['D'],
        'D6' : [],
        'D7' : ['B','C','F','E','D','G','A'],
    }

    const nJobsites = {
        '1.0, 2.0' : ['B'],
        '3.0, 4.0' : [],
        '5.0, 6.0' : ['F','E'],
        '7.0, 8.0' : ['D','G'],
        '9.0, 10.0' : [],
        '11.0, 12.0' : ['B','C'],
        '13.0, 14.0' : ['D','A'],
    }
*/



    // const theNumberOfDrivers = {
    //     'D1' : ['First Aid Cert'],
    //     'D2' : ['Clean Cert', 'Heavy Duty Cert'],
    //     'D3' : [],
    //     'D4' : ['Hazard Cert', 'Fire Safety Cert', 'Chemical Cert'],
    //     'D5' : ['Hazard Cert'],
    //     'D6' : [],
    //     'D7' : ['Clean Cert', 'Heavy Duty Cert', 'Chemical Cert', 'Fire Safety Cert', 'Hazard Cert', 'Weapon Cert', 'First Aid Cert']
    //  };

    // const theNumberOfJobs = {
    //     "1.335834, 103.639269" : ['Clean Cert'],
    //     "1.319487, 103.677506" : [],
    //     "1.320646, 103.702526" : ['Chemical Cert', 'Fire Safety Cert'],
    //     "1.31125, 103.70935" : ['Hazard Cert', 'Weapon Cert'],
    //     "1.309576, 103.677077" : [],
    //     "1.321375, 103.644891" : ['Clean Cert', 'Heavy Duty Cert'],
    //     "1.454073, 103.794794" : ['Hazard Cert', 'First Aid Cert'],
    //     "1.336778, 103.897533" : []
    // };

    // const theNumberOfJobs = {
    //         "1, 2" : ['Clean Cert'],
    //         "3, 4" : [],
    //         "5, 6" : ['Chemical Cert', 'Fire Safety Cert'],
    //         "7, 8" : ['Hazard Cert', 'Weapon Cert'],
    //         "9, 10" : [],
    //         "11, 12" : ['Clean Cert', 'Heavy Duty Cert'],
    //         "13, 14" : ['Hazard Cert', 'First Aid Cert'],
    //         "15, 16" : []
    //     };

    // let todaysJob = distributeJobs(
    //         param_1,
    //         param_2, 
    //         param_3
    //     )
    
    // let todaysJob = distributeJobs(
    //     transformJobsiteData(groupedArrays),
    //     transformDriverData(groupedArrays[0]), 
    //     finalizeJobAmount(transformJobsiteData(groupedArrays), transformDriverData(groupedArrays[0]))
    // )

    // console.log("Todays Job")
    // console.log(todaysJob)