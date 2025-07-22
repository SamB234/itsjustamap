import React from 'react'

export default function ArrowPin({ onArrowClick }) {
  // onArrowClick(direction, event) - callback when arrow clicked, now passes event

  const arrowClass = "w-6 h-6 text-blue-700 hover:text-blue-900 cursor-pointer transition"

  // Wrapper click handler to pass the event
  function handleClick(direction, e) {
    e.stopPropagation()
    onArrowClick(direction, e)
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Central Pin */}
      <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold select-none cursor-pointer">
        📍
      </div>

      {/* Arrows */}
      {/* North */}
      <div
        onClick={(e) => handleClick('N', e)}
        className="absolute -top-8 left-1/2 transform -translate-x-1/2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          className={arrowClass}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
        </svg>
      </div>

      {/* South */}
      <div
        onClick={(e) => handleClick('S', e)}
        className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 rotate-180"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          className={arrowClass}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
        </svg>
      </div>

      {/* West */}
      <div
        onClick={(e) => handleClick('W', e)}
        className="absolute top-1/2 -left-8 transform -translate-y-1/2 -rotate-90"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          className={arrowClass}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
        </svg>
      </div>

      {/* East */}
      <div
        onClick={(e) => handleClick('E', e)}
        className="absolute top-1/2 -right-8 transform -translate-y-1/2 rotate-90"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          className={arrowClass}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
        </svg>
      </div>
    </div>
  )
}
