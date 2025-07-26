import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  const collapsedHeight = '48px'; // Height of the "pill" when collapsed
  const sidebarWidth = '320px';   // Fixed width of the sidebar
  const navbarHeight = '56px';    // Height of your Navbar (h-14 = 56px)
  const paddingTopFromNavbar = '14px'; // Desired padding below Navbar

  return (
    <div
      // Match Navbar styling: backdrop-blur bg-gray-100 bg-opacity-60 shadow-sm
      // Position: Fixed, calculated based on Navbar height and desired padding
      // Conditional rounded classes: rounded-full when collapsed, rounded-lg when open
      // overflow-hidden is crucial for corner rounding when collapsed and preventing scrollbars
      className={`fixed left-5 backdrop-blur bg-gray-100 bg-opacity-60 shadow-sm z-40 transition-all duration-300 ease-in-out flex flex-col ${isOpen ? 'rounded-lg' : 'rounded-full'} overflow-hidden`}
      style={{
        top: `calc(${navbarHeight} + ${paddingTopFromNavbar})`, // Dynamic top position
        width: sidebarWidth,
        height: isOpen ? 'auto' : collapsedHeight, // 'auto' height when open
        maxHeight: `calc(100vh - ${navbarHeight} - ${paddingTopFromNavbar} - 20px)`, // Max height to prevent overflowing screen
      }}
      // OnClick for the entire div to toggle (only when collapsed)
      onClick={!isOpen ? onClose : undefined}
    >
      {/* Top bar container: Contains "Trip Planner" title and toggle button */}
      {/* Uses flexbox for vertical centering and horizontal distribution */}
      <div className="flex items-center justify-between pl-4 pr-2" // Left padding for title, right padding for button
           style={{ height: collapsedHeight }}> {/* Fixed height for this top bar */}

        {/* Trip Planner Title - Always visible, left-justified with padding */}
        {/* flex-grow pushes the button to the right. text-ellipsis handles overflow. */}
        <h2 className="text-xl font-semibold text-blue-700 whitespace-nowrap overflow-hidden text-ellipsis flex-grow">
          Trip Planner
        </h2>
        
        {/* Toggle Button - always visible, positioned on the right within its flex container */}
        <button
          onClick={onClose} // This is the toggle function passed from Map.jsx
          // Match Navbar button styling: p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
          // flex-shrink-0 prevents the button from shrinking if title text is very long.
          className="p-1 rounded-md text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 z-50 flex-shrink-0"
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          onMouseDown={(e) => e.stopPropagation()} // Prevent parent div's onClick from triggering
        >
          {isOpen ? (
            // Close icon (X) - from Navbar SVG
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          ) : (
            // Hamburger icon - from Navbar SVG
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          )}
        </button>
      </div>

      {/* Sidebar Content - only visible/interactive when open */}
      {/* Adjusted padding: pt-4, pb-4, px-4 to ensure consistent spacing when expanded */}
      <div className={`flex-grow px-4 pb-4 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
           style={{ paddingTop: isOpen ? '16px' : '0' }} // Padding from the top bar when expanded
      >
        {/* Children content, e.g., filters */}
        <div className="mt-2"> {/* Small margin for content below the direct padding */}
          {children}
        </div>
      </div>
    </div>
  );
}
