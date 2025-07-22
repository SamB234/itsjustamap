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
  const [popupCoords, setPopupCoords] = useState(null)

  // Map initialization
  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom,
    })

    map.current.on('move', () => {
      const center = map.current.getCenter()
      setLng(center.lng.toFixed(4))
      setLat(center.lat.toFixed(4))
      setZoom(map.current.getZoom().toFixed(2))
    })

    map.current.on('click', (e) => {
      const center = map.current.getCenter()
      const dist = Math.sqrt(
        Math.pow(e.lngLat.lng - center.lng, 2) +
        Math.pow(e.lngLat.lat - center.lat, 2)
      )
      if (dist < 0.001) return
      setActivePopup(null)
    })
  }, [])

  // Drop pin at center
  function dropPinAtCenter() {
    const center = map.current.getCenter()
    setDroppedPins([...droppedPins, [center.lng, center.lat]])
  }

  // Handle arrow click
  function handleArrowClick(direction, pinCoordinates) {
    setActivePopup({
      direction,
      pin: pinCoordinates,
    })
    setPopupCoords(pinCoordinates)
  }

  // Convert map coordinate to screen position
  function projectToScreenCoords(coords) {
    if (!map.current) return null
    return map.current.project(coords)
  }

  return (
    <>
      <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full" />

      {/* Info Panel */}
      <div className="absolute top-[75px] left-5 bg-white/80 px-3 py-2 rounded text-sm shadow z-10">
        📍 {lng}, {lat} | Zoom: {zoom}
      </div>

      {/* Center Drop Pin */}
      <div
        onClick={dropPinAtCenter}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
      >
        <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-lg shadow">
          📍
        </div>
      </div>

      {/* Dropped Pins */}
      {droppedPins.map((pin, index) => {
        const screen = projectToScreenCoords(pin)
        if (!screen) return null

        return (
          <div
            key={index}
            className="absolute"
            style={{
              left: `${screen.x}px`,
              top: `${screen.y}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 25,
            }}
          >
            {/* Expanded hover container */}
            <div
              className="relative group"
              onMouseEnter={() => setHoveredPinIndex(index)}
              onMouseLeave={() => setHoveredPinIndex(null)}
              style={{ padding: '20px' }} // expands hover area invisibly
            >
              {/* Main pin */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-6 h-6 bg-blue-600 rounded-full text-white text-xs flex justify-center items-center shadow">
                  📍
                </div>
              </div>

              {/* Arrows on hover */}
              {hoveredPinIndex === index && (
                <ArrowPin onArrowClick={(dir) => handleArrowClick(dir, pin)} />
              )}
            </div>
          </div>
        )
      })}

      {/* Popup Box pinned to coords */}
      {activePopup && popupCoords && (
        <div
          className="absolute z-30 transition-all duration-300"
          style={() => {
            const screenCoords = projectToScreenCoords(popupCoords)
            if (!screenCoords) return { display: 'none' }
            return {
              left: `${screenCoords.x}px`,
              top: `${screenCoords.y}px`,
              transform: 'translate(-50%, -120%)',
            }
          }}
        >
          <div className="bg-white/90 backdrop-blur-lg rounded-xl shadow-xl p-4 w-72 relative">
            <button
              onClick={() => setActivePopup(null)}
              className="absolute top-1 right-2 text-gray-500 hover:text-red-500 text-lg font-bold"
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
              <button className="border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition rounded-full px-4 py-1 text-sm">
                Explore {activePopup.direction}
              </button>
              <button className="border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition rounded-full px-4 py-1 text-sm">
                Connect to Another Marker
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
