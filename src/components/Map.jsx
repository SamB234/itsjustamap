import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'  // Make sure to import CSS

mapboxgl.accessToken = 'pk.eyJ1Ijoic2FtYjIzNCIsImEiOiJjbWRkZ25xcmcwNHhvMmxxdGU3c2J0eTZnIn0.j5NEdvNhU_eZ1tirQpKEAA'

export default function Map() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [lng, setLng] = useState(-0.1276)
  const [lat, setLat] = useState(51.5074)
  const [zoom, setZoom] = useState(9)
  const [pins, setPins] = useState([])

  // Initialize map only once
  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom
    })

    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4))
      setLat(map.current.getCenter().lat.toFixed(4))
      setZoom(map.current.getZoom().toFixed(2))
    })

    // Add click handler to add pins
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat
      setPins(currentPins => [...currentPins, { lng, lat }])
    })
  }, [])

  // Whenever pins update, add markers to the map
  useEffect(() => {
    if (!map.current) return

    // Remove existing markers (optional - if you want to clear old ones)
    // If you want to keep markers persistent, skip this.

    // For simplicity, add a marker for each pin
    pins.forEach(({ lng, lat }) => {
      new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map.current)
    })
  }, [pins])

  return (
    <>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', top: 10, left: 10, background: 'white', padding: '10px' }}>
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
    </>
  )
}
