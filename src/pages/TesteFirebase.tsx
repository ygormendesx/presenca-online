import React, { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { getDocs, collection } from 'firebase/firestore'

export default function TesteFirebase() {
  const [mensagem, setMensagem] = useState('Conectando ao Firebase...')

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'config'))
        setMensagem('✅ Conectado ao Firebase! Docs em "config": ' + snap.size)
      } catch (e) {
        console.error(e)
        setMensagem('❌ Erro ao conectar ao Firebase — cheque .env ou regras do Firestore')
      }
    })()
  }, [])

  return (
    <div className="container">
      <h1>Teste Firebase</h1>
      <p>{mensagem}</p>
    </div>
  )
}
