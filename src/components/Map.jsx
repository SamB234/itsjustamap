import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ArrowPin from './ArrowPin';
import { getArcPoints, getCirclePoints, getCurvedLinePoints } from './mapUtils';
import Sidebar from './Sidebar';

mapboxgl.accessToken =
  'pk.eyJ1Ijoic2FtYjIzNCIsImEiOiJjbWRkZ25xcmcwNHhvMmxxdGU3c2J0eTZnIn0.j5NEdvNhU_eZ1tirQpKEAA';

const API_BASE_URL = 'https://itsjustamap-api-proxy.onrender.com';

const directionMap = {
  N: 'North',
  S: 'South',
  E: 'East',
  W: 'West',
};

const ARC_SOURCE_ID = 'arc-source';
const ARC_LAYER_ID = 'arc-layer';

const CURVED_LINE_SOURCE_ID = 'curved-line-source';
const CURVED_LINE_LAYER_ID = 'curved-line-layer';

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const [lng, setLng] = useState(-0.1276);
  const [lat, setLat] = useState(51.5074);
  const [zoom, setZoom] = useState(9);
  const [droppedPins, setDroppedPins] = useState([]);
  const [hoveredPinIndex, setHoveredPinIndex] = useState(null);

  const [activePopupData, setActivePopupData] = useState(null);
  const [popupPos, setPopupPos] = useState(null);

  const [selectedRadius, setSelectedRadius] = useState(5);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [connectionMode, setConnectionMode] = useState(false);
  const [connectingMarkerIndex, setConnectingMarkerIndex] = useState(null);
  const [drawnLines, setDrawnLines] = useState([]);

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

    map.current.on('load', () => {
      // Existing Arc Source and Layer additions
      if (!map.current.getSource(ARC_SOURCE_ID)) {
        map.current.addSource(ARC_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
      }

      if (!map.current.getLayer(ARC_LAYER_ID)) {
        map.current.addLayer({
          id: ARC_LAYER_ID,
          type: 'fill',
          source: ARC_SOURCE_ID,
          layout: {},
          paint: {
            'fill-color': '#00BFFF',
            'fill-opacity': 0.25,
            'fill-outline-color': '#007FFF'
          }
        });

        map.current.addLayer({
          id: `${ARC_LAYER_ID}-line`,
          type: 'line',
          source: ARC_SOURCE_ID,
          layout: {},
          paint: {
            'line-color': '#007FFF',
            'line-width': 2,
            'line-opacity': 0.75
          }
        });
      }

      // Curved Line Source and Layer
      if (!map.current.getSource(CURVED_LINE_SOURCE_ID)) {
        map.current.addSource(CURVED_LINE_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
      }

      if (!map.current.getLayer(CURVED_LINE_LAYER_ID)) {
        map.current.addLayer({
          id: CURVED_LINE_LAYER_ID,
          type: 'line',
          source: CURVED_LINE_SOURCE_ID,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#FF8C00',
            'line-width': 3,
            'line-opacity': 0.8
          }
        });
      }
    });

    return () => {
      if (map.current) {
        // Existing Arc cleanup
        if (map.current.getLayer(`${ARC_LAYER_ID}-line`)) map.current.removeLayer(`${ARC_LAYER_ID}-line`);
        if (map.current.getLayer(ARC_LAYER_ID)) map.current.removeLayer(ARC_LAYER_ID);
        if (map.current.getSource(ARC_SOURCE_ID)) map.current.removeSource(ARC_SOURCE_ID);

        // Curved Line cleanup
        if (map.current.getLayer(CURVED_LINE_LAYER_ID)) map.current.removeLayer(CURVED_LINE_LAYER_ID);
        if (map.current.getSource(CURVED_LINE_SOURCE_ID)) map.current.removeSource(CURVED_LINE_SOURCE_ID);

        map.current.remove();
      }
    };
  }, []);

  // Effect to update curved lines on the map
  useEffect(() => {
    // This ensures the style (and thus sources/layers) are completely ready.
    if (map.current && map.current.isStyleLoaded() && map.current.getSource(CURVED_LINE_SOURCE_ID)) {
      const lineFeatures = drawnLines.map(line => line.geojson);
      map.current.getSource(CURVED_LINE_SOURCE_ID).setData({
        type: 'FeatureCollection',
        features: lineFeatures
      });
    } else if (drawnLines.length > 0) {
      // Optional: Log a warning if lines are drawn but map isn't ready
      // This might happen on initial load before the map style is fully parsed.
      console.warn("Attempted to update curved lines but map or source not ready yet.");
    }
  }, [drawnLines]); // Dependency array: run this effect when drawnLines changes

  useEffect(() => {
    if (!map.current || !activePopupData || typeof activePopupData.lng !== 'number' || typeof activePopupData.lat !== 'number' || isNaN(activePopupData.lng) || isNaN(activePopupData.lat)) {
      setPopupPos(null);
      if (map.current && map.current.getSource(ARC_SOURCE_ID)) {
        map.current.getSource(ARC_SOURCE_ID).setData({ type: 'FeatureCollection', features: [] });
      }
      return;
    }

    try {
      const point = map.current.project([activePopupData.lng, activePopupData.lat]);
      setPopupPos({ x: point.x, y: point.y });

      if (map.current && map.current.getSource(ARC_SOURCE_ID)) {
        const source = map.current.getSource(ARC_SOURCE_ID);
        let geojson;

        if (activePopupData.direction === 'Overview') {
          geojson = { type: 'FeatureCollection', features: [] };
        } else {
          const centerCoords = [activePopupData.lng, activePopupData.lat];
          const arcPoints = getArcPoints(centerCoords, selectedRadius, activePopupData.direction);
          geojson = {
            type: 'FeatureCollection',
            features: arcPoints.length > 0 ? [{
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [arcPoints]
              },
              properties: { direction: activePopupData.direction }
            }] : []
          };
        }
        source.setData(geojson);
      }

    } catch (error) {
      console.error("Error projecting popup coordinates or updating arc:", error);
      setPopupPos(null);
    }
  }, [activePopupData, lng, lat, zoom, selectedRadius]);


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

  const fetchAISuggestion = useCallback(async (pinIndex, placeName, direction, lng, lat, radius = null) => {
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
      console.error("Attempted to set active popup with invalid coordinates (NaN, NaN). Aborting AI fetch.");
      setActivePopupData(prev => ({
        ...prev,
        loading: false,
        aiContent: 'Error: Invalid pin coordinates.',
        error: 'Invalid coordinates provided for AI suggestion.',
      }));
      return;
    }

    setActivePopupData(prev => ({
      ...prev,
      loading: true,
      aiContent: 'Generating suggestions...',
      error: null,
      radius: direction === 'Overview' ? null : radius,
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/generate-suggestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ placeName, direction, lng, lat, radius }),
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

  // START ADDITIONS FOR STEP 5: CONNECTION LOGIC
  const handleConnectMarkers = useCallback(() => {
    if (!activePopupData) return;
    const currentPinIndex = activePopupData.pinIndex;

    if (connectionMode && connectingMarkerIndex !== null) {
      // Complete connection
      if (connectingMarkerIndex !== currentPinIndex) { // Don't allow connecting a marker to itself
        const startPin = droppedPins[connectingMarkerIndex];
        const endPin = droppedPins[currentPinIndex];
        
        if (startPin && endPin) {
          const newLineGeoJSON = getCurvedLinePoints(startPin, endPin);
          setDrawnLines(prevLines => [...prevLines, {
            id: `${connectingMarkerIndex}-${currentPinIndex}-${Date.now()}`, // Unique ID for the line
            start: connectingMarkerIndex,
            end: currentPinIndex,
            geojson: newLineGeoJSON
          }]);
        }
      }
      setConnectionMode(false);
      setConnectingMarkerIndex(null);
      handleClosePopup(); // Close popup after attempting connection
    } else {
      // Start connection mode
      setConnectionMode(true);
      setConnectingMarkerIndex(currentPinIndex);
      // Update popup message to guide the user
      setActivePopupData(prev => ({
        ...prev,
        aiContent: 'Select another marker to connect to...',
        loading: false,
        error: null,
      }));
    }
  }, [connectionMode, connectingMarkerIndex, activePopupData, droppedPins, handleClosePopup]); // Added handleClosePopup to dependencies


  const handlePinClick = useCallback(
    async (pinCoordinates, index) => {
      // If in connection mode and a start marker is selected, this click is to select the end marker.
      if (connectionMode && connectingMarkerIndex !== null) {
        // Prevent connecting the same marker to itself if clicked again
        if (connectingMarkerIndex === index) {
            // Optionally, provide feedback that clicking the same marker does nothing in connection mode
            console.log("Cannot connect a marker to itself.");
            // Maybe close the connection mode if they click the same marker? Or do nothing.
            // For now, let's keep the connection mode active.
            return;
        }
        // If a different marker is clicked, attempt to complete the connection
        // The handleConnectMarkers will handle updating drawnLines and resetting mode
        // We pass the currently activePopupData's pinIndex, which is now the *target* for connection
        // The handleConnectMarkers logic relies on activePopupData.pinIndex to be the *current* clicked pin
        // So we need to ensure activePopupData is updated *before* calling handleConnectMarkers if not already.
        // Or, better, refactor handleConnectMarkers to take `endPinIndex` as an argument.
        // For simplicity now, let's just make sure activePopupData is set to the clicked pin.
        
        // Temporarily set the activePopupData to the clicked pin for handleConnectMarkers to pick it up
        setActivePopupData({
            pinIndex: index,
            lng: pinCoordinates[0],
            lat: pinCoordinates[1],
            direction: 'Overview', // or any default, it won't be used for AI call immediately
            placeName: await fetchPlaceName(pinCoordinates[0], pinCoordinates[1]),
            loading: false,
            aiContent: '',
            error: null,
            radius: null,
        });
        // Call handleConnectMarkers in a small timeout to allow state update to propagate
        // This is a common pattern for chained state updates
        setTimeout(() => handleConnectMarkers(), 0); 
        return; // Stop further processing for the pin click
      }

      // Existing logic for non-connection mode pin click
      const [lng, lat] = pinCoordinates;
      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        console.error("Clicked pin has invalid coordinates:", { lng, lat });
        return;
      }

      const placeName = await fetchPlaceName(lng, lat);
      const direction = 'Overview';

      setSelectedRadius(5);
      setActivePopupData({
        pinIndex: index,
        lng,
        lat,
        direction,
        placeName,
        loading: true,
        aiContent: 'Generating overview...',
        error: null,
        radius: null,
      });
      fetchAISuggestion(index, placeName, direction, lng, lat, null);
    },
    [fetchPlaceName, fetchAISuggestion, connectionMode, connectingMarkerIndex, handleConnectMarkers]
  );

  const handleClosePopup = useCallback(() => {
    setActivePopupData(null);
    setSelectedRadius(5);
    // If in connection mode, cancel it when popup closes
    setConnectionMode(false);
    setConnectingMarkerIndex(null);
    if (map.current && map.current.getSource(ARC_SOURCE_ID)) {
      map.current.getSource(ARC_SOURCE_ID).setData({ type: 'FeatureCollection', features: [] });
    }
  }, []); // Dependencies for useCallback are correct here

  const handleRemoveMarker = useCallback(() => {
    if (!activePopupData) return;

    setDroppedPins((prevPins) => {
      const removedIndex = activePopupData.pinIndex;
      const newPins = prevPins.filter((_, index) => index !== removedIndex);
      
      // Filter out any lines connected to the removed marker
      setDrawnLines(prevLines => prevLines.filter(line => 
        line.start !== removedIndex && line.end !== removedIndex
      ));
      return newPins;
    });
    
    // Reset connection mode if the connecting marker is removed
    if (connectionMode && connectingMarkerIndex === activePopupData.pinIndex) {
      setConnectionMode(false);
      setConnectingMarkerIndex(null);
    }
    
    setActivePopupData(null);
    setSelectedRadius(5);
    if (map.current && map.current.getSource(ARC_SOURCE_ID)) {
      map.current.getSource(ARC_SOURCE_ID).setData({ type: 'FeatureCollection', features: [] });
    }
    setHoveredPinIndex(null);
  }, [activePopupData, connectionMode, connectingMarkerIndex]); // Added connectionMode, connectingMarkerIndex to dependencies
  // END ADDITIONS FOR STEP 5: CONNECTION LOGIC

  const handleDirectionalPopupOpen = useCallback(
    async (directionKey, pinCoordinates, index) => {
      const [lng, lat] = pinCoordinates;
      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        console.error("Arrow clicked for pin with invalid coordinates:", { lng, lat });
        return;
      }

      const placeName = await fetchPlaceName(lng, lat);
      const direction = directionMap[directionKey] || directionKey;

      setSelectedRadius(5);
      setActivePopupData({
        pinIndex: index,
        lng,
        lat,
        direction,
        placeName,
        loading: false,
        aiContent: 'Adjust radius and click "Explore" to get suggestions.',
        error: null,
        radius: 5,
      });
    },
    [fetchPlaceName]
  );

  const handleExploreDirection = useCallback(() => {
    if (!activePopupData) return;
    const { pinIndex, placeName, direction, lng, lat } = activePopupData;
    fetchAISuggestion(pinIndex, placeName, direction, lng, lat, selectedRadius);
  }, [activePopupData, fetchAISuggestion, selectedRadius]);

  const handleRadiusChange = useCallback((event) => {
    const newRadius = Number(event.target.value);
    setSelectedRadius(newRadius);
    setActivePopupData(prev => ({
      ...prev,
      loading: false,
      aiContent: 'Adjust radius and click "Explore" to get suggestions.',
      error: null,
      radius: newRadius
    }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);


  return (
    <>
      <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full" />

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

        if (!map.current || typeof pinLng !== 'number' || typeof pinLat !== 'number' || isNaN(pinLng) || isNaN(pinLat)) {
          console.warn(`Skipping render for pin ${index} due to invalid coordinates or uninitialized map.`, { pinLng, pinLat, mapReady: !!map.current });
          return null;
        }

        const point = map.current.project([pinLng, pinLat]);
        
        // ADDED: Pulse animation logic
        const shouldPulse = connectionMode && index === connectingMarkerIndex;

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
              // ADDED: dynamic class for pulse
              className={`relative w-20 h-20 pointer-events-auto ${shouldPulse ? 'animate-pulse-pin' : ''}`}
              onMouseEnter={() => setHoveredPinIndex(index)}
              onMouseLeave={() => setHoveredPinIndex(null)}
              onClick={() => handlePinClick(pin, index)}
            >
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs shadow-md z-5">
                📍
              </div>
              {/* ADDED: Only show arrows if not in connection mode */}
              {hoveredPinIndex === index && !connectionMode && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                  <ArrowPin
                    onArrowClick={(dir) => handleDirectionalPopupOpen(dir, pin, index)}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Popup */}
      {activePopupData && popupPos && map.current &&
        typeof activePopupData.lng === 'number' && !isNaN(activePopupData.lng) &&
        typeof activePopupData.lat === 'number' && !isNaN(activePopupData.lat) && (
          <div
            className="absolute z-20 p-4 pointer-events-auto"
            style={{
              left: popupPos.x,
              top: popupPos.y,
              transform: 'translate(-50%, -130%)',
              width: '320px',
              background: 'rgba(240, 240, 240, 0.95)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              color: '#111',
              fontFamily: 'system-ui, sans-serif',
            }}
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

            {/* Radius Slider for directional responses */}
            {activePopupData.direction !== 'Overview' && (
              <div className="mb-4">
                <label htmlFor="radius-slider" className="block text-sm font-medium text-gray-700 mb-1">
                  Radius: {selectedRadius} km
                </label>
                <input
                  type="range"
                  id="radius-slider"
                  min="1"
                  max="50"
                  step="1"
                  value={selectedRadius}
                  onChange={handleRadiusChange}
                  className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer range-lg"
                />
              </div>
            )}

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
                  className="px-3 py-1 border border-blue-500 text-blue-600 rounded-full hover:bg-blue-700 hover:text-gray-100 transition"
                  onClick={handleExploreDirection}
                >
                  Explore {activePopupData.direction}
                </button>
              )}
              
              {/* ADDED: Connect to Another Marker button logic */}
              {droppedPins.length > 1 && ( // Only show if more than one pin exists
                <button
                  className="px-3 py-1 border border-purple-500 text-purple-600 rounded-full hover:bg-purple-50 transition"
                  onClick={handleConnectMarkers}
                >
                  {connectionMode && connectingMarkerIndex === activePopupData.pinIndex ? 'Connecting...' : 'Connect to Another Marker'}
                </button>
              )}
              <button
                className="px-3 py-1 border border-red-500 text-red-600 rounded-full hover:bg-red-50 transition"
                onClick={handleRemoveMarker}
              >
                Remove Marker
              </button>
            </div>
          </div>
        )}

        {/* Sidebar component */}
        <Sidebar isOpen={isSidebarOpen} onClose={toggleSidebar}>
          <p className="text-gray-700">This is where your trip planning tools will go!</p>
          <div className="mt-4 p-3 bg-white rounded-lg shadow-inner">
            <h3 className="font-semibold mb-2">Filters (Coming Soon)</h3>
            <p className="text-sm text-gray-600">e.g., historical sites, foodie spots, nature trails</p>
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg shadow-inner">
            <h3 className="font-semibold mb-2">Trip Connections (Coming Soon)</h3>
            <p className="text-sm text-gray-600">Manage connections between your markers.</p>
          </div>
        </Sidebar>
    </>
  );
}
