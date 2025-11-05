import React, { useRef } from 'react'
import { Data } from '../data'
import { Aluno } from '../types'

export default function RosterUploader() {
  const fileRef = useRef<HTMLInputElement|null>(null)

  function onCSV(text: string) {
    const lines = text.trim().split(/\r?\n/).slice(1)
    const alunos: Aluno[] = lines.map(l => {
      const [nome, email, matricula] = l.split(',').map(x => x?.trim() || '')
      return { id: matricula || email || nome, nome, ativo: true }
    }).filter(a => a.nome && a.id)
    const current = Data.getRoster()
    const merged = dedup([...current, ...alunos], a => a.id)
    Data.setRoster(merged)
    alert(`Importados ${alunos.length} alunos.`)
  }

  function dedup<T>(arr: T[], key: (x:T)=>string) {
    const m = new Map<string,T>()
    arr.forEach(x => m.set(key(x), x))
    return [...m.values()]
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => onCSV(String(reader.result))
    reader.readAsText(f)
    e.target.value = ''
  }

  return (
    <div className="card">
      <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <strong>Importar alunos (CSV)</strong>
          <div style={{fontSize:12,opacity:.8}}>Cabeçalho esperado: <code>nome,email,matricula</code></div>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleFile}/>
          <button className="btn" onClick={()=>fileRef.current?.click()}>Selecionar CSV</button>
        </div>
      </div>
    </div>
  )
}