import type { Despesa, Receita, Caixinha, Categoria } from '../../types'
import { calcFluxoCaixaMensal, fmt } from '../../hooks/useRelatorios'
import { useState } from 'react'
import { Search } from 'lucide-react'
import ComprometimentoRenda, { type DetalheFluxo } from './ComprometimentoRenda'
import Modal from '../ui/Modal'

interface Props {
  despesas: Despesa[]
  receitas: Receita[]
  caixinhas: Caixinha[]
  userId: string
  mes: number
  ano: number
  /** Liga o total da página de Despesas ao que compromete a renda (cota, previstos) */
  detalhe?: DetalheFluxo
}

// Mapeamento de categorias para a regra 50/20/30
const ESSENCIAL: Categoria[] = ['casa', 'saude', 'locomocao', 'alimentacao', 'educacao']
const QUALIDADE: Categoria[] = ['lazer', 'beleza', 'pessoal', 'presente', 'outros']

function parcelasMes(despesa: Despesa, mes: number, ano: number) {
  return despesa.listaParcelas.filter((p) => {
    const dv = new Date(p.dataVencimento + 'T12:00:00')
    return dv.getMonth() === mes && dv.getFullYear() === ano
  })
}

function barraRegra(real: number, meta: number) {
  const pct = meta > 0 ? Math.min((real / meta) * 100, 150) : 0
  const ok = real <= meta
  return { pct, ok }
}

