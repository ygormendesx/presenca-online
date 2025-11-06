// src/pages/LoginAlunoDeDia.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import rosterDefault from '../data/alunos.json';
import {
  registrarPresenca,
  setAlunoDiaInfo,
  type Periodo,
} from '../data/firebasePresenca';

export default function LoginAlunoDeDia() {
  const [numero, setNumero] = useState('');
  const [pwd, setPwd] = useState('');
  const nav = useNavigate();

  const hojeISO = () => new Date().toISOString().slice(0, 10); // AAAA-MM-DD
  const horaHM = () =>
    new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  const periodoAtual = (): Periodo =>
    new Date().getHours() < 12 ? 'manha' : 'tarde';

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

      localStorage.setItem('tipo_usuario', 'aluno');
      localStorage.setItem('aluno_dia_numero', String(aluno.numero));
      localStorage.setItem(
        'aluno_dia_nome',
        `${aluno.graduacao} ${aluno.nome}`
      );

      // 🔹 grava também no Firestore com dia e período
      try {
        await setAlunoDiaInfo({
          numero: String(aluno.numero),
          nome: `${aluno.graduacao} ${aluno.nome}`,
          dia,
          periodo,
        });
      } catch (err) {
        console.error('Falha ao gravar aluno de dia no Firestore', err);
      }

      // 🔹 marca presença com o flag isAlunoDia
      try {
        const res = await registrarPresenca({
          numero: String(aluno.numero),
          graduacao: aluno.graduacao ?? '',
          nome: aluno.nome ?? '',
          status: 'Presente',
          data: dia,
          hora: horaHM(),
          periodo,
          isAlunoDia: true,
        });

        if (res === 'already') {
          // já estava presente — tudo bem
        }
      } catch (err) {
        console.error('Erro ao registrar presença do aluno de dia:', err);
      }

      nav('/painel');
      return;
    }

    alert('Senha incorreta.');
  }

  return (
    <div className="container">
      <h1>Login</h1>
      <form
        onSubmit={entrar}
        className="card"
        style={{ maxWidth: 620, margin: '0 auto' }}
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
    </div>
  );
}
