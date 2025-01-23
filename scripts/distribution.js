/**
 * Matches drivers to jobsites based on shared attributes.
 * @param {object} nDrivers - An object where keys are driver IDs and values are arrays of driver attributes.
 * @param {object} nJobsites - An object where keys are jobsite IDs and values are arrays of required attributes.
 * @returns {object} - An object where each driver ID is matched to an array of compatible jobsite IDs.
 */
function matchDriversAndJobsites(nDrivers, nJobsites) {
    const result = {};

    // Iterate over each driver and their attributes
    for (const [driver, driverValues] of Object.entries(nDrivers)) {
        const matchedJobsites = [];

        // Compare driver attributes with each jobsite's required attributes
        for (const [jobsite, jobsiteValues] of Object.entries(nJobsites)) {
            // A match occurs if all jobsite requirements are met by the driver
            if (jobsiteValues.every(value => driverValues.includes(value))) {
                matchedJobsites.push(jobsite); // Add the matching jobsite
            }
        }

        // Store matched jobsites for the current driver
        result[driver] = matchedJobsites;
    }

    return result;
}

/**
 * Distributes values across keys in a balanced manner to minimize load imbalance.
 * @param {object} data - An object where keys are IDs and values are arrays of associated values.
 * @returns {object} - A new object where values are balanced across keys.
 */
function balanceValuesAcrossKeys(data) {
    // console.log(data)
    const keys = Object.keys(data); // Extract all keys
    const allValues = new Map(); // Map to store the positions of each value across keys

    // Step 1: Collect occurrences of each value across all keys
    keys.forEach(key => {
        data[key].forEach(value => {
            if (!allValues.has(value)) {
                allValues.set(value, []);
            }
            allValues.get(value).push(key); // Track which keys contain the value
        });
    });

    // Step 2: Distribute values while balancing the load
    const seen = new Set(); // Track values that have already been assigned
    const result = Object.fromEntries(keys.map(key => [key, []])); // Initialize result with empty arrays

    allValues.forEach((keysWithValue, value) => {
        // Sort keys by their current load (number of assigned values)
        keysWithValue.sort((a, b) => result[a].length - result[b].length);

        // Assign the value to the least loaded key that hasn't seen it yet
        for (const key of keysWithValue) {
            if (!seen.has(value)) {
                result[key].push(value);
                seen.add(value); // Mark the value as assigned
                break;
            }
        }
    });

    return result;
}
