import React, { useEffect, useMemo, useState } from 'react'
import { Storage } from '../data'
import rosterDefault from '../data/alunos.json'
import type { Aluno, Presenca } from '../types'

type Tab = 'todos' | 'presentes' | 'ausentes'

export default function Painel() {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('todos')
  const [roster, setRoster] = useState<Aluno[]>([])
  const [pres, setPres] = useState<Presenca[]>([])
  const [liberado, setLiberado] = useState(Storage.isLiberado())

  const tipoUsuario = localStorage.getItem('tipo_usuario')
  const numeroDia = localStorage.getItem('aluno_dia_numero')
  const nomeDia = localStorage.getItem('aluno_dia_nome')
  const dataDia = new Date().toLocaleDateString('pt-BR')

  // bootstrap
  useEffect(() => {
    const ex = Storage.getRoster()
    if (ex.length === 0 && (rosterDefault as Aluno[]).length) {
      Storage.setRoster(rosterDefault as Aluno[])
      setRoster(rosterDefault as Aluno[])
    } else {
      setRoster(ex)
    }
    setPres(Storage.getPresencas())
    setLiberado(Storage.isLiberado())
  }, [])

  // live update (storage + fallback leve)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return
      if (e.key.startsWith('cefs_presencas_v1')) setPres(Storage.getPresencas())
      if (e.key.startsWith('cefs_roster_v1')) setRoster(Storage.getRoster())
      if (e.key.startsWith('cefs_bloqueio_v1')) setLiberado(Storage.isLiberado())
    }
    window.addEventListener('storage', onStorage)
    const id = setInterval(() => {
      setPres(Storage.getPresencas())
      setLiberado(Storage.isLiberado())
    }, 1500)
    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(id)
    }
  }, [])

  const map = useMemo(() => new Map(pres.map(p => [p.numero, p])), [pres])

  const base = useMemo(() => {
    if (tab === 'presentes') return roster.filter(a => map.has(a.numero))
    if (tab === 'ausentes') return roster.filter(a => !map.has(a.numero))
    return roster
  }, [roster, tab, map])

  const filtrados = useMemo(() => {
    const lower = q.toLowerCase()
    return base.filter(
      a =>
        a.numero.includes(q) ||
        a.nome.toLowerCase().includes(lower) ||
        a.graduacao.toLowerCase().includes(lower),
    )
  }, [q, base])

  const presentes = roster.filter(a => map.has(a.numero))
  const ausentes = roster.filter(a => !map.has(a.numero))
  const pct = roster.length ? Math.round((presentes.length / roster.length) * 100) : 0

  function recarregar() {
    if (confirm('Recarregar alunos do arquivo?')) {
      Storage.setRoster(rosterDefault as Aluno[])
      setRoster(Storage.getRoster())
    }
  }

  // Resetar TUDO — preserva presença do aluno de dia
  function resetarTudo() {
    if (!confirm('Resetar tudo (limpar presenças do dia)?')) return

    const numeroKeep = localStorage.getItem('aluno_dia_numero')
    let keep: { numero: string; carimbo: string } | null = null

    if (numeroKeep) {
      const ja = Storage.getPresencaDoNumero(numeroKeep)
      keep = ja ?? { numero: numeroKeep, carimbo: new Date().toISOString() }
    }

    Storage.limparPresencas()
    if (keep) {
      const lista = Storage.getPresencas()
      lista.push(keep)
      Storage.setPresencas(lista)
    }

    // não limpamos roster
    setPres(Storage.getPresencas())
    setRoster(Storage.getRoster())
  }

  function liberar() {
    Storage.liberarPresenca()
    alert('Presenças liberadas para hoje.')
    setLiberado(true)
  }
  function bloquear() {
    Storage.bloquearPresenca()
    alert('Presenças bloqueadas.')
    setLiberado(false)
  }

  return (
    <div className="container">
      {tipoUsuario === 'aluno' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <strong>PAINEL DO ALUNO DE DIA</strong>
          <div>Nº {numeroDia} — {nomeDia}</div>
          <div>Data: {dataDia}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn primary" onClick={liberar} disabled={liberado}>Liberar Presença</button>
            <button className="btn" onClick={bloquear} disabled={!liberado}>Bloquear Presença</button>
            <button className="btn" onClick={resetarTudo}>Resetar TUDO</button>
          </div>
        </div>
      )}

      <h1>Painel</h1>

      <div className="row" style={{ marginBottom: 12 }}>
        <div className="kpi"><div>Total</div><b>{roster.length}</b></div>
        <div className="kpi"><div>Presentes</div><b>{presentes.length}</b></div>
        <div className="kpi"><div>Ausentes</div><b>{ausentes.length}</b></div>
        <div className="kpi"><div>%</div><b>{pct}%</b></div>
        <div className="kpi"><div>Status</div><b>{liberado ? 'Liberado' : 'Bloqueado'}</b></div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="tabs">
          <button className={'tab ' + (tab === 'todos' ? 'active' : '')} onClick={() => setTab('todos')}>Todos</button>
          <button className={'tab ' + (tab === 'presentes' ? 'active' : '')} onClick={() => setTab('presentes')}>Presentes</button>
          <button className={'tab ' + (tab === 'ausentes' ? 'active' : '')} onClick={() => setTab('ausentes')}>Ausentes</button>
        </div>
        <input
          className="input"
          placeholder="Buscar por número, graduação ou nome"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      <div className="card">
        <strong>Lista ({tab})</strong>

        {/* wrapper para responsividade sem alterar cores */}
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Graduação</th>
                <th>Nome</th>
                <th>Status</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(a => {
                const p = map.get(a.numero)
                return (
                  <tr key={a.numero}>
                    <td>{a.numero}</td>
                    <td>{a.graduacao}</td>
                    <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{a.nome}</td>
                    <td>{p ? 'presente' : 'ausente'}</td>
                    <td>{p ? new Date(p.carimbo).toLocaleTimeString() : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="row" style={{ marginTop: 8 }}>
          {localStorage.getItem('tipo_usuario') === 'admin' && (
            <button className="btn" onClick={recarregar}>Recarregar alunos do arquivo</button>
          )}
        </div>
      </div>
    </div>
  )
}
