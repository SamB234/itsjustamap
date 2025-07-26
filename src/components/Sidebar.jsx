import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  const collapsedWidth = '56px'; // Width of the sidebar when collapsed (matches Navbar height)
  const expandedWidth = '320px'; // Desired full width when expanded
  const navbarHeight = '56px';   // Height of your Navbar (h-14 = 56px)
  const paddingTopFromNavbar = '14px'; // Desired padding below Navbar

  // Calculate the available vertical space below the navbar
  const availableHeight = `calc(100vh - ${navbarHeight} - ${paddingTopFromNavbar})`;

  return (
    <div
      // Match Navbar styling: backdrop-blur bg-gray-100 bg-opacity-60 shadow-sm
      // Positioned to the left of the screen, below the navbar
      // Transition all properties for smooth animation
      // Conditional rounding: rounded-r-lg when collapsed, rounded-lg when open
      className={`fixed left-5 backdrop-blur bg-gray-100 bg-opacity-60 shadow-sm z-40 transition-all duration-300 ease-in-out flex flex-col overflow-hidden 
                  ${isOpen ? 'rounded-lg' : 'rounded-r-lg'}`}
      style={{
        top: `calc(${navbarHeight} + ${paddingTopFromNavbar})`, // Start below the navbar
        height: availableHeight, // Fill available vertical space
        width: isOpen ? expandedWidth : collapsedWidth, // Animate width
      }}
      // OnClick for the entire div to toggle (only when collapsed)
      onClick={!isOpen ? onClose : undefined}
    >
      {/* Top bar container for the "Trip Planner" text and toggle button */}
      {/* This div will handle the fixed 'pill' section's appearance */}
      <div className="flex flex-row items-center justify-between" // Use flex-row for horizontal layout of elements
           style={{ minHeight: '48px', paddingLeft: '8px', paddingRight: '8px' }}> {/* Minimum height for visibility when collapsed */}

        {/* Trip Planner Title - Always visible, rotated when collapsed */}
        <h2 
          className={`font-semibold text-blue-700 whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-300 flex-grow
                      ${isOpen ? 'text-xl rotate-0' : 'text-base rotate-90 origin-bottom-left absolute left-10 top-1/2 -translate-y-1/2'}`}
          style={{ width: isOpen ? 'auto' : `${collapsedWidth}` }} // Help with transition of text within changing width
        >
          Trip Planner
        </h2>
        
        {/* Toggle Button - always visible */}
        <button
          onClick={onClose} // This is the toggle function passed from Map.jsx
          className={`p-1 rounded-md text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 z-50 flex-shrink-0
                      ${isOpen ? '' : 'absolute bottom-2 right-2'}`} // Position button at bottom-right when collapsed
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          onMouseDown={(e) => e.stopPropagation()} // Prevent parent div's onClick from triggering
        >
          {isOpen ? (
            // Close icon (X) - from Navbar SVG, now w-7 h-7 (matching navbar for X)
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          ) : (
            // Hamburger icon - from Navbar SVG, now w-7 h-7 (matching navbar for burger)
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          )}
        </button>
      </div>

      {/* Sidebar Content - only visible/interactive when open */}
      {/* Ensure content area scrolls independently if it overflows */}
      <div 
        className={`flex-grow px-4 pb-4 overflow-y-auto ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{
          paddingTop: isOpen ? '16px' : '0', // Consistent internal padding from top bar
          // This max-height ensures content doesn't push the overall sidebar
          maxHeight: isOpen ? `calc(${availableHeight} - 48px - 16px - 16px)` : '0', // total height - header height - padding top - padding bottom
        }}
      >
        <div className="mt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
