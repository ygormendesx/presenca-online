// src/pages/LoginAlunoDeDia.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton'

import rosterDefault from '../data/alunos.json';
import {
  registrarPresenca,
  setAlunoDiaInfo,
  getAlunoDiaAtivo,
  setAlunoDiaAtivo,
  unsetFlagAlunoDiaNoAnterior,
  setFlagAlunoDiaNoNovo,
  type Periodo,
} from '../data/firebasePresenca';

export default function LoginAlunoDeDia() {
  const [numero, setNumero] = useState('');
  const [pwd, setPwd] = useState('');
  const nav = useNavigate();

  // ID persistente do dispositivo/sessão (derrubar sessão antiga quando outro assumir)
  const deviceId = (() => {
    const k = 'device_id';
    let v = localStorage.getItem(k);
    try {
      if (!v) {
        v = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random()}`;
        localStorage.setItem(k, v);
      }
    } catch {
      v = `${Date.now()}-${Math.random()}`;
      localStorage.setItem(k, v);
    }
    return v!;
  })();

  const hojeISO = () => new Date().toISOString().slice(0, 10); // AAAA-MM-DD
  const horaHM = () =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const periodoAtual = (): Periodo => (new Date().getHours() < 12 ? 'manha' : 'tarde');

  async function entrar(e: React.FormEvent) {
    e.preventDefault();

    const roster = rosterDefault as any[];
    const aluno = roster.find((a) => String(a.numero) === String(numero));
    if (!aluno) {
      alert('Número não encontrado.');
      return;
    }

    // Admin
    if (pwd === '@Admin') {
      localStorage.setItem('tipo_usuario', 'admin');
      nav('/painel');
      return;
    }

    // Aluno de dia
    if (pwd === 'CEFS2025') {
      const dia = hojeISO();
      const periodo = periodoAtual();

      // quem está ativo agora?
      const ativo = await getAlunoDiaAtivo(dia, periodo);

      // 👉 Caso 1: ainda não há ativo – assume direto
      if (!ativo) {
        try {
          // salva sessão local
          localStorage.setItem('tipo_usuario', 'aluno');
          localStorage.setItem('aluno_dia_numero', String(aluno.numero));
          localStorage.setItem('aluno_dia_nome', `${aluno.graduacao} ${aluno.nome}`);

          // registra presença (se já existir, tudo bem)
          await registrarPresenca({
            numero: String(aluno.numero),
            graduacao: aluno.graduacao ?? '',
            nome: aluno.nome ?? '',
            status: 'Presente',
            data: dia,
            hora: horaHM(),
            periodo,
            isAlunoDia: true,
          });

          // marca como ativo global
          await setAlunoDiaAtivo({
            numero: String(aluno.numero),
            nome: `${aluno.graduacao} ${aluno.nome}`,
            dia,
            periodo,
            deviceId,
          });

          // info “amigável” (opcional, já usávamos antes)
          await setAlunoDiaInfo({
            numero: String(aluno.numero),
            nome: `${aluno.graduacao} ${aluno.nome}`,
            dia,
            periodo,
          });

          nav('/painel');
          return;
        } catch (err) {
          console.error(err);
          alert('Falha ao assumir como Aluno de Dia.');
          return;
        }
      }

      // 👉 Caso 2: já existe ativo e é o mesmo número – apenas reafirma a posse (relogin)
      if (String(ativo.numero) === String(aluno.numero)) {
        try {
          localStorage.setItem('tipo_usuario', 'aluno');
          localStorage.setItem('aluno_dia_numero', String(aluno.numero));
          localStorage.setItem('aluno_dia_nome', `${aluno.graduacao} ${aluno.nome}`);

          // garante que está marcado presente e com flag
          await registrarPresenca({
            numero: String(aluno.numero),
            graduacao: aluno.graduacao ?? '',
            nome: aluno.nome ?? '',
            status: 'Presente',
            data: dia,
            hora: horaHM(),
            periodo,
            isAlunoDia: true,
          });
          await setFlagAlunoDiaNoNovo(dia, periodo, String(aluno.numero));

          // atualiza deviceId (opcional)
          await setAlunoDiaAtivo({
            numero: String(aluno.numero),
            nome: `${aluno.graduacao} ${aluno.nome}`,
            dia,
            periodo,
            deviceId,
          });

          nav('/painel');
          return;
        } catch (err) {
          console.error(err);
          alert('Falha ao recuperar a sessão do Aluno de Dia.');
          return;
        }
      }

      // 👉 Caso 3: já existe ativo e é OUTRO número – solicitar tomada de posse
      const confirmar = confirm(`O Aluno de Dia atual é o Nº ${ativo.numero}. Deseja assumir a função?`);
      if (!confirmar) return;

      try {
        // retira flag do anterior (se existir doc)
        await unsetFlagAlunoDiaNoAnterior(dia, periodo, String(ativo.numero));

        // salva sessão local do novo
        localStorage.setItem('tipo_usuario', 'aluno');
        localStorage.setItem('aluno_dia_numero', String(aluno.numero));
        localStorage.setItem('aluno_dia_nome', `${aluno.graduacao} ${aluno.nome}`);

        // registra presença com flag (se já existia, ok; se não, cria)
        await registrarPresenca({
          numero: String(aluno.numero),
          graduacao: aluno.graduacao ?? '',
          nome: aluno.nome ?? '',
          status: 'Presente',
          data: dia,
          hora: horaHM(),
          periodo,
          isAlunoDia: true,
        });
        await setFlagAlunoDiaNoNovo(dia, periodo, String(aluno.numero));

        // novo vira o ativo global (o antigo “cai”)
        await setAlunoDiaAtivo({
          numero: String(aluno.numero),
          nome: `${aluno.graduacao} ${aluno.nome}`,
          dia,
          periodo,
          deviceId,
        });

        // info “amigável”
        await setAlunoDiaInfo({
          numero: String(aluno.numero),
          nome: `${aluno.graduacao} ${aluno.nome}`,
          dia,
          periodo,
        });

        nav('/painel');
        return;
      } catch (err) {
        console.error(err);
        alert('Falha ao assumir a função de Aluno de Dia.');
        return;
      }
    }

    alert('Senha incorreta.');
  }

  return (
  <div className="container login-page">
    <h1>Login</h1>
    <form
      onSubmit={entrar}
      className="card"
    >
      <input
        className="input"
        placeholder="Número do aluno de dia"
        value={numero}
        onChange={(e) => setNumero(e.target.value)}
      />
      <input
        className="input"
        type="password"
        placeholder="Senha"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        style={{ marginTop: 8 }}
      />
      <button className="btn primary" type="submit" style={{ marginTop: 8 }}>
        Entrar
      </button>
    </form>

    <button
      type="button"
      className="btn back-btn"
      onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))}
    >
      ← Voltar
    </button>
  </div>
);
}
