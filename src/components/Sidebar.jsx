import React from 'react';

export default function Sidebar({ isOpen, onClose, filterOptions, activeFilters, pendingFilters, onFilterToggle, onApplyFilters }) {
  const collapsedWidth = '56px';    // Fixed width when collapsed
  const expandedWidth = '320px';    // Fixed width when expanded
  
  const navbarHeight = '56px';      // Height of your Navbar (h-14 = 56px)
  const paddingTopFromNavbar = '14px'; // Desired padding below Navbar

  // Calculate top position relative to navbar
  const sidebarTop = `calc(${navbarHeight} + ${paddingTopFromNavbar})`;

  // Define the fixed height for the sidebar in BOTH states
  // You can adjust this '50vh' value if you prefer a different fixed height
  const fixedSidebarHeight = `calc(100vh / 2)`;  

  // Check if pending filters are different from active filters to enable the apply button
  const filtersChanged = JSON.stringify(pendingFilters.sort()) !== JSON.stringify(activeFilters.sort());

  return (
    <div
      className={`fixed left-5 backdrop-blur bg-gray-100 bg-opacity-90 shadow-sm z-40 transition-all duration-300 ease-in-out flex flex-col overflow-hidden 
                  ${isOpen ? 'rounded-lg' : 'rounded-lg'}`} 
      style={{
        top: sidebarTop,
        width: isOpen ? expandedWidth : collapsedWidth, 
        height: fixedSidebarHeight, 
      }}
    >
      {/* Main Content Wrapper */}
      <div 
        className={`flex flex-col flex-grow ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{
          maxHeight: '100%', 
          overflowY: 'auto', 
        }}
      >
        {/* "Trip Planner" Heading */}
        <div className="px-4 py-3 flex items-center flex-shrink-0"> 
          <h2 className="text-xl font-semibold text-blue-700 whitespace-nowrap overflow-hidden text-ellipsis">
            Trip Planner
          </h2>
        </div>

        {/* Sidebar Children Content */}
        <div className="flex-grow px-4 pb-4">
          <div className="mt-2">
            <h3 className="font-semibold text-gray-800 mb-2">Filters</h3>
            <div className="flex flex-col gap-2 text-sm">
              {filterOptions.map(option => (
                <label key={option} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pendingFilters.includes(option)}
                    onChange={() => onFilterToggle(option)}
                    className="form-checkbox text-blue-600 rounded-sm focus:ring-blue-500"
                  />
                  <span>{option.charAt(0).toUpperCase() + option.slice(1)}</span>
                </label>
              ))}
            </div>

            {/* Apply Filters button */}
            <button
              onClick={onApplyFilters}
              disabled={!filtersChanged}
              className={`mt-4 w-full px-4 py-2 rounded-lg font-semibold text-white transition-colors duration-200 
                         ${filtersChanged ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Buttons (Arrow OR X) */}
      {/* Arrow (visible when collapsed) */}
      {!isOpen && (
        <button
          onClick={onClose}
          className={`p-1 rounded-md text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 z-50 absolute 
                      top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2`} 
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
          onClick={onClose} 
          className={`p-1 rounded-md text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 z-50 absolute 
                      top-2 right-4`} 
          aria-label="Close sidebar"
          onMouseDown={(e) => e.stopPropagation()} 
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      )}
    </div>
  );
}
