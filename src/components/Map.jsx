import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import ArrowPin from './ArrowPin'

mapboxgl.accessToken =
  'pk.eyJ1Ijoic2FtYjIzNCIsImEiOiJjbWRkZ25xcmcwNHhvMmxxdGU3c2J0eTZnIn0.j5NEdvNhU_eZ1tirQpKEAA'

const directionMap = {
  N: 'North',
  S: 'South',
  E: 'East',
  W: 'West',
}

export default function Map() {
  const mapContainer = useRef(null)
  const map = useRef(null)

  const [lng, setLng] = useState(-0.1276)
  const [lat, setLat] = useState(51.5074)
  const [zoom, setZoom] = useState(9)
  const [droppedPins, setDroppedPins] = useState([])
  const [hoveredPinIndex, setHoveredPinIndex] = useState(null)
  const [activePopupData, setActivePopupData] = useState(null)
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 })

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

  useEffect(() => {
    if (!map.current || !activePopupData) {
      setPopupPos(null)
      return
    }

    const point = map.current.project([activePopupData.lng, activePopupData.lat])
    setPopupPos({ x: point.x, y: point.y })
  }, [activePopupData, lng, lat, zoom])

  function dropPinAtCenter() {
    if (!map.current) return
    const center = map.current.getCenter()
    setDroppedPins([...droppedPins, [center.lng, center.lat]])
  }

  async function fetchPlaceName(lng, lat) {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
      )
      const data = await response.json()
      const place = data?.features?.find(
        (f) =>
          f.place_type.includes('place') ||
          f.place_type.includes('locality') ||
          f.place_type.includes('neighborhood')
      )
      return place?.text || 'Unknown Location'
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      return 'Error fetching location'
    }
  }

  async function handlePinClick(pinCoordinates) {
    const [lng, lat] = pinCoordinates
    const placeName = await fetchPlaceName(lng, lat)

    setActivePopupData({
      lng,
      lat,
      direction: 'Overview',
      placeName,
    })
  }

  async function handleArrowClick(direction, pinCoordinates) {
    const [lng, lat] = pinCoordinates
    const placeName = await fetchPlaceName(lng, lat)

    setActivePopupData({
      lng,
      lat,
      direction,
      placeName,
    })
  }

  function handleClosePopup() {
    setActivePopupData(null)
  }

  function handleRemoveMarker() {
    if (!activePopupData) return
    const { lng, lat } = activePopupData

    const filtered = droppedPins.filter(
      ([pinLng, pinLat]) => pinLng !== lng || pinLat !== lat
    )

    setDroppedPins(filtered)
    setActivePopupData(null)
  }

  return (
    <>
      <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full" />

      <div className="absolute top-[75px] left-5 bg-white/85 px-3 py-2 rounded shadow-sm text-sm z-30">
        📍 Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>

      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-5 pointer-events-none"
      >
        <button
          onClick={dropPinAtCenter}
          className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold cursor-pointer pointer-events-auto"
          aria-label="Drop a pin"
        >
          📍
        </button>
      </div>

      {/* Dropped Pins */}
      {droppedPins.map((pin, index) => {
        const [pinLng, pinLat] = pin
        if (!map.current) return null
        const point = map.current.project([pinLng, pinLat])
        const isHovered = hoveredPinIndex === index

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
            <div className="relative w-20 h-20 pointer-events-none">
              <button
                onMouseEnter={() => setHoveredPinIndex(index)}
                onMouseLeave={() => setHoveredPinIndex(null)}
                onClick={() => handlePinClick(pin)}
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs shadow-md pointer-events-auto"
                aria-label="Dropped marker"
              >
                📍
              </button>

              {/* Arrows shown only on hover, but without triggering layout shift */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {isHovered && (
                  <ArrowPin
                    onArrowClick={(dir) =>
                      handleArrowClick(directionMap[dir] || dir, pin)
                    }
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Popup */}
      {activePopupData && popupPos && (
        <div
          className="absolute z-20 max-w-xs p-4"
          style={{
            left: popupPos.x,
            top: popupPos.y,
            transform: 'translate(-50%, -130%)',
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
            <strong className="text-lg">
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
          <p className="mb-4">
            {activePopupData.direction === 'Overview'
              ? 'AI-generated overview of this area will appear here.'
              : 'AI-generated info about this direction will go here.'}
          </p>
          <div className="flex flex-col gap-2">
            {activePopupData.direction !== 'Overview' && (
              <button
                className="px-3 py-1 border border-blue-500 text-blue-600 rounded-full hover:bg-blue-50 transition"
                onClick={() =>
                  alert(`Explore ${activePopupData.direction}`)
                }
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
  )
}
