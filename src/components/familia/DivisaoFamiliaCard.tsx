import { Scale, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { DivisaoMes } from '../../lib/divisao'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

interface Props {
  divisao: DivisaoMes
  mes: number
  ano: number
  meuUid?: string
}

/** Divisão das despesas familiares do mês, proporcional à renda, e o acerto entre membros. */
export default function DivisaoFamiliaCard({ divisao, mes, ano, meuUid }: Props) {
  const nome = (uid: string) => {
    const m = divisao.membros.find((x) => x.uid === uid)
    if (!m) return 'Membro'
    return uid === meuUid ? `${m.nome} (você)` : m.nome
  }

  return (
    <section className="divisao-card" aria-label="Divisão da família">
      <header className="divisao-head">
        <span className="divisao-icone"><Scale size={16} /></span>
        <div>
          <h3 className="divisao-titulo">Divisão da família · {NOMES_MES[mes]}/{String(ano).slice(2)}</h3>
          <p className="divisao-sub">
            {divisao.totalDespesas > 0
              ? `${fmt(divisao.totalDespesas)} em despesas familiares · ${divisao.partesIguais ? 'partes iguais (sem renda familiar no mês)' : 'proporcional à renda'}`
              : 'Nenhuma despesa familiar neste mês'}
          </p>
        </div>
      </header>

      {divisao.totalDespesas > 0 && (
        <>
          <div className="divisao-membros">
            {divisao.membros.map((m) => (
              <div key={m.uid} className="divisao-membro">
                <div className="divisao-membro-topo">
                  <span className="divisao-nome">{nome(m.uid)}</span>
                  <span className="divisao-pct">{Math.round(m.proporcao * 100)}%</span>
                </div>
                <div className="divisao-barra"><div style={{ width: `${Math.round(m.proporcao * 100)}%` }} /></div>
                <div className="divisao-valores">
                  <span>cota <strong>{fmt(m.cota)}</strong></span>
                  <span>pagou <strong>{fmt(m.pagou)}</strong></span>
                </div>
              </div>
            ))}
          </div>

          {divisao.transferencias.length > 0 ? (
            <div className="divisao-acertos">
              {divisao.transferencias.map((t, i) => (
                <div key={i} className="divisao-acerto">
                  <span>{nome(t.de)}</span>
                  <ArrowRight size={14} />
                  <span>{nome(t.para)}</span>
                  <strong>{fmt(t.valor)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="divisao-acerto ok"><CheckCircle2 size={14} /> Contas equilibradas neste mês</div>
          )}
        </>
      )}

      <style>{`
        .divisao-card {
          background: #FFFFFF; border: 1px solid #F1F2F6; border-radius: 16px;
          padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.85rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .divisao-head { display: flex; gap: 0.65rem; align-items: flex-start; }
        .divisao-icone {
          width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
          background: rgba(200,164,90,0.12); color: #C8A45A;
          display: flex; align-items: center; justify-content: center;
        }
        .divisao-titulo { margin: 0; font-size: 0.92rem; font-weight: 700; color: #2D3436; }
        .divisao-sub { margin: 0.15rem 0 0; font-size: 0.76rem; color: #95A5A6; line-height: 1.4; }
        .divisao-membros { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.6rem; }
        .divisao-membro { background: #F8F9FA; border-radius: 12px; padding: 0.7rem 0.8rem; display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
        .divisao-membro-topo { display: flex; justify-content: space-between; gap: 0.5rem; }
        .divisao-nome { font-size: 0.85rem; font-weight: 700; color: #2D3436; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .divisao-pct { font-size: 0.8rem; font-weight: 700; color: #C8A45A; }
        .divisao-barra { height: 5px; background: #ECEFF1; border-radius: 3px; overflow: hidden; }
        .divisao-barra > div { height: 100%; background: #C8A45A; border-radius: 3px; }
        .divisao-valores { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.74rem; color: #95A5A6; flex-wrap: wrap; }
        .divisao-valores strong { color: #2D3436; font-variant-numeric: tabular-nums; }
        .divisao-acertos { display: flex; flex-direction: column; gap: 0.4rem; }
        .divisao-acerto {
          display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;
          background: #FFF8EC; color: #8A6A2B; border-radius: 10px;
          padding: 0.6rem 0.75rem; font-size: 0.82rem; font-weight: 600;
        }
        .divisao-acerto strong { margin-left: auto; font-variant-numeric: tabular-nums; }
        .divisao-acerto.ok { background: rgba(46,204,113,0.1); color: #1E8449; }
      `}</style>
    </section>
  )
}
