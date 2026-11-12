import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import Modal from './Modal'

export interface AcaoItem {
  label: string
  icone?: ReactNode
  onClick: () => void
  /** primaria = destaque dourado; perigo = vermelho */
  tom?: 'primaria' | 'perigo' | 'neutra'
}

export interface ItemLista {
  id: string
  icone?: ReactNode
  /** Cor de fundo do quadradinho do ícone */
  iconeFundo?: string
  titulo: string
  /** Etiquetas ao lado/abaixo do título (escopo, parte etc.) */
  etiquetas?: ReactNode
  /** Linha cinza com os detalhes curtos, ex.: ["Nubank", "12/11", "03/10"] */
  detalhes?: (string | false | null | undefined)[]
  valor?: ReactNode
  valorClasse?: string
  /** Badge pequeno abaixo do valor (status) */
  status?: ReactNode
  /** Conteúdo extra embaixo (ex.: barra de progresso) */
  extra?: ReactNode
  /** Linha concluída/paga: aparece esmaecida */
  esmaecido?: boolean
  /** Ação de um toque direto no card (ex.: Pagar) */
  acaoRapida?: AcaoItem
  /** Pares rótulo/valor mostrados no bottom sheet */
  ficha?: { label: string; valor: ReactNode }[]
  acoes?: AcaoItem[]
  /** Abre um diálogo próprio de detalhes (no lugar do bottom sheet padrão) */
  onAbrir?: () => void
}

export interface GrupoLista {
  titulo?: string
  /** Texto à direita do título do grupo (ex.: total do dia) */
  resumo?: ReactNode
  itens: ItemLista[]
}

interface Props {
  grupos: GrupoLista[]
  vazio?: ReactNode
}

/**
 * Lista de cards para celular, usada no lugar das tabelas.
 * Tocar no card abre um bottom sheet com a ficha completa e ações grandes.
 */
