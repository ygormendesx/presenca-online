import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const { pathname } = useLocation()

  // Regras de visibilidade
  const isInicio = pathname === '/'
  const isAlunoDeDiaCtx = pathname.startsWith('/aluno-de-dia') || pathname.startsWith('/painel')

  // Itens do menu conforme regra
  const menuItems =
    isInicio
      ? [] // sem menu no Início
      : isAlunoDeDiaCtx
        ? [{ to: '/', label: 'Início' }] // só Início no Aluno de Dia + Painel
        : [
            { to: '/', label: 'Início' },
            { to: '/presenca', label: 'Marcar Presença' },
            { to: '/aluno-de-dia', label: 'Aluno de Dia' },
          ]

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

    {!isInicio && (
      <nav className="nav">
        {menuItems.map((i) => (
          <Link key={i.to} to={i.to} className="nav-link">
            {i.label}
          </Link>
        ))}
      </nav>
    )}
  </div>
</header>

  )
}
