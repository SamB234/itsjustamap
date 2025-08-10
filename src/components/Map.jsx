import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown'; // <-- Add this import


// Import custom components and utilities
import ArrowPin from './ArrowPin';
import { getArcPoints, getCurvedLinePoints, getDestinationPoint, getCurvedArc, isPointInArc } from './mapUtils';
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
const MARKER_SOURCE_ID = 'markers-source';
const MARKER_FILL_LAYER_ID = 'markers-fill';
const MARKER_OUTLINE_LAYER_ID = 'markers-outline';
const ARROW_SOURCE_ID = 'arrow-source';
const ARROW_LAYER_ID = 'arrow-layer';
const ARC_SOURCE_ID = 'arc-source';
const ARC_LINE_LAYER_ID = 'arc-line-layer'; // Renamed for clarity
const ARC_FILL_LAYER_ID = 'arc-fill-layer'; // New layer for the fill
const CONNECTION_SOURCE_ID = 'connection-source';
const CONNECTION_LAYER_ID = 'connection-layer';

// =========================================================================
// MAIN MAP COMPONENT
// =========================================================================

export default function Map() {
  // =======================================================================
  // STATE MANAGEMENT
  // =======================================================================

  // useRef is used for mutable values that don't trigger re-renders
  const mapContainer = useRef(null);
  const map = useRef(null);
  const mapLoaded = useRef(false);

  // useState is for variables that, when updated, should re-render the component
  const [lng, setLng] = useState(-0.1276);
  const [lat, setLat] = useState(51.5074);
  const [zoom, setZoom] = useState(9);
  const [droppedPins, setDroppedPins] = useState([]);
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const [activePopupData, setActivePopupData] = useState(null);
  const [popupPos, setPopupPos] = useState(null);
  const [selectedRadius, setSelectedRadius] = useState(5);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [drawnLines, setDrawnLines] = useState([]);
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectingMarkerId, setConnectingMarkerId] = useState(null);
  const [connectionSuccess, setConnectionSuccess] = useState(null);

  // New state for filters
  const filterOptions = ['nature', 'culture', 'adventure', 'sports', 'beach', 'food', 'nightlife'];
  const [activeFilters, setActiveFilters] = useState([]);
  const [pendingFilters, setPendingFilters] = useState([]);

  const [aiPins, setAiPins] = useState([]); 
//  const [filters, setFilters] = useState([]);

  // =======================================================================
  // CALLBACK FUNCTIONS (useCallback)
  // =======================================================================

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






const filterEmojis = {
  'nature': '🌳',
  'culture': '🏛️',
  'adventure': '⛰️',
  'sports': '⚽',
  'beach': '🏖️',
  'food': '🍔',
  'nightlife': '🌃'
};






