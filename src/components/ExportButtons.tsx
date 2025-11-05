import React from 'react'
import { Data } from '../data'

export default function ExportButtons(){
  function toCSV(): string {
    const s = Data.getSessao()
    const roster = Data.getRoster()
    const pres = Data.getPresencas().filter(p => p.sessaoId === s?.id)
    const map = new Map(pres.map(p => [p.alunoId, p]))
    const header = 'sessao,data,inicio,fim,aluno,id,status,horario_checkin\n'
    const lines = roster.map(a => {
      const p = map.get(a.id)
      const status = p?.status ?? 'ausente'
      const check = p?.carimbo ?? ''
      return `${s?.id ?? ''},${s?.inicioISO ?? ''},${s?.fimISO ?? ''},${a.nome},${a.id},${status},${check}`
    })
    return header + lines.join('\n')
  }

  function downloadCSV() {
    const blob = new Blob([toCSV()], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function printPDF(){
    window.print()
  }

  return (
    <div className="row">
      <button className="btn" onClick={downloadCSV}>Exportar CSV</button>
      <button className="btn" onClick={printPDF}>Gerar PDF (imprimir)</button>
    </div>
  )
}