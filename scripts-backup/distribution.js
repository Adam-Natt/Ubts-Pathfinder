// Helper Function : Finds how much job each driver gets
function finalizeJobAmount(numberOfJobs, numberOfDrivers){
    const drivers = Object.assign({}, numberOfDrivers);     // Shallow copy
    const jobsLength = Object.keys(numberOfJobs).length;    // Object job length
    const driversLength = Object.keys(numberOfDrivers).length;  // Object driver length

    let jobsAssigned = []
    for(const driver in drivers){
        let temp = [driver,0,drivers[driver]]
        jobsAssigned.push(temp)
    }
    
    let assignJobAmount = distributeJobAmount(jobsLength, driversLength)
    let count = 0
    for(const job in jobsAssigned){
        jobsAssigned[job][1] = assignJobAmount[count]
        count++
    }

    return jobsAssigned
}

// Helper function to distribute job amount
function distributeJobAmount(jobsSize, driversSize){
    let jobAmount = new Array(driversSize).fill(0);
    let count = 0;
    for(let i=0; i<jobsSize; i++){
        if(count < driversSize-1){
            jobAmount[count]++
            count++
        }
        else if(count >= driversSize-1){
            jobAmount[count]++
            count = 0
        }else{
            console.error("Error: Assigning Job Amount Error")
        }   
    }
    return jobAmount
}

// Helper function, check if driver is qualified to enter jobsite
function checkCert(thisDriverCert, thisJobsiteCert){
        // Check if both arrays are equal
        if (thisDriverCert.length === thisJobsiteCert.length && thisDriverCert.every((value, index) => value === thisJobsiteCert[index])) {
            return true;
        }
        // Check if thisJobsiteCert is a subset of thisDriverCert
        return thisJobsiteCert.every(element => thisDriverCert.includes(element));
}

// Function to distribute the jobs among the drivers
function distributeJobs(numberOfJobs, numberOfDrivers, driversAndJobs){
    let jobs = Object.assign({}, numberOfJobs);     // Shallow copy
    let drivers = Object.assign({}, driversAndJobs);// Shallow Copy
    let works = {}
    let noWork = []

    // Initialize the work object with driversId as the keys and set their value to an empty array
    for(const driver in drivers){works[drivers[driver][0]] = []}
    
    // Traverse all drivers
    for(const driver in drivers){
        for(const jobsite in jobs){
            let driverId = drivers[driver][0] , driverCert = drivers[driver][2], jobsiteCert = jobs[jobsite];
            if(checkCert(driverCert,jobsiteCert)){
                if(driverCert.length > 0 && jobsiteCert.length > 0){
                    works[driverId].push(jobsite)
                }else{
                    works[driverId].push(jobsite)
                }
            }else{
                // cl(driverId,driverCert,jobsiteCert,'False')
                // cl(jobsite,'False')
                // noWork.push(jobsite)
            }
        }
    }

    let tempWorks= []
    let tempCount = 0;
    for(const work in works){
        let temp = [works[work],drivers[tempCount][1]]
        tempWorks.push(temp)
        tempCount++;
    }
    let newWorks = removeDuplicates(tempWorks);

    return newWorks
}

function removeDuplicates(arraysWithLimits){
    let usedElements = new Set();
    let result = [];
    
    arraysWithLimits.forEach(([array, limit]) => {
        let newArray = [];
        
        // Loop through the elements of the array
        for (let element of array) {
            // Add element if it's not already used
            if (!usedElements.has(element)) {
                newArray.push(element);
                usedElements.add(element);
            }
            // Stop if we reach the size limit
            if (newArray.length === limit) {
                break;
            }
        }
        
        // Add the new array to the result
        result.push(newArray);
    });
    
    return result;
}

// Newer Function

function matchDriversAndJobsites(nDrivers, nJobsites) {
    const result = {};

    for (const [driver, driverValues] of Object.entries(nDrivers)) {
        const matchedJobsites = [];

        for (const [jobsite, jobsiteValues] of Object.entries(nJobsites)) {
            // A match occurs if all jobsiteValues are in driverValues
            if (jobsiteValues.every(value => driverValues.includes(value))) {
                matchedJobsites.push(jobsite);
            }
        }

        // Add the matched jobsites for this driver
        result[driver] = matchedJobsites;
    }

    return result;
}

function balanceValuesAcrossKeys(data) {
    const keys = Object.keys(data);
    const allValues = new Map(); // To store the positions of each value across the arrays

    // Step 1: Collect occurrences of each value
    keys.forEach(key => {
        data[key].forEach(value => {
            if (!allValues.has(value)) {
                allValues.set(value, []);
            }
            allValues.get(value).push(key);
        });
    });

    // Step 2: Remove duplicates while balancing the load
    const seen = new Set();
    const result = Object.fromEntries(keys.map(key => [key, []]));

    allValues.forEach((keysWithValue, value) => {
        // Sort keys by the current load (array size)
        keysWithValue.sort((a, b) => result[a].length - result[b].length);

        // Assign the value to the least loaded key that hasn't seen it yet
        for (const key of keysWithValue) {
            if (!seen.has(value)) {
                result[key].push(value);
                seen.add(value);
                break;
            }
        }
    });

    return result;
}
