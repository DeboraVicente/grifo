import { useEffect, useState } from 'react'

/** Largura abaixo da qual as tabelas viram lista de cards. */
export const BREAKPOINT_MOBILE = 700

const consulta = `(max-width: ${BREAKPOINT_MOBILE}px)`

/** true quando a tela é de celular; acompanha giro de tela e redimensionamento. */
export function useEhMobile(): boolean {
  const [ehMobile, setEhMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(consulta).matches)

  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const atualizar = () => setEhMobile(mq.matches)
    atualizar()
    mq.addEventListener('change', atualizar)
    return () => mq.removeEventListener('change', atualizar)
  }, [])

  return ehMobile
}

/** Título de grupo por dia: "Hoje", "Amanhã", "Ontem" ou "qua, 12 nov". */
export function rotuloDia(iso: string): string {
  const alvo = new Date(iso + 'T12:00:00')
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0)
  const diff = Math.round((alvo.getTime() - hoje.getTime()) / 86400000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  if (diff === -1) return 'Ontem'
  return alvo.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, '')
}

/** Agrupa itens por dia (ISO yyyy-mm-dd), mantendo a ordem de entrada. */
export function agruparPorDia<T>(itens: T[], dia: (t: T) => string): [string, T[]][] {
  const mapa = new Map<string, T[]>()
  for (const t of itens) {
    const k = dia(t)
    const lista = mapa.get(k)
    if (lista) lista.push(t)
    else mapa.set(k, [t])
  }
  return [...mapa.entries()]
}
