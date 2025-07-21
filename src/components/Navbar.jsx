import React from 'react'

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-gray-100 shadow-sm">
      {/* Logo */}
      <div className="text-xl font-semibold text-blue-700">ItsJustAMap</div>

      {/* Nav links */}
      <div className="flex gap-4">
        {['Features', 'Pricing', 'Login / Sign Up'].map((item) => (
          <a
            key={item}
            href="#"
            className="px-4 py-1 border-2 border-blue-600 text-blue-600 rounded-full
                       hover:bg-blue-600 hover:text-gray-100 transition-colors duration-300"
          >
            {item}
          </a>
        ))}
      </div>
    </nav>
  )
}
