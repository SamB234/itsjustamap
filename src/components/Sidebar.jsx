import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 bg-gray-100/85 backdrop-blur-md shadow-lg rounded-l-lg z-40 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ overflowY: 'auto' }} // Enable scrolling for content
    >
      <div className="p-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-600 hover:text-gray-900 font-bold text-xl leading-none"
          aria-label="Close sidebar"
        >
          ×
        </button>

        {/* Sidebar Title (optional) */}
        <h2 className="text-xl font-semibold text-blue-700 mb-4 text-center">Trip Planner</h2>
        
        {/* Main Content Area */}
        <div className="mt-8"> {/* Add margin top to push content below close button */}
          {children} {/* This is where other components/content will be rendered */}
        </div>
      </div>
    </div>
  );
}
