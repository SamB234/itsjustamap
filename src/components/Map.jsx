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
  const [pins, setPins] = useState([])

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

  // Handle arrow clicks
  function handleArrowClick(direction) {
    alert(`You clicked arrow: ${direction}`)
    // TODO: Fetch and show info for that direction (via AI)
  }

  return (
    <>
      <div
        ref={mapContainer}
        className="absolute top-0 left-0 w-full h-full"
      />
      <div
        style={{
          position: 'absolute',
          top: '75px',
          left: '20px',
          background: 'rgba(255, 255, 255, 0.85)',
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          fontSize: '0.85rem',
          zIndex: 10,
        }}
      >
        <div>📍 Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}</div>
      </div>

      {/* Arrow pin fixed in center */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 select-none pointer-events-auto"
      >
        <ArrowPin onArrowClick={handleArrowClick} />
      </div>
    </>
  )
}
