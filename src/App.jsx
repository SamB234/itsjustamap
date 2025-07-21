import React from 'react'
import Map from './components/Map'

export default function App() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav
        style={{
          height: '60px',
          backgroundColor: '#1a73e8',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 30px',
          fontWeight: '600',
          fontSize: '1rem',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
          zIndex: 2,
        }}
      >
        <div style={{ fontSize: '1.2rem' }}>ItsJustAMap</div>

        <div style={{ display: 'flex', gap: '25px' }}>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Features</a>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Pricing</a>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Login / Sign Up</a>
        </div>
      </nav>

      {/* Map container */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Map />
      </div>
    </div>
  )
}
