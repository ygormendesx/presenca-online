import React, { useEffect, useMemo, useState } from 'react';
import {
  getLiberado,
  setLiberado as setLiberadoRemote, // evita conflito com setLib
  watchLiberado,
  watchPresentes,
  type Periodo,
} from '../data/firebasePresenca';
import rosterDefault from '../data/alunos.json';

export default function Painel() {
  const [liberado, setLib] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>(
    new Date().getHours() < 12 ? 'manha' : 'tarde'
  );
  const [presentes, setPresentes] = useState<any[]>([]);

  // AAAA-MM-DD de hoje
  const dia = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const total = (rosterDefault as any[]).length;

  // Carrega e “escuta” o flag liberado em tempo real
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const v = await getLiberado();
      setLib(v);
      unsub = watchLiberado(setLib);
    })();
    return () => unsub();
  }, []);

  // Atualiza a lista de presentes sempre que liberar/bloquear, ou mudar período
useEffect(() => {
  // em tempo real
  const unsub = watchPresentes(dia, periodo, setPresentes);
  return () => unsub();
}, [dia, periodo]);

  const ausentes = total - presentes.length;

  async function handleLiberar(val: boolean) {
    // opcional: otimista na UI
    setLib(val);
    try {
      await setLiberadoRemote(val);
    } catch (e) {
      // se falhar, volta estado
      setLib(!val);
      alert('Não foi possível atualizar o bloqueio no servidor.');
      console.error(e);
    }
  }

  return (
    <div className="container">
      <h1>PAINEL DO ALUNO DE DIA</h1>

      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn" onClick={() => handleLiberar(true)} disabled={liberado}>
          Liberar Presença
        </button>
        <button className="btn" onClick={() => handleLiberar(false)} disabled={!liberado}>
          Bloquear Presença
        </button>

        <button className="btn" onClick={() => setPeriodo('manha')} disabled={periodo === 'manha'}>
          Manhã
        </button>
        <button className="btn" onClick={() => setPeriodo('tarde')} disabled={periodo === 'tarde'}>
          Tarde
        </button>
      </div>

      <div className="row">
        <div className="kpi"><div>Total</div><b>{total}</b></div>
        <div className="kpi"><div>Presentes</div><b>{presentes.length}</b></div>
        <div className="kpi"><div>Ausentes</div><b>{ausentes}</b></div>
        <div className="kpi"><div>Status</div><b>{liberado ? 'Liberado' : 'Bloqueado'}</b></div>
        <div className="kpi"><div>Período</div><b>{periodo === 'manha' ? 'Manhã' : 'Tarde'}</b></div>
      </div>

      <h3 style={{ marginTop: 16 }}>Presentes ({presentes.length})</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Graduação</th>
              <th>Nome</th>
              <th>Hora</th>
            </tr>
          </thead>
          <tbody>
            {presentes.map((p: any) => (
              <tr key={`${p.data}-${p.periodo}-${p.numero}`}>
                <td>{p.numero}</td>
                <td>{p.graduacao}</td>
                <td>{p.nome}</td>
                <td>{p.hora}</td>
              </tr>
            ))}
            {presentes.length === 0 && (
              <tr><td colSpan={4} style={{ opacity: .7 }}>Ninguém presente neste período ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
