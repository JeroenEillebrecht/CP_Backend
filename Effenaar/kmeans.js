const MAX_ITERATIONS = 50;

function createCentroids(denominator){
    let centroids = []
    for (let i = 0; i < denominator+1; i++) {
        for (let j = 0; j < denominator+1; j++) {
            for (let k = 0; k < denominator + 1; k++) {
                let centroid = [Math.round((1 / denominator * i) * 100) / 100, Math.round((1 / denominator * j) * 100) / 100, Math.round((1 / denominator * k) * 100) / 100]
                centroids.push(centroid)
            }
        }
    }
    return centroids
}

function randomBetween(min, max) {
    return Math.floor(
        Math.random() * (max - min) + min
    );
}

function calcMeanCentroid(dataSet, start, end) {
    const features = dataSet[0].length;
    const n = end - start;
    let mean = [];
    for (let i = 0; i < features; i++) {
        mean.push(0);
    }
    for (let i = start; i < end; i++) {
        for (let j = 0; j < features; j++) {
            mean[j] = mean[j] + dataSet[i][j] / n;
        }
    }
    return mean;
}

function getRandomCentroidsNaiveSharding(dataset, k) {
    // implementation of a variation of naive sharding centroid initialization method
    // (not using sums or sorting, just dividing into k shards and calc mean)
    // https://www.kdnuggets.com/2017/03/naive-sharding-centroid-initialization-method.html
    const numSamples = dataset.length;
    // Divide dataset into k shards:
    const step = Math.floor(numSamples / k);
    const centroids = [];
    for (let i = 0; i < k; i++) {
        const start = step * i;
        let end = step * (i + 1);
        if (i + 1 === k) {
            end = numSamples;
        }
        centroids.push(calcMeanCentroid(dataset, start, end));
    }
    return centroids;
}

function getRandomCentroids(dataset, k) {
    // selects random points as centroids from the dataset
    const numSamples = dataset.length;
    const centroidsIndex = [];
    let index;
    while (centroidsIndex.length < k) {
        index = randomBetween(0, numSamples);
        if (centroidsIndex.indexOf(index) === -1) {
            centroidsIndex.push(index);
        }
    }
    const centroids = [];
    for (let i = 0; i < centroidsIndex.length; i++) {
        const centroid = [...dataset[centroidsIndex[i]]];
        centroids.push(centroid);
    }
    return centroids;
}

