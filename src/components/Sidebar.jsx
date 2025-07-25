import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  return (
    <div
      className={`fixed top-[120px] left-0 h-[calc(100%-140px)] w-80 bg-gray-100/85 backdrop-blur-md shadow-lg rounded-r-lg z-40 transition-transform duration-300 ease-in-out p-4 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-[calc(100%-40px)]'}`}
      style={{ overflowY: 'auto' }} // Enable scrolling for content
    >
      {/* Close/Toggle Button for collapsed state */}
      <button
        onClick={onClose}
        className={`absolute top-4 ${isOpen ? 'right-4' : 'right-0 -translate-x-full'} text-gray-600 hover:text-gray-900 font-bold text-xl leading-none transition-all duration-300`}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? '×' : '☰'}
      </button>

      {/* Sidebar Content - only visible when open */}
      <div className={`flex-grow ${isOpen ? '' : 'hidden'}`}> {/* Hidden when collapsed */}
        <h2 className="text-xl font-semibold text-blue-700 mb-4 text-center">Trip Planner</h2>
        <div className="mt-8"> {/* Add margin top to push content below title */}
          {children} {/* This is where other components/content will be rendered */}
        </div>
      </div>
    </div>
  );
}
