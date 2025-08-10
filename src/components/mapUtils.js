// This file contains a collection of geospatial utility functions.
// The arc drawing and point-in-arc logic have been updated for reliability.

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
 * Uses Haversine formula for a spherical earth.
 * @param {number} lng - Starting longitude.
 * @param {number} lat - Starting latitude.
 * @param {number} distanceKm - Distance in kilometers.
 * @param {number} bearingDegrees - Bearing in degrees (0 = North, 90 = East, etc.).
 * @returns {Array<number>} - New point [longitude, latitude].
 */
export function getDestinationPoint(lng, lat, distanceKm, bearingDegrees) {
  const R = 6371; // Earth's radius in km
  const latRad = toRadians(lat);
  const lonRad = toRadians(lng);
  const bearingRad = toRadians(bearingDegrees);

  const endLat = Math.asin(
    Math.sin(latRad) * Math.cos(distanceKm / R) +
    Math.cos(latRad) * Math.sin(distanceKm / R) * Math.cos(bearingRad)
  );

  const endLng =
    lonRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distanceKm / R) * Math.cos(latRad),
      Math.cos(distanceKm / R) - Math.sin(latRad) * Math.sin(endLat)
    );

  return [toDegrees(endLng), toDegrees(endLat)];
}

/**
 * Generates an array of points forming a geographic arc (a pie slice polygon).
 *
 * @param {Array<number>} center - [longitude, latitude] of the arc's center.
 * @param {number} radius - Radius in kilometers.
 * @param {string} direction - 'N', 'S', 'E', or 'W'.
 * @returns {Array<Array<number>>} - Array of [lng, lat] points for the arc polygon.
 */
export function getArcPoints(center, radius, direction) {
  if (!center || typeof radius !== 'number' || !direction) {
    console.error("Invalid input for getArcPoints.");
    return [];
  }

  const [lng, lat] = center;
  const points = [];
  const numSegments = 32;

  let startBearing = 0, endBearing = 0;
  switch (direction) {
    case 'N':
      startBearing = 315;
      endBearing = 45;
      break;
    case 'E':
      startBearing = 45;
      endBearing = 135;
      break;
    case 'S':
      startBearing = 135;
      endBearing = 225;
      break;
    case 'W':
      startBearing = 225;
      endBearing = 315;
      break;
    default:
      return [];
  }

  // Add the center point first
  points.push(center);

  // Add points along the arc
  for (let i = 0; i <= numSegments; i++) {
    const bearing = startBearing + ((endBearing - startBearing) / numSegments) * i;
    const point = getDestinationPoint(lng, lat, radius, bearing);
    points.push(point);
  }

  // Close the polygon by returning to the center
  points.push(center);

  return points;
}

/**
 * Checks if a given point is inside a polygon.
 * @param {Array<number>} point - [longitude, latitude].
 * @param {Array<Array<number>>} polygon - Array of polygon points.
 * @returns {boolean} - True if the point is inside the polygon, false otherwise.
 */
function isPointInPolygon(point, polygon) {
  if (!point || !polygon || polygon.length < 3) {
    return false;
  }
  const [x, y] = point;
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

/**
 * Checks if a point is within the defined arc by generating a polygon
 * and checking if the point is within it.
 *
 * @param {Array<number>} point - [longitude, latitude].
 * @param {Array<number>} center - [longitude, latitude] of the arc's center.
 * @param {number} radius - Radius in kilometers.
 * @param {string} direction - 'N', 'S', 'E', or 'W'.
 * @returns {boolean} - True if the point is within the arc, false otherwise.
 */
export function isPointInArc(point, center, radius, direction) {
  const arcPolygon = getArcPoints(center, radius, direction);
  return isPointInPolygon(point, arcPolygon);
}