function compareCentroids(a, b) {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

function shouldStop(oldCentroids, centroids, iterations) {
    if (iterations > MAX_ITERATIONS) {
        return true;
    }
    if (!oldCentroids || !oldCentroids.length) {
        return false;
    }
    let sameCount = true;
    for (let i = 0; i < centroids.length; i++) {
        if (!compareCentroids(centroids[i], oldCentroids[i])) {
            sameCount = false;
        }
    }
    return sameCount;
}

// Calculate Squared Euclidean Distance
function getDistanceSQ(a, b) {
    const diffs = [];
    for (let i = 0; i < a.length; i++) {
        diffs.push(a[i] - b[i]);
    }
    return diffs.reduce((r, e) => (r + (e * e)), 0);
}

// Returns a label for each piece of data in the dataset.
function getLabels(dataSet, centroids) {
    // prep data structure:
    const labels = {};
    for (let c = 0; c < centroids.length; c++) {
        labels[c] = {
            points: [],
            centroid: centroids[c],
        };
    }
    // For each element in the dataset, choose the closest centroid.
    // Make that centroid the element's label.
    for (let i = 0; i < dataSet.length; i++) {
        const a = dataSet[i];
        let closestCentroid, closestCentroidIndex, prevDistance;
        for (let j = 0; j < centroids.length; j++) {
            let centroid = centroids[j];
            if (j === 0) {
                closestCentroid = centroid;
                closestCentroidIndex = j;
                prevDistance = getDistanceSQ(a, closestCentroid);
            } else {
                // get distance:
                const distance = getDistanceSQ(a, centroid);
                if (distance < prevDistance) {
                    prevDistance = distance;
                    closestCentroid = centroid;
                    closestCentroidIndex = j;
                }
            }
        }
        // add point to centroid labels:
        labels[closestCentroidIndex].points.push(a);
    }
    return labels;
}

function getPointsMean(pointList) {
    const totalPoints = pointList.length;
    const means = [];
    for (let j = 0; j < pointList[0].length; j++) {
        means.push(0);
    }
    for (let i = 0; i < pointList.length; i++) {
        const point = pointList[i];
        for (let j = 0; j < point.length; j++) {
            const val = point[j];
            means[j] = means[j] + val / totalPoints;
        }
    }
    return means;
}

function recalculateCentroids(dataSet, labels, k) {
    // Each centroid is the geometric mean of the points that
    // have that centroid's label. Important: If a centroid is empty (no points have
    // that centroid's label) you should randomly re-initialize it.
    let newCentroid;
    const newCentroidList = [];
    for (const k in labels) {
        const centroidGroup = labels[k];
        if (centroidGroup.points.length > 0) {
            // find mean:
            newCentroid = getPointsMean(centroidGroup.points);
        } else {
            // get new random centroid
            newCentroid = getRandomCentroids(dataSet, 1)[0];
        }
        newCentroidList.push(newCentroid);
    }
    return newCentroidList;
}

function kmeans(dataset, k, useNaiveSharding = true) {
    if (dataset.length && dataset[0].length && dataset.length > k) {
        // Initialize book keeping variables
        let iterations = 0;
        let oldCentroids, labels, centroids;

        // Initialize centroids randomly
        if (useNaiveSharding) {
            centroids = getRandomCentroidsNaiveSharding(dataset, k);
        } else {
            centroids = getRandomCentroids(dataset, k);
        }

        // Run the main k-means algorithm
        while (!shouldStop(oldCentroids, centroids, iterations)) {
            // Save old centroids for convergence test.
            oldCentroids = [...centroids];
            iterations++;

            // Assign labels to each datapoint based on centroids
            labels = getLabels(dataset, centroids);
            centroids = recalculateCentroids(dataset, labels, k);
        }

        const clusters = [];
        for (let i = 0; i < k; i++) {
            clusters.push(labels[i]);
        }
        const results = {
            clusters: clusters,
            centroids: centroids,
            iterations: iterations,
            converged: iterations <= MAX_ITERATIONS,
        };
        return results;
    } else {
        throw new Error('Invalid dataset');
    }
}

function getClosestCentroid(spot, centroids){
    let distances = []
    centroids.forEach(centroid => {
        let distance = Math.sqrt(((spot[0]-centroid.centroid[0])**2) + ((spot[1]-centroid.centroid[1])**2) + ((spot[2]-centroid.centroid[2])**2))
        distances.push(distance)
    })

    let shortestDistance = Math.min(...distances)
    let index = distances.indexOf(shortestDistance)

    return centroids[index]
}
export function getMatchAverageDistance(spots, centroids){
    centroids.forEach(centroid => {
        let distances = []
        spots.forEach(spot => {
            let distance = Math.sqrt(((spot[0]-centroid.centroid[0])**2) + ((spot[1]-centroid.centroid[1])**2) + ((spot[2]-centroid.centroid[2])**2))
            distances.push(distance)
        })
        let getAverage = (distances) => distances.reduce((a, b) => a + b, 0) / distances.length
        let avg
        if(distances.length > 0){
            avg = getAverage(distances)
        }else{
            console.log("no data found")
        }
        centroid.avgDistance = avg
    })
    centroids.sort((a, b) => (a.avgDistance > b.avgDistance) ? 1 : -1)
    return centroids
}

function matchUser(userData, ArtistData){
    let artistData = ArtistData

    for (let i = 0; i < userData.length; i++) {
        let centroid = getClosestCentroid(userData[i], artistData).centroid
        artistData.forEach(artist => {
            if(centroid === (artist.centroid)){
                artist.score++
            }
        })
    }
    artistData.sort((a, b) => (a.score > b.score) ? -1 : 1)
    return artistData
}

let artistData = [
    {
        name: 'Ray',
        centroid: [0.2, 0.8, 0.9],
        score: 0,
        avgDistance: 0
    },
    {
        name: 'sor',
        centroid: [0.5, 0.75, 0.3],
        score: 0,
        avgDistance: 0
    }
]

let userData = [
    [0.5, 0.75, 0.3],
    [0.1, 0.75, 0.4],
    [0.2, 0.75, 0.6],
    [0.4, 0.75, 0.7],
    [0.1, 0.75, 0.3],
    [0.2, 0.75, 0.8],
    [0.8, 0.75, 0.3],
    [0.76, 0.75, 0.9],
    [0.5, 0.75, 0.3],
    [0.8, 0.75, 0.2],
    [0.5, 0.75, 0.3],
    [0.5, 0.75, 0.1],
    [0.5, 0.75, 0.3],
    [0.5, 0.75, 0.2],
    [0.5, 0.75, 0.3],
]

console.log(getMatchAverageDistance(userData, artistData))



