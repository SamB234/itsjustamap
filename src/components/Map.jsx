import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import ArrowPin from './ArrowPin'

mapboxgl.accessToken = 'pk.eyJ1Ijoic2FtYjIzNCIsImEiOiJjbWRkZ25xcmcwNHhvMmxxdGU3c2J0eTZnIn0.j5NEdvNhU_eZ1tirQpKEAA'

export default function Map() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [lng, setLng] = useState(-0.1276)
  const [lat, setLat] = useState(51.5074)
  const [zoom, setZoom] = useState(9)
  const [droppedPins, setDroppedPins] = useState([])
  const [hoveredPinIndex, setHoveredPinIndex] = useState(null)
  const [activePopup, setActivePopup] = useState(null)

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

  function dropPinAtCenter() {
    const center = map.current.getCenter()
    const newPin = [center.lng, center.lat]
    setDroppedPins([...droppedPins, newPin])
  }

  // This now accepts the mouse event 'e' to get screen coords
  function handleArrowClick(direction, pinCoordinates, screenPosition) {
    setActivePopup({
      direction,
      pin: pinCoordinates,
      position: screenPosition,
    })
  }

  return (
    <>
      {/* Map container */}
      <div
        ref={mapContainer}
        className="absolute top-0 left-0 w-full h-full"
      />

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

      {/* Render dropped pins */}
      {droppedPins.map((pin, index) => {
        const [lng, lat] = pin
        const point = map.current?.project([lng, lat])
        if (!point) return null

        return (
          <div
            key={index}
            className="absolute z-20"
            style={{
              left: `${point.x}px`,
              top: `${point.y}px`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none', // let child elements handle interactions
            }}
          >
            <div
              className="relative"
              style={{ width: '80px', height: '80px' }}
              onMouseEnter={() => setHoveredPinIndex(index)}
              onMouseLeave={() => setHoveredPinIndex(null)}
            >
              {/* Main 📍 pin */}
              <div
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs shadow-md z-10"
                style={{ pointerEvents: 'auto' }}
              >
                📍
              </div>

              {/* Arrows on hover */}
              {hoveredPinIndex === index && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                  <ArrowPin
                    onArrowClick={(dir, e) =>
                      handleArrowClick(dir, pin, { x: e.clientX, y: e.clientY })
                    }
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Popup UI fixed on screen */}
      {activePopup && (
        <div
          className="absolute bg-white/80 backdrop-blur-md rounded-xl shadow-md p-4 w-72 z-30 transition-all duration-300"
          style={{
            left: `${activePopup.position.x}px`,
            top: `${activePopup.position.y}px`,
            transform: 'translate(-50%, -120%)',
            pointerEvents: 'auto',
          }}
        >
          <div className="font-semibold text-gray-800 mb-2">
            AI Explorer – {activePopup.direction}
          </div>
          <p className="text-sm text-gray-700 mb-4">
            AI-generated info about this area will go here.
          </p>
          <div className="flex flex-col gap-2">
            <button className="border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition rounded-full px-4 py-1 text-sm">
              Explore {activePopup.direction}
            </button>
            <button className="border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition rounded-full px-4 py-1 text-sm">
              Connect to Another Marker
            </button>
          </div>
        </div>
      )}
    </>
  )
}
