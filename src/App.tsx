// src/App.tsx
import React,{useEffect} from 'react'
import {BrowserRouter,Routes,Route} from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Presenca from './pages/Presenca'
import LoginAlunoDeDia from './pages/LoginAlunoDeDia'
import Painel from './pages/Painel'
import TesteFirebase from './pages/TesteFirebase'   // 👈 NOVO
import './styles.css'
import { Storage } from './data'

export default function App(){
  useEffect(()=>{
    if(localStorage.getItem('cefs_bloqueio_v1')===null){ Storage.bloquearPresenca() }
    function agendar(){
      const now=new Date()
      const target=new Date()
      target.setHours(20,0,0,0)
      if(now>target) target.setDate(target.getDate()+1)
      const ms=target.getTime()-now.getTime()
      return setTimeout(()=>{
        Storage.limparPresencas()
        Storage.bloquearPresenca()
        agendar()
        alert('Presenças resetadas e sistema bloqueado para o próximo dia.')
      }, ms)
    }
    const timer=agendar()
    return ()=> clearTimeout(timer)
  }, [])

  return (
    <BrowserRouter>
      <Header/>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/presenca' element={<Presenca/>}/>
        <Route path='/aluno-de-dia' element={<LoginAlunoDeDia/>}/>
        <Route path='/painel' element={<Painel/>}/>
        <Route path='/teste' element={<TesteFirebase/>}/>  {/* 👈 NOVO */}
        {/* opcional: 404 */}
        {/* <Route path='*' element={<div className="container">Página não encontrada</div>} /> */}
      </Routes>
    </BrowserRouter>
  )
}
