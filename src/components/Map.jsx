import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'

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

    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat
      setPins((prev) => [...prev, { lng, lat }])
      new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map.current)
    })
  }, [])

  return (
    <>
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
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
          zIndex: 1,
        }}
      >
        <div>📍 Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}</div>
      </div>
    </>
  )
}
