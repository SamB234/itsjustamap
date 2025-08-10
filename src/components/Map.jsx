import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';

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
const ARC_SOURCE_ID = 'arc-source';
const ARC_LAYER_ID = 'arc-layer';
const POINT_OF_INTEREST_SOURCE_ID = 'poi-source';
const POINT_OF_INTEREST_FILL_LAYER_ID = 'poi-fill-layer';
const POINT_OF_INTEREST_OUTLINE_LAYER_ID = 'poi-outline-layer';

// =========================================================================
// MAIN MAP COMPONENT
// =========================================================================

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [markers, setMarkers] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activePopupData, setActivePopupData] = useState(null);
  const [popup, setPopup] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [routeLine, setRouteLine] = useState(null);
  const [pendingFilters, setPendingFilters] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterOptions, setFilterOptions] = useState([]);

  // Mock data for the filters for now, this would come from an API in a real app
  const mockFilterOptions = [
    { label: 'Historical Sites', value: 'historical', color: '#10B981' },
    { label: 'Foodie Spots', value: 'foodie', color: '#F59E0B' },
    { label: 'Nature Trails', value: 'nature', color: '#3B82F6' },
    { label: 'Beaches', value: 'beach', color: '#06B6D4' },
    { label: 'Museums', value: 'museum', color: '#6366F1' },
  ];

  // =========================================================================
  // MAP INITIALIZATION & SIDE EFFECTS
  // =========================================================================

  useEffect(() => {
    // Return early if the map is already initialized
    if (map.current) return;

    // Initialize the map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-74.5, 40],
      zoom: 9,
    });

    // Add navigation controls to the map
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add sources and layers once the map style is loaded
    map.current.on('load', () => {
      // Create a source for the markers
      map.current.addSource(MARKER_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Add layers for the markers
      map.current.addLayer({
        id: MARKER_OUTLINE_LAYER_ID,
        type: 'circle',
        source: MARKER_SOURCE_ID,
        paint: {
          'circle-radius': 10,
          'circle-color': '#000',
          'circle-opacity': 0.8,
        },
      });

      map.current.addLayer({
        id: MARKER_FILL_LAYER_ID,
        type: 'circle',
        source: MARKER_SOURCE_ID,
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'match',
            ['get', 'category'],
            'historical',
            '#10B981',
            'foodie',
            '#F59E0B',
            'nature',
            '#3B82F6',
            'beach',
            '#06B6D4',
            'museum',
            '#6366F1',
            '#E5E7EB', // default color
          ],
        },
      });

      // Add a source for the route arc
      map.current.addSource(ARC_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Add a layer for the route arc
      map.current.addLayer({
        id: ARC_LAYER_ID,
        type: 'line',
        source: ARC_SOURCE_ID,
        paint: {
          'line-color': '#4299e1',
          'line-width': 4,
          'line-opacity': 0.7,
        },
      });

      // Add a source and layers for points of interest
      map.current.addSource(POINT_OF_INTEREST_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.current.addLayer({
        id: POINT_OF_INTEREST_OUTLINE_LAYER_ID,
        type: 'circle',
        source: POINT_OF_INTEREST_SOURCE_ID,
        paint: {
          'circle-radius': 6,
          'circle-color': '#000',
          'circle-opacity': 0.8,
        },
      });

      map.current.addLayer({
        id: POINT_OF_INTEREST_FILL_LAYER_ID,
        type: 'circle',
        source: POINT_OF_INTEREST_SOURCE_ID,
        paint: {
          'circle-radius': 4,
          'circle-color': '#FCA5A5',
        },
      });

      // Set up click event listeners
      map.current.on('click', MARKER_FILL_LAYER_ID, handleMarkerClick);
      map.current.on('click', handleMapClick);

      // Change the cursor to a pointer when hovering over a marker
      map.current.on('mouseenter', MARKER_FILL_LAYER_ID, () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      // Change the cursor back to default when leaving a marker
      map.current.on('mouseleave', MARKER_FILL_LAYER_ID, () => {
        map.current.getCanvas().style.cursor = '';
      });

      // Add mousemove event to display the popup if it's over a pin
      map.current.on('mousemove', handleMouseMove);
    });

    setFilterOptions(mockFilterOptions);

    // Clean up on unmount
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // =========================================================================
  // HELPER FUNCTIONS & EVENT HANDLERS
  // =========================================================================

  const getCoordinatesFromEvent = useCallback((e) => {
    if (e.features && e.features.length > 0) {
      return e.features[0].geometry.coordinates;
    }
    return [e.lngLat.lng, e.lngLat.lat];
  }, []);

  // Handler for when the map is clicked
  const handleMapClick = useCallback((e) => {
    // If the sidebar is open, close it
    if (isSidebarOpen) {
      toggleSidebar();
    }
    // If a popup is open, close it
    if (popup) {
      popup.remove();
      setPopup(null);
      setActivePopupData(null);
    }
    // If a marker is selected, clear the selection
    if (selectedMarker) {
      setSelectedMarker(null);
      if (map.current.getLayer(ARC_LAYER_ID)) {
        map.current.getSource(ARC_SOURCE_ID).setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    }
  }, [isSidebarOpen, popup, selectedMarker]);


  // Handles marker clicks, displaying a popup
  const handleMarkerClick = useCallback((e) => {
    e.preventDefault();

    const clickedMarker = e.features[0];
    const coordinates = getCoordinatesFromEvent(e);
    const pinId = clickedMarker.properties.id;

    if (popup) popup.remove();

    if (selectedMarker === pinId) {
      // If the same marker is clicked again, deselect it
      setSelectedMarker(null);
      map.current.getSource(ARC_SOURCE_ID).setData({
        type: 'FeatureCollection',
        features: [],
      });
    } else {
      // Select a new marker and show the arc
      setSelectedMarker(pinId);
      const start = coordinates;
      const destination = getDestinationPoint(start);
      const arc = getCurvedArc(start, destination);

      if (map.current.getSource(ARC_SOURCE_ID)) {
        map.current.getSource(ARC_SOURCE_ID).setData(arc);
      }
    }

    const newPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      anchor: 'bottom',
      offset: 20,
    })
      .setLngLat(coordinates)
      .setHTML('<div id="popup-content"></div>')
      .addTo(map.current);

    setPopup(newPopup);
    setActivePopupData({
      id: clickedMarker.properties.id,
      title: clickedMarker.properties.title,
      description: clickedMarker.properties.description,
      category: clickedMarker.properties.category,
      pinId: pinId,
    });
  }, [popup, selectedMarker]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prevState) => !prevState);
    if (popup) {
      popup.remove();
      setPopup(null);
    }
  }, [popup]);

  // Handle adding a new marker
  const handleAddMarker = useCallback(async () => {
    setIsLoading(true);
    const center = map.current.getCenter();
    const newMarker = {
      id: uuidv4(),
      title: 'New Marker',
      description: 'A newly added marker.',
      category: 'nature',
      coordinates: [center.lng, center.lat],
    };

    try {
      const response = await fetch(`${API_BASE_URL}/markers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMarker),
      });

      if (!response.ok) {
        throw new Error('Failed to add marker');
      }

      setMarkers((prevMarkers) => [...prevMarkers, newMarker]);
    } catch (error) {
      console.error('Error adding marker:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handles removing a marker
  const handleRemoveMarker = useCallback(async (pinId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/markers/${pinId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove marker');
      }

      setMarkers((prevMarkers) => prevMarkers.filter((marker) => marker.id !== pinId));

      if (popup) {
        popup.remove();
        setPopup(null);
      }
    } catch (error) {
      console.error('Error removing marker:', error);
    }
  }, [popup]);

  // Handle filter toggles
  const handleFilterToggle = useCallback((filterValue) => {
    setPendingFilters((prevFilters) =>
      prevFilters.includes(filterValue)
        ? prevFilters.filter((f) => f !== filterValue)
        : [...prevFilters, filterValue]
    );
  }, []);

  // Handle applying filters
  const handleApplyFilters = useCallback(() => {
    setActiveFilters(pendingFilters);
  }, [pendingFilters]);

  const handleMouseMove = useCallback((e) => {
    if (activePopupData) {
      const isOverPopup = isPointInArc(e.point, map.current.project(activePopupData.coordinates));
      if (!isOverPopup) {
        // You can add logic here to hide the popup if the user moves away
      }
    }
  }, [activePopupData]);

  // Update the map's marker data whenever the markers or activeFilters state changes
  useEffect(() => {
    if (map.current && map.current.getSource(MARKER_SOURCE_ID)) {
      const filteredMarkers = markers.filter((marker) =>
        activeFilters.length > 0 ? activeFilters.includes(marker.category) : true
      );
      const geojsonFeatures = filteredMarkers.map((marker) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: marker.coordinates,
        },
        properties: {
          id: marker.id,
          title: marker.title,
          description: marker.description,
          category: marker.category,
        },
      }));
      map.current.getSource(MARKER_SOURCE_ID).setData({
        type: 'FeatureCollection',
        features: geojsonFeatures,
      });
    }
  }, [markers, activeFilters]);

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans">
      <div ref={mapContainer} className="map-container w-full h-full" />

      {/* Main UI elements */}
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-3xl font-bold text-gray-800">Trip Planner</h1>
      </div>

      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <button
          onClick={handleAddMarker}
          className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300"
          aria-label="Add new marker"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="animate-spin h-5 w-5 block border-4 border-gray-500 rounded-full border-t-transparent"></span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>
        <button
          onClick={toggleSidebar}
          className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300"
          aria-label="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {activePopupData && (
        <div className="absolute z-30 p-4 bg-white rounded-xl shadow-2xl min-w-[250px] max-w-sm"
             style={{
               left: '50%',
               top: '50%',
               transform: 'translate(-50%, -50%)',
             }}
        >
          <h2 className="text-lg font-bold text-gray-900 mb-1">{activePopupData.title}</h2>
          <p className="text-sm text-gray-600 mb-3">{activePopupData.description}</p>
          <div className="flex space-x-2">
            <button
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 rounded-full hover:bg-blue-600 transition"
              onClick={() => setSelectedMarker(activePopupData.pinId)}
            >
              View Details
            </button>
            <button
              className="px-4 py-2 text-sm font-semibold border border-red-500 text-red-600 rounded-full hover:bg-red-50 transition"
              onClick={() => handleRemoveMarker(activePopupData.pinId)}
            >
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
        {selectedMarker && (
          <ArrowPin
            onClick={() => {
              // Logic to add a new point along the route
              console.log("Add point along route clicked");
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Map;
