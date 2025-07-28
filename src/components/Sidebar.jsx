import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  const collapsedWidth = '56px'; // Fixed width of the sidebar when collapsed
  const expandedWidth = '320px'; // Desired full width when expanded
  
  const navbarHeight = '56px'; // Height of your Navbar (h-14 = 56px)
  const paddingTopFromNavbar = '14px'; // Desired padding below Navbar

  // Calculate top position relative to navbar
  const sidebarTop = `calc(${navbarHeight} + ${paddingTopFromNavbar})`;

  return (
    <div
      // Background and transparency: bg-opacity-90 for more prominence
      // Conditional rounding: rounded-r-lg when collapsed, rounded-lg when open
      // Overflow-hidden on the main container for clean edges during width transition
      className={`fixed left-5 backdrop-blur bg-gray-100 bg-opacity-90 shadow-sm z-40 transition-all duration-300 ease-in-out flex flex-col overflow-hidden
                  ${isOpen ? 'rounded-lg' : 'rounded-r-lg'}`} // Use rounded-r-lg for a vertical strip
      style={{
        top: sidebarTop,
        width: isOpen ? expandedWidth : collapsedWidth, // Animate width
        // *** KEY CHANGE: Height is always 'auto' to fit content ***
        height: 'auto', 
        // Max height limits 'auto' height to prevent overflow off-screen
        maxHeight: `calc(100vh - ${sidebarTop} - 20px)`, 
      }}
      // NO onClick on the parent div to ensure button clickability
    >
      {/* Conditional rendering for "Trip Planner" heading when expanded */}
      {/* It only appears when isOpen is true, without any animation/rotation */}
      {isOpen && (
        <div className="px-4 py-3 flex items-center"> {/* No fixed height here, let content dictate */}
          <h2 className="text-xl font-semibold text-blue-700 whitespace-nowrap overflow-hidden text-ellipsis">
            Trip Planner
          </h2>
        </div>
      )}

      {/* Sidebar Content (Children) - visible when open, but always present to drive height */}
      {/* Opacity and pointer-events control visibility/interactivity */}
      <div 
        className={`px-4 pb-4 overflow-y-auto transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        // The max-height for the content itself ensures it scrolls if it's too much for the sidebar's max-height
        style={{ 
          maxHeight: isOpen ? '1000px' : '0', // Arbitrarily large or dynamic to allow scroll if needed, 0 when collapsed
          // The padding top should only apply when expanded, otherwise it takes up space in collapsed state
          paddingTop: isOpen ? '16px' : '0',
          // Adjust this max-height further if content goes off screen before scroll appears
          // A more robust calc would be: `calc(${maxHeightOfSidebar} - ${currentHeightOfHeader})`
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
