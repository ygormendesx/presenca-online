import React from 'react'; import { Link } from 'react-router-dom'
export default function Home() {
    return (<div className="container">
  <div className="home-actions">
    <Link className="btn block" to="/presenca">Marcar Presença</Link>
    <Link className="btn block" to="/aluno-de-dia">Aluno de Dia</Link>
  </div>
</div>)
}