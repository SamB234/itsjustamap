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

  // Initialize map
  useEffect(() => {
    if (map.current) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom,
    })
    map.current.on('move', () => {
      const c = map.current.getCenter()
      setLng(c.lng.toFixed(4))
      setLat(c.lat.toFixed(4))
      setZoom(map.current.getZoom().toFixed(2))
    })
    map.current.on('click', () => setActivePopup(null))
  }, [])

  function dropPinAtCenter() {
    const c = map.current.getCenter()
    setDroppedPins([...droppedPins, [c.lng, c.lat]])
  }

  function handleArrowClick(direction, pin) {
    setActivePopup({ direction, pin })
  }

  function getScreenPosition(pin) {
    return map.current?.project(pin)
  }

  return (
    <>
      <div ref={mapContainer} className="absolute inset-0" />

      <div className="absolute top-20 left-5 bg-white/80 px-3 py-2 rounded text-sm shadow z-10">
        📍 {lng}, {lat} — Zoom {zoom}
      </div>

      <div
        className="absolute inset-1/2 z-20 cursor-pointer"
        onClick={dropPinAtCenter}
      >
        <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-lg shadow">
          📍
        </div>
      </div>

      {droppedPins.map((pin, i) => {
        const pos = getScreenPosition(pin)
        if (!pos) return null
        return (
          <div
            key={i}
            className="absolute"
            style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
            onMouseEnter={() => setHoveredPinIndex(i)}
            onMouseLeave={() => setHoveredPinIndex(null)}
          >
            <div className="w-6 h-6 bg-blue-600 rounded-full text-white flex items-center justify-center shadow">
              📍
            </div>

            {hoveredPinIndex === i && (
              <ArrowPin
                onArrowClick={(dir) => handleArrowClick(dir, pin)}
              />
            )}
          </div>
        )
      })}

      {activePopup && (
        (() => {
          const pos = getScreenPosition(activePopup.pin)
          if (!pos) return null
          return (
            <div
              className="absolute z-30 bg-white/90 backdrop-blur-lg rounded-xl shadow-lg p-4 w-72 transform -translate-x-1/2 -translate-y-full transition"
              style={{ left: pos.x, top: pos.y }}
            >
              <button
                onClick={() => setActivePopup(null)}
                className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
              >
                ×
              </button>
              <div className="font-semibold text-gray-800 mb-2">
                AI Explorer – {activePopup.direction}
              </div>
              <p className="text-sm text-gray-700 mb-4">
                AI-generated info about this area will go here.
              </p>
              <div className="flex flex-col gap-2">
                <button className="btn-blue-outline">Explore</button>
                <button className="btn-blue-outline">Connect</button>
              </div>
            </div>
          )
        })()
      )}
    </>
  )
}
