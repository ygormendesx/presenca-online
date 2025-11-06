// src/pages/Painel.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  getLiberado,
  setLiberado as setLiberadoRemote,
  watchLiberado,
  watchPresentes,
  getAlunoDiaInfo, // nº/nome do Aluno de Dia
  type Periodo,
} from '../data/firebasePresenca';
import rosterDefault from '../data/alunos.json';

import { db } from '../lib/firebase';
import {
  collection, getDocs, query, where,
  writeBatch, setDoc, doc, serverTimestamp
} from 'firebase/firestore';

type PresRow = {
  numero: string;
  graduacao: string;
  nome: string;
  status: 'Presente' | 'Ausente';
  hora?: string;
};

type Aba = 'todos' | 'presentes' | 'ausentes';
type AlunoDiaInfo = { numero: string; nome: string } | null;

export default function Painel() {
  const [liberado, setLib] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>(
    new Date().getHours() < 12 ? 'manha' : 'tarde'
  );
  const [presentes, setPresentes] = useState<any[]>([]);
  const [aba, setAba] = useState<Aba>('todos');
  const [alunoDia, setAlunoDia] = useState<AlunoDiaInfo>(null);

  const dia = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const total = (rosterDefault as any[]).length;

  // flag liberado em tempo real
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const v = await getLiberado();
      setLib(v);
      unsub = watchLiberado(setLib);
    })();
    return () => unsub();
  }, []);

  // presentes em tempo real
  useEffect(() => {
    const unsub = watchPresentes(dia, periodo, setPresentes);
    return () => unsub();
  }, [dia, periodo]);

  // aluno de dia do dia/período
  useEffect(() => {
    (async () => {
      const info = await getAlunoDiaInfo(dia, periodo);
      setAlunoDia(info);
    })();
  }, [dia, periodo]);

  // consolida lista
  const { linhas, qtdPresentes } = useMemo(() => {
    const mapaHora = new Map<string, string>();
    const numerosPresentes = new Set<string>();

    for (const p of presentes) {
      numerosPresentes.add(String(p.numero));
      if (p.hora) mapaHora.set(String(p.numero), p.hora);
    }

    const rows: PresRow[] = (rosterDefault as any[]).map((a: any) => {
      const num = String(a.numero ?? a.n ?? a.N ?? a.id ?? '');
      const status = numerosPresentes.has(num) ? 'Presente' : 'Ausente';
      return {
        numero: num,
        graduacao: a.graduacao ?? a.grad ?? '',
        nome: a.nome ?? a.name ?? '',
        status,
        hora: status === 'Presente' ? mapaHora.get(num) ?? '—' : '—',
      };
    });

    const presentesCount = rows.filter(r => r.status === 'Presente').length;
    return { linhas: rows, qtdPresentes: presentesCount };
  }, [presentes]);

  const ausentes = total - qtdPresentes;

  const linhasFiltradas = useMemo(() => {
    if (aba === 'presentes') return linhas.filter(l => l.status === 'Presente');
    if (aba === 'ausentes')  return linhas.filter(l => l.status === 'Ausente');
    return linhas;
  }, [linhas, aba]);

  async function handleLiberar(val: boolean) {
    setLib(val); // otimista
    try {
      await setLiberadoRemote(val);
    } catch {
      setLib(!val);
      alert('Falha ao atualizar status de liberação.');
    }
  }

  // reset com preservação do AD
  async function handleResetarPresencas() {
    if (!confirm('Tem certeza que deseja resetar TODAS as presenças deste período de hoje?')) return;

    const q = query(
      collection(db, 'presencas'),
      where('data', '==', dia),
      where('periodo', '==', periodo)
    );
    const snap = await getDocs(q);

    let alunoDiaDoc = snap.docs.find(d => (d.data() as any)?.isAlunoDia === true);
    let numeroAlunoDia = alunoDiaDoc ? String((alunoDiaDoc.data() as any).numero) : '';

    if (!numeroAlunoDia) {
      const fromCfg = await getAlunoDiaInfo(dia, periodo);
      if (fromCfg?.numero) numeroAlunoDia = String(fromCfg.numero);
    }
    if (!numeroAlunoDia) {
      const nLS = String(localStorage.getItem('aluno_dia_numero') || '').trim();
      if (nLS) numeroAlunoDia = nLS;
    }
    if (!numeroAlunoDia) {
      const input = prompt('Número do Aluno de Dia para preservar:');
      if (!input) { alert('Operação cancelada.'); return; }
      numeroAlunoDia = String(input).trim();
    }

    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      const data = d.data() as any;
      const preserve =
        data?.isAlunoDia === true || String(data?.numero) === String(numeroAlunoDia);
      if (!preserve) batch.delete(d.ref);
    });
    await batch.commit();

    const snap2 = await getDocs(q);
    const aindaTemAD = snap2.docs.some(d => {
      const data = d.data() as any;
      return data?.isAlunoDia === true || String(data?.numero) === String(numeroAlunoDia);
    });

    if (!aindaTemAD) {
      const alunoRoster = (rosterDefault as any[]).find(
        (a: any) => String(a.numero).trim() === String(numeroAlunoDia)
      );
      const graduacao = alunoRoster?.graduacao ?? '';
      const nome = alunoRoster?.nome ?? (localStorage.getItem('aluno_dia_nome') || 'Aluno de Dia');

      const id = `${dia}-${periodo}-${numeroAlunoDia}`;
      const ref = doc(db, 'presencas', id);
      const hh = String(new Date().getHours()).padStart(2, '0');
      const mm = String(new Date().getMinutes()).padStart(2, '0');

      await setDoc(ref, {
        data: dia,
        periodo,
        numero: numeroAlunoDia,
        graduacao,
        nome,
        status: 'Presente',
        hora: `${hh}:${mm}`,
        isAlunoDia: true,
        createdAt: serverTimestamp(),
      });
    }

    alert('Presenças resetadas com sucesso!');
  }

  return (
    <div className="container panel-page">
      <h1>PAINEL DO ALUNO DE DIA</h1>

      {alunoDia && (
        <div className="ad-banner">
          <div className="ad-title">Aluno de Dia</div>
          <div className="ad-content">
            <span className="ad-name">{alunoDia.nome || '—'}</span>
            <span className="ad-num">Nº {alunoDia.numero}</span>
          </div>
        </div>
      )}

      <div className="row">
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
        <button className="btn danger" onClick={handleResetarPresencas}>
          Resetar Presenças
        </button>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="kpi"><div>Total</div><b>{total}</b></div>
        <div className="kpi"><div>Presentes</div><b>{qtdPresentes}</b></div>
        <div className="kpi"><div>Ausentes</div><b>{ausentes}</b></div>
        <div className="kpi"><div>Status</div><b>{liberado ? 'Liberado' : 'Bloqueado'}</b></div>
        <div className="kpi"><div>Período</div><b>{periodo === 'manha' ? 'Manhã' : 'Tarde'}</b></div>
      </div>

      <div className="tabs" style={{ marginTop: 16 }}>
        <button className={`tab ${aba === 'todos' ? 'active' : ''}`} onClick={() => setAba('todos')}>TODOS</button>
        <button className={`tab ${aba === 'presentes' ? 'active' : ''}`} onClick={() => setAba('presentes')}>PRESENTES</button>
        <button className={`tab ${aba === 'ausentes' ? 'active' : ''}`} onClick={() => setAba('ausentes')}>AUSENTES</button>
      </div>

      <h3 style={{ marginTop: 16 }}>
        {aba === 'todos' && <>Lista (todos)</>}
        {aba === 'presentes' && <>Presentes ({qtdPresentes})</>}
        {aba === 'ausentes' && <>Ausentes ({ausentes})</>}
      </h3>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Nº</th>
              <th style={{ width: 140 }}>Graduação</th>
              <th>Nome</th>
              <th style={{ width: 120 }}>Hora</th>
            </tr>
          </thead>
          <tbody>
            {linhasFiltradas.length === 0 ? (
              <tr><td colSpan={4}>Ninguém presente neste período ainda.</td></tr>
            ) : (
              linhasFiltradas.map((r) => {
                const isAD = alunoDia && String(r.numero) === String(alunoDia.numero);
                return (
                  <tr key={r.numero} className={isAD ? 'is-ad' : ''} style={{ opacity: r.status === 'Ausente' ? 0.6 : 1 }}>
                    <td>{r.numero}</td>
                    <td>{r.graduacao}</td>
                    <td>
                      {r.nome}
                      {isAD && <span className="badge-ad">Aluno de Dia</span>}
                    </td>
                    <td>{r.status === 'Presente' ? r.hora ?? '—' : '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
