import React from 'react'
import Map from './components/Map'

export default function App() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav
        style={{
          height: '60px',
          backgroundColor: '#0077cc',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          zIndex: 2,
        }}
      >
        <div>ItsJustAMap</div>

        <div style={{ display: 'flex', gap: '20px', fontSize: '1rem' }}>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Features</a>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Pricing</a>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Login / Sign Up</a>
        </div>
      </nav>

      {/* Full height map below navbar */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Map />
      </div>
    </div>
  )
}
