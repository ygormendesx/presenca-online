import React,{useState} from 'react'
import { useNavigate } from 'react-router-dom'
import { Storage } from '../data'
import rosterDefault from '../data/alunos.json'
import { Aluno } from '../types'

export default function LoginAlunoDeDia(){
  const [numero,setNumero]=useState('')
  const [pwd,setPwd]=useState('')
  const nav=useNavigate()

  const roster:Aluno[] = Storage.getRoster().length? Storage.getRoster() : (rosterDefault as Aluno[])

  function entrar(e:React.FormEvent){
    e.preventDefault()
    const aluno = roster.find(a=>a.numero===numero)
    if(!aluno){ alert('Número não encontrado.'); return }

    if(pwd==='CEFS2025'){
      Storage.registrar(numero)
      localStorage.setItem('tipo_usuario','aluno')
      localStorage.setItem('aluno_dia_numero', aluno.numero)
      localStorage.setItem('aluno_dia_nome', `${aluno.graduacao} ${aluno.nome}`)
      nav('/painel')
      return
    }

    if(pwd==='@Admin'){
      localStorage.setItem('tipo_usuario','admin')
      nav('/painel')
      return
    }

    alert('Senha incorreta.')
  }

  return (
  <div className="container">
    <h1 className="login-title">Login</h1>

    <form onSubmit={entrar} className="card login-box">
      <input
        className="input"
        placeholder="Número do aluno de dia"
        value={numero}
        onChange={e => setNumero(e.target.value)}
      />
      <input
        className="input"
        type="password"
        placeholder="Senha"
        value={pwd}
        onChange={e => setPwd(e.target.value)}
        style={{ marginTop: 8 }}
      />
      <button className="btn primary" type="submit" style={{ marginTop: 8 }}>
        Entrar
      </button>
    </form>
  </div>
)
}
