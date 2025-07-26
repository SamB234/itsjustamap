import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  const collapsedHeight = '48px'; // Height of the "pill" when collapsed
  const expandedHeight = '300px'; // New fixed height when expanded (adjust as needed)
  const sidebarWidth = '320px';   // Fixed width of the sidebar
  const navbarHeight = '56px';    // Height of your Navbar (h-14 = 56px)
  const paddingTopFromNavbar = '14px'; // Desired padding below Navbar (56px + 14px = 70px total top offset)

  return (
    <div
      // Match Navbar styling: backdrop-blur bg-gray-100 bg-opacity-60 shadow-sm
      // Position: Fixed, calculated based on Navbar height and desired padding
      // Conditional rounded classes: rounded-full when collapsed, rounded-lg when open
      // Overflow-hidden on the main container ensures corners are smooth and no scrollbar appears on the main div
      className={`fixed left-5 backdrop-blur bg-gray-100 bg-opacity-60 shadow-sm z-40 transition-all duration-300 ease-in-out flex flex-col ${isOpen ? 'rounded-lg' : 'rounded-full'} overflow-hidden`}
      style={{
        top: `calc(${navbarHeight} + ${paddingTopFromNavbar})`, // Dynamic top position (70px from top)
        width: sidebarWidth,
        // Control height explicitly for transition
        height: isOpen ? expandedHeight : collapsedHeight, 
      }}
      // OnClick for the entire div to toggle (only when collapsed)
      onClick={!isOpen ? onClose : undefined}
    >
      {/* Top bar container: Contains "Trip Planner" title and toggle button */}
      {/* Uses flexbox for vertical centering and horizontal distribution */}
      <div className="flex items-center justify-between pl-4 pr-2" // Left padding for title, right padding for button
           style={{ height: collapsedHeight }}> {/* Fixed height for this top bar */}

        {/* Trip Planner Title - Always visible, left-justified with padding */}
        <h2 className="text-base font-semibold text-blue-700 whitespace-nowrap overflow-hidden text-ellipsis flex-grow">
          Trip Planner
        </h2>
        
        {/* Toggle Button - always visible, positioned on the right within its flex container */}
        <button
          onClick={onClose} // This is the toggle function passed from Map.jsx
          // Ensure specific sizing for burger/x icon (w-6 h-6)
          className="p-1 rounded-md text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 z-50 flex-shrink-0"
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          onMouseDown={(e) => e.stopPropagation()} // Prevent parent div's onClick from triggering
        >
          {isOpen ? (
            // Close icon (X) - from Navbar SVG, now w-6 h-6
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          ) : (
            // Hamburger icon - from Navbar SVG, now w-6 h-6
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          )}
        </button>
      </div>

      {/* Sidebar Content - only visible/interactive when open */}
      {/* Content overflow is handled here. Added `pt-4` and `pb-4` for consistent internal padding. */}
      <div 
        className={`px-4 pb-4 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{
          // Calculate max height for content based on total expanded height minus top bar height
          maxHeight: `calc(${expandedHeight} - ${collapsedHeight})`, 
          overflowY: 'auto', // Allow content to scroll if it exceeds its area
          paddingTop: isOpen ? '16px' : '0', // Consistent internal padding from top bar
        }}
      >
        <div className="mt-2"> {/* Small top margin for children below the padding */}
          {children}
        </div>
      </div>
    </div>
  );
}
