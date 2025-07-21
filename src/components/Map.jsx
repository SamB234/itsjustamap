import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'

// Replace with your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FtYjIzNCIsImEiOiJjbWRkZ25xcmcwNHhvMmxxdGU3c2J0eTZnIn0.j5NEdvNhU_eZ1tirQpKEAA'

export default function Map() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [lng, setLng] = useState(-0.1276)  // Default: London
  const [lat, setLat] = useState(51.5074)
  const [zoom, setZoom] = useState(9)
  const [pins, setPins] = useState([])

  useEffect(() => {
    if (map.current) return // initialize map only once

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
      setPins([...pins, { lng, lat }])
      new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map.current)
    })
  }, [pins])

  return (
    <>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', top: 10, left: 10, background: 'white', padding: '10px' }}>
        <div>Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}</div>
      </div>
    </>
  )
}
