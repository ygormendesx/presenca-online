import React, { useEffect, useMemo, useState } from 'react'
import { Storage } from '../data'
import rosterDefault from '../data/alunos.json'
import { Aluno } from '../types'
type Tela = 'form' | 'ok' | 'already' | 'error'
function fmtDataHora(iso: string) { const d = new Date(iso); return { data: d.toLocaleDateString('pt-BR'), hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } }
export default function Presenca() {
  const [numero, setNumero] = useState('')
  const [tela, setTela] = useState<Tela>('form')
  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [carimbo, setCarimbo] = useState('')
  const [erro, setErro] = useState('')
  const [liberado, setLiberado] = useState(Storage.isLiberado())

  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key && e.key.startsWith('cefs_bloqueio_v1')) setLiberado(Storage.isLiberado()) }
    window.addEventListener('storage', onStorage)
    const id = setInterval(() => setLiberado(Storage.isLiberado()), 1500)
    return () => { window.removeEventListener('storage', onStorage); clearInterval(id) }
  }, [])

  const roster: Aluno[] = useMemo(() => {
    const ex = Storage.getRoster()
    if (ex.length === 0 && (rosterDefault as Aluno[]).length) { Storage.setRoster(rosterDefault as Aluno[]); return rosterDefault as Aluno[] }
    return ex
  }, [])

  function enviar() {
    if (!liberado) { setErro('Presença bloqueada. Aguarde o aluno de dia liberar.'); setTela('error'); return }
    const n = numero.trim(); if (!n) { setErro('Digite seu número.'); setTela('error'); return }
    const a = roster.find(x => x.numero === n); if (!a) { setErro('Número não encontrado.'); setTela('error'); return }
    setAluno(a); const res = Storage.registrar(n)
    if (res.status === 'ok') { setCarimbo(res.carimbo); setTela('ok'); setNumero(''); return }
    if (res.status === 'already') { setCarimbo(res.carimbo); setTela('already'); setNumero(''); return }
    setErro(res.reason || 'Erro inesperado.'); setTela('error')
  }
  function voltar() { setTela('form'); setErro(''); setAluno(null); setCarimbo('') }

  if (tela === 'form') {
    return (<div className='container'><h1>Marcar Presença</h1><div className='card'>
      <input className='input' placeholder='NUMERO, ex: "150"' value={numero} onChange={e => setNumero(e.target.value)} />
      <div className='row' style={{ marginTop: 8 }}>
        <button className='btn primary' onClick={enviar} disabled={!liberado} style={{ opacity: liberado ? 1 : .5 }}>
          {liberado ? 'Enviar Presença' : 'Presença bloqueada'}
        </button>
      </div>
    </div></div>)
  }

  if (tela === 'ok' && aluno) { const { data, hora } = fmtDataHora(carimbo); return (<div className='container'><div className='card'><h2>PRESENÇA CONFIRMADA</h2><p><strong>{aluno.graduacao} {aluno.nome}</strong><br />Nº {aluno.numero}{aluno.matricula ? ` • Matrícula ${aluno.matricula}` : ''}</p><p>DATA {data} &nbsp; HORA: {hora}</p></div></div>) }
  if (tela === 'already' && aluno) { const { data, hora } = fmtDataHora(carimbo); return (<div className='container'><div className='card'><h2>PRESENÇA JÁ FOI CONFIRMADA</h2><p><strong>{aluno.graduacao} {aluno.nome}</strong><br />Nº {aluno.numero}{aluno.matricula ? ` • Matrícula ${aluno.matricula}` : ''}</p><p>DATA {data}, HORA: {hora}</p></div></div>) }
  return (<div className='container'><div className='card'><h2>ERRO NA CONFIRMAÇÃO DE PRESENÇA</h2><p>{erro}</p><button className='btn' onClick={voltar}>Voltar</button></div></div>)
}
