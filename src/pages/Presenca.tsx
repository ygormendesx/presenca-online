import React, { useEffect, useState } from 'react';
import rosterDefault from '../data/alunos.json';
import { getLiberado, watchLiberado, registrarPresenca, type Presenca, type Periodo } from '../data/firebasePresenca';

export default function Presenca() {
  const [numero, setNumero] = useState('');
  const [liberado, setLiberadoState] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    const unsub = watchLiberado(setLiberadoState);
    return () => unsub();
  }, []);

  async function enviar() {
    setMsg('');
    const ok = await getLiberado();
    if (!ok) { setMsg('ERRO NA CONFIRMAÇÃO DE PRESENÇA — Lista bloqueada.'); return; }

    const aluno = (rosterDefault as any[]).find(a => String(a.numero) === String(numero));
    if (!aluno) { setMsg('Número não encontrado.'); return; }

    const agora = new Date();
    const data = agora.toISOString().slice(0,10);
    const hora = agora.toTimeString().slice(0,5);
    const periodo: Periodo = (agora.getHours() < 12) ? 'manha' : 'tarde';

    const payload: Presenca = {
      numero: String(aluno.numero),
      graduacao: aluno.graduacao,
      nome: aluno.nome,
      status: 'Presente',
      data, hora, periodo
    };

    const r = await registrarPresenca(payload);
    if (r === 'ok') {
      setMsg(`PRESENÇA CONFIRMADA\n${aluno.graduacao} ${aluno.nome}\nDATA ${data} HORA ${hora}`);
      setNumero('');
    } else {
      setMsg(`PRESENÇA JÁ FOI CONFIRMADA. DATA ${data}, HORA: ${hora}`);
    }
  }

  return (
    <div className="container">
      <h1>Marcar Presença</h1>
      <p>Status: <b>{liberado ? 'Liberado' : 'Bloqueado'}</b></p>

      <input
        className="input"
        placeholder="Número do aluno"
        value={numero}
        onChange={e => setNumero(e.target.value)}
      />
      <button className="btn primary" onClick={enviar} disabled={!liberado} style={{marginTop:8}}>
        Enviar Presença
      </button>

      {msg && (
        <pre style={{whiteSpace:'pre-wrap', marginTop:12}}>{msg}</pre>
      )}
    </div>
  );
}
