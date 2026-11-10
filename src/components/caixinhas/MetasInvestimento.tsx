import { ArrowUp } from 'lucide-react'
import type { Caixinha } from '../../types'
import CategoryIcon from '../ui/CategoryIcon'
import ListaMobile, { ResumoMobile, useEhMobile } from '../ui/ListaMobile'

interface Props {
  caixinhas: Caixinha[]
  ano: number
  mes: number
  onDepositar: (caixinha: Caixinha) => void
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function chave(ano: number, mes: number) {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

function investidoNomes(caixinha: Caixinha, ano: number, mes: number): number {
  const prefixo = chave(ano, mes)
  return (caixinha.historico ?? [])
    .filter((m) => m.tipo === 'entrada' && m.data.startsWith(prefixo))
    .reduce((acc, m) => acc + m.valor, 0)
}

const hoje = new Date()

export default function MetasInvestimento({ caixinhas, ano, mes, onDepositar }: Props) {
  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1
  const caixinhasComMeta = caixinhas.filter((c) => c.metaMensal)
  const ehMobile = useEhMobile()

  if (ehMobile) {
    const totalMeta = caixinhasComMeta.reduce((s, c) => s + (c.metaMensal ?? 0), 0)
    const totalInvestido = caixinhasComMeta.reduce((s, c) => s + investidoNomes(c, ano, mes), 0)
    return (
      <div className="metas-mobile">
        {caixinhasComMeta.length > 0 && (
          <ResumoMobile itens={[
            { label: 'Meta do mês', valor: fmt(totalMeta) },
            { label: 'Aportado', valor: fmt(totalInvestido), cor: '#27AE60' },
            { label: 'Falta', valor: fmt(Math.max(totalMeta - totalInvestido, 0)), destaque: true },
          ]} />
        )}
        <ListaMobile
          vazio={<>Nenhuma caixinha com aporte mensal definido.<br />Edite uma caixinha e ative "Definir aporte mensal".</>}
          grupos={[{
            itens: caixinhasComMeta.map((c) => {
              const investido = investidoNomes(c, ano, mes)
              const aportou = investido > 0
              const progresso = c.valorMeta ? Math.min((c.valorAtual / c.valorMeta) * 100, 100) : null
              return {
                id: c.id,
                icone: <CategoryIcon categoria={c.categoria} size={18} color="#636e72" />,
                titulo: c.nome,
                detalhes: [`${fmt(investido)} de ${fmt(c.metaMensal!)} no mês`],
                status: <span className={`badge-status ${aportou ? 'aportou' : 'nao-aportou'}`}>{aportou ? 'Aportou' : 'Não aportou'}</span>,
                extra: progresso !== null ? (
                  <span className="metas-m-prog">
                    <span className="prog-bar"><span className="prog-fill" style={{ width: `${progresso}%` }} /></span>
                    <span className="prog-label">{fmt(c.valorAtual)} / {fmt(c.valorMeta!)}</span>
                  </span>
                ) : undefined,
                acaoRapida: ehMesAtual
                  ? { label: 'Aportar', icone: <ArrowUp size={14} />, onClick: () => onDepositar(c) }
                  : undefined,
              }
            }),
          }]}
        />
        <style>{`
          .metas-mobile { display: flex; flex-direction: column; gap: 0.85rem; }
          .metas-m-prog { display: flex; flex-direction: column; gap: 3px; }
          .metas-mobile .prog-bar { display: block; height: 5px; background: #F1F2F6; border-radius: 3px; overflow: hidden; }
          .metas-mobile .prog-fill { display: block; height: 100%; background: linear-gradient(90deg, #C8A45A, #D4AF37); border-radius: 3px; }
          .metas-mobile .prog-label { font-size: 0.72rem; color: #95A5A6; font-variant-numeric: tabular-nums; }
          .badge-status { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 0.66rem; font-weight: 700; white-space: nowrap; }
          .badge-status.aportou { background: #E8F5E9; color: #27AE60; }
          .badge-status.nao-aportou { background: #FFF5F5; color: #E74C3C; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="metas-wrapper">
      {caixinhasComMeta.length === 0 ? (
        <div className="metas-vazio">
          Nenhuma caixinha com aporte mensal definido.<br />
          Edite uma caixinha e ative "Definir aporte mensal".
        </div>
      ) : (
        <div className="metas-tabela-wrap">
          <table className="metas-tabela">
            <thead>
              <tr>
                <th className="col-motivo">Motivo</th>
                <th className="col-num">Objetivo</th>
                <th className="col-num">Mês</th>
                <th className="col-num">Atual</th>
                <th className="col-progresso">Progresso</th>
                <th className="col-status">Status</th>
                <th className="col-acao"></th>
              </tr>
            </thead>
            <tbody>
              {caixinhasComMeta.map((c) => {
                const investido = investidoNomes(c, ano, mes)
                const aportou = investido > 0
                const progresso = c.valorMeta
                  ? Math.min((c.valorAtual / c.valorMeta) * 100, 100)
                  : null

                return (
                  <tr key={c.id}>
                    <td className="col-motivo">
                      <div className="motivo-cell">
                        <div className="motivo-icon">
                          <CategoryIcon categoria={c.categoria} size={18} color="#636e72" />
                        </div>
                        <span className="motivo-nome">{c.nome}</span>
                      </div>
                    </td>
                    <td className="col-num">
                      {c.valorMeta ? fmt(c.valorMeta) : <span className="sem-valor">—</span>}
                    </td>
                    <td className="col-num aporte">
                      {fmt(c.metaMensal!)}
                    </td>
                    <td className="col-num atual">
                      {investido > 0
                        ? <span className="investido-valor">{fmt(investido)}</span>
                        : <span className="sem-valor">R$ 0,00</span>
                      }
                    </td>
                    <td className="col-progresso">
                      {progresso !== null ? (
                        <div className="prog-wrap">
                          <div className="prog-bar">
                            <div className="prog-fill" style={{ width: `${progresso}%` }} />
                          </div>
                          <span className="prog-label">
                            {fmt(c.valorAtual)} / {fmt(c.valorMeta!)}
                          </span>
                        </div>
                      ) : (
                        <span className="sem-valor">sem meta total</span>
                      )}
                    </td>
                    <td className="col-status">
                      <span className={`badge-status ${aportou ? 'aportou' : 'nao-aportou'}`}>
                        {aportou ? 'Aportou' : 'Não aportou'}
                      </span>
                    </td>
                    <td className="col-acao">
                      {ehMesAtual && (
                        <button className="btn-aportar" onClick={() => onDepositar(c)} title="Depositar">
                          <ArrowUp size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .metas-wrapper { display: flex; flex-direction: column; gap: 1rem; }


        .metas-vazio {
          text-align: center; color: #95A5A6; font-size: 0.88rem;
          padding: 3rem 1rem; line-height: 1.7;
        }

        .metas-tabela-wrap { overflow-x: auto; border-radius: 16px; border: 1px solid #F1F2F6; }

        .metas-tabela {
          width: 100%; border-collapse: collapse;
          font-size: 0.88rem;
        }

        .metas-tabela thead tr {
          background: #F8F9FA;
          border-bottom: 1px solid #F1F2F6;
        }

        .metas-tabela th {
          padding: 0.85rem 1rem;
          color: #95A5A6; font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase;
          text-align: left; white-space: nowrap;
        }
        .metas-tabela th.col-num { text-align: right; }
        .metas-tabela th.col-status { text-align: center; }
        .metas-tabela th.col-acao { width: 48px; }

        .metas-tabela tbody tr {
          border-bottom: 1px solid #F8F9FA;
          transition: background 0.15s;
        }
        .metas-tabela tbody tr:last-child { border-bottom: none; }
        .metas-tabela tbody tr:hover { background: #FAFBFC; }

        .metas-tabela td {
          padding: 1rem;
          color: #2D3436;
          vertical-align: middle;
        }
        .metas-tabela td.col-num { text-align: right; font-variant-numeric: tabular-nums; }
        .metas-tabela td.col-status { text-align: center; }

        .motivo-cell { display: flex; align-items: center; gap: 0.75rem; }
        .motivo-icon {
          width: 36px; height: 36px; background: #F8F9FA; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .motivo-nome { font-weight: 600; color: #2D3436; }

        .aporte { color: #636E72; }
        .investido-valor { font-weight: 600; color: #2ECC71; }
        .sem-valor { color: #BDC3C7; }

        .prog-wrap { display: flex; flex-direction: column; gap: 4px; min-width: 150px; }
        .prog-bar { height: 6px; background: #F1F2F6; border-radius: 3px; overflow: hidden; }
        .prog-fill {
          height: 100%;
          background: linear-gradient(90deg, #C8A45A, #D4AF37);
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        .prog-label { font-size: 0.72rem; color: #95A5A6; font-variant-numeric: tabular-nums; }

        .badge-status {
          display: inline-block;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 700; white-space: nowrap;
        }
        .badge-status.aportou { background: #E8F5E9; color: #27AE60; }
        .badge-status.nao-aportou { background: #FFF5F5; color: #E74C3C; }

        .btn-aportar {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 8px;
          background: #E8F5E9; color: #2ECC71; border: none;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-aportar:hover { background: #2ECC71; color: white; }

        @media (max-width: 700px) {
          .metas-tabela th.col-progresso,
          .metas-tabela td.col-progresso { display: none; }
        }
      `}</style>
    </div>
  )
}
