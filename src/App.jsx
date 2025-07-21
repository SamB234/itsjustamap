import React from 'react'
import Map from './components/Map'

export default function App() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav
        style={{
          height: '50px',
          backgroundColor: '#0077cc',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          zIndex: 1000,
        }}
      >
        {/* Left nav links */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Home</a>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>About</a>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Contact</a>
        </div>

        {/* Right logo */}
        <div>ItsJustAMap</div>
      </nav>

      {/* Map container fills remaining space */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Map />
      </div>
    </div>
  )
}

