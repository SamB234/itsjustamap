import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  const collapsedHeight = '48px'; // Height of the "pill" when collapsed
  const expandedFullHeight = '300px'; // Full height when expanded (adjust as needed)
  const sidebarWidth = '320px'; // Fixed width of the sidebar

  return (
    <div
      className={`fixed top-5 left-5 bg-gray-100/85 backdrop-blur-md shadow-lg rounded-lg z-40 transition-all duration-300 ease-in-out flex flex-col`}
      style={{
        width: sidebarWidth, // Maintain a consistent width
        height: isOpen ? expandedFullHeight : collapsedHeight, // Control height for vertical expansion
        overflowY: isOpen ? 'auto' : 'hidden', // Allow scrolling when open, hide overflow when closed
      }}
    >
      {/* Toggle Button - positioned on the far right of the bar (within its fixed width) */}
      <button
        onClick={onClose} // This is now the toggle function passed from Map.jsx
        className="absolute top-2 right-4 p-2 rounded-full text-gray-600 hover:text-gray-900 font-bold text-xl leading-none transition-all duration-300 z-50"
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? '×' : '☰'}
      </button>

      {/* Sidebar Content - only visible/interactive when open */}
      <div className={`flex-grow px-4 pb-4 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
           style={{ paddingTop: isOpen ? '50px' : '0' }} // Push content down to avoid overlapping the button when open
      >
        <h2 className="text-xl font-semibold text-blue-700 mb-4 text-center">Trip Planner</h2>
        <div className="mt-8">
          {children}
        </div>
      </div>
    </div>
  );
}
