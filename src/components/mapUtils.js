// mapUtils.js
// This file contains a collection of geospatial utility functions for mapping applications.

// Helper functions for geographical calculations
// (Simplified for demonstration; for production, consider a robust geo-library like Turf.js)

/**
 * Converts degrees to radians.
 * @param {number} degrees
 * @returns {number} radians
 */
function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Converts radians to degrees.
 * @param {number} radians
 * @returns {number} degrees
 */
function toDegrees(radians) {
    return radians * 180 / Math.PI;
}

/**
 * Calculates a new point given a start point, bearing, and distance.
 * Uses Haversine formula for spherical earth.
 * @param {[number, number]} center [longitude, latitude]
 * @param {number} distanceKm Distance in kilometers
 * @param {number} bearingDegrees Bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West)
 * @returns {[number, number]} New point [longitude, latitude]
 */
function getPointAtDistanceBearing(center, distanceKm, bearingDegrees) {
    const R = 6371; // Earth's radius in kilometers
    const latRad = toRadians(center[1]);
    const lonRad = toRadians(center[0]);
    const bearingRad = toRadians(bearingDegrees);

    const latResultRad = Math.asin(
        Math.sin(latRad) * Math.cos(distanceKm / R) +
        Math.cos(latRad) * Math.sin(distanceKm / R) * Math.cos(bearingRad)
    );

    let lonResultRad = lonRad + Math.atan2(
        Math.sin(bearingRad) * Math.sin(distanceKm / R) * Math.cos(latRad),
        Math.cos(distanceKm / R) - Math.sin(latRad) * Math.sin(latResultRad)
    );

    // Normalize longitude to -180 to +180
    lonResultRad = (lonResultRad + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

    return [toDegrees(lonResultRad), toDegrees(latResultRad)];
}

/**
 * Generates points for a full circle (polygon)
 * @param {[number, number]} center [longitude, latitude]
 * @param {number} radiusKm Radius in kilometers
 * @param {number} [numSegments=64] Number of segments for the circle (higher = smoother)
 * @returns {Array<[number, number]>} Array of [longitude, latitude] points forming a circle
 */
export function getCirclePoints(center, radiusKm, numSegments = 64) {
    const points = [];
    for (let i = 0; i <= numSegments; i++) {
        const bearing = (i * 360) / numSegments;
        points.push(getPointAtDistanceBearing(center, radiusKm, bearing));
    }
    return points;
}

/**
 * Generates GeoJSON coordinates for an arc segment (a pie slice).
 * This will create a polygon starting from the center, going to the arc, and back to the center.
 *
 * @param {[number, number]} center [longitude, latitude]
 * @param {number} radiusKm Radius of the arc in kilometers
 * @param {string} direction 'N', 'S', 'E', 'W' OR 'North', 'South', 'East', 'West'
 * @param {number} [sweepAngle=90] The total angle covered by the arc (e.g., 90 for a quarter circle)
 * @param {number} [numSegments=20] Number of segments for the arc itself (higher = smoother)
 * @returns {Array<[number, number]>} Array of [longitude, latitude] points forming the arc polygon
 */
export function getArcPoints(center, radiusKm, direction, sweepAngle = 90, numSegments = 20) {
    const directionMap = {
        'N': 'N', 'North': 'N',
        'E': 'E', 'East': 'E',
        'S': 'S', 'South': 'S',
        'W': 'W', 'West': 'W',
    };

    const normalizedDirection = directionMap[direction];

    let startBearing;
    switch (normalizedDirection) {
        case 'N':
            startBearing = 360 - (sweepAngle / 2);
            break;
        case 'E':
            startBearing = 90 - (sweepAngle / 2);
            break;
        case 'S':
            startBearing = 180 - (sweepAngle / 2);
            break;
        case 'W':
            startBearing = 270 - (sweepAngle / 2);
            break;
        default:
            console.warn(`Invalid direction for arc: ${direction}`);
            return [];
    }

    const points = [center]; // Start from the center to form a pie slice

    for (let i = 0; i <= numSegments; i++) {
        const bearing = startBearing + (i * sweepAngle) / numSegments;
        points.push(getPointAtDistanceBearing(center, radiusKm, bearing));
    }

    points.push(center); // Close the polygon back to the center

    return points;
}

/**
 * Calculates a single destination point given a start point, direction, and distance.
 * @param {[number, number]} center [longitude, latitude]
 * @param {string} direction 'North', 'South', 'East', 'West'
 * @param {number} distanceKm Distance in kilometers
 * @returns {[number, number]} The destination point
 */
export function getDestinationPoint(center, direction, distanceKm) {
    let bearing;
    switch (direction) {
        case 'North': bearing = 0; break;
        case 'East':  bearing = 90; break;
        case 'South': bearing = 180; break;
        case 'West':  bearing = 270; break;
        default:      console.warn(`Invalid direction for destination point: ${direction}`); return center;
    }
    return getPointAtDistanceBearing(center, distanceKm, bearing);
}

/**
 * Generates GeoJSON for a curved line between two points.
 * @param {Array<[number, number]>} coordsArray [startCoords, endCoords]
 * @returns {object} GeoJSON LineString object
 */
export function getCurvedArc(coordsArray) {
    const startCoords = coordsArray[0];
    const endCoords = coordsArray[1];
    const midLng = (startCoords[0] + endCoords[0]) / 2;
    const midLat = (startCoords[1] + endCoords[1]) / 2;

    const dx = endCoords[0] - startCoords[0];
    const dy = endCoords[1] - startCoords[1];

    let perpX = -dy;
    let perpY = dx;
    if (perpY < 0) {
        perpX = -perpX;
        perpY = -perpY;
    }

    const offsetFactor = 0.5;
    const controlLng = midLng + perpX * offsetFactor;
    const controlLat = midLat + perpY * offsetFactor;

    const points = [];
    const numPoints = 50;
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const x = (1 - t) * (1 - t) * startCoords[0] + 2 * (1 - t) * t * controlLng + t * t * endCoords[0];
        const y = (1 - t) * (1 - t) * startCoords[1] + 2 * (1 - t) * t * controlLat + t * t * endCoords[1];
        points.push([x, y]);
    }

    return {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: points
        },
        properties: {}
    };
}

