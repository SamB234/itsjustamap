import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  const collapsedHeight = '48px'; // Height of the "pill" when collapsed
  const sidebarWidth = '320px';   // Fixed width of the sidebar

  // Determine the correct rounded class based on state
  const roundedClass = isOpen ? 'rounded-lg' : 'rounded-full';

  return (
    <div
      // Match Navbar styling: backdrop-blur bg-gray-100 bg-opacity-60 shadow-sm
      // Position: top-[70px] left-5
      className={`fixed top-[70px] left-5 backdrop-blur bg-gray-100 bg-opacity-60 shadow-sm z-40 transition-all duration-300 ease-in-out flex flex-col ${roundedClass}`}
      style={{
        width: sidebarWidth,
        height: isOpen ? 'auto' : collapsedHeight,
        maxHeight: 'calc(100vh - 80px)', // Maintain max height, but height is 'auto'
        overflowY: isOpen ? 'auto' : 'hidden', // Only allow scroll when open, hide when collapsed
      }}
      // OnClick for the entire div only when collapsed
      onClick={!isOpen ? onClose : undefined}
    >
      {/* Container for the "Filters" text and the toggle button */}
      <div className={`flex items-center w-full relative h-[${collapsedHeight}]`}>
        {/* "Filters" text - visible only when collapsed, positioned absolutely */}
        {!isOpen && (
          <span className="absolute left-5 text-blue-700 font-semibold text-lg whitespace-nowrap overflow-hidden pr-12 pointer-events-none">
            Filters
          </span>
        )}
        
        {/* Toggle Button - always visible, positioned on the right */}
        <button
          onClick={onClose} // This is the toggle function passed from Map.jsx
          className={`absolute top-1/2 -translate-y-1/2 ${isOpen ? 'right-4' : 'right-4'} text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1 transition-all duration-300 z-50`}
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          // Stop propagation to prevent parent div's onClick when the button is clicked
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isOpen ? (
            // Close icon (X) - from Navbar
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
            // Hamburger icon - from Navbar
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

      {/* Sidebar Content - only visible/interactive when open */}
      {/* Added `pt-20` for generous top padding when open */}
      <div className={`flex-grow px-4 pb-4 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
           style={{ paddingTop: isOpen ? '20px' : '0' }} // Adjust padding top to account for button container height
      >
        <h2 className="text-xl font-semibold text-blue-700 mb-4 text-center">Trip Planner</h2>
        <div className="mt-8">
          {children}
        </div>
      </div>
    </div>
  );
}
