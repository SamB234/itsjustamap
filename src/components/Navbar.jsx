import React, { useState } from 'react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false); // State to control mobile menu visibility

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="backdrop-blur bg-gray-100 bg-opacity-60 fixed top-0 left-0 w-full z-50 shadow-sm flex items-center justify-between px-4 sm:px-8 h-14 font-semibold text-blue-700">
      <div className="text-xl font-bold">ItsJustAMap</div>

      {/* Hamburger Icon (visible on small screens only) */}
      <div className="sm:hidden">
        <button
          onClick={toggleMenu}
          className="text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? (
            // Close icon (X)
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          ) : (
            // Hamburger icon
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          )}
        </button>
      </div>

      {/* Desktop Navigation Links (hidden on small screens, visible on medium and up) */}
      <div className="hidden sm:flex gap-6">
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

      {/* Mobile Menu Overlay (conditionally rendered) */}
      {isOpen && (
        <div className="sm:hidden absolute top-14 left-0 w-full h-screen bg-gray-100 bg-opacity-95 flex flex-col items-center py-8 space-y-6 z-40 animate-fade-in-down"
             // Add an onClick handler to close the menu when clicking outside (on the overlay itself)
             onClick={toggleMenu}>
          <a
            href="#"
            className="w-4/5 text-center px-4 py-3 rounded-full border border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-gray-100 transition text-lg"
            onClick={toggleMenu} // Close menu on link click
          >
            Features
          </a>
          <a
            href="#"
            className="w-4/5 text-center px-4 py-3 rounded-full border border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-gray-100 transition text-lg"
            onClick={toggleMenu} // Close menu on link click
          >
            Pricing
          </a>
          <a
            href="#"
            className="w-4/5 text-center px-4 py-3 rounded-full border border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-gray-100 transition text-lg"
            onClick={toggleMenu} // Close menu on link click
          >
            Login / Sign Up
          </a>
        </div>
      )}
    </nav>
  );
}
