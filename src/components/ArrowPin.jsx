import React from 'react'

export default function ArrowPin({ onArrowClick }) {
  const arrow = (dir, rotate, pos) => (
    <div
      onClick={() => onArrowClick(dir)}
      className={`absolute ${pos} transform ${rotate} w-6 h-6 text-blue-700 hover:text-blue-900 cursor-pointer transition`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
      </svg>
    </div>
  )

  return (
    <div className="relative w-16 h-16">
      {arrow('N', '', 'top-0 left-1/2 -translate-x-1/2')}
      {arrow('S', 'rotate-180', 'bottom-0 left-1/2 -translate-x-1/2')}
      {arrow('E', 'rotate-90', 'top-1/2 right-0 -translate-y-1/2')}
      {arrow('W', '-rotate-90', 'top-1/2 left-0 -translate-y-1/2')}
    </div>
  )
}
