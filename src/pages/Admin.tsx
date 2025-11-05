import React, { useEffect, useMemo, useState } from 'react'
import { Data } from '../data'
import RosterUploader from '../components/RosterUploader'
import ExportButtons from '../components/ExportButtons'
import { Aluno } from '../types'

const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD || 'presencafacil'

export default function Admin(){
  const [auth, setAuth] = useState(false)
  const [pwd, setPwd] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [tol, setTol] = useState(5)

  const sessao = Data.getSessao()
  const roster = Data.getRoster()
  const pres = Data.getPresencas().filter(p => p.sessaoId === sessao?.id)
  const presentMap = new Map(pres.map(p => [p.alunoId, p]))

  const kpis = useMemo(() => {
    const total = roster.length
    const presentes = pres.length
    const atrasados = pres.filter(p => p.status === 'atrasado').length
    const ausentes = total - presentes
    const pct = total ? Math.round((presentes/total)*100) : 0
    return { total, presentes, atrasados, ausentes, pct }
  }, [roster, pres])

  useEffect(() => {
    const h = () => setAuth(a => a)
    window.addEventListener('storage', h)
    return () => window.removeEventListener('storage', h)
  }, [])

  function login(e: React.FormEvent){
    e.preventDefault()
    if (pwd === ADMIN_PASS) { setAuth(true) }
    else alert('Senha incorreta.')
  }

  function abrirSessao(){
    if (!inicio || !fim) return alert('Defina início e fim.')
    Data.openSessao(inicio, fim, tol)
    alert('Sessão aberta.')
  }
  function encerrarSessao(){
    if (!sessao) return
    Data.setSessao(null)
    alert('Sessão encerrada.')
  }
  function limparPresencas(){
    if (!sessao) return
    if (confirm('Apagar presenças desta sessão?')) {
      Data.clearPresencasSessao(sessao.id)
    }
  }

  if (!auth) {
    return (
      <div className="container">
        <h1>Painel do Aluno Responsável</h1>
        <form onSubmit={login} className="card">
          <input className="input" type="password" placeholder="Senha" value={pwd} onChange={e=>setPwd(e.target.value)} />
          <div style={{marginTop:8}}>
            <button className="btn primary" type="submit">Entrar</button>
          </div>
          <div style={{opacity:.7, fontSize:12, marginTop:8}}>
            Senha definida em <code>VITE_ADMIN_PASSWORD</code> (padrão: <code>presencafacil</code>).
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Painel — Conferência de Chamada</h1>

      <div className="kpis" style={{marginBottom:12}}>
        <div className="kpi"><div>Total</div><strong>{kpis.total}</strong></div>
        <div className="kpi"><div>Presentes</div><strong>{kpis.presentes}</strong></div>
        <div className="kpi"><div>Ausentes</div><strong>{kpis.ausentes}</strong></div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <strong>Sessão atual</strong>
        <div>Sessão: <b>{sessao?.id ?? '—'}</b></div>
        <div>Janela: <code>{sessao?.inicioISO ?? '—'}</code> → <code>{sessao?.fimISO ?? '—'}</code> / Tolerância: {sessao?.toleranciaMin ?? tol} min</div>
        <div className="row" style={{marginTop:8}}>
          <input className="input" type="datetime-local" value={inicio} onChange={e=>setInicio(e.target.value)} />
          <input className="input" type="datetime-local" value={fim} onChange={e=>setFim(e.target.value)} />
          <input className="input" type="number" min={0} value={tol} onChange={e=>setTol(parseInt(e.target.value || '0'))} placeholder="Tolerância (min)"/>
        </div>
        <div className="row" style={{marginTop:8}}>
          <button className="btn primary" onClick={abrirSessao}>Abrir sessão</button>
          <button className="btn" onClick={encerrarSessao}>Encerrar</button>
          <button className="btn" onClick={limparPresencas}>Limpar presenças da sessão</button>
        </div>
      </div>

      <RosterUploader />

      <div className="card" style={{marginTop:12}}>
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <strong>Lista ao vivo</strong>
          <div className="badge">{kpis.pct}% presença</div>
        </div>
        <table className="table" style={{marginTop:8}}>
          <thead>
            <tr><th>Aluno</th><th>Matrícula/ID</th><th>Status</th><th>Horário</th></tr>
          </thead>
          <tbody>
            {roster.map((a: Aluno) => {
              const p = presentMap.get(a.id)
              return (
                <tr key={a.id}>
                  <td>{a.nome}</td>
                  <td>{a.id}</td>
                  <td>
                    {p ? (
                      <span className={`badge ${p.status === 'presente' ? 'ok':'late'}`}>{p.status}</span>
                    ) : (
                      <span className="badge">ausente</span>
                    )}
                  </td>
                  <td>{p?.carimbo ? new Date(p.carimbo).toLocaleTimeString() : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div style={{marginTop:12}}>
          <ExportButtons />
        </div>
      </div>
    </div>
  )
}