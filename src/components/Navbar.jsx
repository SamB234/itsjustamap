import React from 'react'

export default function Navbar() {
  return (

    
 /*   <nav className="flex items-center justify-between px-8 py-4 bg-gray-100 shadow-sm">
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
*/

        
     <nav className="backdrop-blur bg-gray-100 bg-opacity-60 fixed top-0 left-0 w-full z-50 shadow-sm flex items-center justify-between px-8 h-14 font-semibold text-blue-700">
  <div className="text-xl font-bold">ItsJustAMap</div>

  <div className="flex gap-6">
    <a
      href="#"
      className="px-4 py-1 rounded-full border border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-gray-100 transition"
    >
      Features
    </a>
    <a
      href="#"
      className="px-4 py-1 rounded-full border border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-gray-100 transition"
    >
      Pricing
    </a>
    <a
      href="#"
      className="px-4 py-1 rounded-full border border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-gray-100 transition"
    >
      Login / Sign Up
    </a>
  </div>
</nav>
   

  )
}
