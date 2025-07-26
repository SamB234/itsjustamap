import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  const collapsedHeight = '48px'; // Height of the "pill" when collapsed
  const sidebarWidth = '320px'; // Fixed width of the sidebar

  return (
    <div
      className={`fixed top-[70px] left-5 bg-gray-100/85 backdrop-blur-md shadow-lg z-40 transition-all duration-300 ease-in-out flex flex-col`}
      // Conditional classes for roundedness: rounded-full when collapsed, rounded-lg when open
      style={{
        width: sidebarWidth,
        height: isOpen ? 'auto' : collapsedHeight, // 'auto' height when open
        maxHeight: 'calc(100vh - 80px)', // Prevent it from going off-screen (adjust 80px based on actual navbar height + desired bottom padding)
        overflowY: 'auto', // Always allow scrolling if content overflows even when it's 'auto' height
      }}
      // Add onClick to the main div for toggling when collapsed
      onClick={!isOpen ? onClose : undefined}
    >
      {/* Container for the "Filters" text and the toggle button */}
      <div className={`flex items-center ${isOpen ? 'justify-end' : 'justify-between'} w-full relative h-[${collapsedHeight}]`}>
        {/* "Filters" text - visible only when collapsed */}
        {!isOpen && (
          <span className="absolute left-4 text-gray-700 font-semibold pointer-events-none">Filters</span>
        )}
        
        {/* Toggle Button - always visible, positioned relative to its container */}
        <button
          onClick={onClose} // This is the toggle function passed from Map.jsx
          className={`p-2 rounded-full text-gray-600 hover:text-gray-900 font-bold text-xl leading-none transition-all duration-300 z-50 ${isOpen ? 'absolute top-2 right-4' : 'relative mr-4'}`}
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          // Prevent click from bubbling up to the parent div if it's the toggle button
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isOpen ? '×' : '☰'}
        </button>
      </div>

      {/* Sidebar Content - only visible/interactive when open */}
      <div className={`flex-grow px-4 pb-4 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
           style={{ paddingTop: isOpen ? '10px' : '0' }} // Adjust padding top when open to prevent overlap with internal toggle button container
      >
        <h2 className="text-xl font-semibold text-blue-700 mb-4 text-center">Trip Planner</h2>
        <div className="mt-8">
          {children}
        </div>
      </div>
    </div>
  );
}
