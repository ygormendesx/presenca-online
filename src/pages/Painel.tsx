import React, { useEffect, useMemo, useState } from 'react';
import { getLiberado, setLiberado, watchLiberado, listarPresentes, type Periodo } from '../data/firebasePresenca';
import rosterDefault from '../data/alunos.json';

export default function Painel(){
  const [liberado, setLib] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>((new Date().getHours()<12)?'manha':'tarde');
  const [presentes, setPresentes] = useState<any[]>([]);

  const dia = useMemo(()=> new Date().toISOString().slice(0,10), []);
  const total = (rosterDefault as any[]).length;

  useEffect(()=>{
    getLiberado().then(setLib);
    const unsub = watchLiberado(setLib);
    return ()=>unsub();
  },[]);

  useEffect(()=>{
    listarPresentes(dia, periodo).then(setPresentes);
  },[dia, periodo, liberado]);

  const ausentes = total - presentes.length;

  return (
    <div className="container">
      <h1>PAINEL DO ALUNO DE DIA</h1>
      <div className="row">
        <button className="btn" onClick={()=>setLiberado(true)} disabled={liberado}>Liberar Presença</button>
        <button className="btn" onClick={()=>setLiberado(false)} disabled={!liberado}>Bloquear Presença</button>
        <button className="btn" onClick={()=>setPeriodo('manha')} disabled={periodo==='manha'}>Manhã</button>
        <button className="btn" onClick={()=>setPeriodo('tarde')} disabled={periodo==='tarde'}>Tarde</button>
      </div>

      <div className="row" style={{marginTop:12}}>
        <div className="kpi"><div>Total</div><b>{total}</b></div>
        <div className="kpi"><div>Presentes</div><b>{presentes.length}</b></div>
        <div className="kpi"><div>Ausentes</div><b>{ausentes}</b></div>
        <div className="kpi"><div>Status</div><b>{liberado ? 'Liberado' : 'Bloqueado'}</b></div>
        <div className="kpi"><div>Período</div><b>{periodo}</b></div>
      </div>

      <h3 style={{marginTop:16}}>Presentes ({presentes.length})</h3>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Nº</th><th>Graduação</th><th>Nome</th><th>Hora</th></tr></thead>
          <tbody>
            {presentes.map((p:any)=>(
              <tr key={`${p.data}-${p.periodo}-${p.numero}`}>
                <td>{p.numero}</td>
                <td>{p.graduacao}</td>
                <td>{p.nome}</td>
                <td>{p.hora}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
