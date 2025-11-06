// src/data/firebasePresenca.ts
import { db } from '../lib/firebase';
import {
  doc, getDoc, setDoc, onSnapshot, collection, getDocs,
  where, query, serverTimestamp, orderBy, type Unsubscribe
} from 'firebase/firestore';

const cfgRef = doc(db, 'config', 'presenca');

export async function getLiberado(): Promise<boolean> {
  const s = await getDoc(cfgRef);
  if (!s.exists()) {
    // primeira execução: cria doc com padrão bloqueado
    await setDoc(cfgRef, { liberado: false }, { merge: true });
    return false;
  }
  return !!s.data()?.liberado;
}

export function watchLiberado(cb: (v: boolean) => void): Unsubscribe {
  return onSnapshot(cfgRef, (s) => cb(!!s.data()?.liberado));
}

export async function setLiberado(v: boolean) {
  await setDoc(cfgRef, { liberado: v }, { merge: true });
}

export type Periodo = 'manha' | 'tarde';

export type Presenca = {
  numero: string;
  graduacao: string;
  nome: string;
  status: 'Presente' | 'Ausente';
  data: string;          // AAAA-MM-DD
  hora: string;          // HH:mm
  periodo: Periodo;
  createdAt?: any;       // serverTimestamp()
};

const makeId = (dia: string, periodo: Periodo, numero: string) =>
  `${dia}-${periodo}-${numero}`;

export async function registrarPresenca(p: Presenca): Promise<'ok' | 'already'> {
  const id = makeId(p.data, p.periodo, p.numero);
  const ref = doc(db, 'presencas', id);
  const ja = await getDoc(ref);
  if (ja.exists()) return 'already';
  await setDoc(ref, { ...p, status: 'Presente', createdAt: serverTimestamp() });
  return 'ok';
}

export async function listarPresentes(dia: string, periodo: Periodo) {
  const q = query(
    collection(db, 'presencas'),
    where('data', '==', dia),
    where('periodo', '==', periodo),
    where('status', '==', 'Presente'),
    //orderBy('createdAt', 'asc') // opcional (pode pedir índice)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

// Atualizações em tempo real (opcional para o Painel)
export function watchPresentes(
  dia: string,
  periodo: Periodo,
  cb: (rows: any[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'presencas'),
    where('data', '==', dia),
    where('periodo', '==', periodo),
    where('status', '==', 'Presente'),
    orderBy('createdAt', 'asc') // se aparecer erro de índice, crie o índice sugerido
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => d.data())));
}
