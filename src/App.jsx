import React from 'react'
import Map from './components/Map'

const navLinks = [
  { label: 'Features', href: '#' },
  { label: 'Pricing', href: '#' },
  { label: 'Login / Sign Up', href: '#' },
]

export default function App() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav
        style={{
          height: '60px',
          backgroundColor: '#f3f4f6', // light gray (tailwind gray-100)
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 30px',
          fontWeight: '600',
          fontSize: '1rem',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
          zIndex: 2,
          userSelect: 'none',
        }}
      >
        <div style={{ fontSize: '1.3rem', color: '#2563eb', fontWeight: '700' }}>
          ItsJustAMap
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          {navLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px', // pill shape
                border: '2px solid #2563eb', // blue border
                color: '#2563eb', // blue text
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                backgroundColor: '#f3f4f6', // same as navbar bg
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb'
                e.currentTarget.style.color = '#f3f4f6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6'
                e.currentTarget.style.color = '#2563eb'
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <div style={{ flex: 1, position: 'relative' }}>
        <Map />
      </div>
    </div>
  )
}
