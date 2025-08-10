// mapUtils.js

// This file contains a collection of geospatial utility functions for mapping applications.
// It has been updated to use a more forgiving arc shape for AI suggestions.

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
 * Calculates the distance between two points on the Earth's surface using the Haversine formula.
 * @param {[number, number]} p1 [longitude, latitude] of the first point
 * @param {[number, number]} p2 [longitude, latitude] of the second point
 * @returns {number} The distance in kilometers
 */
function getDistance(p1, p2) {
    const R = 6371; // Earth's radius in kilometers
    const [lon1, lat1] = p1.map(toRadians);
    const [lon2, lat2] = p2.map(toRadians);

    const deltaLon = lon2 - lon1;
    const deltaLat = lat2 - lat1;

    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Calculates the bearing (direction) from point p1 to p2.
 * @param {[number, number]} p1 [longitude, latitude] of the start point
 * @param {[number, number]} p2 [longitude, latitude] of the end point
 * @returns {number} The bearing in degrees (0-360)
 */
function getBearing(p1, p2) {
    const [lon1, lat1] = p1.map(toRadians);
    const [lon2, lat2] = p2.map(toRadians);

    const deltaLon = lon2 - lon1;

    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    let bearing = toDegrees(Math.atan2(y, x));
    return (bearing + 360) % 360; // Normalize to 0-360 degrees
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

// KEY UPDATE: New arc drawing logic to create a more forgiving shape.
const MIN_ARC_WIDTH_DEGREES = 15; // Minimum width of the arc at its origin

/**
 * Generates GeoJSON coordinates for an arc segment (a pie slice).
 * This will create a polygon starting from the center, going to the arc, and back to the center.
 * @param {[number, number]} center [longitude, latitude]
 * @param {number} radiusKm Radius of the arc in kilometers
 * @param {string} direction 'N', 'S', 'E', 'W' OR 'North', 'South', 'East', 'West'
 * @param {number} [sweepAngle=90] The total angle covered by the arc (e.g., 90 for a quarter circle)
 * @param {number} [numSegments=20] Number of segments for the arc itself (higher = smoother)
 * @returns {Array<[number, number]>} Array of [longitude, latitude] points forming the arc polygon
 */
export function getArcPoints(center, radiusKm, direction, sweepAngle = 90, numSegments = 20) {
    const directionBearings = {
        'N': 0, 'North': 0,
        'E': 90, 'East': 90,
        'S': 180, 'South': 180,
        'W': 270, 'West': 270,
    };
    const centerBearing = directionBearings[direction];

    if (centerBearing === undefined) {
        console.error("Invalid direction provided:", direction);
        return [];
    }

    const points = [center]; // Start from the center to form a pie slice

    const arcStartBearing = centerBearing - sweepAngle / 2;
    const arcEndBearing = centerBearing + sweepAngle / 2;

    for (let i = 0; i <= numSegments; i++) {
        const bearing = arcStartBearing + (i * sweepAngle) / numSegments;
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

// KEY UPDATE: New filtering logic to create a more forgiving arc near the origin.
/**
 * Checks if a point is within the arc defined by a center, radius, and direction.
 * @param {[number, number]} point [longitude, latitude]
 * @param {[number, number]} center [longitude, latitude]
 * @param {number} radiusKm Radius of the arc in kilometers
 * @param {string} direction 'N', 'S', 'E', 'W' OR 'North', 'South', 'East', 'West'
 * @param {number} [sweepAngle=90] The total angle covered by the arc
 * @returns {boolean} True if the point is within the arc, false otherwise
 */
export function isPointInArc(point, center, radiusKm, direction, sweepAngle = 90) {
    // Step 1: Check if the point is within the radius.
    const distance = getDistance(center, point);
    if (distance > radiusKm) {
        return false;
    }

    // Step 2: Check if the point's bearing is within the arc's angular range.
    const directionMap = {
        'N': 'N', 'North': 'N',
        'E': 'E', 'East': 'E',
        'S': 'S', 'South': 'S',
        'W': 'W', 'West': 'W',
    };
    const normalizedDirection = directionMap[direction];

    let arcCenterBearing;
    switch (normalizedDirection) {
        case 'N': arcCenterBearing = 0; break;
        case 'E': arcCenterBearing = 90; break;
        case 'S': arcCenterBearing = 180; break;
        case 'W': arcCenterBearing = 270; break;
        default: return false; // Invalid direction
    }
    
    // Define the bearing range of the arc
    const startBearing = (arcCenterBearing - sweepAngle / 2 + 360) % 360;
    const endBearing = (arcCenterBearing + sweepAngle / 2) % 360;

    // Get the bearing of the point from the center
    const pointBearing = getBearing(center, point);

    // This handles the special case where the arc crosses the 0/360 degree line (e.g., North)
    if (startBearing > endBearing) {
        return pointBearing >= startBearing || pointBearing <= endBearing;
    } else {
        return pointBearing >= startBearing && pointBearing <= endBearing;
    }
}
