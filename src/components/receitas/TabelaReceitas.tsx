import { Pencil, Trash2, Repeat } from 'lucide-react'
import type { Receita } from '../../types'
import { CATEGORIA_RECEITA_LABEL, fmtBRL, fmtDiaMes, resumoReceitas, type LinhaReceita } from '../../lib/receitas'
import IconeReceita from './IconeReceita'
import ListaMobile, { ResumoMobile } from '../ui/ListaMobile'
import { useEhMobile, rotuloDia, agruparPorDia } from '../../lib/mobile'

interface Props {
  linhas: LinhaReceita[]
  onEditar: (r: Receita) => void
  onRemover: (r: Receita) => void
}

/** Receitas do mês em tabela (mesmo visual da tabela de despesas). */
export default function TabelaReceitas({ linhas, onEditar, onRemover }: Props) {
  const resumo = resumoReceitas(linhas)
  const ehMobile = useEhMobile()

  if (ehMobile) {
    const ordenadas = [...linhas].sort((a, b) => a.dataNoMes.localeCompare(b.dataNoMes))
    return (
      <div className="tr-mobile">
        {linhas.length > 0 && (
          <ResumoMobile itens={[
            { label: 'Recorrente', valor: fmtBRL(resumo.recorrente) },
            { label: 'Avulso', valor: fmtBRL(resumo.avulso) },
            { label: 'Total', valor: fmtBRL(resumo.total), cor: '#27AE60', destaque: true },
          ]} />
        )}
        <ListaMobile
          vazio="Nenhuma receita neste mês."
          grupos={agruparPorDia(ordenadas, l => l.dataNoMes).map(([dia, ls]) => ({
            titulo: rotuloDia(dia),
            resumo: ls.length > 1 ? fmtBRL(ls.reduce((s, l) => s + l.receita.valor, 0)) : undefined,
            itens: ls.map(({ receita: r, dataNoMes }) => ({
              id: r.id,
              icone: <IconeReceita categoria={r.categoria} size={18} />,
              iconeFundo: 'rgba(39,174,96,0.08)',
              titulo: r.nome,
              detalhes: [CATEGORIA_RECEITA_LABEL[r.categoria] ?? r.categoria, r.recorrente ? 'Recorrente' : 'Avulsa'],
              valor: fmtBRL(r.valor),
              valorClasse: 'positivo',
              ficha: [
                { label: 'Data', valor: fmtDiaMes(dataNoMes) },
                { label: 'Categoria', valor: CATEGORIA_RECEITA_LABEL[r.categoria] ?? r.categoria },
                { label: 'Tipo', valor: r.recorrente ? 'Recorrente' : 'Avulsa' },
              ],
              acoes: [
                { label: 'Editar', icone: <Pencil size={16} />, tom: 'neutra', onClick: () => onEditar(r) },
                { label: 'Excluir', icone: <Trash2 size={16} />, tom: 'perigo', onClick: () => onRemover(r) },
              ],
            })),
          }))}
        />
        <style>{`.tr-mobile { display: flex; flex-direction: column; gap: 0.85rem; }`}</style>
      </div>
    )
  }

  return (
    <div className="tr-wrap">
      <div className="tr-scroll">
        <table className="tr-tabela">
          <thead>
            <tr>
              <th>Descrição</th>
              <th className="tr-col-cat">Categoria</th>
              <th>Data</th>
              <th className="tr-col-tipo">Tipo</th>
              <th className="tr-col-valor">Valor</th>
              <th className="tr-col-acoes" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ receita: r, dataNoMes }) => (
              <tr key={r.id}>
                <td>
                  <div className="tr-desc">
                    <span className="tr-icone"><IconeReceita categoria={r.categoria} size={16} /></span>
                    <span className="tr-nome">{r.nome}</span>
                  </div>
                </td>
                <td className="tr-col-cat">{CATEGORIA_RECEITA_LABEL[r.categoria] ?? r.categoria}</td>
                <td className="tr-data">{fmtDiaMes(dataNoMes)}</td>
                <td className="tr-col-tipo">
                  {r.recorrente
                    ? <span className="tr-badge rec"><Repeat size={11} /> Recorrente</span>
                    : <span className="tr-badge">Avulsa</span>}
                </td>
                <td className="tr-col-valor tr-valor">{fmtBRL(r.valor)}</td>
                <td className="tr-col-acoes">
                  <div className="tr-acoes">
                    <button onClick={() => onEditar(r)} aria-label={`Editar ${r.nome}`}><Pencil size={14} /></button>
                    <button className="del" onClick={() => onRemover(r)} aria-label={`Excluir ${r.nome}`}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tr-footer">
        <span className="tr-contagem">{linhas.length} {linhas.length === 1 ? 'receita' : 'receitas'}</span>
        <div className="tr-subtotais">
          <div className="tr-sub"><span>Recorrente</span><strong>{fmtBRL(resumo.recorrente)}</strong></div>
          <div className="tr-sub"><span>Avulso</span><strong>{fmtBRL(resumo.avulso)}</strong></div>
          <div className="tr-sub destaque"><span>Total do mês</span><strong>{fmtBRL(resumo.total)}</strong></div>
        </div>
      </div>

      <style>{`
        .tr-wrap { background: #fff; border: 1px solid #F1F2F6; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .tr-scroll { overflow-x: auto; }
        .tr-tabela { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .tr-tabela thead tr { background: #F8F9FA; border-bottom: 1px solid #F1F2F6; }
        .tr-tabela th {
          padding: 0.85rem 1rem; color: #95A5A6; font-size: 0.68rem; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase; text-align: left; white-space: nowrap;
        }
        .tr-tabela tbody tr { border-bottom: 1px solid #F8F9FA; }
        .tr-tabela tbody tr:hover { background: #FAFBFC; }
        .tr-tabela td { padding: 0.85rem 1rem; vertical-align: middle; color: #636E72; }
        .tr-tabela .tr-col-valor { text-align: right; }
        .tr-desc { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
        .tr-icone { width: 32px; height: 32px; background: rgba(39,174,96,0.08); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .tr-nome { font-weight: 600; color: #2D3436; font-size: 0.88rem; }
        .tr-data { white-space: nowrap; }
        .tr-valor { font-weight: 700; color: #27AE60; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .tr-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 0.7rem; font-weight: 700; border-radius: 6px; padding: 0.2rem 0.5rem; background: #F1F2F6; color: #7F8C8D; }
        .tr-badge.rec { background: rgba(200,164,90,0.12); color: #A8853F; }
        .tr-acoes { display: flex; gap: 0.25rem; justify-content: flex-end; }
        .tr-acoes button { background: none; border: none; color: #BDC3C7; cursor: pointer; padding: 0.35rem; border-radius: 6px; display: flex; }
        .tr-acoes button:hover { color: #C8A45A; background: #F8F9FA; }
        .tr-acoes button.del:hover { color: #E74C3C; }
        .tr-footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.9rem 1rem; border-top: 1px solid #F1F2F6; flex-wrap: wrap; }
        .tr-contagem { font-size: 0.78rem; color: #95A5A6; }
        .tr-subtotais { display: flex; gap: 1.5rem; }
        .tr-sub { display: flex; flex-direction: column; align-items: flex-end; }
        .tr-sub span { font-size: 0.65rem; color: #95A5A6; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .tr-sub strong { font-size: 0.9rem; color: #2D3436; font-variant-numeric: tabular-nums; }
        .tr-sub.destaque { border-left: 1px solid #F1F2F6; padding-left: 1.5rem; }
        .tr-sub.destaque strong { color: #27AE60; }
        @media (max-width: 640px) {
          .tr-col-cat, .tr-col-tipo { display: none; }
          .tr-subtotais { gap: 0.75rem; }
          .tr-sub.destaque { padding-left: 0.75rem; }
        }
      `}</style>
    </div>
  )
}
