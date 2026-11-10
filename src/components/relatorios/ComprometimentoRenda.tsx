import { fmt } from '../../hooks/useRelatorios'

export interface LinhaComprometimento {
  label: string
  valor: number
  sub?: string
}

export interface DetalheFluxo {
  /** Título do detalhamento (ex.: "Quanto compromete sua renda") */
  titulo: string
  /** Frase de abertura do dialog */
  intro: string
  /** Rótulo do total (ex.: "Total comprometido") */
  rotuloTotal: string
  /** Rótulo da porcentagem (ex.: "da sua renda") */
  rotuloRenda: string
  /** Total igual ao da página de Despesas no mesmo mês (valor cheio, sem previstos) */
  totalPagina: number
  /** O que de fato compromete a renda neste relatório */
  linhas: LinhaComprometimento[]
}

/** Quebra do que compromete a renda no mês, ligando o total da página de Despesas ao saldo. */
export default function ComprometimentoRenda({ detalhe, receitas }: { detalhe: DetalheFluxo; receitas: number }) {
  const total = detalhe.linhas.reduce((s, l) => s + l.valor, 0)
  const pct = receitas > 0 ? Math.round((total / receitas) * 100) : null

  return (
    <div className="cr-card">
      <div className="cr-topo">
        <span className="cr-titulo">{detalhe.titulo}</span>
        {pct !== null && <span className={`cr-pct ${pct > 100 ? 'alerta' : ''}`}>{pct}% {detalhe.rotuloRenda}</span>}
      </div>
      <div className="cr-linhas">
        {detalhe.linhas.map((l) => (
          <div key={l.label} className="cr-linha">
            <div className="cr-linha-info">
              <span className="cr-label">{l.label}</span>
              {l.sub && <span className="cr-sub">{l.sub}</span>}
            </div>
            <span className="cr-valor">{fmt(l.valor)}</span>
          </div>
        ))}
        <div className="cr-linha total">
          <span className="cr-label">{detalhe.rotuloTotal}</span>
          <span className="cr-valor">{fmt(total)}</span>
        </div>
      </div>

      <style>{`
        .cr-card { background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.25rem; }
        .cr-topo { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
        .cr-titulo { font-size: 0.65rem; font-weight: 700; color: #95A5A6; text-transform: uppercase; letter-spacing: 0.05em; }
        .cr-pct { font-size: 0.72rem; font-weight: 700; color: #A8853F; background: rgba(200,164,90,0.12); border-radius: 6px; padding: 0.15rem 0.5rem; }
        .cr-pct.alerta { color: #C0392B; background: rgba(231,76,60,0.1); }
        .cr-linhas { display: flex; flex-direction: column; }
        .cr-linha { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.55rem 0; border-bottom: 1px solid #ECEFF1; }
        .cr-linha:last-child { border-bottom: none; }
        .cr-linha-info { display: flex; flex-direction: column; min-width: 0; }
        .cr-label { font-size: 0.85rem; color: #2D3436; font-weight: 600; }
        .cr-sub { font-size: 0.72rem; color: #95A5A6; }
        .cr-valor { font-size: 0.9rem; font-weight: 700; color: #2D3436; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .cr-linha.total .cr-label, .cr-linha.total .cr-valor { color: #E74C3C; font-weight: 800; }
      `}</style>
    </div>
  )
}
