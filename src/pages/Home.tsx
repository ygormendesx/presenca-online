import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { watchAlunoDiaAtivo, type Periodo } from '../data/firebasePresenca';

type Ativo = { numero: string; nome: string; dia: string; periodo: Periodo } | null;

export default function Home() {
  const [ativo, setAtivo] = useState<Ativo>(null);

  useEffect(() => {
    const unsub = watchAlunoDiaAtivo((a) => {
      if (a) setAtivo({ numero: a.numero, nome: a.nome, dia: a.dia, periodo: a.periodo });
      else setAtivo(null);
    });
    return () => unsub();
  }, []);

  return (
    <div className="container">
      {/* Banner de status do Aluno de Dia */}
      <div className="card" style={{ marginBottom: 12, textAlign: 'center' }}>
        {ativo ? (
          <div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>Aluno de Dia ativo</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>
              Nº {ativo.numero} — {ativo.nome}
            </div>
            <div style={{ opacity: 0.8, fontSize: 12, marginTop: 2 }}>
              {ativo.dia} • {ativo.periodo === 'manha' ? 'Manhã' : 'Tarde'}
            </div>
          </div>
        ) : (
          <div style={{ fontWeight: 600 }}>Nenhum Aluno de Dia ativo no momento.</div>
        )}
      </div>

      <div className="home-actions">
        <Link className="btn block" to="/presenca">Marcar Presença</Link>
        <Link className="btn block" to="/aluno-de-dia">Aluno de Dia</Link>
      </div>
    </div>
  );
}
