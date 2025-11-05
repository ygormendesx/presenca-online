import React, { useMemo, useState } from 'react'
import { Data } from '../data'
import { Aluno } from '../types'

export default function Checkin(){
  const [q, setQ] = useState('')
  const roster = Data.getRoster().filter(a => a.ativo !== false)
  const sessao = Data.getSessao()
  const janelaAberta = Data.isJanelaAberta(sessao)

  const lista = useMemo(() => {
    const lower = q.toLowerCase()
    return roster
      .filter(a => a.nome.toLowerCase().includes(lower) || a.id.toLowerCase().includes(lower))
      .slice(0, 100)
  }, [roster, q])

  function marcar(a: Aluno){
    if (!sessao) return alert('Não há sessão ativa.')
    if (!Data.isJanelaAberta(sessao)) return alert('Fora da janela de presença.')
    Data.marcarPresenca(a)
    alert(`Presença registrada: ${a.nome}`)
  }

  return (
    <div className="container">
      <h1>Marcar Presença</h1>
      <div className="card" style={{marginBottom:12}}>
        <div>Sessão: <strong>{sessao?.id ?? '—'}</strong></div>
        <div>Janela: <code>{sessao?.inicioISO ?? '—'}</code> → <code>{sessao?.fimISO ?? '—'}</code></div>
        <div>Status: {janelaAberta ? <span className="badge ok">Aberta</span> : <span className="badge">Fechada</span>}</div>
      </div>

      <input className="input" placeholder="Buscar por nome ou matrícula" value={q} onChange={e=>setQ(e.target.value)} />

      <div style={{marginTop:12}} className="card">
        {lista.length === 0 ? <div>Ninguém encontrado.</div> :
          <div className="row">
            {lista.map(a => (
              <button key={a.id} className="btn" onClick={()=>marcar(a)}>{a.nome} <small>({a.id})</small></button>
            ))}
          </div>
        }
      </div>

      <div style={{opacity:.7, fontSize:12, marginTop:8}}>
        Dica: digite sua matrícula e toque no seu nome. 2 toques e pronto.
      </div>
    </div>
  )
}