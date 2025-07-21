import React from 'react'
import Map from './components/Map'

export default function App() {
  return (
    <div className="flex flex-col h-screen">
      {/* Navbar */}
      <nav className="h-14 bg-blue-600 text-white flex items-center justify-between px-8 font-semibold shadow-md z-10">
        {/* Logo */}
        <div className="text-lg">ItsJustAMap</div>

        {/* Navigation Links */}
        <div className="flex gap-6 text-sm">
          <a href="#" className="hover:underline">Features</a>
          <a href="#" className="hover:underline">Pricing</a>
          <a href="#" className="hover:underline">Login / Sign Up</a>
        </div>
      </nav>

      {/* Map container */}
      <div className="flex-1 relative">
        <Map />
      </div>
    </div>
  )
}