// In map.jsx
const fetchAISuggestion = useCallback(async (pinId, placeName, direction, lng, lat, radius = 5) => {
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

    if (direction === 'Overview') {
        const overview = await fetchGeneralOverview(placeName);
        setActivePopupData(prev => ({
            ...prev,
            loading: false,
            aiContent: overview,
            error: null,
            radius: null
        }));
        return;
    }

    const cacheKey = direction + '-' + activeFilters.sort().join(',');
    const currentPin = droppedPins.find(p => p.id === pinId);
    if (currentPin && currentPin.aiCache && currentPin.aiCache[cacheKey]) {
        setActivePopupData(prev => ({
            ...prev,
            loading: false,
            aiContent: currentPin.aiCache[cacheKey],
            error: null,
            radius: direction === 'Overview' ? null : radius,
        }));
        return;
    }

    setActivePopupData(prev => ({
        ...prev,
        loading: true,
        aiContent: 'Searching for towns and generating suggestions...',
        error: null,
        radius: direction === 'Overview' ? null : radius,
    }));

    try {
        console.log('Fetching towns from Mapbox...');
        
    const townsResponse = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/place.json?country=GB&types=place,locality,city&proximity=${lng},${lat}&access_token=${mapboxgl.accessToken}`);
    if (!townsResponse.ok) {
    throw new Error(`Mapbox API request failed with status: ${townsResponse.status}`);
}
const townsData = await townsResponse.json();

        const townNames = townsData.features
            .map(feature => feature.text)
            .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

        if (townNames.length === 0) {
            const aiContentToDisplay = 'No major towns found near this area. Try a different location.';
            setActivePopupData(prev => ({
                ...prev,
                loading: false,
                aiContent: aiContentToDisplay,
                error: null,
            }));
            return;
        }

        console.log(`Found towns: ${townNames.join(', ')}`);

        // The AI prompt is now more precise, including the direction.
        const prompt = `Given the following list of places: ${townNames.join(', ')}. The user is exploring towards the ${directionMap[direction]} of ${placeName}, within a radius of ${radius}km. They are interested in a trip with the following filters: ${activeFilters.join(', ')}. Provide a concise suggestion of a place from the list and why it fits the filters and the general direction. Only include suggestions that are geographically plausible for the given direction and radius. Format your response as a numbered list with each item starting with the place name in bold, followed by a colon and the description. For example: **Townsville**: A great spot for foodies.`;
        
        const response = await fetch(`${API_BASE_URL}/generate-suggestion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });

        const responseText = await response.text();
        if (!responseText) {
            throw new Error('Server returned an empty response.');
        }

        const aiGeneratedContent = JSON.parse(responseText).suggestion;
        const lines = aiGeneratedContent.split('\n');
        const validLocations = [];

        for (const line of lines) {
            const match = line.match(/\*\*(.*?)\*\*\s*:\s*(.*)/);
            if (match) {
                const place = match[1].trim();
                const description = match[2].trim();
                validLocations.push({ name: place, description });
            }
        }
        
        const geocodedLocations = [];
        for (const loc of validLocations) {
            const geocodingResponse = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(loc.name)}.json?country=GB&access_token=${mapboxgl.accessToken}`);
            const geocodingData = await geocodingResponse.json();
            
            if (geocodingData.features && geocodingData.features.length > 0) {
                const coordinates = geocodingData.features[0].center;
                if (isPointInArc(coordinates, [lng, lat], radius, direction)) {
                    geocodedLocations.push({
                        ...loc,
                        coords: coordinates
                    });
                } else {
                    console.warn(`AI suggested '${loc.name}', but it's outside the arc and will not be displayed.`);
                }
            } else {
                console.warn(`Could not find coordinates for: ${loc.name}`);
            }
        }

        if (geocodedLocations.length > 0) {
            setDroppedPins(prevPins => {
                const newPins = geocodedLocations.map(loc => ({
                    id: uuidv4(),
                    coords: loc.coords,
                    description: loc.description,
                    name: loc.name,
                    isAIGenerated: true,
                    emoji: activeFilters.length > 0 ? (filterEmojis[activeFilters[0].toLowerCase()] || '📌') : '📌',
                    filters: activeFilters,
                }));
                return [...prevPins, ...newPins];
            });
        } else {
            console.log('No suggestions found within the search area.');
        }

        const aiContentToDisplay = geocodedLocations.length > 0
            ? 'Based on the towns found within the search area, here are a few suggestions:\n' + geocodedLocations.map(loc => `**${loc.name}**: ${loc.description}`).join('\n')
            : 'No suggestions found within the search area.';

        setDroppedPins(prevPins =>
            prevPins.map(pin =>
                pin.id === pinId
                    ? { ...pin, aiCache: { ...pin.aiCache, [cacheKey]: aiContentToDisplay } }
                    : pin
            )
        );

        setActivePopupData((prev) => ({
            ...prev,
            loading: false,
            aiContent: aiContentToDisplay,
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
}, [droppedPins, setDroppedPins, setActivePopupData, activeFilters, filterEmojis, isPointInArc, fetchGeneralOverview]);

  

  

  
  

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

        // Find existing cached content for the Overview direction, regardless of filters
        let cachedContent = null;
        for (const key in pin.aiCache) {
          if (key.startsWith('Overview-')) {
            cachedContent = pin.aiCache[key];
            break; // Use the first one we find
          }
        }

        // Check if the current cache key (with active filters) exists to determine if stale
        const currentCacheKey = direction + '-' + activeFilters.sort().join(',');
        const isStale = cachedContent && !pin.aiCache[currentCacheKey];

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

      // Find any existing cached content for this direction to display
      let cachedContent = null;
      let lastRadius = pin.lastRadius?.[direction] || 5;
      for (const key in pin.aiCache) {
        if (key.startsWith(direction + '-')) {
          cachedContent = pin.aiCache[key];
          break; // Use the first one we find
        }
      }

      // Determine if this content is stale by checking if a cache key for the
      // current filters exists.
      const currentCacheKey = direction + '-' + activeFilters.sort().join(',');
      const isStale = cachedContent && !pin.aiCache[currentCacheKey];

      const initialContent = cachedContent || 'Adjust radius and click "Explore" to get suggestions.';

      setSelectedRadius(lastRadius);

      if (pin.lastRadius?.[direction] && pin.lastDirection === direction) {
        const centerCoords = [pin.lng, pin.lat];
        const arcPoints = getArcPoints(centerCoords, pin.lastRadius[direction], direction);
        if (map.current && map.current.getSource(ARC_SOURCE_ID)) {
          map.current.getSource(ARC_SOURCE_ID).setData({
            type: 'FeatureCollection',
            features: arcPoints.length > 0 ? [{
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: [arcPoints] },
              properties: { direction }
            }] : []
          });
        }
      }

      setActivePopupData({
        pinId: pin.id, lng, lat, direction, placeName, loading: cachedContent ? false : false, aiContent: initialContent, error: null, radius: lastRadius, isStale,
      });
    },
    [fetchPlaceName, activeFilters]
  );

