// src/data/firebasePresenca.ts
import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  getDocs,
  where,
  query,
  serverTimestamp,
  orderBy,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

/* ===========================
 *  CONFIG (config/presenca)
 * =========================== */

const cfgRef = doc(db, 'config', 'presenca');

export async function getLiberado(): Promise<boolean> {
  const s = await getDoc(cfgRef);
  if (!s.exists()) {
    // primeira vez: cria doc com padrão bloqueado
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

/** Guarda no Firestore quem é o Aluno de Dia (nº e nome). */
export async function setAlunoDiaInfo(numero: string, nome: string) {
  await setDoc(
    cfgRef,
    {
      alunoDiaNumero: String(numero),
      alunoDiaNome: String(nome || ''),
    },
    { merge: true }
  );
}

/** Lê do Firestore quem é o Aluno de Dia (nº e nome). */
export async function getAlunoDiaInfo(): Promise<{ numero: string; nome: string }> {
  const s = await getDoc(cfgRef);
  const d = (s.data() || {}) as any;
  return {
    numero: String(d?.alunoDiaNumero || ''),
    nome: String(d?.alunoDiaNome || ''),
  };
}

/* ===========================
 *  PRESENÇAS
 * =========================== */

export type Periodo = 'manha' | 'tarde';

export type Presenca = {
  numero: string;
  graduacao: string;
  nome: string;
  status: 'Presente' | 'Ausente';
  data: string;    // AAAA-MM-DD
  hora: string;    // HH:mm
  periodo: Periodo;
  createdAt?: any; // serverTimestamp()
  isAlunoDia?: boolean;
};

const makeId = (dia: string, periodo: Periodo, numero: string) =>
  `${dia}-${periodo}-${numero}`;

/** Registra presença se ainda não existir para o aluno/dia/período. */
export async function registrarPresenca(p: Presenca): Promise<'ok' | 'already'> {
  const id = makeId(p.data, p.periodo, p.numero);
  const ref = doc(db, 'presencas', id);
  const ja = await getDoc(ref);
  if (ja.exists()) return 'already';

  await setDoc(ref, { ...p, status: 'Presente', createdAt: serverTimestamp() });
  return 'ok';
}

/** Lista presentes para o dia/período (consulta única). */
export async function listarPresentes(dia: string, periodo: Periodo) {
  const q = query(
    collection(db, 'presencas'),
    where('data', '==', dia),
    where('periodo', '==', periodo),
    where('status', '==', 'Presente'),
    // Se preferir sem ordenação, remova a linha abaixo
    orderBy('createdAt', 'asc') // pode pedir índice composto
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/** Observa em tempo real os presentes do dia/período. */
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
    // Se preferir sem ordenação, remova a linha abaixo
    orderBy('createdAt', 'asc') // pode pedir índice composto
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => d.data())));
}

/**
 * Reseta TODAS as presenças do dia/período, com opção de
 * preservar um número específico (ex.: Aluno de Dia).
 *
 * Obs.: se quiser ter certeza de preservar o Aluno de Dia
 * de forma independente do navegador, obtenha o número
 * antes via `getAlunoDiaInfo()` e passe em `preserveNumero`.
 */
export async function resetDiaPeriodo(
  dia: string,
  periodo: Periodo,
  preserveNumero?: string
) {
  const q = query(
    collection(db, 'presencas'),
    where('data', '==', dia),
    where('periodo', '==', periodo)
  );
  const snap = await getDocs(q);

  const batch = writeBatch(db);
  snap.docs.forEach((docSnap) => {
    const d = docSnap.data() as any;
    if (preserveNumero && String(d?.numero) === String(preserveNumero)) {
      // mantém o Aluno de Dia
      return;
    }
    batch.delete(docSnap.ref);
  });

  await batch.commit();
}
