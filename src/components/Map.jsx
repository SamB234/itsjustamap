import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { v4 as uuidv4 } from 'uuid';

// Import custom components and utilities
import ArrowPin from './ArrowPin';
import { getArcPoints, getCurvedLinePoints } from './mapUtils';
import Sidebar from './Sidebar';

// =========================================================================
// MAPBOX CONFIGURATION & CONSTANTS
// =========================================================================

// Set your Mapbox access token
mapboxgl.accessToken =
  'pk.eyJ1Ijoic2FtYjIzNCIsImEiOiJjbWRkZ25xcmcwNHhvMmxxdGU3c2J0eTZnIn0.j5NEdvNhU_eZ1tirQpKEAA';

// API Base URL for backend requests
const API_BASE_URL = 'https://itsjustamap-api-proxy.onrender.com';

// Mapping for directional keys to user-friendly names
const directionMap = {
  N: 'North',
  S: 'South',
  E: 'East',
  W: 'West',
};

// Unique IDs for Mapbox GL JS sources and layers
// This is crucial for updating existing layers without re-creating them
const ARC_SOURCE_ID = 'arc-source';
const ARC_LAYER_ID = 'arc-layer';

const CURVED_LINE_SOURCE_ID = 'curved-line-source';
const CURVED_LINE_LAYER_ID = 'curved-line-layer';

// =========================================================================
// MAIN MAP COMPONENT
// =========================================================================