export default function FluxoCaixaMensal({ despesas, receitas, caixinhas, userId, mes, ano, detalhe }: Props) {
  const [verDetalhe, setVerDetalhe] = useState(false)
  const dados = calcFluxoCaixaMensal(despesas, receitas, userId, mes, ano)
  const saldoPositivo = dados.saldo >= 0

  // Totais de caixinhas
  const totalCaixinhas = caixinhas.reduce((s, c) => s + c.valorAtual, 0)
  const mesChave = `${ano}-${String(mes + 1).padStart(2, '0')}`
  const investidoMes = caixinhas.reduce((s, c) =>
    s + (c.historico ?? [])
      .filter(m => m.tipo === 'entrada' && m.data.startsWith(mesChave))
      .reduce((ms, m) => ms + m.valor, 0), 0)

  // Breakdown: fixo vs variável + pago vs pendente
  let totalFixo = 0, totalVariavel = 0, totalPago = 0, totalPendente = 0
  let totalEssencial = 0, totalQualidade = 0

  despesas.forEach((d) => {
    parcelasMes(d, mes, ano).forEach((p) => {
      const valor = d.minhaParte !== undefined && d.minhaParte !== null
        ? d.minhaParte / d.parcelas : p.valor
      if (d.tipoGasto === 'fixo') totalFixo += valor; else totalVariavel += valor
      if (p.pago) totalPago += valor; else totalPendente += valor
      if (ESSENCIAL.includes(d.categoria)) totalEssencial += valor
      else if (QUALIDADE.includes(d.categoria)) totalQualidade += valor
    })
  })

  const totalDespesas = dados.totalDespesas
  const receitas50 = dados.totalReceitas * 0.5
  const receitas20 = dados.totalReceitas * 0.2
  const receitas30 = dados.totalReceitas * 0.3

  const pctFixo = totalDespesas > 0 ? Math.round((totalFixo / totalDespesas) * 100) : 0
  const pctPago = totalDespesas > 0 ? Math.round((totalPago / totalDespesas) * 100) : 0
  const semDados = totalDespesas === 0 && dados.totalReceitas === 0

  const regra50 = barraRegra(totalEssencial, receitas50)
  const regra20 = barraRegra(investidoMes, receitas20)
  const regra30 = barraRegra(totalQualidade, receitas30)

  return (
    <div className="relatorio-section">
      {/* Cards principais — 4 cards */}
      <div className="fluxo-cards">
        <div className="fluxo-card receita">
          <span className="fc-label">Total Receitas</span>
          <span className="fc-valor">{fmt(dados.totalReceitas)}</span>
        </div>
        <div className="fluxo-card despesa">
          <span className="fc-label fc-label-acao">
            Total Despesas
            {detalhe && (
              <button className="fc-detalhe" onClick={() => setVerDetalhe(true)}
                aria-label={detalhe.titulo} title={detalhe.titulo}>
                <Search size={14} />
              </button>
            )}
          </span>
          {/* Em destaque o que compromete a renda (é o que entra no saldo); o total lançado fica como apoio */}
          <span className="fc-valor">{fmt(dados.totalDespesas)}</span>
          {detalhe && <span className="fc-sub">total lançado: {fmt(detalhe.totalPagina)}</span>}
        </div>
        <div className="fluxo-card caixinha">
          <span className="fc-label">Investido em Caixinhas</span>
          <span className="fc-valor">{fmt(investidoMes)}</span>
          <span className="fc-sub">total acumulado: {fmt(totalCaixinhas)}</span>
        </div>
        <div className={`fluxo-card saldo ${saldoPositivo ? 'positivo' : 'negativo'}`}>
          <span className="fc-label">Saldo do Mês</span>
          <span className="fc-valor">{fmt(dados.saldo)}</span>
        </div>
      </div>

      {detalhe && verDetalhe && (
        <Modal titulo={detalhe.titulo} onFechar={() => setVerDetalhe(false)}>
          <p className="fc-modal-intro">{detalhe.intro}</p>
          <ComprometimentoRenda detalhe={detalhe} receitas={dados.totalReceitas} />
        </Modal>
      )}

      {semDados ? (
        <div className="estado-vazio-rel">Nenhuma movimentação neste mês</div>
      ) : (
        <>

          {/* Breakdown */}
          {totalDespesas > 0 && (
            <div className="breakdown-grid">
              <div className="breakdown-card">
                <span className="bk-titulo">Composição das despesas</span>
                <div className="bk-barra">
                  <div className="bk-fill fixo" style={{ width: `${pctFixo}%` }} />
                  <div className="bk-fill variavel" style={{ width: `${100 - pctFixo}%` }} />
                </div>
                <div className="bk-legenda">
                  <div className="bk-leg-item">
                    <span className="bk-dot fixo-dot" />
                    <div><span className="bk-leg-label">Fixo</span><span className="bk-leg-valor">{fmt(totalFixo)}</span></div>
                    <span className="bk-leg-pct">{pctFixo}%</span>
                  </div>
                  <div className="bk-leg-item">
                    <span className="bk-dot variavel-dot" />
                    <div><span className="bk-leg-label">Variável</span><span className="bk-leg-valor">{fmt(totalVariavel)}</span></div>
                    <span className="bk-leg-pct">{100 - pctFixo}%</span>
                  </div>
                </div>
              </div>

              <div className="breakdown-card">
                <span className="bk-titulo">Situação dos pagamentos</span>
                <div className="bk-barra">
                  <div className="bk-fill pago" style={{ width: `${pctPago}%` }} />
                  <div className="bk-fill pendente" style={{ width: `${100 - pctPago}%` }} />
                </div>
                <div className="bk-legenda">
                  <div className="bk-leg-item">
                    <span className="bk-dot pago-dot" />
                    <div><span className="bk-leg-label">Pago</span><span className="bk-leg-valor">{fmt(totalPago)}</span></div>
                    <span className="bk-leg-pct">{pctPago}%</span>
                  </div>
                  <div className="bk-leg-item">
                    <span className="bk-dot pendente-dot" />
                    <div><span className="bk-leg-label">Pendente</span><span className="bk-leg-valor">{fmt(totalPendente)}</span></div>
                    <span className="bk-leg-pct">{100 - pctPago}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Regra 50/30/20 */}
          {dados.totalReceitas > 0 && (
            <div className="regra-wrap">
              <div className="regra-header">
                <span className="regra-titulo">Regra 50/30/20</span>
              </div>
              <div className="regra-itens">

                {/* 50% Essencial */}
                <div className="regra-item">
                  <div className="regra-item-header">
                    <div className="regra-item-left">
                      <span className="regra-badge essencial">50%</span>
                      <div>
                        <span className="regra-nome">Essencial</span>
                      </div>
                    </div>
                    <div className="regra-valores">
                      <span className={`regra-real ${regra50.ok ? 'ok' : 'excedeu'}`}>{fmt(totalEssencial)}</span>
                      <span className="regra-meta">/ {fmt(receitas50)}</span>
                    </div>
                  </div>
                  <div className="regra-barra-bg">
                    <div
                      className={`regra-barra-fill essencial-fill ${!regra50.ok ? 'excedeu-fill' : ''}`}
                      style={{ width: `${Math.min(regra50.pct, 100)}%` }}
                    />
                  </div>
                  <span className="regra-pct-label">{regra50.pct.toFixed(0)}% da meta {regra50.ok ? '✓' : '— excedeu'}</span>
                </div>

                {/* 30% Qualidade de vida */}
                <div className="regra-item">
                  <div className="regra-item-header">
                    <div className="regra-item-left">
                      <span className="regra-badge qualidade">30%</span>
                      <div>
                        <span className="regra-nome">Qualidade de vida</span>
                      </div>
                    </div>
                    <div className="regra-valores">
                      <span className={`regra-real ${regra30.ok ? 'ok' : 'excedeu'}`}>{fmt(totalQualidade)}</span>
                      <span className="regra-meta">/ {fmt(receitas30)}</span>
                    </div>
                  </div>
                  <div className="regra-barra-bg">
                    <div
                      className={`regra-barra-fill qualidade-fill ${!regra30.ok ? 'excedeu-fill' : ''}`}
                      style={{ width: `${Math.min(regra30.pct, 100)}%` }}
                    />
                  </div>
                  <span className="regra-pct-label">{regra30.pct.toFixed(0)}% da meta {regra30.ok ? '✓' : '— excedeu'}</span>
                </div>

                {/* 20% Investimentos */}
                <div className="regra-item">
                  <div className="regra-item-header">
                    <div className="regra-item-left">
                      <span className="regra-badge investimento">20%</span>
                      <div>
                        <span className="regra-nome">Investimentos</span>
                      </div>
                    </div>
                    <div className="regra-valores">
                      <span className={`regra-real ${regra20.ok && investidoMes > 0 ? 'ok' : 'abaixo'}`}>{fmt(investidoMes)}</span>
                      <span className="regra-meta">/ {fmt(receitas20)}</span>
                    </div>
                  </div>
                  <div className="regra-barra-bg">
                    <div
                      className="regra-barra-fill investimento-fill"
                      style={{ width: `${Math.min(regra20.pct, 100)}%` }}
                    />
                  </div>
                  <span className="regra-pct-label">{regra20.pct.toFixed(0)}% da meta {regra20.pct >= 100 ? '✓' : ''}</span>
                </div>

                

              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        /* Cards */
        .fluxo-cards { display: grid; grid-template-columns:  repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
        @media (max-width: 480px) { .fluxo-cards { grid-template-columns: 1fr; } }
        .fluxo-card { background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
        .fluxo-card.saldo { grid-column: 1 / -1; }
        .fluxo-card.receita { border-left: 3px solid #2ECC71; }
        .fluxo-card.despesa { border-left: 3px solid #E74C3C; }
        .fluxo-card.caixinha { border-left: 3px solid #C8A45A; }
        .fluxo-card.positivo { border-left: 3px solid #2ECC71; background: #F0FDF4; }
        .fluxo-card.negativo { border-left: 3px solid #E74C3C; background: #FEF2F2; }
        .fc-label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #95A5A6; }
        .fc-valor { font-size: 1.3rem; font-weight: 800; color: #2D3436; }
        .fc-sub { font-size: 0.7rem; color: #95A5A6; }
        .fc-label-acao { display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; }
        .fc-detalhe {
          display: flex; align-items: center; justify-content: center; width: 26px; height: 26px;
          border: none; border-radius: 8px; background: rgba(200,164,90,0.12); color: #A8853F; cursor: pointer;
        }
        .fc-detalhe:hover { background: #C8A45A; color: #fff; }
        .fc-modal-intro { font-size: 0.85rem; color: #636E72; line-height: 1.5; margin: 0 0 1rem; }


        /* Barra proporção */
        .proporcao-wrap { margin-bottom: 1.25rem; }
        .proporcao-labels { display: flex; justify-content: space-between; margin-bottom: 0.4rem; }
        .prop-label-receita { font-size: 0.75rem; font-weight: 700; color: #2ECC71; }
        .prop-label-despesa { font-size: 0.75rem; font-weight: 700; color: #E74C3C; }
        .proporcao-barra { display: flex; height: 12px; border-radius: 6px; overflow: hidden; gap: 2px; background: #F1F2F6; }
        .prop-fill-receita { background: #2ECC71; border-radius: 6px 0 0 6px; transition: width 0.5s ease; }
        .prop-fill-despesa { background: #E74C3C; border-radius: 0 6px 6px 0; transition: width 0.5s ease; flex: 1; }
        .proporcao-valores { display: flex; justify-content: space-between; margin-top: 0.35rem; }
        .proporcao-valores span { font-size: 0.72rem; color: #95A5A6; font-variant-numeric: tabular-nums; }

        /* Breakdown */
        .breakdown-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem; }
        @media (max-width: 560px) { .breakdown-grid { grid-template-columns: 1fr; } }
        .breakdown-card { background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .bk-titulo { font-size: 0.65rem; font-weight: 700; color: #95A5A6; text-transform: uppercase; letter-spacing: 0.05em; }
        .bk-barra { display: flex; height: 8px; border-radius: 4px; overflow: hidden; gap: 1px; }
        .bk-fill { transition: width 0.5s ease; }
        .bk-fill.fixo { background: #8E44AD; }
        .bk-fill.variavel { background: #BDC3C7; flex: 1; }
        .bk-fill.pago { background: #2ECC71; }
        .bk-fill.pendente { background: #FAD7A0; flex: 1; }
        .bk-legenda { display: flex; flex-direction: column; gap: 0.5rem; }
        .bk-leg-item { display: flex; align-items: center; gap: 0.6rem; }
        .bk-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .bk-dot.fixo-dot { background: #8E44AD; }
        .bk-dot.variavel-dot { background: #BDC3C7; }
        .bk-dot.pago-dot { background: #2ECC71; }
        .bk-dot.pendente-dot { background: #FAD7A0; border: 1px solid #E67E22; }
        .bk-leg-item > div { flex: 1; display: flex; flex-direction: column; gap: 1px; }
        .bk-leg-label { font-size: 0.75rem; font-weight: 600; color: #636E72; }
        .bk-leg-valor { font-size: 0.8rem; font-weight: 700; color: #2D3436; font-variant-numeric: tabular-nums; }
        .bk-leg-pct { font-size: 0.72rem; font-weight: 700; color: #95A5A6; flex-shrink: 0; }

        /* Regra 50/20/30 */
        .regra-wrap {
          background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 16px;
          padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem;
        }
        .regra-header { display: flex; flex-direction: column; gap: 0.1rem; }
        .regra-titulo { font-size: 0.88rem; font-weight: 800; color: #2D3436; }

        .regra-itens { display: flex; flex-direction: column; gap: 1rem; }

        .regra-item { display: flex; flex-direction: column; gap: 0.5rem; }
        .regra-item-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
        .regra-item-left { display: flex; align-items: flex-start; gap: 0.75rem; flex: 1; min-width: 0; }

        .regra-badge {
          font-size: 0.65rem; font-weight: 800; border-radius: 6px;
          padding: 3px 7px; flex-shrink: 0; margin-top: 1px;
        }
        .regra-badge.essencial { background: rgba(52,152,219,0.12); color: #2980B9; }
        .regra-badge.investimento { background: rgba(200,164,90,0.15); color: #C8A45A; }
        .regra-badge.qualidade { background: rgba(142,68,173,0.12); color: #8E44AD; }

        .regra-nome { display: block; font-size: 0.82rem; font-weight: 700; color: #2D3436; }

        .regra-valores { display: flex; align-items: baseline; gap: 0.2rem; flex-shrink: 0; }
        .regra-real { font-size: 0.9rem; font-weight: 800; font-variant-numeric: tabular-nums; }
        .regra-real.ok { color: #2ECC71; }
        .regra-real.excedeu { color: #E74C3C; }
        .regra-real.abaixo { color: #95A5A6; }
        .regra-meta { font-size: 0.72rem; color: #BDC3C7; font-variant-numeric: tabular-nums; white-space: nowrap; }

        .regra-barra-bg { height: 8px; background: #E8E8E8; border-radius: 4px; overflow: hidden; }
        .regra-barra-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
        .regra-barra-fill.essencial-fill { background: #3498DB; }
        .regra-barra-fill.investimento-fill { background: #C8A45A; }
        .regra-barra-fill.qualidade-fill { background: #8E44AD; }
        .regra-barra-fill.excedeu-fill { background: #E74C3C; }

        .regra-pct-label { font-size: 0.68rem; color: #95A5A6; }

        .regra-aviso {
          display: flex; align-items: center; gap: 0.4rem;
          font-size: 0.68rem; color: #BDC3C7; padding-top: 0.5rem;
          border-top: 1px solid #F1F2F6;
        }
      `}</style>
    </div>
  )
}