/**
 * Generates GeoJSON coordinates for a curved line between two points.
 * Uses a quadratic Bezier curve for a slight arc, ensuring the curve is always "upwards" (umbrella shape).
 *
 * @param {[number, number]} startCoords [longitude, latitude] of the start point
 * @param {[number, number]} endCoords [longitude, latitude] of the end point
 * @param {number} [numPoints=50] Number of interpolation points for the curve (higher = smoother)
 * @param {number} [offsetFactor=0.2] Controls the "bend" of the curve. Higher value = more bend.
 * @returns {Array<[number, number]>} An array of [longitude, latitude] points
 */
export function getCurvedLinePoints(startCoords, endCoords, numPoints = 50, offsetFactor = 0.2) {
    const [startLng, startLat] = startCoords;
    const [endLng, endLat] = endCoords;

    const points = [];

    // Calculate midpoint
    const midLng = (startLng + endLng) / 2;
    const midLat = (startLat + endLat) / 2;

    const dx = endLng - startLng;
    const dy = endLat - startLat;

    // Calculate the perpendicular vector
    let perpX = -dy;
    let perpY = dx;

    // Check the direction of the perpendicular vector's Y component
    // If it's negative, it means the curve would be a "bowl".
    // We flip the vector to ensure it always points "up" (umbrella shape).
    if (perpY < 0) {
        perpX = -perpX;
        perpY = -perpY;
    }
    
    const controlLng = midLng + perpX * offsetFactor;
    const controlLat = midLat + perpY * offsetFactor;

    // Generate points along the quadratic Bezier curve
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const x = (1 - t) * (1 - t) * startLng + 2 * (1 - t) * t * controlLng + t * t * endLng;
        const y = (1 - t) * (1 - t) * startLat + 2 * (1 - t) * t * controlLat + t * t * endLat;
        points.push([x, y]);
    }

    return points;
}

/**
 * Checks if a point is inside a polygon using the Ray-Casting algorithm.
 * This is the same function from my previous response, now moved here.
 * @param {[number, number]} point [longitude, latitude]
 * @param {Array<[number, number]>} polygon Array of [longitude, latitude] points
 * @returns {boolean} True if the point is inside the polygon, false otherwise
 */
export function isPointInPolygon(point, polygon) {
    const x = point[0]; // Point's longitude
    const y = point[1]; // Point's latitude

    let isInside = false;

    // Loop through each edge of the polygon
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0]; // Longitude of the current vertex
        const yi = polygon[i][1]; // Latitude of the current vertex
        const xj = polygon[j][0]; // Longitude of the previous vertex
        const yj = polygon[j][1]; // Latitude of the previous vertex

        // Ray-casting algorithm: check if a horizontal ray from the point
        // intersects with the polygon edge.
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        
        // If the ray intersects, flip the state of `isInside`.
        if (intersect) {
            isInside = !isInside;
        }
    }

    return isInside;
}
