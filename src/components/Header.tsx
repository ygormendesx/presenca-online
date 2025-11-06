import React from 'react'

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <img
            src="/cbmba.png"
            alt="Logo"
            className="brand-logo"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <div className="brand-title">LISTA DE PRESENÇA ONLINE CEFS 2025.1</div>
        </div>
      </div>
    </header>
  )
}
