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

/** Salva no Firestore quem é o Aluno de Dia + dia/período (para produção). */
export async function setAlunoDiaInfo(params: {
  numero: string;
  nome: string;
  dia: string;
  periodo: Periodo;
}) {
  const { numero, nome, dia, periodo } = params;
  await setDoc(
    cfgRef,
    {
      alunoDia: {
        numero: String(numero),
        nome: String(nome || ''),
        dia,
        periodo,
      },
    },
    { merge: true }
  );
}

/** Lê do Firestore o Aluno de Dia válido para este dia/período (ou null). */
export async function getAlunoDiaInfo(
  dia: string,
  periodo: Periodo
): Promise<{ numero: string; nome: string } | null> {
  const s = await getDoc(cfgRef);
  const a = (s.data() as any)?.alunoDia;
  if (a && a.dia === dia && a.periodo === periodo && a.numero) {
    return { numero: String(a.numero), nome: String(a.nome || '') };
  }
  return null;
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
  isAlunoDia?: boolean; // 👈 importante para o reset preservar
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
    orderBy('createdAt', 'asc') // remova se não quiser ordenar
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
    orderBy('createdAt', 'asc') // remova se não quiser ordenar
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => d.data())));
}

/**
 * Reseta TODAS as presenças do dia/período, preservando:
 *  - qualquer doc com isAlunoDia === true; e
 *  - (fallback) o número vindo de config para o dia/período.
 */
export async function resetDiaPeriodo(
  dia: string,
  periodo: Periodo
) {
  // tenta ler do config o aluno de dia válido
  const cfgAluno = await getAlunoDiaInfo(dia, periodo);
  const numeroCfg = cfgAluno?.numero ? String(cfgAluno.numero) : '';

  const q = query(
    collection(db, 'presencas'),
    where('data', '==', dia),
    where('periodo', '==', periodo)
  );
  const snap = await getDocs(q);

  const batch = writeBatch(db);
  snap.docs.forEach((docSnap) => {
    const d = docSnap.data() as any;
    const ehAlunoDiaFlag = d?.isAlunoDia === true;
    const ehAlunoDiaCfg = numeroCfg && String(d?.numero) === numeroCfg;
    if (ehAlunoDiaFlag || ehAlunoDiaCfg) return; // preserva
    batch.delete(docSnap.ref);
  });
  await batch.commit();
}
