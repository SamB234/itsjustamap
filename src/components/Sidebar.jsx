import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  const collapsedWidth = '56px'; // Width of the sidebar when collapsed (matches Navbar height)
  const expandedWidth = '320px'; // Desired full width when expanded
  const navbarHeight = '56px';   // Height of your Navbar (h-14 = 56px)
  const paddingTopFromNavbar = '14px'; // Desired padding below Navbar

  // Calculate the available vertical space below the navbar for the fixed-height pill
  const availableHeight = `calc(100vh - ${navbarHeight} - ${paddingTopFromNavbar})`;
  const headerHeightExpanded = '48px'; // Fixed height for the header when expanded (approx px-4 py-3 with text)

  return (
    <div
      // Background and transparency: bg-opacity-90 for more prominence
      // Conditional rounding: rounded-r-lg when collapsed, rounded-lg when open
      // Overflow-hidden on the main container for clean edges and to prevent main scrollbar
      className={`fixed left-5 backdrop-blur bg-gray-100 bg-opacity-90 shadow-sm z-40 transition-all duration-300 ease-in-out flex flex-col overflow-hidden 
                  ${isOpen ? 'rounded-lg' : 'rounded-r-lg'}`}
      style={{
        top: `calc(${navbarHeight} + ${paddingTopFromNavbar})`, // Start below the navbar (70px total)
        height: availableHeight, // Fixed vertical height for the "pill" structure
        width: isOpen ? expandedWidth : collapsedWidth, // Animate width
      }}
      // OnClick for the entire div to toggle (only when collapsed)
      // This allows clicking anywhere on the pill to expand it
      onClick={!isOpen ? onClose : undefined}
    >
      {/* Toggle Button (Arrow / X): direct child of main div, always absolute positioned */}
      {/* Positions centrally in collapsed state, top-right in expanded state */}
      <button
        onClick={onClose} // This is the primary toggle function
        className={`p-1 rounded-md text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 z-50 flex-shrink-0 absolute
                    ${isOpen ? 'top-2 right-4' : 'top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2'}`} // Centered in collapsed, top-right in expanded
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        // IMPORTANT: Prevent button clicks from propagating to the parent div's onClick
        onMouseDown={(e) => e.stopPropagation()} 
      >
        {isOpen ? (
          // Close icon (X)
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        ) : (
          // Right arrow icon (simple V on its side)
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        )}
      </button>

      {/* Conditional rendering for "Trip Planner" heading when expanded */}
      {/* It only appears when isOpen is true, without any animation/rotation */}
      {isOpen && (
        <div className="px-4 py-3 flex items-center" style={{ height: headerHeightExpanded }}> {/* py-3 with text-xl makes it approx 48px height */}
          <h2 className="text-xl font-semibold text-blue-700 whitespace-nowrap overflow-hidden text-ellipsis">
            Trip Planner
          </h2>
        </div>
      )}

      {/* Sidebar Content - only visible/interactive when open */}
      <div 
        className={`flex-grow px-4 pb-4 overflow-y-auto ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{
          // Calculate max-height for content, allowing it to scroll if it exceeds available space
          // Subtract headerHeightExpanded ONLY if isOpen (as it's conditionally rendered)
          maxHeight: isOpen ? `calc(${availableHeight} - ${headerHeightExpanded} - 16px - 16px)` : '0', 
          paddingTop: isOpen ? '16px' : '0', // Consistent internal padding
        }}
      >
        <div className="mt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