export default function ListaMobile({ grupos, vazio }: Props) {
  const [aberto, setAberto] = useState<ItemLista | null>(null)
  const total = grupos.reduce((s, g) => s + g.itens.length, 0)

  if (total === 0) return <div className="lm-vazio">{vazio ?? 'Nada por aqui.'}</div>

  const executar = (a: AcaoItem) => { setAberto(null); a.onClick() }

  return (
    <div className="lm">
      {grupos.filter(g => g.itens.length > 0).map((g, gi) => (
        <section key={g.titulo ?? gi} className="lm-grupo">
          {g.titulo && (
            <header className="lm-grupo-titulo">
              <span>{g.titulo}</span>
              {g.resumo && <span className="lm-grupo-resumo">{g.resumo}</span>}
            </header>
          )}
          <ul className="lm-lista">
            {g.itens.map(item => {
              const detalhes = (item.detalhes ?? []).filter(Boolean)
              const temSheet = !!item.onAbrir || (item.acoes?.length ?? 0) > 0 || (item.ficha?.length ?? 0) > 0
              return (
                <li key={item.id} className={`lm-item ${item.esmaecido ? 'esmaecido' : ''}`}>
                  <button
                    type="button"
                    className="lm-card"
                    onClick={() => item.onAbrir ? item.onAbrir() : temSheet && setAberto(item)}
                    aria-label={temSheet ? `Abrir ${item.titulo}` : undefined}
                    disabled={!temSheet}
                  >
                    {item.icone && (
                      <span className="lm-icone" style={item.iconeFundo ? { background: item.iconeFundo } : undefined}>
                        {item.icone}
                      </span>
                    )}
                    <span className="lm-corpo">
                      <span className="lm-linha1">
                        <span className="lm-titulo">{item.titulo}</span>
                        {item.valor !== undefined && <span className={`lm-valor ${item.valorClasse ?? ''}`}>{item.valor}</span>}
                      </span>
                      <span className="lm-linha2">
                        <span className="lm-detalhes">
                          {item.etiquetas}
                          {detalhes.length > 0 && <span className="lm-det-txt">{detalhes.join(' · ')}</span>}
                        </span>
                        {item.status}
                      </span>
                      {item.extra && <span className="lm-extra">{item.extra}</span>}
                    </span>
                    {temSheet && !item.acaoRapida && <ChevronRight size={16} className="lm-seta" aria-hidden="true" />}
                  </button>
                  {item.acaoRapida && (
                    <button
                      type="button"
                      className={`lm-rapida ${item.acaoRapida.tom ?? 'primaria'}`}
                      onClick={item.acaoRapida.onClick}
                      aria-label={`${item.acaoRapida.label} ${item.titulo}`}
                    >
                      {item.acaoRapida.icone}
                      <span>{item.acaoRapida.label}</span>
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {aberto && (
        <Modal titulo={aberto.titulo} onFechar={() => setAberto(null)}>
          {(aberto.valor !== undefined || aberto.status) && (
            <div className="lm-sheet-topo">
              {aberto.valor !== undefined && <span className={`lm-sheet-valor ${aberto.valorClasse ?? ''}`}>{aberto.valor}</span>}
              {aberto.status}
            </div>
          )}
          {aberto.ficha && aberto.ficha.length > 0 && (
            <dl className="lm-ficha">
              {aberto.ficha.map(f => (
                <div key={f.label} className="lm-ficha-linha">
                  <dt>{f.label}</dt>
                  <dd>{f.valor}</dd>
                </div>
              ))}
            </dl>
          )}
          {aberto.acoes && aberto.acoes.length > 0 && (
            <div className="lm-sheet-acoes">
              {aberto.acoes.map(a => (
                <button key={a.label} type="button" className={`lm-sheet-btn ${a.tom ?? 'neutra'}`} onClick={() => executar(a)}>
                  {a.icone}<span>{a.label}</span>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      <style>{`
        .lm { display: flex; flex-direction: column; gap: 1rem; }
        .lm-vazio { text-align: center; color: #95A5A6; font-size: 0.88rem; padding: 3rem 1rem; line-height: 1.6; }
        .lm-grupo { display: flex; flex-direction: column; gap: 0.4rem; }
        .lm-grupo-titulo {
          display: flex; justify-content: space-between; align-items: baseline;
          padding: 0 0.25rem; font-size: 0.72rem; font-weight: 700; color: #95A5A6;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .lm-grupo-resumo { font-variant-numeric: tabular-nums; text-transform: none; letter-spacing: 0; }
        .lm-lista {
          list-style: none; margin: 0; padding: 0;
          background: #fff; border: 1px solid #F1F2F6; border-radius: 16px; overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .lm-item { display: flex; align-items: center; border-bottom: 1px solid #F4F5F8; }
        .lm-item:last-child { border-bottom: none; }
        .lm-item.esmaecido .lm-card { opacity: 0.55; }
        .lm-card {
          flex: 1; min-width: 0; display: flex; align-items: center; gap: 0.75rem;
          background: none; border: none; text-align: left; font-family: inherit; color: inherit;
          padding: 0.8rem 0.9rem; min-height: 64px; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .lm-card:disabled { cursor: default; }
        .lm-card:not(:disabled):active { background: #F8F9FA; }
        .lm-icone {
          width: 40px; height: 40px; border-radius: 12px; background: #F4F5F8;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .lm-corpo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .lm-linha1, .lm-linha2 { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .lm-titulo {
          font-weight: 600; color: #2D3436; font-size: 0.92rem;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
        }
        .lm-valor { font-weight: 700; color: #2D3436; font-size: 0.92rem; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .lm-valor.riscado { text-decoration: line-through; color: #95A5A6; }
        .lm-valor.positivo { color: #27AE60; }
        .lm-detalhes { display: flex; align-items: center; gap: 0.35rem; min-width: 0; overflow: hidden; }
        .lm-det-txt { font-size: 0.76rem; color: #95A5A6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lm-linha2 > :last-child:not(.lm-detalhes) { flex-shrink: 0; }
        .lm-extra { display: block; margin-top: 4px; }
        .lm-seta { color: #CED6E0; flex-shrink: 0; }
        .lm-rapida {
          display: inline-flex; align-items: center; justify-content: center; gap: 4px;
          min-width: 64px; min-height: 40px; margin-right: 0.75rem; padding: 0 0.75rem;
          border: none; border-radius: 10px; font-family: inherit; font-size: 0.78rem; font-weight: 700;
          cursor: pointer; flex-shrink: 0;
        }
        .lm-rapida.primaria { background: rgba(200,164,90,0.14); color: #A8853F; }
        .lm-rapida.neutra { background: #F1F2F6; color: #636E72; }
        .lm-rapida.perigo { background: rgba(231,76,60,0.1); color: #C0392B; }
        .lm-rapida:active { filter: brightness(0.95); }

        .lm-sheet-topo { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; }
        .lm-sheet-valor { font-size: 1.6rem; font-weight: 800; color: #2D3436; font-variant-numeric: tabular-nums; }
        .lm-sheet-valor.riscado { text-decoration: line-through; color: #95A5A6; }
        .lm-sheet-valor.positivo { color: #27AE60; }
        .lm-ficha { margin: 0 0 1.25rem; display: flex; flex-direction: column; }
        .lm-ficha-linha { display: flex; justify-content: space-between; gap: 1rem; padding: 0.7rem 0; border-bottom: 1px solid #F4F5F8; }
        .lm-ficha-linha:last-child { border-bottom: none; }
        .lm-ficha dt { color: #95A5A6; font-size: 0.82rem; }
        .lm-ficha dd { margin: 0; color: #2D3436; font-size: 0.85rem; font-weight: 600; text-align: right; }
        .lm-sheet-acoes { display: flex; flex-direction: column; gap: 0.5rem; }
        .lm-sheet-btn {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          min-height: 48px; border-radius: 12px; border: none; font-family: inherit;
          font-size: 0.92rem; font-weight: 700; cursor: pointer;
        }
        .lm-sheet-btn.primaria { background: #C8A45A; color: #fff; }
        .lm-sheet-btn.neutra { background: #F1F2F6; color: #2D3436; }
        .lm-sheet-btn.perigo { background: rgba(231,76,60,0.08); color: #C0392B; }
      `}</style>
    </div>
  )
}

/** Barra de totais fixa no topo da lista mobile. */
export function ResumoMobile({ itens }: { itens: { label: string; valor: ReactNode; cor?: string; destaque?: boolean }[] }) {
  return (
    <div className="rm">
      {itens.map(i => (
        <div key={i.label} className={`rm-item ${i.destaque ? 'destaque' : ''}`}>
          <span className="rm-label">{i.label}</span>
          <strong className="rm-valor" style={i.cor ? { color: i.cor } : undefined}>{i.valor}</strong>
        </div>
      ))}
      <style>{`
        .rm {
          display: grid; grid-template-columns: repeat(${itens.length}, minmax(0, 1fr)); gap: 0.5rem;
          background: #fff; border: 1px solid #F1F2F6; border-radius: 14px; padding: 0.7rem 0.85rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .rm-item { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .rm-item.destaque { border-left: 1px solid #F1F2F6; padding-left: 0.6rem; }
        .rm-label { font-size: 0.62rem; color: #95A5A6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rm-valor { font-size: 0.88rem; color: #2D3436; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rm-item.destaque .rm-valor { font-size: 0.95rem; font-weight: 900; }
      `}</style>
    </div>
  )
}
