// src/pages/Presenca.tsx
import React, { useState } from 'react';
import rosterDefault from '../data/alunos.json';
import { getLiberado, registrarPresenca, type Periodo } from '../data/firebasePresenca';

export default function Presenca() {
  const [numero, setNumero] = useState('');
  const [status, setStatus] = useState<'idle'|'ok'|'already'|'blocked'|'error'>();
  const [mensagem, setMensagem] = useState('');

  const hojeISO = () => new Date().toISOString().slice(0, 10);             // AAAA-MM-DD
  const horaHM = () =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const periodoAtual = (): Periodo => (new Date().getHours() < 12 ? 'manha' : 'tarde');

  async function enviar() {
    try {
      setStatus(undefined);
      setMensagem('');

      const roster = rosterDefault as any[];
      const aluno = roster.find(a => String(a.numero) === String(numero));
      if (!aluno) {
        alert('Número não encontrado.');
        return;
      }

      // checa se a lista está liberada
      const liberado = await getLiberado();
      if (!liberado) {
        setStatus('blocked');
        setMensagem('Presença bloqueada pelo aluno de dia.');
        return;
      }

      // grava no Firestore com os MESMOS campos usados pelo Painel
      const res = await registrarPresenca({
        numero: String(aluno.numero),
        graduacao: aluno.graduacao ?? '',
        nome: aluno.nome ?? '',
        status: 'Presente',
        data: hojeISO(),
        hora: horaHM(),
        periodo: periodoAtual(),
      });

      if (res === 'ok') {
        setStatus('ok');
        setMensagem(`PRESENÇA CONFIRMADA\n${aluno.graduacao} ${aluno.nome}\nDATA ${hojeISO()} HORA: ${horaHM()}`);
      } else {
        setStatus('already');
        setMensagem(`PRESENÇA JÁ FOI CONFIRMADA.\nDATA ${hojeISO()}, HORA: ${horaHM()}`);
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
      setMensagem('ERRO NA CONFIRMAÇÃO DE PRESENÇA');
    }
  }

  return (
    <div className="container">
      <h1>Marcar Presença</h1>

      <div className="card" style={{ maxWidth: 520 }}>
        <input
          className="input"
          placeholder="Nº do aluno"
          value={numero}
          onChange={e => setNumero(e.target.value)}
        />
        <button className="btn primary" style={{ marginTop: 8 }} onClick={enviar}>
          Enviar Presença
        </button>
      </div>

      {/* feedback conforme você pediu */}
      {status && (
        <div className="card" style={{ marginTop: 12, whiteSpace: 'pre-line' }}>
          <b>{mensagem}</b>
          {status === 'error' || status === 'blocked' ? (
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={() => setStatus(undefined)}>Voltar</button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
