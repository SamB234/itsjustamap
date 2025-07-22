import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import ArrowPin from './ArrowPin'

mapboxgl.accessToken =
  'pk.eyJ1Ijoic2FtYjIzNCIsImEiOiJjbWRkZ25xcmcwNHhvMmxxdGU3c2J0eTZnIn0.j5NEdvNhU_eZ1tirQpKEAA'

export default function Map() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const popupRef = useRef(null) // Store Mapbox Popup instance

  const [lng, setLng] = useState(-0.1276)
  const [lat, setLat] = useState(51.5074)
  const [zoom, setZoom] = useState(9)
  const [droppedPins, setDroppedPins] = useState([])
  const [hoveredPinIndex, setHoveredPinIndex] = useState(null)
  const [activePopupData, setActivePopupData] = useState(null) // { lng, lat, direction }

  // Initialize map once
  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom,
    })

    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4))
      setLat(map.current.getCenter().lat.toFixed(4))
      setZoom(map.current.getZoom().toFixed(2))
    })
  }, [])

  // Manage popup creation/update
  useEffect(() => {
    if (!map.current) return

    // Remove existing popup
    if (popupRef.current) {
      popupRef.current.remove()
      popupRef.current = null
    }

    if (activePopupData) {
      popupRef.current = new mapboxgl.Popup({ closeOnClick: true, offset: 25 })
        .setLngLat([activePopupData.lng, activePopupData.lat])
        .setHTML(`
          <div style="font-weight:bold; margin-bottom: 6px;">AI Explorer – ${activePopupData.direction}</div>
          <p style="margin-bottom: 8px;">AI-generated info about this area will go here.</p>
          <button style="margin-bottom:4px; padding:4px 8px; border:1px solid #3b82f6; color:#3b82f6; border-radius:9999px; background:transparent; cursor:pointer;">
            Explore ${activePopupData.direction}
          </button>
          <button style="padding:4px 8px; border:1px solid #3b82f6; color:#3b82f6; border-radius:9999px; background:transparent; cursor:pointer;">
            Connect to Another Marker
          </button>
        `)
        .addTo(map.current)

      // Close popup on map click elsewhere
      map.current.on('click', () => {
        popupRef.current?.remove()
        popupRef.current = null
        setActivePopupData(null)
      })
    }
  }, [activePopupData])

  // Drop pin at center of map
  function dropPinAtCenter() {
    if (!map.current) return
    const center = map.current.getCenter()
    setDroppedPins([...droppedPins, [center.lng, center.lat]])
  }

  // Handle arrow click on dropped pin
  function handleArrowClick(direction, pinCoordinates) {
    setActivePopupData({
      lng: pinCoordinates[0],
      lat: pinCoordinates[1],
      direction,
    })
  }

  return (
    <>
      {/* Map container */}
      <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full" />

      {/* Info panel */}
      <div className="absolute top-[75px] left-5 bg-white/85 px-3 py-2 rounded shadow-sm text-sm z-10">
        📍 Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>

      {/* Fixed center pin to drop */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer select-none"
        onClick={dropPinAtCenter}
      >
        <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold">
          📍
        </div>
      </div>

      {/* Render dropped pins manually positioned */}
      {droppedPins.map((pin, index) => {
        const [pinLng, pinLat] = pin

        if (!map.current) return null

        const point = map.current.project([pinLng, pinLat])
        // point = { x, y } in pixels relative to map container top-left corner

        return (
          <div
            key={index}
            className="absolute"
            style={{
              left: point.x,
              top: point.y,
              transform: 'translate(-50%, -50%)',
              width: 80,
              height: 80,
              cursor: 'pointer',
              zIndex: 1000,
            }}
            onMouseEnter={() => setHoveredPinIndex(index)}
            onMouseLeave={() => setHoveredPinIndex(null)}
          >
            <div className="relative w-20 h-20 pointer-events-auto">
              {/* Main pin */}
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs shadow-md z-10">
                📍
              </div>

              {/* Show arrows only when hovered */}
              {hoveredPinIndex === index && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                  <ArrowPin onArrowClick={(dir) => handleArrowClick(dir, pin)} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
