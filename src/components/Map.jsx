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

  function handleArrowClick(direction, pinCoordinates) {
    setActivePopupData({
      lng: pinCoordinates[0],
      lat: pinCoordinates[1],
      direction,
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

  function handlePinClick(pinCoordinates) {
    setActivePopupData({
      lng: pinCoordinates[0],
      lat: pinCoordinates[1],
      direction: 'Overview',
    })
  }

  return (
    <>
      <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full" />

      {/* Info panel */}
      <div className="absolute top-[75px] left-5 bg-white/85 px-3 py-2 rounded shadow-sm text-sm z-30">
        📍 Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>

      {/* Fixed center pin */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-5 cursor-pointer select-none"
        onClick={dropPinAtCenter}
      >
        <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold">
          📍
        </div>
      </div>

      {/* Render dropped pins */}
      {droppedPins.map((pin, index) => {
        const [pinLng, pinLat] = pin
        if (!map.current) return null
        const point = map.current.project([pinLng, pinLat])

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
              zIndex: 5,
            }}
            onMouseEnter={() => setHoveredPinIndex(index)}
            onMouseLeave={() => setHoveredPinIndex(null)}
            onClick={() => handlePinClick(pin)}
          >
            <div className="relative w-20 h-20 pointer-events-auto">
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-grey-600 rounded-full flex items-center justify-center text-white text-xs shadow-md z-5">
                📍
              </div>
              {hoveredPinIndex === index && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                  <ArrowPin
                    onArrowClick={(dir) =>
                      handleArrowClick(directionMap[dir] || dir, pin)
                    }
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Popup */}
      {activePopupData && popupPos && (
        <div
          className="absolute z-10 max-w-xs p-4"
          style={{
            left: popupPos.x,
            top: popupPos.y,
            transform: 'translate(-50%, -130%)', // Higher offset
            background: 'rgba(240, 240, 240, 0.9)',
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
              {activePopupData.direction === 'Overview'
                ? 'Discover This Area'
                : `AI Explorer – ${activePopupData.direction}`}
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
