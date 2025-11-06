// src/pages/Painel.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  getLiberado,
  setLiberado as setLiberadoRemote,
  watchLiberado,
  watchPresentes,
  getAlunoDiaInfo,           // 👈 pega nº/nome do Aluno de Dia do Firestore
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

export default function Painel() {
  const [liberado, setLib] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>(
    new Date().getHours() < 12 ? 'manha' : 'tarde'
  );
  const [presentes, setPresentes] = useState<any[]>([]);
  const [aba, setAba] = useState<Aba>('todos');

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

  // Presentes em tempo real (para o período atual)
  useEffect(() => {
    const unsub = watchPresentes(dia, periodo, setPresentes);
    return () => unsub();
  }, [dia, periodo]);

  // Monta a lista consolidada (roster + presentes)
  const { linhas, qtdPresentes } = useMemo(() => {
    const mapaHora = new Map<string, string>(); // numero -> hora
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

    const presentesCount = rows.filter((r) => r.status === 'Presente').length;
    return { linhas: rows, qtdPresentes: presentesCount };
  }, [presentes]);

  const ausentes = total - qtdPresentes;

  // Filtra pela aba
  const linhasFiltradas = useMemo(() => {
    if (aba === 'presentes') return linhas.filter((l) => l.status === 'Presente');
    if (aba === 'ausentes') return linhas.filter((l) => l.status === 'Ausente');
    return linhas;
  }, [linhas, aba]);

  async function handleLiberar(val: boolean) {
    // otimista na UI
    setLib(val);
    try {
      await setLiberadoRemote(val);
    } catch {
      // rollback se falhar
      setLib(!val);
      alert('Falha ao atualizar status de liberação.');
    }
  }

  // 🔴 Resetar presenças do dia + período (preservando Aluno de Dia do Firestore)
  async function handleResetarPresencas() {
  if (!confirm('Tem certeza que deseja resetar TODAS as presenças deste período de hoje?')) return;

  // 1) Pega todos os docs do dia+período
  const q = query(
    collection(db, 'presencas'),
    where('data', '==', dia),
    where('periodo', '==', periodo)
  );
  const snap = await getDocs(q);

  // 2) Procura um doc com isAlunoDia === true
  let alunoDiaDoc = snap.docs.find(d => (d.data() as any)?.isAlunoDia === true);
  let numeroAlunoDia = alunoDiaDoc ? String((alunoDiaDoc.data() as any).numero) : '';

  // 3) Fallback: tenta Firestore config/localStorage; por fim pergunta
  if (!numeroAlunoDia) {
    try {
      const { numero: nCfg } = await getAlunoDiaInfo(); // se você já expôs esta função
      if (nCfg) numeroAlunoDia = String(nCfg);
    } catch {}
    if (!numeroAlunoDia) {
      const nLS = String(localStorage.getItem('aluno_dia_numero') || '').trim();
      if (nLS) numeroAlunoDia = nLS;
    }
    if (!numeroAlunoDia) {
      const input = prompt('Número do Aluno de Dia para preservar (obrigatório):');
      if (!input) {
        alert('Operação cancelada. Número do Aluno de Dia não informado.');
        return;
      }
      numeroAlunoDia = String(input).trim();
    }
  }

  // 4) Deleta todos, menos o doc com flag OU com o número do aluno de dia
  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    const data = d.data() as any;
    const preserve =
      data?.isAlunoDia === true || String(data?.numero) === String(numeroAlunoDia);
    if (!preserve) batch.delete(d.ref);
  });
  await batch.commit();

  // 5) Se não existia doc do aluno de dia, recria agora
  const aindaTemAlunoDia = (await getDocs(q)).docs.some(
    d => (d.data() as any)?.isAlunoDia === true ||
         String((d.data() as any)?.numero) === String(numeroAlunoDia)
  );
  if (!aindaTemAlunoDia) {
    const alunoRoster = (rosterDefault as any[]).find(
      (a: any) => String(a.numero).trim() === String(numeroAlunoDia)
    );
    const graduacao = alunoRoster?.graduacao ?? '';
    const nome = alunoRoster?.nome ?? (localStorage.getItem('aluno_dia_nome') || 'Aluno de Dia');

    const id = `${dia}-${periodo}-${numeroAlunoDia}`;
    const ref = doc(db, 'presencas', id);
    const hh = String(new Date().getHours()).padStart(2,'0');
    const mm = String(new Date().getMinutes()).padStart(2,'0');

    await setDoc(ref, {
      data: dia,
      periodo,
      numero: numeroAlunoDia,
      graduacao,
      nome,
      status: 'Presente',
      hora: `${hh}:${mm}`,
      isAlunoDia: true,      // 👈 mantém o flag
      createdAt: serverTimestamp(),
    });
  }

  alert('Presenças resetadas com sucesso! (Aluno de Dia preservado)');
}

  return (
    <div className="container">
      <h1>PAINEL DO ALUNO DE DIA</h1>

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

        {/* 🔴 Botão de reset */}
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

      {/* Abas */}
      <div className="tabs" style={{ marginTop: 16 }}>
        <button className={`tab ${aba === 'todos' ? 'active' : ''}`} onClick={() => setAba('todos')}>
          TODOS
        </button>
        <button className={`tab ${aba === 'presentes' ? 'active' : ''}`} onClick={() => setAba('presentes')}>
          PRESENTES
        </button>
        <button className={`tab ${aba === 'ausentes' ? 'active' : ''}`} onClick={() => setAba('ausentes')}>
          AUSENTES
        </button>
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
              <tr>
                <td colSpan={4}>Ninguém presente neste período ainda.</td>
              </tr>
            ) : (
              linhasFiltradas.map((r) => (
                <tr key={r.numero} style={{ opacity: r.status === 'Ausente' ? 0.6 : 1 }}>
                  <td>{r.numero}</td>
                  <td>{r.graduacao}</td>
                  <td>{r.nome}</td>
                  <td>{r.status === 'Presente' ? r.hora ?? '—' : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
