import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl'; // This import is crucial and needs to be stable
import 'mapbox-gl/dist/mapbox-gl.css';
import ArrowPin from './ArrowPin';
import { getArcPoints, getCirclePoints, getCurvedLinePoints } from './mapUtils'; 
import Sidebar from './Sidebar';

// Ensure this token is correct and valid
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FtYjIzNCIsImEiOiJjbWRkZ25xcmcwNHhvMmxxdGU3c2J0eTZnIn0.j5NEdvNhU_eZ1tirQpKEAA';

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

  // PRIMARY useEffect for map initialization
  useEffect(() => {
    if (map.current) return; // Initialize map only once

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
      // Add Arc Source and Layer
      // IMPORTANT: Ensure map.current.getSource/getLayer is called *after* map.current is loaded.
      // The 'load' event ensures the map style is fully loaded.
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

      // Add Curved Line Source and Layer
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
        // Clean up Arc layers (order matters for removal: layers before sources)
        if (map.current.getLayer(`${ARC_LAYER_ID}-line`)) map.current.removeLayer(`${ARC_LAYER_ID}-line`);
        if (map.current.getLayer(ARC_LAYER_ID)) map.current.removeLayer(ARC_LAYER_ID);
        if (map.current.getSource(ARC_SOURCE_ID)) map.current.removeSource(ARC_SOURCE_ID);
        
        // Clean up Curved Line layers
        if (map.current.getLayer(CURVED_LINE_LAYER_ID)) map.current.removeLayer(CURVED_LINE_LAYER_ID);
        if (map.current.getSource(CURVED_LINE_SOURCE_ID)) map.current.removeSource(CURVED_LINE_SOURCE_ID);
        
        map.current.remove();
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Effect to update curved lines on the map
  useEffect(() => {
    // This effect correctly checks if map.current and its source exist *before* trying to use them.
    if (map.current && map.current.getSource(CURVED_LINE_SOURCE_ID)) {
      const lineFeatures = drawnLines.map(line => line.geojson);
      map.current.getSource(CURVED_LINE_SOURCE_ID).setData({
        type: 'FeatureCollection',
        features: lineFeatures
      });
    }
  }, [drawnLines]); 

  // Effect for popup position and arc display
  useEffect(() => {
    // This effect also correctly checks for map.current.
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
            const direction = directionMap[activePopupData.directionKey] || activePopupData.direction;
            const arcPoints = getArcPoints(centerCoords, selectedRadius, direction);
            geojson = {
                type: 'FeatureCollection',
                features: arcPoints.length > 0 ? [{
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [arcPoints]
                    },
                    properties: { direction: direction }
                }] : []
            };
        }
        source.setData(geojson);
      }

    } catch (error) {
      console.error("Error projecting popup coordinates or updating arc:", error);
      setPopupPos(null);
    }
  }, [activePopupData, selectedRadius]); 

  // Callbacks: These functions are generally fine as they internally check map.current or depend on state.
  const dropPinAtCenter = useCallback(() => {
    if (!map.current) return;
    const center = map.current.getCenter();
    if (typeof center.lng !== 'number' || typeof center.lat !== 'number' || isNaN(center.lng) || isNaN(center.lat)) {
      console.error("Attempted to drop pin with invalid coordinates (NaN, NaN). Aborting.");
      return;
    }
    setDroppedPins((prevPins) => [...prevPins, [center.lng, center.lat]]);
  }, []);

  const fetchPlaceName = useCallback(async (lng, lat) => { /* ... (unchanged) ... */ }, []);
  const fetchAISuggestion = useCallback(async (pinIndex, placeName, direction, lng, lat, radius = null) => { /* ... (unchanged) ... */ }, []);
  const handlePinClick = useCallback(async (pinCoordinates, index) => { /* ... (unchanged) ... */ }, [fetchPlaceName, fetchAISuggestion, connectionMode, connectingMarkerIndex, droppedPins, handleClosePopup]);
  const handleDirectionalPopupOpen = useCallback(async (directionKey, pinCoordinates, index) => { /* ... (unchanged) ... */ }, [fetchPlaceName]);
  const handleExploreDirection = useCallback(() => { /* ... (unchanged) ... */ }, [activePopupData, fetchAISuggestion, selectedRadius]);
  const handleClosePopup = useCallback(() => { /* ... (unchanged) ... */ }, [connectionMode]);
  const handleRemoveMarker = useCallback(() => { /* ... (unchanged) ... */ }, [activePopupData, connectionMode]);
  const handleRadiusChange = useCallback((event) => { /* ... (unchanged) ... */ }, []);
  const toggleSidebar = useCallback(() => { /* ... (unchanged) ... */ }, []);
  const handleConnectMarkers = useCallback(() => { /* ... (unchanged) ... */ }, [droppedPins, activePopupData]);


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

        // CRITICAL CHECK: Ensure map.current exists BEFORE trying to project points
        if (!map.current || typeof pinLng !== 'number' || typeof pinLat !== 'number' || isNaN(pinLng) || isNaN(pinLat)) {
          console.warn(`Skipping render for pin ${index} due to invalid coordinates or uninitialized map.`, { pinLng, pinLat, mapReady: !!map.current });
          return null;
        }
        
        const point = map.current.project([pinLng, pinLat]);

        const shouldPulse = connectionMode && index !== connectingMarkerIndex;

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
              className={`relative w-20 h-20 pointer-events-auto ${shouldPulse ? 'animate-pulse-pin' : ''}`}
              onMouseEnter={() => setHoveredPinIndex(index)}
              onMouseLeave={() => setHoveredPinIndex(null)}
              onClick={() => handlePinClick(pin, index)} 
            >
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs shadow-md z-5">
                📍
              </div>
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
      {activePopupData && popupPos && map.current && // Ensure map.current exists before rendering popup related to map position
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
              {droppedPins.length > 1 && (
                <button
                  className="px-3 py-1 border border-purple-500 text-purple-600 rounded-full hover:bg-purple-50 transition"
                  onClick={handleConnectMarkers}
                >
                  Connect to Another Marker
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
