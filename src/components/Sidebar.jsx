import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  const collapsedWidth = '56px'; // Width of the sidebar when collapsed (e.g., small pill)
  const collapsedHeight = '48px'; // Height of the sidebar when collapsed (small pill height)
  const expandedWidth = '320px';  // Desired full width when expanded
  // Note: Height will be 'auto' when expanded, but limited by max-height
  
  const navbarHeight = '56px';   // Height of your Navbar (h-14 = 56px)
  const paddingTopFromNavbar = '14px'; // Desired padding below Navbar (56px + 14px = 70px total top offset)

  // Calculate top position relative to navbar
  const sidebarTop = `calc(${navbarHeight} + ${paddingTopFromNavbar})`;

  return (
    <div
      // Background, transparency, shadow, position, and transition
      className={`fixed left-5 backdrop-blur bg-gray-100 bg-opacity-90 shadow-sm z-40 transition-all duration-300 ease-in-out flex flex-col overflow-hidden 
                  ${isOpen ? 'rounded-lg' : 'rounded-full'}`} {/* Change to rounded-full for the collapsed pill */}
      style={{
        top: sidebarTop,
        width: isOpen ? expandedWidth : collapsedWidth, // Animate width
        // Height: auto when open, fixed when collapsed. Limited by max-height
        height: isOpen ? 'auto' : collapsedHeight, 
        maxHeight: `calc(100vh - ${sidebarTop} - 20px)`, // Limit overall height to screen minus top offset and some bottom padding
      }}
      // OnClick for the entire div to toggle (only when collapsed)
      onClick={!isOpen ? onClose : undefined}
    >
      {/* --- Toggle Button (Arrow or X) --- */}
      {/* The button's visibility and position depend on the isOpen state */}
      {/* Arrow (visible when collapsed) */}
      {!isOpen && (
        <button
          onClick={onClose} // Clicking the arrow expands the sidebar
          className={`p-1 rounded-md text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 z-50 absolute 
                      top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2`} // Centered in the collapsed pill
          aria-label="Open sidebar"
          onMouseDown={(e) => e.stopPropagation()} 
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
          onMouseDown={(e) => e.stopPropagation()} 
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      )}

      {/* --- Conditional Content Area (Visible only when Expanded) --- */}
      {/* This entire section appears/disappears with the sidebar expansion */}
      {isOpen && (
        <div className={`flex flex-col flex-grow opacity-100 pointer-events-auto`}
             style={{ paddingTop: '16px' }} // Start content with padding after button
        >
          {/* "Trip Planner" Heading (no animation, just appears) */}
          <div className="px-4 py-3 flex items-center"> {/* Use py-3 for vertical centering */}
            <h2 className="text-xl font-semibold text-blue-700 whitespace-nowrap overflow-hidden text-ellipsis">
              Trip Planner
            </h2>
          </div>

          {/* Main Content (scrollable if needed) */}
          <div className="flex-grow px-4 pb-4 overflow-y-auto">
            <div className="mt-2">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
