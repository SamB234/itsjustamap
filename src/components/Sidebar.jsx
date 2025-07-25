import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  const collapsedWidth = '40px'; // The width of the "pill" when collapsed
  const expandedWidth = '320px'; // The full width when expanded

  return (
    <div
      className={`fixed top-[120px] left-0 h-[calc(100%-140px)] bg-gray-100/85 backdrop-blur-md shadow-lg rounded-r-lg z-40 transition-all duration-300 ease-in-out flex flex-col`}
      style={{
        width: isOpen ? expandedWidth : collapsedWidth, // Control width directly
        transform: isOpen ? 'translateX(0)' : 'translateX(0)', // Keep at 0, width changes
        overflowX: 'hidden', // Hide horizontal overflow when collapsed
        overflowY: isOpen ? 'auto' : 'hidden', // Only show vertical scroll when open
      }}
    >
      {/* This button stays visible on the right edge of the sidebar */}
      <button
        onClick={onClose} // This handler will toggle the isOpen state in Map.jsx
        className={`absolute top-4 ${isOpen ? 'right-4' : 'right-0 -translate-x-full'} p-2 rounded-full text-gray-600 hover:text-gray-900 font-bold text-xl leading-none transition-all duration-300 z-50`}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        // Style for the pill button when collapsed
        style={!isOpen ? { width: collapsedWidth, height: collapsedWidth, display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}}
      >
        {isOpen ? '×' : '☰'}
      </button>

      {/* Sidebar Content - only visible when open and has padding */}
      <div className={`flex-grow p-4 ${isOpen ? '' : 'opacity-0 pointer-events-none'}`}> {/* Fade out content and disable clicks when collapsed */}
        <h2 className="text-xl font-semibold text-blue-700 mb-4 text-center">Trip Planner</h2>
        <div className="mt-8"> {/* Add margin top to push content below title */}
          {children} {/* This is where other components/content will be rendered */}
        </div>
      </div>
    </div>
  );
}
