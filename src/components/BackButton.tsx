import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function BackButton({ fallback = '/' }: { fallback?: string }) {
  const nav = useNavigate()
  const goBack = () => {
    if (window.history.length > 1) nav(-1)
    else nav(fallback)
  }
  return (
    <button className="btn-mp" onClick={goBack} style={{ marginBottom: 12 }}>
      ← Voltar
    </button>
  )
}