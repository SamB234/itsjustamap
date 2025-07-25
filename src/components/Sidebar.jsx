import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  const collapsedVisibleWidth = '48px'; // Visible width when collapsed (enough for button)
  const expandedFullWidth = '320px';    // Full width when expanded

  return (
    <div
      className={`fixed top-[120px] left-0 h-[calc(100%-140px)] bg-gray-100/85 backdrop-blur-md shadow-lg rounded-r-lg z-40 transition-all duration-300 ease-in-out flex flex-col`}
      style={{
        width: isOpen ? expandedFullWidth : collapsedVisibleWidth,
        // When collapsed, translate it left by its full expanded width minus the visible part
        transform: isOpen ? 'translateX(0)' : `translateX(calc(-${expandedFullWidth} + ${collapsedVisibleWidth}))`,
        overflowX: 'hidden', // Prevent horizontal scrollbar on the sidebar itself
      }}
    >
      {/* Toggle Button - positioned on the right edge of the *visible* part */}
      <button
        onClick={onClose} // This will toggle the 'isOpen' state in Map.jsx
        className={`absolute top-4 ${isOpen ? 'right-4' : 'right-0'} p-2 rounded-full text-gray-600 hover:text-gray-900 font-bold text-xl leading-none transition-all duration-300 z-50`}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? '×' : '☰'}
      </button>

      {/* Sidebar Content - only visible/interactive when open */}
      {/* Added `w-full pr-4` to content div to ensure it takes full width and has right padding */}
      <div className={`flex-grow p-4 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <h2 className="text-xl font-semibold text-blue-700 mb-4 text-center">Trip Planner</h2>
        <div className="mt-8">
          {children}
        </div>
      </div>
    </div>
  );
}
