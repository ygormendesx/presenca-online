import { Aluno, Presenca } from './types'
const K={ROSTER:'cefs_roster_v1',PRESENCAS:'cefs_presencas_v1',BLOQUEIO:'cefs_bloqueio_v1'}
function ping(k:string){try{localStorage.setItem(k+'_ts',String(Date.now()))}catch{}}
export const Storage={
getRoster(){const r=localStorage.getItem(K.ROSTER);return r?JSON.parse(r) as Aluno[]:[]},
setRoster(l:Aluno[]){localStorage.setItem(K.ROSTER,JSON.stringify(l));ping(K.ROSTER)},
getPresencas(){const r=localStorage.getItem(K.PRESENCAS);return r?JSON.parse(r) as Presenca[]:[]},
setPresencas(l:Presenca[]){localStorage.setItem(K.PRESENCAS,JSON.stringify(l));ping(K.PRESENCAS)},
getPresencaDoNumero(n:string){return this.getPresencas().find(p=>p.numero===n)},
registrar(n:string){try{const all=this.getPresencas();const x=all.find(p=>p.numero===n);if(x)return{status:'already',carimbo:x.carimbo} as const;const c=new Date().toISOString();all.push({numero:n,carimbo:c});this.setPresencas(all);return{status:'ok',carimbo:c} as const}catch(e:any){return{status:'error',reason:e?.message||'Falha ao salvar'} as const}},
isLiberado(){const f=localStorage.getItem(K.BLOQUEIO);return f==='liberado'},
liberarPresenca(){localStorage.setItem(K.BLOQUEIO,'liberado');ping(K.BLOQUEIO)},
bloquearPresenca(){localStorage.setItem(K.BLOQUEIO,'bloqueado');ping(K.BLOQUEIO)},
limparPresencas(){localStorage.removeItem(K.PRESENCAS);ping(K.PRESENCAS)},
limparRoster(){localStorage.removeItem(K.ROSTER);ping(K.ROSTER)}
}