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
  const [droppedPins, setDroppedPins] = useState([]) // Store dropped pin coordinates

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

  // Handle direction arrow click
  function handleArrowClick(direction, pinCoordinates) {
    alert(`Clicked ${direction} for pin at ${pinCoordinates[0]}, ${pinCoordinates[1]}`)
    // Future: Use coordinates + direction for AI-powered suggestions
  }

  // Handle center pin click to drop a new pin
  function dropPinAtCenter() {
    const center = map.current.getCenter()
    const newPin = [center.lng, center.lat]
    setDroppedPins([...droppedPins, newPin])
  }

  return (
    <>
      <div
        ref={mapContainer}
        className="absolute top-0 left-0 w-full h-full"
      />

      {/* Map info (can hide later) */}
      <div
        className="absolute top-[75px] left-5 bg-white/85 px-3 py-2 rounded shadow-sm text-sm z-10"
      >
        📍 Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>

      {/* Fixed Center Pin (Click to drop) */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer select-none"
        onClick={dropPinAtCenter}
      >
        {/* Just the center 📍 */}
        <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold">
          📍
        </div>
      </div>

      {/* Render dropped pins with arrows */}
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
            }}
          >
            <ArrowPin onArrowClick={(dir) => handleArrowClick(dir, pin)} />
          </div>
        )
      })}
    </>
  )
}
