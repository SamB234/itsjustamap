import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  const collapsedWidth = '56px';    // Fixed width of the sidebar when collapsed
  const collapsedHeight = '48px';   // Fixed height of the sidebar when collapsed (for the arrow)
  const expandedWidth = '320px';    // Desired full width when expanded
  
  const navbarHeight = '56px';      // Height of your Navbar (h-14 = 56px)
  const paddingTopFromNavbar = '14px'; // Desired padding below Navbar

  // Calculate top position relative to navbar
  const sidebarTop = `calc(${navbarHeight} + ${paddingTopFromNavbar})`;

  return (
    <div
      // Background and transparency: bg-opacity-90 for more prominence
      // Conditional rounding: rounded-lg when open, rounded-full when collapsed (for the small pill)
      // Overflow-hidden on the main container for clean edges during width/height transition
      className={`fixed left-5 backdrop-blur bg-gray-100 bg-opacity-90 shadow-sm z-40 transition-all duration-300 ease-in-out flex flex-col overflow-hidden 
                  ${isOpen ? 'rounded-lg' : 'rounded-full'}`} {/* Changed to rounded-full for collapsed pill */}
      style={{
        top: sidebarTop,
        width: isOpen ? expandedWidth : collapsedWidth, // Animate width
        // *** KEY CHANGE: Fixed height when collapsed, auto height when expanded ***
        height: isOpen ? 'auto' : collapsedHeight, 
        // Max height limits 'auto' height to prevent overflow off-screen
        maxHeight: `calc(100vh - ${sidebarTop} - 20px)`, 
      }}
      // NO onClick on the parent div to ensure button clickability (clicks only on arrow/X)
    >
      {/* Conditional rendering for "Trip Planner" heading when expanded */}
      {/* It only appears when isOpen is true, without any animation/rotation */}
      {isOpen && (
        <div className="px-4 py-3 flex items-center">
          <h2 className="text-xl font-semibold text-blue-700 whitespace-nowrap overflow-hidden text-ellipsis">
            Trip Planner
          </h2>
        </div>
      )}

      {/* Sidebar Content (Children) - visible when open, but always present to drive height */}
      {/* Opacity and pointer-events control visibility/interactivity */}
      <div 
        className={`flex-grow px-4 pb-4 overflow-y-auto transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ 
          // Adjust max-height for content when open, so it scrolls if sidebar's auto height isn't enough
          maxHeight: isOpen ? `calc(100% - ${48}px)` : '0', // 100% of parent minus header height when open, 0 when collapsed
          paddingTop: isOpen ? '16px' : '0', // Consistent internal padding
        }}
      >
        <div className="mt-2">
          {children}
        </div>
      </div>

      {/* --- Toggle Buttons (Arrow OR X) --- */}
      {/* Each button is rendered conditionally and has its own onClick */}
      {/* Arrow (visible when collapsed) */}
      {!isOpen && (
        <button
          onClick={onClose} // Clicking the arrow expands the sidebar
          className={`p-1 rounded-md text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 z-50 absolute 
                      top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2`} // Centered in the collapsed pill
          aria-label="Open sidebar"
          onMouseDown={(e) => e.stopPropagation()} // Stop propagation from this specific button click
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {/* X (visible when expanded) */}
      {isOpen && (
        <button
          onClick={onClose} // Clicking X collapses the sidebar
          className={`p-1 rounded-md text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 z-50 absolute 
                      top-2 right-4`} // Top-right in expanded state
          aria-label="Close sidebar"
          onMouseDown={(e) => e.stopPropagation()} // Stop propagation from this specific button click
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      )}
    </div>
  );
}
