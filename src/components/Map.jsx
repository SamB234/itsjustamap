import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ArrowPin from './ArrowPin';

mapboxgl.accessToken =
  'pk.eyJ1Ijoic2FtYjIzNCIsImEiOiJjbWRkZ25xcmcwNHhvMmxxdGU3c2J0eTZnIn0.j5NEdvNhU_eZ1tirQpKEAA';

// IMPORTANT: Replace with the actual URL of your deployed Render backend service
const API_BASE_URL = 'https://itsjustamap-api-proxy.onrender.com';

const directionMap = {
  N: 'North',
  S: 'South',
  E: 'East',
  W: 'West',
};

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const [lng, setLng] = useState(-0.1276);
  const [lat, setLat] = useState(51.5074);
  const [zoom, setZoom] = useState(9);
  const [droppedPins, setDroppedPins] = useState([]); // Stores [lng, lat] for each pin
  const [hoveredPinIndex, setHoveredPinIndex] = useState(null); // Index of pin currently hovered

  // State for the active popup, including AI content status
  const [activePopupData, setActivePopupData] = useState(null);
  // activePopupData structure:
  // {
  //  pinIndex: number, // Index in droppedPins array
  //  lng: number,
  //  lat: number,
  //  direction: 'North' | 'South' | 'East' | 'West' | 'Overview',
  //  placeName: string,
  //  aiContent: string,
  //  loading: boolean,
  //  error: string | null
  // }
  const [popupPos, setPopupPos] = useState(null); // Initialize with null to indicate no popup active/positioned

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom,
      interactive: true, // Ensure map interactions are enabled
    });

    map.current.on('move', () => {
      // Ensure that map center is a valid LngLat object before accessing properties
      const center = map.current.getCenter();
      if (center && typeof center.lng === 'number' && typeof center.lat === 'number' && !isNaN(center.lng) && !isNaN(center.lat)) {
        setLng(center.lng.toFixed(4));
        setLat(center.lat.toFixed(4));
        setZoom(map.current.getZoom().toFixed(2));
      }
    });

    // Add an event listener to handle potential style image missing warnings more gracefully
    map.current.on('styleimagemissing', (e) => {
      console.warn(`Mapbox GL JS: Missing image ${e.id}. This might be a default style icon that doesn't affect functionality.`);
      // You can add map.addImage() here if you have custom images that are actually missing
    });

    // Clean up on unmount (important for performance and avoiding memory leaks)
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Effect to update popup position when map moves or popup data changes
  // Added stronger checks to ensure map.current and activePopupData.lng/lat are valid
  useEffect(() => {
    if (!map.current || !activePopupData || typeof activePopupData.lng !== 'number' || typeof activePopupData.lat !== 'number' || isNaN(activePopupData.lng) || isNaN(activePopupData.lat)) {
      setPopupPos(null); // Set to null if data is invalid, preventing render
      return;
    }

    try {
      const point = map.current.project([activePopupData.lng, activePopupData.lat]);
      setPopupPos({ x: point.x, y: point.y });
    } catch (error) {
      console.error("Error projecting popup coordinates:", error);
      setPopupPos(null); // Fallback to null if projection fails
    }
  }, [activePopupData, lng, lat, zoom]); // Re-run if popup data or map center/zoom changes


  // Function to drop a new pin at the current map center
  const dropPinAtCenter = useCallback(() => {
    if (!map.current) return;
    const center = map.current.getCenter();

    // Validate coordinates before adding them to state
    if (typeof center.lng !== 'number' || typeof center.lat !== 'number' || isNaN(center.lng) || isNaN(center.lat)) {
      console.error("Attempted to drop pin with invalid coordinates (NaN, NaN). Aborting.");
      return; // Prevent adding invalid coordinates
    }

    setDroppedPins((prevPins) => [...prevPins, [center.lng, center.lat]]);
  }, []);

  // Helper function to reverse geocode coordinates to a place name
  const fetchPlaceName = useCallback(async (lng, lat) => {
    // Validate input coordinates for geocoding
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
      console.error("Invalid coordinates for geocoding:", { lng, lat });
      return 'Invalid Location';
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
      );
      if (!response.ok) {
          throw new Error(`Geocoding failed with status: ${response.status}`);
      }
      const data = await response.json();
      const feature = data?.features?.[0];
      if (!feature) return 'Unknown Location';

      const context = feature.context || [];
      const locality =
        context.find((c) => c.id.includes('place')) ||
        context.find((c) => c.id.includes('locality')) ||
        context.find((c) => c.id.includes('region'));

      return locality?.text || feature.text || 'Unknown Location';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return 'Error fetching location';
    }
  }, []);

  // New function to fetch AI suggestions from your backend
  const fetchAISuggestion = useCallback(async (pinIndex, placeName, direction, lng, lat) => {
    // Set loading state for the specific popup, ensuring initial coords are valid
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
      console.error("Attempted to set active popup with invalid coordinates (NaN, NaN). Aborting AI fetch.");
      setActivePopupData({
        pinIndex,
        lng: lng || 0, // Fallback for display if needed, but not for projection
        lat: lat || 0, // Fallback for display if needed, but not for projection
        direction,
        placeName: placeName || 'Unknown Location',
        loading: false,
        aiContent: 'Error: Invalid pin coordinates.',
        error: 'Invalid coordinates provided for AI suggestion.',
      });
      return;
    }


    setActivePopupData({
      pinIndex,
      lng,
      lat,
      direction,
      placeName,
      loading: true,
      aiContent: 'Generating suggestions...', // Initial loading text
      error: null,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/generate-suggestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ placeName, direction }),
      });

      if (!response.ok) {
        // Attempt to parse error message from backend
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Network response was not ok');
      }

      const data = await response.json();
      setActivePopupData((prev) => ({
        ...prev,
        loading: false,
        aiContent: data.suggestion,
        error: null,
      }));
    } catch (error) {
      console.error('Error fetching AI suggestion:', error);
      setActivePopupData((prev) => ({
        ...prev,
        loading: false,
        aiContent: 'Could not load suggestions.',
        error: error.message,
      }));
    }
  }, [API_BASE_URL]);

  // Handler for clicking the central pin (shows overview for that location)
  const handlePinClick = useCallback(
    async (pinCoordinates, index) => {
      const [lng, lat] = pinCoordinates;
      // Validate pinCoordinates before using
      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        console.error("Clicked pin has invalid coordinates:", { lng, lat });
        return; // Do not proceed with invalid coordinates
      }

      const placeName = await fetchPlaceName(lng, lat);
      const direction = 'Overview'; // Special direction for general info

      fetchAISuggestion(index, placeName, direction, lng, lat);
    },
    [fetchPlaceName, fetchAISuggestion]
  );

  // Handler for clicking a directional arrow
  const handleArrowClick = useCallback(
    async (directionKey, pinCoordinates, index) => {
      const [lng, lat] = pinCoordinates;
      // Validate pinCoordinates before using
      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        console.error("Arrow clicked for pin with invalid coordinates:", { lng, lat });
        return; // Do not proceed with invalid coordinates
      }

      const placeName = await fetchPlaceName(lng, lat);
      const direction = directionMap[directionKey] || directionKey; // Map 'N' to 'North' etc.

      fetchAISuggestion(index, placeName, direction, lng, lat);
    },
    [fetchPlaceName, fetchAISuggestion]
  );

  // Close the currently active popup
  const handleClosePopup = useCallback(() => {
    setActivePopupData(null);
  }, []);

  // Remove the currently active pin and close its popup
  const handleRemoveMarker = useCallback(() => {
    if (!activePopupData) return;

    // Filter out the pin by its index
    setDroppedPins((prevPins) =>
      prevPins.filter((_, index) => index !== activePopupData.pinIndex)
    );
    setActivePopupData(null); // Close popup
    setHoveredPinIndex(null); // Ensure arrow pin is hidden
  }, [activePopupData]);

  return (
    <>
      <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full" />

      {/* Info panel */}
      <div className="absolute top-[75px] left-5 bg-white/85 px-3 py-2 rounded shadow-sm text-sm z-30 pointer-events-auto">
        📍 Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>

      {/* Fixed center pin */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-5 pointer-events-none"
      >
        <div
          className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold cursor-pointer pointer-events-auto"
          onClick={dropPinAtCenter}
        >
          📍
        </div>
      </div>

      {/* Dropped pins */}
      {droppedPins.map((pin, index) => {
        const [pinLng, pinLat] = pin;

        // **CRITICAL FIX 1: Validate coordinates before projecting**
        // Ensure map is initialized and coordinates are valid numbers
        if (!map.current || typeof pinLng !== 'number' || typeof pinLat !== 'number' || isNaN(pinLng) || isNaN(pinLat)) {
          console.warn(`Skipping render for pin ${index} due to invalid coordinates or uninitialized map.`, { pinLng, pinLat, mapReady: !!map.current });
          return null; // Don't render if coordinates are bad or map isn't ready
        }
        
        const point = map.current.project([pinLng, pinLat]); // Get pixel coordinates

        return (
          <div
            key={index} // Use index as key (caution if pins are reordered/deleted frequently)
            className="absolute pointer-events-none" // Wrapper does not block map events
            style={{
              left: point.x,
              top: point.y,
              transform: 'translate(-50%, -50%)', // Center the wrapper around the pin coordinates
              zIndex: 5, // Below popup, above map
            }}
          >
            <div
              className="relative w-20 h-20 pointer-events-auto" // This element is clickable
              onMouseEnter={() => setHoveredPinIndex(index)}
              onMouseLeave={() => setHoveredPinIndex(null)}
              onClick={() => handlePinClick(pin, index)} // Pass index to handler
            >
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs shadow-md z-5">
                📍
              </div>
              {hoveredPinIndex === index && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                  <ArrowPin
                    onArrowClick={(dir) => handleArrowClick(dir, pin, index)} // Pass index to handler
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Popup */}
      {/* **CRITICAL FIX 2: Conditionally render popup with comprehensive checks** */}
      {/* Ensure activePopupData exists, map is ready, popupPos is calculated, and coordinates are valid */}
      {activePopupData && popupPos && map.current &&
        typeof activePopupData.lng === 'number' && !isNaN(activePopupData.lng) &&
        typeof activePopupData.lat === 'number' && !isNaN(activePopupData.lat) && (
          <div
            className="absolute z-20 max-w-xs p-4 pointer-events-auto"
            style={{
              left: popupPos.x,
              top: popupPos.y,
              transform: 'translate(-50%, -130%)', // Position above and centered on the pin
              background: 'rgba(240, 240, 240, 0.95)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              color: '#111',
              fontFamily: 'system-ui, sans-serif',
            }}
            onClick={(e) => e.stopPropagation()} // Prevent map click through popup
          >
            <div className="flex justify-between items-center mb-2">
              <strong className="text-lg text-blue-700">
                {activePopupData.placeName || 'Loading...'}
              </strong>
              <button
                onClick={handleClosePopup}
                aria-label="Close popup"
                className="text-gray-600 hover:text-gray-900 font-bold text-xl leading-none"
                style={{ lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <div className="text-sm text-gray-500 mb-2">
              {activePopupData.direction === 'Overview'
                ? 'Discover this area'
                : `Explore toward the ${activePopupData.direction}`}
            </div>
            <p className="mb-4 text-gray-800 text-sm whitespace-pre-wrap">
              {activePopupData.loading ? (
                <span className="text-blue-500 animate-pulse">{activePopupData.aiContent}</span>
              ) : activePopupData.error ? (
                <span className="text-red-500">Error: {activePopupData.error}</span>
              ) : (
                activePopupData.aiContent
              )}
            </p>
            <div className="flex flex-col gap-2">
              {activePopupData.direction !== 'Overview' && (
                <button
                  className="px-3 py-1 border border-blue-500 text-blue-600 rounded-full hover:bg-blue-50 transition"
                  onClick={() => alert(`Explore ${activePopupData.direction}`)}
                >
                  Explore {activePopupData.direction}
                </button>
              )}
              <button
                className="px-3 py-1 border border-blue-500 text-blue-600 rounded-full hover:bg-blue-50 transition"
                onClick={() => alert('Connect to Another Marker')}
              >
                Connect to Another Marker
              </button>
              <button
                className="px-3 py-1 border border-red-500 text-red-600 rounded-full hover:bg-red-50 transition"
                onClick={handleRemoveMarker}
              >
                Remove Marker
              </button>
            </div>
          </div>
        )}
    </>
  );
}
