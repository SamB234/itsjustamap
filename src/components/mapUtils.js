// mapUtils.js

// This file contains a collection of geospatial utility functions for mapping applications.

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

    lonResultRad = (lonResultRad + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    return [toDegrees(lonResultRad), toDegrees(latResultRad)];
}

/**
 * Calculates the distance between two points on the Earth's surface using the Haversine formula.
 * @param {[number, number]} p1 [longitude, latitude] of the first point
 * @param {[number, number]} p2 [longitude, latitude] of the second point
 * @returns {number} The distance in kilometers
 */
export function getDistance(p1, p2) {
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
    return (bearing + 360) % 360;
}

/**
 * Helper function to map a direction string to its bearing range.
 * @param {string} direction 'North', 'South', 'East', 'West'
 * @returns {Array<number>} [minBearing, maxBearing]
 */
function getDirectionBearing(direction) {
    switch (direction.toLowerCase()) {
        case 'north': return [315, 45];
        case 'east': return [45, 135];
        case 'south': return [135, 225];
        case 'west': return [225, 315];
        default: return [0, 360];
    }
}

/**
 * Generates GeoJSON coordinates for a full circle (polygon)
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
 * @param {[number, number]} center [longitude, latitude]
 * @param {number} radiusKm Radius of the arc in kilometers
 * @param {string} direction 'North', 'South', 'East', 'West'
 * @param {number} [numSegments=20] Number of segments for the arc itself (higher = smoother)
 * @returns {Array<[number, number]>} Array of [longitude, latitude] points forming the arc polygon
 */
export function getArcPoints(center, radiusKm, direction, numSegments = 20) {
    const [minBearing, maxBearing] = getDirectionBearing(direction);
    const sweepAngle = (maxBearing - minBearing + 360) % 360;

    const points = [center];
    const startBearing = minBearing;

    for (let i = 0; i <= numSegments; i++) {
        const bearing = startBearing + (i * sweepAngle) / numSegments;
        points.push(getPointAtDistanceBearing(center, radiusKm, bearing));
    }

    points.push(center);
    return points;
}

/**
 * Calculates a bounding box [minLng, minLat, maxLng, maxLat] for the search arc.
 * @param {[number, number]} center [longitude, latitude]
 * @param {number} radiusKm Radius of the arc in kilometers
 * @param {string} direction 'North', 'South', 'East', 'West'
 * @returns {Array<number>|null} The bounding box or null if the direction is invalid.
 */
export function getArcBoundingBox(center, radiusKm, direction) {
    const [minBearing, maxBearing] = getDirectionBearing(direction);
    const R = 6371;

    const calculateNewPoint = (bearing) => {
        const latRad = toRadians(center[1]);
        const lonRad = toRadians(center[0]);
        const bearingRad = toRadians(bearing);

        const lat2 = Math.asin(Math.sin(latRad) * Math.cos(radiusKm / R) + Math.cos(latRad) * Math.sin(radiusKm / R) * Math.cos(bearingRad));
        const lon2 = lonRad + Math.atan2(
            Math.sin(bearingRad) * Math.sin(radiusKm / R) * Math.cos(latRad),
            Math.cos(radiusKm / R) - Math.sin(latRad) * Math.sin(lat2)
        );

        return [toDegrees(lon2), toDegrees(lat2)];
    };

    const point1 = calculateNewPoint(minBearing);
    const point2 = calculateNewPoint(maxBearing);
    
    const points = [
        { latitude: center[1], longitude: center[0] },
        { latitude: point1[1], longitude: point1[0] },
        { latitude: point2[1], longitude: point2[0] }
    ];
    
    let latMin = Infinity, latMax = -Infinity, lonMin = Infinity, lonMax = -Infinity;
    for (const p of points) {
        latMin = Math.min(latMin, p.latitude);
        latMax = Math.max(latMax, p.latitude);
        lonMin = Math.min(lonMin, p.longitude);
        lonMax = Math.max(lonMax, p.longitude);
    }
    
    const buffer = 0.05;
    return [lonMin - buffer, latMin - buffer, lonMax + buffer, latMax + buffer];
}

/**
 * Checks if a point is within the arc defined by a center, radius, and direction.
 * @param {[number, number]} point [longitude, latitude]
 * @param {[number, number]} center [longitude, latitude]
 * @param {number} radiusKm Radius of the arc in kilometers
 * @param {string} direction 'North', 'South', 'East', 'West'
 * @returns {boolean} True if the point is within the arc, false otherwise
 */
export function isPointInArc(point, center, radiusKm, direction) {
    const distance = getDistance(center, point);
    if (distance > radiusKm) {
        return false;
    }

    const bearing = getBearing(center, point);
    const [minBearing, maxBearing] = getDirectionBearing(direction);

    if (direction.toLowerCase() === 'overview') {
        return true;
    }

    if (minBearing > maxBearing) {
        return bearing >= minBearing || bearing <= maxBearing;
    } else {
        return bearing >= minBearing && bearing <= maxBearing;
    }
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
        case 'East': bearing = 90; break;
        case 'South': bearing = 180; break;
        case 'West': bearing = 270; break;
        default: console.warn(`Invalid direction for destination point: ${direction}`); return center;
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

    const midLng = (startLng + endLng) / 2;
    const midLat = (startLat + endLat) / 2;

    const dx = endLng - startLng;
    const dy = endLat - startLat;

    let perpX = -dy;
    let perpY = dx;

    if (perpY < 0) {
        perpX = -perpX;
        perpY = -perpY;
    }
    
    const controlLng = midLng + perpX * offsetFactor;
    const controlLat = midLat + perpY * offsetFactor;

    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const x = (1 - t) * (1 - t) * startLng + 2 * (1 - t) * t * controlLng + t * t * endLng;
        const y = (1 - t) * (1 - t) * startLat + 2 * (1 - t) * t * controlLat + t * t * endLat;
        points.push([x, y]);
    }

    return points;
}