export default function Map() {
  // =======================================================================
  // STATE MANAGEMENT
  // =======================================================================

  // useRef is used for mutable values that don't trigger re-renders
  const mapContainer = useRef(null); // DOM element for the map
  const map = useRef(null);         // The Mapbox map instance itself
  const mapLoaded = useRef(false);  // Flag to ensure map is loaded before
                                    // adding sources/layers

  // useState is for variables that, when updated, should re-render the component
  const [lng, setLng] = useState(-0.1276);
  const [lat, setLat] = useState(51.5074);
  const [zoom, setZoom] = useState(9);
  const [droppedPins, setDroppedPins] = useState([]); // Stores all dropped pins
  const [hoveredPinId, setHoveredPinId] = useState(null); // Tracks which pin is hovered
  const [activePopupData, setActivePopupData] = useState(null); // Data for the currently open popup
  const [popupPos, setPopupPos] = useState(null); // Screen coordinates for the popup
  const [selectedRadius, setSelectedRadius] = useState(5); // Radius for directional exploration
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Sidebar visibility
  const [drawnLines, setDrawnLines] = useState([]); // Stores all connection lines
  const [connectionMode, setConnectionMode] = useState(false); // Flag for connection mode
  const [connectingMarkerId, setConnectingMarkerId] = useState(null); // ID of the first marker to connect
  const [connectionSuccess, setConnectionSuccess] = useState(null); // Message for a successful connection


  // New state for filters
  const filterOptions = ['nature', 'culture', 'adventure', 'sports', 'beach', 'food', 'nightlife'];
  const [activeFilters, setActiveFilters] = useState([]); // The filters currently applied
  const [pendingFilters, setPendingFilters] = useState([]); // The filters selected in the sidebar, not yet applied
  

  // =======================================================================
  // MAP INITIALIZATION & LIFECYCLE
  // This useEffect hook runs only once on component mount to set up the map.
  // =======================================================================
  useEffect(() => {
    // If the map has already been initialized, do nothing.
    if (map.current) return;

    // Create a new Mapbox map instance
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom,
      interactive: true,
      dragRotate: false,       // Disables rotation with mouse
      pitchWithRotate: false,  // Prevents pitch with mouse rotation
      touchPitch: false,       // Prevents pitch with touch
      // touchZoomRotate is left enabled to allow mobile pinch-to-zoom.
      // We will disable the rotation part specifically on the 'load' event.
    });

    // Event listener to update state with current map center and zoom level
    map.current.on('move', () => {
      const center = map.current.getCenter();
      if (center && typeof center.lng === 'number' && typeof center.lat === 'number' && !isNaN(center.lng) && !isNaN(center.lat)) {
        setLng(center.lng.toFixed(4));
        setLat(center.lat.toFixed(4));
        setZoom(map.current.getZoom().toFixed(2));
      }
    });

    // Handle missing style images warning (common with default styles)
    map.current.on('styleimagemissing', (e) => {
      console.warn(`Mapbox GL JS: Missing image ${e.id}. This might be a default style icon that doesn't affect functionality.`);
    });

    // Event listener for when the map has fully loaded its style and resources
    map.current.on('load', () => {
      mapLoaded.current = true;
      
      // FIX FOR MOBILE ZOOM: This line specifically disables the rotation part of the touch
      // controls, but leaves the pinch-to-zoom functionality intact.
      if (map.current.touchZoomRotate) {
        map.current.touchZoomRotate.disableRotation();
      }

      // Add source and layers for the directional arc (if they don't exist)
      if (!map.current.getSource(ARC_SOURCE_ID)) {
        map.current.addSource(ARC_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
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
            'fill-outline-color': '#1d4ed8'
          }
        });
        map.current.addLayer({
          id: `${ARC_LAYER_ID}-line`,
          type: 'line',
          source: ARC_SOURCE_ID,
          layout: {},
          paint: {
            'line-color': '#1d4ed8',
            'line-width': 2,
            'line-opacity': 0.75
          }
        });
      }

      // Add source and layer for the curved lines (if they don't exist)
      if (!map.current.getSource(CURVED_LINE_SOURCE_ID)) {
        map.current.addSource(CURVED_LINE_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
      }
      if (!map.current.getLayer(CURVED_LINE_LAYER_ID)) {
        map.current.addLayer({
          id: CURVED_LINE_LAYER_ID,
          type: 'line',
          source: CURVED_LINE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#1d4ed8',
            'line-width': 2,
            'line-opacity': 1,
          }
        });
      }
    });

    // Cleanup function to remove the map instance and its layers when the component unmounts
    return () => {
      if (map.current) {
        if (map.current.getLayer(`${ARC_LAYER_ID}-line`)) map.current.removeLayer(`${ARC_LAYER_ID}-line`);
        if (map.current.getLayer(ARC_LAYER_ID)) map.current.removeLayer(ARC_LAYER_ID);
        if (map.current.getSource(ARC_SOURCE_ID)) map.current.removeSource(ARC_SOURCE_ID);
        if (map.current.getLayer(CURVED_LINE_LAYER_ID)) map.current.removeLayer(CURVED_LINE_LAYER_ID);
        if (map.current.getSource(CURVED_LINE_SOURCE_ID)) map.current.removeSource(CURVED_LINE_SOURCE_ID);
        map.current.remove();
      }
    };
  }, []);

  // =======================================================================
  // DYNAMIC MAP UPDATES (useEffect hooks)
  // These hooks update map sources based on changes in component state.
  // =======================================================================

  // Effect to update the curved lines on the map whenever `drawnLines` state changes
  // This is the correct place to add or replace code related to drawing lines.
  useEffect(() => {
    console.log("useEffect [drawnLines] triggered. drawnLines count:", drawnLines.length);

    const updateMapLines = () => {
      if (map.current && mapLoaded.current && map.current.getSource(CURVED_LINE_SOURCE_ID)) {
        const lineFeatures = drawnLines.map(line => line.geojson);
        try {
          map.current.getSource(CURVED_LINE_SOURCE_ID).setData({
            type: 'FeatureCollection',
            features: lineFeatures
          });
          console.log("Curved line source updated successfully.");
        } catch (e) {
          console.error("Error setting data for curved line source:", e);
        }
      }
    };

    if (mapLoaded.current) {
      updateMapLines();
    } else {
      map.current.once('load', updateMapLines);
    }
  }, [drawnLines]);

  // Effect to update the arc polygon based on `activePopupData` and `selectedRadius`
  // This is the correct place to add or replace code related to the arc.
  useEffect(() => {
    if (!map.current || !activePopupData || typeof activePopupData.lng !== 'number' || typeof activePopupData.lat !== 'number' || isNaN(activePopupData.lng) || isNaN(activePopupData.lat)) {
      setPopupPos(null);
      if (map.current && map.current.getSource(ARC_SOURCE_ID)) {
        map.current.getSource(ARC_SOURCE_ID).setData({ type: 'FeatureCollection', features: [] });
      }
      return;
    }

    const updateArc = () => {
      try {
        const point = map.current.project([activePopupData.lng, activePopupData.lat]);
        setPopupPos({ x: point.x, y: point.y });

        if (map.current.getSource(ARC_SOURCE_ID)) {
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
                geometry: { type: 'Polygon', coordinates: [arcPoints] },
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
    };

    if (mapLoaded.current) {
      updateArc();
    } else {
      map.current.once('load', updateArc);
    }
    
  }, [activePopupData, lng, lat, zoom, selectedRadius]);


 // =======================================================================
  // CALLBACK FUNCTIONS (useCallback)
  // These functions are memoized to prevent unnecessary re-creations.
  // =======================================================================

  // Function to drop a pin at the current center of the map
  const dropPinAtCenter = useCallback(() => {
    if (!map.current) return;
    const center = map.current.getCenter();
    if (typeof center.lng !== 'number' || typeof center.lat !== 'number' || isNaN(center.lng) || isNaN(center.lat)) {
      console.error("Attempted to drop pin with invalid coordinates (NaN, NaN). Aborting.");
      return;
    }
    const newPin = { id: uuidv4(), coords: [center.lng, center.lat], aiCache: {} };
    setDroppedPins((prevPins) => [...prevPins, newPin]);
  }, []);

  // Function to get a human-readable place name from coordinates
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

  // Function to fetch AI suggestions from the backend
  const fetchAISuggestion = useCallback(async (pinId, placeName, direction, lng, lat, radius = null, filters = []) => {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeName, direction, lng, lat, radius, filters }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Network response was not ok');
      }
      const data = await response.json();
      setDroppedPins(prevPins => {
        return prevPins.map(pin => {
          if (pin.id === pinId) {
            const cacheKey = direction + '-' + filters.sort().join(',');
            return {
              ...pin,
              aiCache: { ...pin.aiCache, [cacheKey]: data.suggestion, }
            };
          }
          return pin;
        });
      });
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

// Handler for when a pin is clicked (for opening the main popup or connecting)
  const handlePinClick = useCallback(
    async (pin) => {
      const [lng, lat] = pin.coords;
      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        console.error("Clicked pin has invalid coordinates:", { lng, lat });
        return;
      }
      if (connectionMode && connectingMarkerId !== null && connectingMarkerId !== pin.id) {
        const firstPin = droppedPins.find(p => p.id === connectingMarkerId);
        const secondPin = pin;
        const curveCoords = getCurvedLinePoints(firstPin.coords, secondPin.coords);
        const newLine = {
          id: `${firstPin.id}-${secondPin.id}`,
          geojson: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: curveCoords },
            properties: { fromId: firstPin.id, toId: secondPin.id }
          }
        };
        console.log("Adding new line to state:", newLine);
        setDrawnLines(prevLines => [...prevLines, newLine]);
        setConnectionMode(false);
        setConnectingMarkerId(null);
        setConnectionSuccess(`Connection successful!`);
        setTimeout(() => setConnectionSuccess(null), 3000);
      } else if (connectionMode && connectingMarkerId === pin.id) {
        console.log('You clicked the same marker. Connection cancelled.');
        setConnectionSuccess('Connection cancelled.');
        setConnectionMode(false);
        setConnectingMarkerId(null);
        setActivePopupData(null);
        setTimeout(() => setConnectionSuccess(null), 3000);
      } else {
        const placeName = await fetchPlaceName(lng, lat);
        const direction = 'Overview';
        setSelectedRadius(5);
        const cacheKey = direction + '-' + activeFilters.sort().join(',');
        const cachedContent = pin.aiCache[cacheKey];
        
        // Determine if the content is stale by checking if a cache key exists
        // that doesn't match the current filters.
        const allKeys = Object.keys(pin.aiCache);
        const isStale = allKeys.length > 0 && !allKeys.includes(cacheKey);

        if (cachedContent) {
          setActivePopupData({
            pinId: pin.id, lng, lat, direction, placeName, loading: false, aiContent: cachedContent, error: null, radius: null, isStale,
          });
        } else {
          setActivePopupData({
            pinId: pin.id, lng, lat, direction, placeName, loading: true, aiContent: 'Generating overview...', error: null, radius: null, isStale,
          });
          fetchAISuggestion(pin.id, placeName, direction, lng, lat, null, activeFilters);
        }
      }
    },
    [connectionMode, connectingMarkerId, droppedPins, fetchPlaceName, fetchAISuggestion, setDrawnLines, activeFilters]
  );

  // Handler for when a directional arrow is clicked
  const handleDirectionalPopupOpen = useCallback(
    async (directionKey, pin) => {
      const [lng, lat] = pin.coords;
      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        console.error("Arrow clicked for pin with invalid coordinates:", { lng, lat });
        return;
      }
      const placeName = await fetchPlaceName(lng, lat);
      const direction = directionMap[directionKey] || directionKey;
      const cacheKey = direction + '-' + activeFilters.sort().join(',');
      const cachedContent = pin.aiCache[cacheKey];
      const initialContent = cachedContent || 'Adjust radius and click "Explore" to get suggestions.';

      // Determine if the content is stale
      const allKeys = Object.keys(pin.aiCache);
      const isStale = allKeys.length > 0 && !allKeys.includes(cacheKey);

      setSelectedRadius(5);
      setActivePopupData({
        pinId: pin.id, lng, lat, direction, placeName, loading: cachedContent ? false : false, aiContent: initialContent, error: null, radius: 5, isStale,
      });
    },
    [fetchPlaceName, activeFilters]
  );

  // Handler for the "Explore" button inside the popup
  const handleExploreDirection = useCallback(() => {
    if (!activePopupData) return;
    const { pinId, placeName, direction, lng, lat } = activePopupData;
    const cacheKey = direction + '-' + activeFilters.sort().join(',');
    const currentPin = droppedPins.find(p => p.id === pinId);
    if (currentPin && currentPin.aiCache[cacheKey]) {
      setActivePopupData(prev => ({
        ...prev, loading: false, aiContent: currentPin.aiCache[cacheKey], error: null,
      }));
      return;
    }
    fetchAISuggestion(pinId, placeName, direction, lng, lat, selectedRadius, activeFilters);
  }, [activePopupData, fetchAISuggestion, selectedRadius, droppedPins, activeFilters]);

  // Handler for the "Connect" button
  const handleConnectToAnotherMarker = useCallback(() => {
    if (activePopupData) {
      setConnectionMode(true);
      setConnectingMarkerId(activePopupData.pinId);
      setActivePopupData(null);
    }
  }, [activePopupData]);

  // Handler to close the active popup
  const handleClosePopup = useCallback(() => {
    setActivePopupData(null);
    setSelectedRadius(5);
    if (map.current && map.current.getSource(ARC_SOURCE_ID)) {
      map.current.getSource(ARC_SOURCE_ID).setData({ type: 'FeatureCollection', features: [] });
    }
    setConnectionMode(false);
    setConnectingMarkerId(null);
  }, []);

  // Handler to remove a pin and any associated lines
  const handleRemoveMarker = useCallback((pinIdToRemove) => {
    const removedPin = droppedPins.find(p => p.id === pinIdToRemove);
    if (!removedPin) return;
    setDroppedPins((prevPins) => prevPins.filter((pin) => pin.id !== pinIdToRemove));
    setDrawnLines((prevLines) =>
      prevLines.filter(
        (line) => line.geojson.properties.fromId !== pinIdToRemove && line.geojson.properties.toId !== pinIdToRemove
      )
    );
    if (activePopupData && activePopupData.pinId === pinIdToRemove) {
      setActivePopupData(null);
    }
    if (connectionMode && connectingMarkerId === pinIdToRemove) {
      setConnectionMode(false);
      setConnectingMarkerId(null);
    }
    setHoveredPinId(null);
    setSelectedRadius(5);
    if (map.current && map.current.getSource(ARC_SOURCE_ID)) {
      map.current.getSource(ARC_SOURCE_ID).setData({ type: 'FeatureCollection', features: [] });
    }
  }, [activePopupData, connectionMode, connectingMarkerId, droppedPins]);

  // Handler for the radius slider
  const handleRadiusChange = useCallback((event) => {
    const newRadius = Number(event.target.value);
    setSelectedRadius(newRadius);
    setActivePopupData(prev => ({
      ...prev, loading: false, aiContent: 'Adjust radius and click "Explore" to get suggestions.', error: null, radius: newRadius
    }));
  }, []);
  
  // Handler for when a filter checkbox is toggled
  const handleFilterToggle = useCallback((filter) => {
    setPendingFilters(prevFilters => {
      if (prevFilters.includes(filter)) {
        return prevFilters.filter(f => f !== filter);
      } else {
        return [...prevFilters, filter];
      }
    });
  }, []);

  // Handler for the "Apply Filters" button in the sidebar
  const handleApplyFilters = useCallback(() => {
    setActiveFilters([...pendingFilters]);
    // Optionally close the sidebar after applying filters
    setIsSidebarOpen(false);
  }, [pendingFilters]);
  
  // Handler to toggle the sidebar
  const toggleSidebar = useCallback(() => {
    if (!isSidebarOpen) {
      // When opening the sidebar, sync pending filters with active filters
      setPendingFilters([...activeFilters]);
    }
    setIsSidebarOpen(prev => !prev);
  }, [isSidebarOpen, activeFilters]);

  // =======================================================================
  // COMPONENT RENDERING (JSX)
  // This section defines what is rendered on the screen.
  // =======================================================================

  return (
    <>
      {/* Map container - This div is where the Mapbox map is rendered */}
      <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full" />

      {/* Conditional rendering for the "Connection Mode" message */}
      {connectionMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-50 animate-pulse">
          Connection Mode: Click another marker to connect!
          <button className="ml-4 px-2 py-0.5 border border-white rounded-full text-xs hover:bg-white hover:text-blue-600" onClick={() => { setConnectionMode(false); setConnectingMarkerId(null); }}>
            Cancel
          </button>
        </div>
      )}

      {/* Conditional rendering for the "Connection Success" message */}
      {connectionSuccess && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg z-50 transition-opacity duration-500">
          {connectionSuccess}
        </div>
      )}

      {/* The central drop-pin button */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-5 pointer-events-none">
        <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold cursor-pointer pointer-events-auto" onClick={dropPinAtCenter}>
          📍
        </div>
      </div>

      {/* Loop through all dropped pins and render them on the map */}
      {droppedPins.map((pin) => {
        const [pinLng, pinLat] = pin.coords;
        // Project map coordinates to screen coordinates
        if (!map.current || typeof pinLng !== 'number' || typeof pinLat !== 'number' || isNaN(pinLng) || isNaN(pinLat)) return null;
        const point = map.current.project([pinLng, pinLat]);
        
        return (
          <div
            key={pin.id}
            className={`absolute pointer-events-none ${connectionMode && pin.id === connectingMarkerId ? 'border-4 border-blue-500 rounded-full animate-ping-slow' : ''}`}
            style={{ left: point.x, top: point.y, transform: 'translate(-50%, -50%)', zIndex: 5 }}
          >
            {/* The visual pin marker and the ArrowPin component */}
            <div className={`relative w-20 h-20 pointer-events-auto`} onMouseEnter={() => setHoveredPinId(pin.id)} onMouseLeave={() => setHoveredPinId(null)} onClick={() => handlePinClick(pin)}>
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-blue-700 rounded-full flex items-center justify-center text-gray-800 text-xs shadow-md z-5">
                📍
              </div>
              {hoveredPinId === pin.id && <div className="absolute inset-0 flex items-center justify-center pointer-events-auto"> <ArrowPin onArrowClick={(dir) => handleDirectionalPopupOpen(dir, pin)} /> </div>}
            </div>
          </div>
        );
      })}

      {/* Conditional rendering for the main AI suggestion popup */}
      {activePopupData && popupPos && map.current && typeof activePopupData.lng === 'number' && !isNaN(activePopupData.lng) && typeof activePopupData.lat === 'number' && !isNaN(activePopupData.lat) && (
        <div className="absolute z-20 p-4 pointer-events-auto" style={{
            left: popupPos.x, top: popupPos.y, transform: 'translate(-50%, -130%)', width: '320px',
            background: 'rgba(240, 240, 240, 0.95)', backdropFilter: 'blur(8px)', borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', color: '#111', fontFamily: 'system-ui, sans-serif',
          }} onClick={(e) => e.stopPropagation()}
        >
          {/* Popup header */}
          <div className="flex justify-between items-center mb-2">
            <strong className="text-lg text-blue-700">{activePopupData.placeName || 'Loading...'}</strong>
            <button onClick={handleClosePopup} aria-label="Close popup" className="text-gray-600 hover:text-gray-900 font-bold text-xl leading-none">×</button>
          </div>
          <div className="text-sm text-gray-500 mb-2">
            {activePopupData.direction === 'Overview' ? 'Discover this area' : `Explore toward the ${directionMap[activePopupData.direction] || activePopupData.direction}`}
          </div>

          {/* Radius slider (only for directional exploration) */}
          {activePopupData.direction !== 'Overview' && (
            <div className="mb-4">
              <label htmlFor="radius-slider" className="block text-sm font-medium text-gray-700 mb-1">
                Radius: {selectedRadius} km
              </label>
              <input type="range" id="radius-slider" min="0" max="2000" step="10" value={selectedRadius} onChange={handleRadiusChange} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer range-lg" />
            </div>
          )}

          {/* AI content display area */}
          <p className="mb-4 text-gray-800 text-sm whitespace-pre-wrap">
            {activePopupData.loading ? <span className="text-blue-500 animate-pulse">{activePopupData.aiContent}</span> : activePopupData.error ? <span className="text-red-500">Error: {activePopupData.error}</span> : activePopupData.aiContent}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {activePopupData.direction !== 'Overview' && (
              <button className="px-3 py-1 border border-blue-500 text-blue-600 rounded-full hover:bg-blue-700 hover:text-gray-100 transition" onClick={handleExploreDirection}>
                Explore {directionMap[activePopupData.direction] || activePopupData.direction}
              </button>
            )}
            {(activePopupData.direction === 'Overview' || (!activePopupData.loading && !activePopupData.error && activePopupData.aiContent !== 'Adjust radius and click "Explore" to get suggestions.')) && (
              <button className="px-3 py-1 border border-blue-500 text-blue-600 rounded-full hover:bg-blue-50 transition" onClick={handleConnectToAnotherMarker}>
                Connect to Another Marker
              </button>
            )}
            <button className="px-3 py-1 border border-red-500 text-red-600 rounded-full hover:bg-red-50 transition" onClick={() => handleRemoveMarker(activePopupData.pinId)}>
              Remove Marker
            </button>
          </div>
        </div>
      )}

 {/* The Sidebar component */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={toggleSidebar}
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        pendingFilters={pendingFilters}
        onFilterToggle={handleFilterToggle}
        onApplyFilters={handleApplyFilters}
      >
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
