// src/pages/Presenca.tsx
import React, { useState } from 'react';
import rosterDefault from '../data/alunos.json';
import BackButton from '../components/BackButton';
import { getLiberado, registrarPresenca, type Periodo } from '../data/firebasePresenca';

export default function Presenca() {
  const [numero, setNumero] = useState('');
  const [status, setStatus] = useState<'idle' | 'ok' | 'already' | 'blocked' | 'error'>('idle');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  const hojeISO = () => new Date().toISOString().slice(0, 10); // AAAA-MM-DD
  const horaHM = () =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const periodoAtual = (): Periodo => (new Date().getHours() < 12 ? 'manha' : 'tarde');

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();

    try {
      setStatus('idle');
      setMensagem('');
      setEnviando(true);

      const n = numero.trim();
      if (!n) {
        setMensagem('Informe o número do aluno.');
        setStatus('error');
        return;
      }

      const roster = rosterDefault as any[];
      const aluno = roster.find((a) => String(a.numero) === String(n));
      if (!aluno) {
        setMensagem('Número não encontrado.');
        setStatus('error');
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
        setMensagem(
          `PRESENÇA CONFIRMADA\n${aluno.graduacao} ${aluno.nome}\nDATA ${hojeISO()} HORA: ${horaHM()}`
        );
      } else {
        setStatus('already');
        setMensagem(`PRESENÇA JÁ FOI CONFIRMADA.\nDATA ${hojeISO()}, HORA: ${horaHM()}`);
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMensagem('ERRO NA CONFIRMAÇÃO DE PRESENÇA');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-page">{/* reaproveitando o mesmo layout da tela de login */}
      <h1>Marcar Presença</h1>

      <form onSubmit={enviar} className="card">
        <input
          className="input"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Nº do aluno"
          value={numero}
          onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
          autoFocus
        />

        <button className="btn primary" type="submit" disabled={enviando || !numero.trim()}>
          {enviando ? 'Enviando…' : 'Enviar Presença'}
        </button>
      </form>

      {/* feedback */}
      {status !== 'idle' && (
        <div className="card" style={{ marginTop: 12, whiteSpace: 'pre-line' }}>
          <b>{mensagem}</b>
          {(status === 'error' || status === 'blocked') && (
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={() => setStatus('idle')}>
                Ok
              </button>
            </div>
          )}
        </div>
      )}

      {/* botão voltar centralizado, igual ao login */}
      
      <BackButton />
    </div>
  );
}
