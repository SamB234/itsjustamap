import React from 'react';

export default function Sidebar({ isOpen, onClose, children }) {
  const collapsedWidth = '56px'; 
  const expandedWidth = '320px'; 
  
  const navbarHeight = '56px'; 
  const paddingTopFromNavbar = '14px'; 

  const sidebarTop = `calc(${navbarHeight} + ${paddingTopFromNavbar})`;

  return (
    <div
      className={`fixed left-5 backdrop-blur bg-gray-100 bg-opacity-90 shadow-sm z-40 transition-all duration-300 ease-in-out flex flex-col overflow-hidden 
                  ${isOpen ? 'rounded-lg' : 'rounded-r-lg'}`}
      style={{
        top: sidebarTop,
        width: isOpen ? expandedWidth : collapsedWidth, 
        height: 'auto', 
        maxHeight: `calc(100vh - ${sidebarTop} - 20px)`, 
      }}
    >
      {/* Main Content Wrapper */}
      <div 
        className={`flex flex-col transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{
          maxHeight: isOpen ? 'none' : '0', 
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
            {children}
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
