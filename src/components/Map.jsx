import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ArrowPin from './ArrowPin';

mapboxgl.accessToken =
  'pk.eyJ1Ijoic2FtYjIzNCIsImEiOiJjbWRkZ25xcmcwNHhvMmxxdGU3c2J0eTZnIn0.j5NEdvNhU_eZ1tirQpKEAA';

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
  const popupRef = useRef(null); // Ref for the popup element to measure its size

  const [lng, setLng] = useState(-0.1276);
  const [lat, setLat] = useState(51.5074);
  const [zoom, setZoom] = useState(9);
  const [droppedPins, setDroppedPins] = useState([]);
  const [hoveredPinIndex, setHoveredPinIndex] = useState(null);

  const [activePopupData, setActivePopupData] = useState(null);
  const [popupPixelCoords, setPopupPixelCoords] = useState(null); // Separate state for actual pixel coordinates after calculations

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom,
      interactive: true,
    });

    map.current.on('move', () => {
      const center = map.current.getCenter();
      if (center && typeof center.lng === 'number' && typeof center.lat === 'number' && !isNaN(center.lng) && !isNaN(center.lat)) {
        setLng(center.lng.toFixed(4));
        setLat(center.lat.toFixed(4));
        setZoom(map.current.getZoom().toFixed(2));
      }
    });

    map.current.on('styleimagemissing', (e) => {
      console.warn(`Mapbox GL JS: Missing image ${e.id}. This might be a default style icon that doesn't affect functionality.`);
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Effect to calculate and update popup pixel coordinates based on map position and screen boundaries
  useEffect(() => {
    if (!map.current || !activePopupData || typeof activePopupData.lng !== 'number' || typeof activePopupData.lat !== 'number' || isNaN(activePopupData.lng) || isNaN(activePopupData.lat)) {
      setPopupPixelCoords(null);
      return;
    }

    // Get the pixel coordinates of the marker
    const markerScreenPos = map.current.project([activePopupData.lng, activePopupData.lat]);

    // Define preferred popup dimensions (from Tailwind classes)
    const popupWidth = 320; // Corresponds to max-w-xs (20rem)
    const popupHeightOffset = 130; // Roughly 130% for 'translate(-50%, -130%)' to position it above

    let finalX = markerScreenPos.x;
    let finalY = markerScreenPos.y;

    // Adjust for horizontal centering and push up from marker
    finalX -= popupWidth / 2; // initial shift left by half its width for centering
    finalY -= popupHeightOffset; // initial shift up for positioning above

    // Get viewport dimensions
    const mapContainerRect = mapContainer.current.getBoundingClientRect();
    const viewportWidth = mapContainerRect.width;
    const viewportHeight = mapContainerRect.height;
    const padding = 20; // Minimum padding from screen edges

    // Horizontal boundary checks
    if (finalX < padding) { // Too far left
        finalX = padding;
    } else if (finalX + popupWidth + padding > viewportWidth) { // Too far right
        finalX = viewportWidth - popupWidth - padding;
    }

    // Vertical boundary checks (less critical for this issue, but good practice)
    if (finalY < padding) { // Too far up
        finalY = padding;
    } else if (finalY + popupRef.current?.offsetHeight + padding > viewportHeight) { // Too far down
        // If it goes too far down, we might need to reposition it below the marker
        // For simplicity, we'll just push it up from the bottom edge
        finalY = viewportHeight - popupRef.current?.offsetHeight - padding;
    }


    setPopupPixelCoords({ x: finalX, y: finalY });

  }, [activePopupData, lng, lat, zoom]); // Re-run if popup data or map center/zoom changes


  const dropPinAtCenter = useCallback(() => {
    if (!map.current) return;
    const center = map.current.getCenter();

    if (typeof center.lng !== 'number' || typeof center.lat !== 'number' || isNaN(center.lng) || isNaN(center.lat)) {
      console.error("Attempted to drop pin with invalid coordinates (NaN, NaN). Aborting.");
      return;
    }

    setDroppedPins((prevPins) => [...prevPins, [center.lng, center.lat]]);
  }, []);

  const fetchPlaceName = useCallback(async (lng, lat) => {
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

  const fetchAISuggestion = useCallback(async (pinIndex, placeName, direction, lng, lat) => {
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
      console.error("Attempted to set active popup with invalid coordinates (NaN, NaN). Aborting AI fetch.");
      setActivePopupData({
        pinIndex,
        lng: lng || 0,
        lat: lat || 0,
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
      aiContent: 'Generating suggestions...',
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
  }, []);

  const handlePinClick = useCallback(
    async (pinCoordinates, index) => {
      const [lng, lat] = pinCoordinates;
      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        console.error("Clicked pin has invalid coordinates:", { lng, lat });
        return;
      }

      const placeName = await fetchPlaceName(lng, lat);
      const direction = 'Overview';

      fetchAISuggestion(index, placeName, direction, lng, lat);
    },
    [fetchPlaceName, fetchAISuggestion]
  );

  const handleArrowClick = useCallback(
    async (directionKey, pinCoordinates, index) => {
      const [lng, lat] = pinCoordinates;
      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        console.error("Arrow clicked for pin with invalid coordinates:", { lng, lat });
        return;
      }

      const placeName = await fetchPlaceName(lng, lat);
      const direction = directionMap[directionKey] || directionKey;

      fetchAISuggestion(index, placeName, direction, lng, lat);
    },
    [fetchPlaceName, fetchAISuggestion]
  );

  const handleClosePopup = useCallback(() => {
    setActivePopupData(null);
  }, []);

  const handleRemoveMarker = useCallback(() => {
    if (!activePopupData) return;

    setDroppedPins((prevPins) =>
      prevPins.filter((_, index) => index !== activePopupData.pinIndex)
    );
    setActivePopupData(null);
    setHoveredPinIndex(null);
  }, [activePopupData]);

  return (
    <>
      <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full" />

      <div className="absolute top-[75px] left-5 bg-white/85 px-3 py-2 rounded shadow-sm text-sm z-30 pointer-events-auto">
        📍 Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>

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

      {droppedPins.map((pin, index) => {
        const [pinLng, pinLat] = pin;

        if (!map.current || typeof pinLng !== 'number' || typeof pinLat !== 'number' || isNaN(pinLng) || isNaN(pinLat)) {
          console.warn(`Skipping render for pin ${index} due to invalid coordinates or uninitialized map.`, { pinLng, pinLat, mapReady: !!map.current });
          return null;
        }
        
        const point = map.current.project([pinLng, pinLat]);

        return (
          <div
            key={index}
            className="absolute pointer-events-none"
            style={{
              left: point.x,
              top: point.y,
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
            }}
          >
            <div
              className="relative w-20 h-20 pointer-events-auto"
              onMouseEnter={() => setHoveredPinIndex(index)}
              onMouseLeave={() => setHoveredPinIndex(null)}
              onClick={() => handlePinClick(pin, index)}
            >
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs shadow-md z-5">
                📍
              </div>
              {hoveredPinIndex === index && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                  <ArrowPin
                    onArrowClick={(dir) => handleArrowClick(dir, pin, index)}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Popup */}
      {activePopupData && popupPixelCoords && map.current &&
        typeof activePopupData.lng === 'number' && !isNaN(activePopupData.lng) &&
        typeof activePopupData.lat === 'number' && !isNaN(activePopupData.lat) && (
          <div
            ref={popupRef} // Attach ref to the popup div
            className="absolute z-20 p-4 pointer-events-auto"
            style={{
              left: popupPixelCoords.x,
              top: popupPixelCoords.y,
              // Removed the transform here, as positioning is now handled in useEffect
              background: 'rgba(240, 240, 240, 0.95)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              color: '#111',
              fontFamily: 'system-ui, sans-serif',
              // Added responsive width controls
              minWidth: '250px', // A minimum width
              maxWidth: '320px', // Your original max-w-xs (20rem)
              width: 'calc(100vw - 40px)', // Occupy full width minus padding on small screens
                                           // This line needs to be carefully evaluated for desired behavior on larger screens
                                           // For desktop, this could make it too wide if the viewport is very large.
                                           // Let's refine for mobile.
            }}
            // Tailwind classes for responsive width
            // This is a direct style prop, it will override Tailwind classes
            // For responsive width control, we often use Tailwind's responsive prefixes (e.g., sm:max-w-xs)
            // But for this absolute positioning scenario, direct style overrides are common.
            onClick={(e) => e.stopPropagation()}
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