// Map.jsx

// Find this function and replace it with the one below
const handleExploreDirection = useCallback(() => {
    if (!activePopupData) return;
    const { pinId, placeName, direction, lng, lat, isStale } = activePopupData;

    // Determine the current cache key based on the current radius and filters
    const cacheKey = direction + '-' + selectedRadius + '-' + activeFilters.sort().join(',');

    const currentPin = droppedPins.find(p => p.id === pinId);
    
    // Check if we need to fetch new data. This happens if:
    // 1. The data is marked as stale (due to radius or filter changes).
    // 2. The cache key for the current settings doesn't exist.
    // 3. The current AI content is the default "Adjust radius..." message.
    if (isStale || !currentPin || !currentPin.aiCache[cacheKey] || activePopupData.aiContent.includes('Adjust radius and click')) {

        setActivePopupData(prev => ({
            ...prev,
            loading: true,
            aiContent: 'Generating suggestions...',
            error: null,
            isStale: false, // Reset the stale flag
        }));
        
        fetchAISuggestion(pinId, placeName, direction, lng, lat, selectedRadius, activeFilters);
    } else {
        // If the data is not stale and already in the cache, use it directly
        setActivePopupData(prev => ({
            ...prev, 
            loading: false, 
            aiContent: currentPin.aiCache[cacheKey], 
            error: null,
            isStale: false,
        }));
    }

    // Store the last used radius and direction
    setDroppedPins(prevPins =>
        prevPins.map(p => {
            if (p.id === pinId) {
                return {
                    ...p,
                    lastRadius: { ...(p.lastRadius || {}), [direction]: selectedRadius },
                    lastDirection: direction
                };
            }
            return p;
        })
    );

    // Update the arc on the map
    const centerCoords = [lng, lat];
    const arcPoints = getArcPoints(centerCoords, selectedRadius, direction);
    if (map.current && map.current.getSource(ARC_SOURCE_ID)) {
        map.current.getSource(ARC_SOURCE_ID).setData({
            type: 'FeatureCollection',
            features: arcPoints.length > 0 ? [{
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [arcPoints] },
                properties: { direction }
            }] : []
        });
    }
}, [activePopupData, fetchAISuggestion, selectedRadius, droppedPins, activeFilters]);

  // Handler for the "Connect" button
  const handleConnectToAnotherMarker = useCallback(() => {
    if (activePopupData) {
      setConnectionMode(true);
      setConnectingMarkerId(activePopupData.pinId);
      setActivePopupData(null);
    }
  }, [activePopupData]);
  

