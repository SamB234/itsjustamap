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
 * @param {string} direction 'North', 'South', 'East', 'West'
 * @param {number} [sweepAngle=90] The total angle covered by the arc (e.g., 90 for a quarter circle)
 * @param {number} [numSegments=20] Number of segments for the arc itself (higher = smoother)
 * @returns {Array<[number, number]>} Array of [longitude, latitude] points forming the arc polygon
 */
export function getArcPoints(center, radiusKm, direction, sweepAngle = 90, numSegments = 20) {
    let startBearing;
    switch (direction) {
        case 'North':
            startBearing = 360 - (sweepAngle / 2); // e.g., for 90 deg sweep, starts at 315, ends at 45
            break;
        case 'East':
            startBearing = 90 - (sweepAngle / 2); // e.g., for 90 deg sweep, starts at 45, ends at 135
            break;
        case 'South':
            startBearing = 180 - (sweepAngle / 2); // e.g., for 90 deg sweep, starts at 135, ends at 225
            break;
        case 'West':
            startBearing = 270 - (sweepAngle / 2); // e.g., for 90 deg sweep, starts at 225, ends at 315
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
 * Generates GeoJSON for a curved line between two points.
 * Uses a quadratic Bezier curve for a slight arc.
 *
 * @param {[number, number]} startCoords [longitude, latitude] of the start point
 * @param {[number, number]} endCoords [longitude, latitude] of the end point
 * @param {number} [numPoints=50] Number of interpolation points for the curve (higher = smoother)
 * @param {number} [offsetFactor=0.2] Controls the "bend" of the curve. Higher value = more bend.
 * @returns {object} GeoJSON Feature of type LineString
 */
export function getCurvedLinePoints(startCoords, endCoords, numPoints = 50, offsetFactor = 0.2) {
    const [startLng, startLat] = startCoords;
    const [endLng, endLat] = endCoords;

    const points = [];

    // Calculate midpoint
    const midLng = (startLng + endLng) / 2;
    const midLat = (startLat + endLat) / 2;

    // Calculate perpendicular offset for the curve
    // This creates the "arc". The direction of the offset depends on the relative position of start/end.
    // We use a simplified cross product logic (dy, -dx) or (-dy, dx)
    const dx = endLng - startLng;
    const dy = endLat - startLat;

    // To ensure the curve is always "above" or "below" the straight line consistently,
    // we can base the offset direction on the midpoint's relation to the line.
    // A simple way for a consistent upward/downward curve on a map is to use the midpoint
    // and apply an offset based on the overall longitude difference.
    // For flight paths, a slight curve that bends "outwards" is common.

    // Calculate the control point for a quadratic Bezier curve
    // P(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    // Where P0 is startCoords, P2 is endCoords, and P1 is the control point.

    // Let's create a control point that's slightly off-center, perpendicular to the line.
    // A simple cross-product approach: (dy, -dx) for a vector perpendicular to (dx, dy)
    // Scale by a factor to control the curve's intensity.
    const perpX = -dy * offsetFactor;
    const perpY = dx * offsetFactor;

    // Apply the offset to the midpoint to get the control point
    const controlLng = midLng + perpX;
    const controlLat = midLat + perpY;

    // Generate points along the quadratic Bezier curve
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const x = (1 - t) * (1 - t) * startLng + 2 * (1 - t) * t * controlLng + t * t * endLng;
        const y = (1 - t) * (1 - t) * startLat + 2 * (1 - t) * t * controlLat + t * t * endLat;
        points.push([x, y]);
    }

    return {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: points
        }
    };
}
