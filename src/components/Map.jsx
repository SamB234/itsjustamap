import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown'; // For rendering markdown content
import Sidebar from './Sidebar'; // Assuming you have this component
import ArrowPin from './ArrowPin'; // The custom component you created
import { getArcPoints, getCurvedLinePoints, isPointInArc } from './mapUtils'; // Assuming you have these utilities

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
const MARKER_SOURCE_ID = 'markers-source';
const MARKER_FILL_LAYER_ID = 'markers-fill';
const MARKER_OUTLINE_LAYER_ID = 'markers-outline';
const ARROW_SOURCE_ID = 'arrow-source';
const ARROW_LAYER_ID = 'arrow-layer';
const ARC_SOURCE_ID = 'arc-source';
const ARC_LINE_LAYER_ID = 'arc-line-layer';
const ARC_FILL_LAYER_ID = 'arc-fill-layer';
const CONNECTION_SOURCE_ID = 'connection-source';
const CONNECTION_LAYER_ID = 'connection-layer';

// =========================================================================
// MAIN MAP COMPONENT
// =========================================================================

export default function Map() {
  // =======================================================================
  // STATE MANAGEMENT
  // =======================================================================

  // useRef for mutable values that don't trigger re-renders
  const mapContainer = useRef(null);
  const map = useRef(null);
  const mapLoaded = useRef(false);

  // useState for variables that, when updated, should re-render the component
  const [lng, setLng] = useState(-0.1276);
  const [lat, setLat] = useState(51.5074);
  const [zoom, setZoom] = useState(9);
  const [droppedPins, setDroppedPins] = useState([]);
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const [activePopupData, setActivePopupData] = useState(null);
  const [selectedRadius, setSelectedRadius] = useState(5);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [drawnLines, setDrawnLines] = useState([]);
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectingMarkerId, setConnectingMarkerId] = useState(null);
  const [connectionSuccess, setConnectionSuccess] = useState(null);

  // State for filters
  const filterOptions = ['nature', 'culture', 'adventure', 'sports', 'beach', 'food', 'nightlife'];
  const [activeFilters, setActiveFilters] = useState([]);
  const [pendingFilters, setPendingFilters] = useState([]);

  // Emojis for filters
  const filterEmojis = {
    'nature': '🌳',
    'culture': '🏛️',
    'adventure': '⛰️',
    'sports': '⚽',
    'beach': '🏖️',
    'food': '🍔',
    'nightlife': '🌃'
  };

  // =======================================================================
  // CALLBACK FUNCTIONS (useCallback)
  // =======================================================================

  const handleClosePopup = useCallback(() => {
    setActivePopupData(null);
    setSelectedRadius(5);
    if (map.current && map.current.getSource(ARC_SOURCE_ID)) {
      map.current.getSource(ARC_SOURCE_ID).setData({ type: 'FeatureCollection', features: [] });
    }
    setConnectionMode(false);
    setConnectingMarkerId(null);
  }, []);

  const handleRemoveMarker = useCallback((pinIdToRemove) => {
    setDroppedPins((prevPins) => prevPins.filter((pin) => pin.id !== pinIdToRemove));
    setDrawnLines((prevLines) =>
      prevLines.filter(
        (line) => line.geojson.properties.fromId !== pinIdToRemove && line.geojson.properties.toId !== pinIdToRemove
      )
    );
    if (activePopupData && activePopupData.pinId === pinIdToRemove) {
      setActivePopupData(null);
    }
    setHoveredPinId(null);
    setSelectedRadius(5);
  }, [activePopupData]);

  const dropPinAtCenter = useCallback(() => {
    if (!map.current) return;
    const center = map.current.getCenter();
    const newPin = {
      id: uuidv4(),
      coords: [center.lng, center.lat],
      name: 'User Pin',
      description: 'A pin placed by the user.',
      isAIGenerated: false,
      emoji: '📌',
      aiCache: {},
      lastRadius: {},
      lastDirection: null,
    };
    setDroppedPins((prevPins) => [...prevPins, newPin]);
  }, []);

  const fetchPlaceName = useCallback(async (lng, lat) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
      );
      if (!response.ok) throw new Error(`Geocoding failed with status: ${response.status}`);
      const data = await response.json();
      const feature = data?.features?.[0];
      if (!feature) return 'Unknown Location';
      const locality = feature.context?.find((c) => c.id.includes('place') || c.id.includes('locality'));
      return locality?.text || feature.text || 'Unknown Location';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return 'Error fetching location';
    }
  }, []);

  const fetchGeneralOverview = useCallback(async (pinId, placeName) => {
    const cacheKey = 'Overview';
    const pin = droppedPins.find(p => p.id === pinId);
    if (pin && pin.aiCache[cacheKey]) {
      setActivePopupData(prev => ({ ...prev, loading: false, aiContent: pin.aiCache[cacheKey] }));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/generate-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeName, direction: 'Overview' }),
      });
      const data = await response.json();
      const overviewText = data.suggestion || 'No overview available.';

      setDroppedPins(prevPins =>
        prevPins.map(p => (p.id === pinId ? { ...p, aiCache: { ...p.aiCache, [cacheKey]: overviewText } } : p))
      );
      setActivePopupData(prev => ({ ...prev, loading: false, aiContent: overviewText }));
    } catch (error) {
      console.error('Error fetching general overview:', error);
      setActivePopupData(prev => ({ ...prev, loading: false, aiContent: 'Failed to load overview.' }));
    }
  }, [droppedPins]);

  const fetchAIOverview = useCallback(async (pinId, placeName, filter) => {
    const cacheKey = `Overview-${filter}`;
    const pin = droppedPins.find(p => p.id === pinId);
    if (pin && pin.aiCache[cacheKey]) {
      setActivePopupData(prev => ({ ...prev, loading: false, aiContent: pin.aiCache[cacheKey] }));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/generate-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeName, direction: 'Overview', filters: [filter] }),
      });
      const data = await response.json();
      const overviewText = data.suggestion || 'No overview available for this filter.';

      setDroppedPins(prevPins =>
        prevPins.map(p => (p.id === pinId ? { ...p, aiCache: { ...p.aiCache, [cacheKey]: overviewText } } : p))
      );
      setActivePopupData(prev => ({ ...prev, loading: false, aiContent: overviewText }));
    } catch (error) {
      console.error('Error fetching AI overview:', error);
      setActivePopupData(prev => ({ ...prev, loading: false, aiContent: 'Failed to load overview.' }));
    }
  }, [droppedPins]);

  const fetchAISuggestion = useCallback(async (pinId, placeName, direction, lng, lat, radius, filters) => {
    setActivePopupData(prev => ({ ...prev, loading: true, aiContent: 'Generating suggestions...', error: null }));
    const cacheKey = `${direction}-${radius}-${filters.sort().join(',')}`;

    try {
      const response = await fetch(`${API_BASE_URL}/generate-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeName, direction, lng, lat, radius, filters }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.details || 'Network response was not ok');

      const aiGeneratedContent = data.suggestion;
      const validLocations = [];
      const lines = aiGeneratedContent.split('\n');

      for (const line of lines) {
        const nameMatch = line.match(/\*\*(.*?)\*\*/);
        if (nameMatch) {
          const place = nameMatch[1].trim();
          const description = line.split('**:').slice(1).join(':').trim();

          const geocodingResponse = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json?access_token=${mapboxgl.accessToken}`);
          const geocodingData = await geocodingResponse.json();

          if (geocodingData.features?.length > 0) {
            const coordinates = geocodingData.features[0].center;
            if (isPointInArc(coordinates, [lng, lat], radius, direction)) {
              validLocations.push({ name: place, description, coords: coordinates });
            }
          }
        }
      }

      if (validLocations.length > 0) {
        const newPins = validLocations.map(loc => ({
          id: uuidv4(),
          coords: loc.coords,
          description: loc.description,
          name: loc.name,
          isAIGenerated: true,
          emoji: filters.length > 0 ? filterEmojis[filters[0]] : '📌',
          filters: filters,
          aiCache: {},
          lastRadius: {},
          lastDirection: null,
        }));
        setDroppedPins(prevPins => [...prevPins, ...newPins]);
      }

      const contentToDisplay = validLocations.length > 0
        ? validLocations.map(loc => `**${loc.name}**: ${loc.description}`).join('\n')
        : 'No suggestions found within the search area.';

      setDroppedPins(prevPins =>
        prevPins.map(p => (p.id === pinId ? { ...p, aiCache: { ...p.aiCache, [cacheKey]: contentToDisplay } } : p))
      );
      setActivePopupData(prev => ({ ...prev, loading: false, aiContent: contentToDisplay }));
    } catch (error) {
      console.error('Error fetching AI suggestion:', error);
      setActivePopupData(prev => ({ ...prev, loading: false, aiContent: 'Could not load suggestions.', error: error.message }));
    }
  }, [setDroppedPins, activeFilters, filterEmojis]);


  const handlePinClick = useCallback(async (pin) => {
    const placeName = await fetchPlaceName(pin.coords[0], pin.coords[1]);

    setActivePopupData({
      pinId: pin.id,
      lng: pin.coords[0],
      lat: pin.coords[1],
      direction: 'Overview',
      placeName: placeName,
      isAIGenerated: pin.isAIGenerated,
      loading: true,
      aiContent: '',
      error: null,
      radius: null,
    });

    if (pin.isAIGenerated && pin.filters && pin.filters.length > 0) {
      fetchAIOverview(pin.id, placeName, pin.filters[0]);
    } else {
      fetchGeneralOverview(pin.id, placeName);
    }
  }, [fetchPlaceName, fetchAIOverview, fetchGeneralOverview]);

  const handleDirectionalPopupOpen = useCallback(async (directionKey, pin) => {
    const placeName = await fetchPlaceName(pin.coords[0], pin.coords[1]);
    const direction = directionMap[directionKey];

    const cachedContent = pin.aiCache?.[`${direction}-${pin.lastRadius?.[direction]}-${activeFilters.sort().join(',')}`];

    setActivePopupData({
      pinId: pin.id,
      lng: pin.coords[0],
      lat: pin.coords[1],
      direction,
      placeName,
      isAIGenerated: false,
      loading: false,
      aiContent: cachedContent || 'Adjust radius and click "Explore" to get suggestions.',
      error: null,
      radius: pin.lastRadius?.[direction] || 5,
    });
  }, [fetchPlaceName, activeFilters]);

  const handleExploreDirection = useCallback(() => {
    if (!activePopupData || !activePopupData.direction) return;

    const { pinId, placeName, direction, lng, lat } = activePopupData;
    const cacheKey = `${direction}-${selectedRadius}-${activeFilters.sort().join(',')}`;
    const currentPin = droppedPins.find(p => p.id === pinId);
    const cachedContent = currentPin?.aiCache?.[cacheKey];

    if (cachedContent) {
      setActivePopupData(prev => ({ ...prev, loading: false, aiContent: cachedContent }));
    } else {
      fetchAISuggestion(pinId, placeName, direction, lng, lat, selectedRadius, activeFilters);
    }

    setDroppedPins(prevPins =>
      prevPins.map(p =>
        p.id === pinId
          ? { ...p, lastRadius: { ...(p.lastRadius || {}), [direction]: selectedRadius }, lastDirection: direction }
          : p
      )
    );

    const arcPoints = getArcPoints([lng, lat], selectedRadius, direction);
    if (map.current.getSource(ARC_SOURCE_ID)) {
      map.current.getSource(ARC_SOURCE_ID).setData({
        type: 'FeatureCollection',
        features: arcPoints.length > 0 ? [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [arcPoints] } }] : [],
      });
    }
  }, [activePopupData, selectedRadius, activeFilters, droppedPins, fetchAISuggestion]);

  const handleRadiusChange = useCallback((event) => {
    setSelectedRadius(Number(event.target.value));
  }, []);

  const handleConnectToAnotherMarker = useCallback(() => {
    if (activePopupData) {
      setConnectionMode(true);
      setConnectingMarkerId(activePopupData.pinId);
      setActivePopupData(null);
    }
  }, [activePopupData]);

  const handleFilterToggle = useCallback((filter) => {
    setPendingFilters(prevFilters => {
      if (prevFilters.includes(filter)) {
        return prevFilters.filter(f => f !== filter);
      } else {
        return [...prevFilters, filter];
      }
    });
  }, []);

  const handleApplyFilters = useCallback(() => {
    setActiveFilters([...pendingFilters]);
    setIsSidebarOpen(false);
  }, [pendingFilters]);

  const toggleSidebar = useCallback(() => {
    if (!isSidebarOpen) {
      setPendingFilters([...activeFilters]);
    }
    setIsSidebarOpen(prev => !prev);
  }, [isSidebarOpen, activeFilters]);

  const renderPopupContent = useCallback(() => {
    if (!activePopupData) return null;

    const { pinId, name, isAIGenerated, loading, aiContent, error, direction } = activePopupData;

    let content;
    if (loading) {
      content = 'Loading...';
    } else if (error) {
      content = `Error: ${error}`;
    } else if (aiContent) {
      content = aiContent;
    } else {
      content = 'No information available.';
    }

    const isDirectionalPopup = direction !== 'Overview';
    const isUserPin = !isAIGenerated;

    return (
      <div className="popup-content bg-white rounded-lg shadow-xl p-4 max-w-sm max-h-96 overflow-y-auto">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold">{name}</h3>
          <button onClick={handleClosePopup} className="text-gray-400 hover:text-gray-600 transition-colors">
            &times;
          </button>
        </div>

        <ReactMarkdown className="prose text-sm text-gray-700 leading-relaxed mb-4">
          {content}
        </ReactMarkdown>

        {isDirectionalPopup && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">Explore Options</h4>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium whitespace-nowrap">Radius: {selectedRadius}km</span>
              <input
                type="range"
                min="1"
                max="100"
                value={selectedRadius}
                onChange={handleRadiusChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <button
              onClick={handleExploreDirection}
              disabled={loading}
              className="w-full bg-blue-500 text-white rounded-lg py-2 px-4 hover:bg-blue-600 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Exploring...' : `Explore ${directionMap[direction]}`}
            </button>
          </div>
        )}

        {isUserPin && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between space-x-2">
            <button
              onClick={() => handleRemoveMarker(pinId)}
              className="flex-1 bg-red-500 text-white rounded-lg py-2 px-4 hover:bg-red-600 transition-colors"
            >
              Remove Marker
            </button>
            <button
              onClick={handleConnectToAnotherMarker}
              className="flex-1 bg-green-500 text-white rounded-lg py-2 px-4 hover:bg-green-600 transition-colors"
            >
              Connect
            </button>
          </div>
        )}
      </div>
    );
  }, [activePopupData, selectedRadius, handleRadiusChange, handleExploreDirection, handleClosePopup, handleRemoveMarker, handleConnectToAnotherMarker]);

  // =======================================================================
  // MAPBOX AND SIDEBAR EFFECTS
  // =======================================================================

  // Initialize the map and its layers (runs once)
  useEffect(() => {
    if (mapLoaded.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom,
      interactive: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });

    map.current.on('load', () => {
      mapLoaded.current = true;
      console.log('Map loaded and ready.');
      if (map.current.touchZoomRotate) {
        map.current.touchZoomRotate.disableRotation();
      }

      // Add sources and layers for pins, arrows, arcs, and connections
      map.current.addSource(MARKER_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({ id: MARKER_OUTLINE_LAYER_ID, type: 'circle', source: MARKER_SOURCE_ID, paint: { 'circle-radius': 12, 'circle-color': '#FFFFFF', 'circle-stroke-width': 2, 'circle-stroke-color': '#007BFF', 'circle-opacity': 1 } });
      map.current.addLayer({ id: MARKER_FILL_LAYER_ID, type: 'circle', source: MARKER_SOURCE_ID, paint: { 'circle-radius': 10, 'circle-color': ['case', ['==', ['get', 'id'], hoveredPinId], '#007BFF', '#FFFFFF'], 'circle-opacity': 1 } });
      map.current.addSource(ARROW_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({ id: ARROW_LAYER_ID, type: 'symbol', source: ARROW_SOURCE_ID, layout: { 'icon-image': 'triangle-15', 'icon-size': 1.5, 'icon-allow-overlap': true, 'icon-rotate': ['get', 'angle'], 'icon-anchor': 'center' }, paint: { 'icon-color': '#007BFF' } });
      map.current.addSource(ARC_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({ id: ARC_FILL_LAYER_ID, type: 'fill', source: ARC_SOURCE_ID, paint: { 'fill-color': '#00BFFF', 'fill-opacity': 0.25 } });
      map.current.addLayer({ id: ARC_LINE_LAYER_ID, type: 'line', source: ARC_SOURCE_ID, paint: { 'line-color': '#00BFFF', 'line-width': 2 } });
      map.current.addSource(CONNECTION_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({ id: CONNECTION_LAYER_ID, type: 'line', source: CONNECTION_SOURCE_ID, paint: { 'line-color': '#F76D5E', 'line-width': 3, 'line-dasharray': [2, 2] } });

      // Add marker interaction events
      map.current.on('mouseenter', MARKER_FILL_LAYER_ID, (e) => {
        if (e.features.length) {
          setHoveredPinId(e.features[0].properties.id);
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });
      map.current.on('mouseleave', MARKER_FILL_LAYER_ID, () => {
        setHoveredPinId(null);
        map.current.getCanvas().style.cursor = '';
      });
      map.current.on('click', MARKER_FILL_LAYER_ID, (e) => {
        if (e.features.length) {
          const clickedPin = droppedPins.find(p => p.id === e.features[0].properties.id);
          if (clickedPin) {
            handlePinClick(clickedPin);
          }
        }
      });
    });

    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });

    map.current.on('click', (e) => {
      if (!map.current.getLayer('arrow-layer') || !map.current.getLayer('marker-fill-layer')) return;

      const features = map.current.queryRenderedFeatures(e.point, {
        layers: [ARROW_LAYER_ID, MARKER_FILL_LAYER_ID],
      });

      if (features.length === 0) {
        if (activePopupData) {
          handleClosePopup();
        } else {
        }
      }
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update map sources when state changes
  useEffect(() => {
    if (!map.current || !mapLoaded.current) return;

    const markerFeatures = droppedPins.map(pin => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: pin.coords },
      properties: { id: pin.id, emoji: pin.emoji, isAI: pin.isAIGenerated, direction: pin.lastDirection, radius: pin.lastRadius?.[pin.lastDirection] },
    }));

    map.current.getSource(MARKER_SOURCE_ID)?.setData({
      type: 'FeatureCollection',
      features: markerFeatures,
    });

    if (activePopupData && !activePopupData.isAIGenerated && !activePopupData.isDirectionalPopup) {
      const arrowFeatures = ['N', 'S', 'E', 'W'].map(directionKey => {
        const destination = getDestinationPoint(activePopupData.lng, activePopupData.lat, 0.5, directionKey);
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [destination[0], destination[1]] },
          properties: { id: `arrow-${directionKey}`, direction: directionKey, angle: { 'N': 0, 'S': 180, 'E': 90, 'W': 270 }[directionKey] }
        };
      });
      map.current.getSource(ARROW_SOURCE_ID)?.setData({ type: 'FeatureCollection', features: arrowFeatures });
    } else {
      map.current.getSource(ARROW_SOURCE_ID)?.setData({ type: 'FeatureCollection', features: [] });
    }

    const connectionFeatures = drawnLines.map(line => line.geojson);
    map.current.getSource(CONNECTION_SOURCE_ID)?.setData({ type: 'FeatureCollection', features: connectionFeatures });
  }, [droppedPins, activePopupData, drawnLines, hoveredPinId]);

  // Update popup when activePopupData changes
  useEffect(() => {
    if (!map.current) return;

    if (map.current.getLayer('popup')) {
      map.current.removeLayer('popup');
      map.current.removeSource('popup');
    }

    if (activePopupData) {
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setLngLat([activePopupData.lng, activePopupData.lat])
        .setDOMContent(() => {
          const div = document.createElement('div');
          div.innerHTML = renderPopupContent();
          return div;
        })
        .addTo(map.current);

      return () => {
        popup.remove();
      };
    }
  }, [activePopupData, renderPopupContent]);

  return (
    <>
      <div ref={mapContainer} className="map-container" style={{ flex: 1, height: '100vh' }}></div>

      {connectionSuccess && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 p-2 bg-green-500 text-white rounded-lg shadow-xl z-50 transition-opacity duration-300">
          {connectionSuccess}
        </div>
      )}

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
          <h3 className="font-semibold mb-2">Filters</h3>
          <p className="text-sm text-gray-600">e.g., historical sites, foodie spots, nature trails</p>
        </div>
        <div className="mt-4 p-3 bg-white rounded-lg shadow-inner">
          <h3 className="font-semibold mb-2">Trip Connections</h3>
          <p className="text-sm text-gray-600">Manage connections between your markers.</p>
        </div>
      </Sidebar>

      {/* CORRECTED: Using the ArrowPin component as requested */}
      <div className="absolute bottom-4 right-4 p-2 bg-white rounded-full shadow-lg z-10 flex items-center justify-center">
        <ArrowPin onClick={dropPinAtCenter} />
      </div>
    </>
  );
}

// Dummy function to prevent errors if getDestinationPoint is not in mapUtils
function getDestinationPoint(lng, lat, distance, direction) {
  // Implement a simple dummy function or replace with your actual utility
  return [lng, lat];
}