const handleRadiusChange = useCallback((event) => {
    const sliderValue = Number(event.target.value);
    const nonlinearRadius = Math.round(1000 * Math.pow(sliderValue / 100, 2));

    setSelectedRadius(nonlinearRadius);

    // Get the direction from the activePopupData
    const currentDirection = activePopupData.direction;
    
    // Check if the new radius is different from the previously explored radius for the current direction
    const lastExploredRadius = activePopupData?.radius;
    
    if (lastExploredRadius !== nonlinearRadius) {
        // This marks the content as stale
        setActivePopupData(prev => ({
            ...prev,
            loading: false,
            aiContent: prev.aiContent, // Keep the previous content to show until the user clicks 'Explore'
            error: null,
            isStale: true, // A new state variable to track staleness due to radius change
            // Do not update the `radius` property here, only update it on the 'Explore' button click.
        }));
    }
}, [activePopupData]);
  

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
    setIsSidebarOpen(false);
  }, [pendingFilters]);

  // Handler to toggle the sidebar
  const toggleSidebar = useCallback(() => {
    if (!isSidebarOpen) {
      setPendingFilters([...activeFilters]);
    }
    setIsSidebarOpen(prev => !prev);
  }, [isSidebarOpen, activeFilters]);

  // =======================================================================
  // MAP INITIALIZATION (Runs once)
  // =======================================================================
  useEffect(() => {
    if (mapLoaded.current) return;

    mapboxgl.accessToken = mapboxgl.accessToken;
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

      // Add Sources and Layers for Pins
      map.current.addSource(MARKER_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({
        id: MARKER_OUTLINE_LAYER_ID,
        type: 'circle',
        source: MARKER_SOURCE_ID,
        paint: {
          'circle-radius': 10,
          'circle-color': '#007BFF',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 1,
        }
      });
      map.current.addLayer({
        id: MARKER_FILL_LAYER_ID,
        type: 'circle',
        source: MARKER_SOURCE_ID,
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'case',
            ['==', ['get', 'id'], hoveredPinId],
            '#FFFFFF',
            '#007BFF'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#007BFF',
          'circle-opacity': 1,
        }
      });
      // Add Sources and Layers for Directional Arrows and Arc
      map.current.addSource(ARC_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({
        id: ARC_FILL_LAYER_ID,
        type: 'fill',
        source: ARC_SOURCE_ID,
        paint: {
          'fill-color': '#00BFFF',
          'fill-opacity': 0.25,
        }
      });
      map.current.addLayer({
        id: ARC_LINE_LAYER_ID,
        type: 'line',
        source: ARC_SOURCE_ID,
        paint: {
          'line-color': '#00BFFF',
          'line-width': 2,
        },
      });

      // Add Source and Layer for Connection Lines
      map.current.addSource(CONNECTION_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({
        id: CONNECTION_LAYER_ID,
        type: 'line',
        source: CONNECTION_SOURCE_ID,
        paint: {
          'line-color': '#007BFF',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });
    });

    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        mapLoaded.current = false;
      }
    };
  }, []); // Empty dependency array, so this effect runs only ONCE.

  // =======================================================================
  // DYNAMIC MAP UPDATES (useEffect hooks)
  // =======================================================================

  // This useEffect handles the map click listener specifically for closing the popup.
  useEffect(() => {
    if (!map.current || !mapLoaded.current) return;

    const handleMapClickToClosePopup = (e) => {
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: [MARKER_FILL_LAYER_ID, MARKER_OUTLINE_LAYER_ID],
      });
      if (!features.length && activePopupData) {
        handleClosePopup();
      }
    };

    map.current.on('click', handleMapClickToClosePopup);

    // Clean up the event listener when the component unmounts or dependencies change
    return () => {
      if (map.current) {
        map.current.off('click', handleMapClickToClosePopup);
      }
    };
  }, [activePopupData, handleClosePopup]);

  // This useEffect forces a re-render of the markers on every map move,
  // ensuring they stay aligned with their geographic coordinates.
  useEffect(() => {
    if (!map.current || !mapLoaded.current) return;

    const updateMarkerPositions = () => {
      // Trigger a state update to re-render the dropped pins
      setDroppedPins(prevPins => [...prevPins]);
    };

    map.current.on('move', updateMarkerPositions);

    return () => {
      if (map.current) {
        map.current.off('move', updateMarkerPositions);
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded.current) return;
    const pinFeatures = droppedPins.map(pin => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: pin.coords },
      properties: { id: pin.id }
    }));
    map.current.getSource(MARKER_SOURCE_ID)?.setData({
      type: 'FeatureCollection',
      features: pinFeatures
    });
  }, [droppedPins]);

  useEffect(() => {
    if (!map.current || !mapLoaded.current) return;
    map.current.setPaintProperty(MARKER_FILL_LAYER_ID, 'circle-color', [
      'case',
      ['==', ['get', 'id'], hoveredPinId],
      '#FFFFFF',
      '#007BFF'
    ]);
  }, [hoveredPinId]);

  useEffect(() => {
    console.log("useEffect [drawnLines] triggered. drawnLines count:", drawnLines.length);

    const updateMapLines = () => {
      if (map.current && mapLoaded.current && map.current.getSource(CONNECTION_SOURCE_ID)) {
        const lineFeatures = drawnLines.map(line => line.geojson);
        try {
          map.current.getSource(CONNECTION_SOURCE_ID).setData({
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
        const popupTransform = activePopupData.direction === 'North' ? '30%' : '-130%';
        setPopupPos({ x: point.x, y: point.y, transform: popupTransform });

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
  // COMPONENT RENDERING (JSX)
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
          left: popupPos.x,
          top: popupPos.y,
          transform: `translate(-50%, ${activePopupData.direction === 'North' ? '30%' : '-130%'})`,
          width: '320px',
          background: 'rgba(240, 240, 240, 0.95)', backdropFilter: 'blur(8px)', borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', color: '#111', fontFamily: 'system-ui, sans-serif',
        }} onClick={(e) => e.stopPropagation()}
        >
          {/* Popup header */}
          <div className="flex justify-between items-center mb-2">
            <strong className="text-lg text-blue-700">{activePopupData.placeName || 'Loading...'}</strong>
            <button onClick={handleClosePopup} aria-label="Close popup" className="text-gray-600 hover:text-gray-900 font-bold text-xl leading-none">×</button>
          </div>

{/* Stale content warning */}
          {(activePopupData.isStale && activePopupData.direction !== 'Overview') && (
            <div className="bg-yellow-100 text-yellow-800 p-2 rounded-lg text-xs mb-2">
              Note: This information was generated with different filters or radius settings.
            </div>
          )}

          <div className="text-sm text-gray-500 mb-2">
            {activePopupData.direction === 'Overview' ? 'Discover this area' : `Explore toward the ${directionMap[activePopupData.direction] || activePopupData.direction}`}
          </div>

          {/* Radius slider (only for directional exploration) */}
          {activePopupData.direction !== 'Overview' && (
            <div className="mb-4">
              <label htmlFor="radius-slider" className="block text-sm font-medium text-gray-700 mb-1">
                Radius: {selectedRadius} km
              </label>
              <input type="range" id="radius-slider" min="0" max="100" step="1" value={Math.sqrt(selectedRadius / 1000) * 100} onChange={handleRadiusChange} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer range-lg" />
            </div>
          )}

          {/* AI content display area */}
          <div className="mb-4 text-gray-800 text-sm whitespace-pre-wrap">
            {activePopupData.loading ? (
              <span className="text-blue-500 animate-pulse">{activePopupData.aiContent}</span>
            ) : activePopupData.error ? (
              <span className="text-red-500">Error: {activePopupData.error}</span>
            ) : (
              <ReactMarkdown>{activePopupData.aiContent}</ReactMarkdown>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {activePopupData.direction !== 'Overview' && (
              <button className="px-3 py-1 border border-blue-500 text-blue-600 rounded-full hover:bg-blue-700 hover:text-gray-100 transition" onClick={handleExploreDirection}>
                {activePopupData.isStale ? `Update with current settings` : `Explore ${directionMap[activePopupData.direction] || activePopupData.direction}`}
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

      <div className="absolute bottom-4 right-4 p-2 bg-white rounded-full shadow-lg z-10 flex items-center justify-center">
        <button onClick={toggleSidebar} className="text-2xl text-blue-600 p-2">
          {isSidebarOpen ? '❮' : '❯'}
        </button>
      </div>

    </>
  );
}
