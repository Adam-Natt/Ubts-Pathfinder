
// Load custom icons for drawing markers with different colors
const icons = {
    red: L.icon({ iconUrl: 'marker/red_marker.png', iconSize: [32, 32] }),
    blue: L.icon({ iconUrl: 'marker/blue_marker.png', iconSize: [32, 32] }),
    green: L.icon({ iconUrl: 'marker/green_marker.png', iconSize: [32, 32] }),
    orange: L.icon({ iconUrl: 'marker/orange_marker.png', iconSize: [32, 32] }),
};

// Initialize the map, centered on Singapore coordinates with zoom level 11
const map = L.map('map').setView([1.366295, 103.802261], 11);

// Add OpenStreetMap tile layer to the map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Add geocoding control to the map for location search
L.Control.geocoder().addTo(map);

// Fetch and draw markers from jobsites data (currently commented out)
fetch('json/map/jobsites_v1.json')
    .then(response => response.json())
    .then(data => {
        // Uncomment to draw markers for each jobsite (for example, in green)
        // data.endpoints.forEach(endpoint => drawMarker(endpoint, icons.green));
    })
    .catch(error => console.error('Error fetching jobsites data:', error));

// Fetch and draw road network
fetch('json/map/road_network_v2.json')
    .then(response => response.json())
    .then(async data => { 
        drawRoadNetwork(data);  // Draw the road network on the map
    })
    .catch(error => console.error('Error fetching road network data:', error));

// Event listener for clicking on the map to get coordinates
map.on('click', onMapClick);


/**
 * Generates HTML to display daily driver job assignments
 * @param {Object} theTodaysJob - The data containing driver job assignments
 */
function createDailyDriverJobHtml(theTodaysJob) {
    const driverAndWorkContainer = document.getElementById('driver-and-work-container');
    const driverAndWorkDiv = document.createElement("div");

    // Loop through the driver's job data and create HTML elements for each driver
    for (const jobs in theTodaysJob) {
        const worklist = document.createElement("ol");
        worklist.setAttribute('class', 'worklist');
        worklist.textContent = 'Driver ' + jobs + ':';

        const workCheckbox = document.createElement("input");
        workCheckbox.setAttribute('id', 'driver-id-' + (Number(jobs) + 1));
        workCheckbox.setAttribute('type', 'checkbox');
        workCheckbox.setAttribute('name', 'option');
        workCheckbox.setAttribute('onclick', 'drawDriversJob(this)');
        workCheckbox.setAttribute('value', 'false');

        worklist.appendChild(workCheckbox);

        // Add job items for the current driver
        for (const job in theTodaysJob[jobs]) {
            const work = document.createElement("li");
            work.setAttribute('class', 'work');
            work.setAttribute('value', String(theTodaysJob[jobs][job]));
            work.textContent = String(theTodaysJob[jobs][job]);
            worklist.appendChild(work);
        }

        driverAndWorkDiv.appendChild(worklist);
    }

    driverAndWorkContainer.appendChild(driverAndWorkDiv);
}

/**
 * Draws or removes job markers and routes when a checkbox is clicked for a driver
 * @param {HTMLElement} button - The checkbox button for a specific driver
 */
function drawDriversJob(button) {
    const driver = button.parentElement.querySelector('input');
    const jobs = button.parentElement.querySelectorAll('li');

    // When checkbox is checked, draw job markers and routes
    if (driver.value === 'false') {
        driver.value = 'true';

        // Draw job markers in red
        for (let i = 0; i < jobs.length; i++) {
            drawJobMarker(strToArray(jobs[i].getAttribute('value')), icons.red);
        }

        // Draw routes between jobs for the driver
        for (let i = 0; i < jobs.length; i += 2) {
            createJobRoutes(jobs[i].getAttribute('value'), jobs[i + 1].getAttribute('value'), driver.getAttribute('id'));
        }
        
    } else if (driver.value === 'true') {
        // When checkbox is unchecked, remove job markers and routes
        driver.value = 'false';
        for (const job of jobs) {
            removeJobMarker(strToArray(job.getAttribute('value')));
        }
        removeJobPolyline(driver.getAttribute('id'));
    } else {
        console.log("Error in driver value");
    }
}

// Working on pseudocode for finding most efficient path of jobsite combination
// Drew the system design for the jobsite distribution algorithm

// Procedure of the code when a driver and jobsite is assigned
/*
Drew the process on the ipad
*/
