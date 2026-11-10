import type { GastoPrevisto } from '../types'

export type StatusPrevisto = 'atrasado' | 'chegando' | 'em-dia'

export const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Data local (sem fuso) no formato YYYY-MM-DD */
export function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function paraData(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

/** Soma meses sem "pular" mês: 31/jan + 1 mês = 28/fev (ou 29) */
export function somarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const alvo = new Date(a, m - 1 + meses, 1)
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  alvo.setDate(Math.min(d, ultimoDia))
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`
}

export function diasAte(iso: string): number {
  const hoje = paraData(hojeISO())
  return Math.round((paraData(iso).getTime() - hoje.getTime()) / 86_400_000)
}

/** Quantos meses de reserva ainda cabem até a data (contando o mês atual). */
export function mesesParaReservar(iso: string): number {
  const hoje = new Date()
  const alvo = paraData(iso)
  const meses = (alvo.getFullYear() - hoje.getFullYear()) * 12 + (alvo.getMonth() - hoje.getMonth())
  return Math.max(1, meses)
}

const mesAtual = () => hojeISO().slice(0, 7)

/** Quanto já foi reservado neste mês */
export function reservadoNoMes(g: GastoPrevisto): number {
  const mes = mesAtual()
  return g.historico
    .filter((m) => m.tipo === 'reserva' && m.data.startsWith(mes))
    .reduce((s, m) => s + m.valor, 0)
}

export interface ResumoPrevisto {
  status: StatusPrevisto
  dias: number
  falta: number
  reservaMensal: number
  pendenteNoMes: number
  progresso: number
}

export function resumir(g: GastoPrevisto): ResumoPrevisto {
  const dias = diasAte(g.proximaData)
  const status: StatusPrevisto = dias < 0 ? 'atrasado' : dias <= g.avisarDiasAntes ? 'chegando' : 'em-dia'
  const falta = Math.max(0, g.valorEstimado - g.valorReservado)

  // A parcela do mês é calculada sobre o que faltava no início do mês,
  // para que reservar não "mude a meta" do próprio mês.
  const doMes = reservadoNoMes(g)
  const faltavaNoInicio = Math.max(0, g.valorEstimado - (g.valorReservado - doMes))
  const reservaMensal = faltavaNoInicio / mesesParaReservar(g.proximaData)
  const pendenteNoMes = falta <= 0 ? 0 : Math.max(0, Math.min(falta, reservaMensal - doMes))

  const progresso = g.valorEstimado > 0 ? Math.min(100, (g.valorReservado / g.valorEstimado) * 100) : 0
  return { status, dias, falta, reservaMensal, pendenteNoMes, progresso }
}

export function precisaAtencao(g: GastoPrevisto): boolean {
  const r = resumir(g)
  return r.status !== 'em-dia' || r.pendenteNoMes >= 0.01
}

export function descreverPrazo(dias: number): string {
  if (dias < -1) return `atrasado há ${-dias} dias`
  if (dias === -1) return 'era para ontem'
  if (dias === 0) return 'é hoje'
  if (dias === 1) return 'amanhã'
  if (dias < 60) return `em ${dias} dias`
  const meses = Math.round(dias / 30)
  return `em ~${meses} meses`
}

export function descreverIntervalo(meses: number): string {
  if (meses === 1) return 'todo mês'
  if (meses === 12) return 'todo ano'
  if (meses % 12 === 0) return `a cada ${meses / 12} anos`
  return `a cada ${meses} meses`
}

// ─── Calendário (.ics) ───────────────────────────────────────────────────────
// Funciona sem servidor: o celular importa o evento com alarme na agenda nativa.

const icsData = (iso: string) => iso.replace(/-/g, '')
const icsTexto = (t: string) => t.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
const carimbo = () => new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

export function gerarICS(g: GastoPrevisto): string {
  const r = resumir(g)
  const fimDia = icsData(somarMeses(g.proximaData, 0))
  const diaSeguinte = (() => {
    const d = paraData(g.proximaData); d.setDate(d.getDate() + 1)
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  })()

  // Lembrete mensal de reservar: dia 5 de cada mês até a data do gasto
  const inicioReserva = (() => {
    const d = new Date(); const alvo = new Date(d.getFullYear(), d.getMonth() + (d.getDate() > 5 ? 1 : 0), 5)
    return `${alvo.getFullYear()}${String(alvo.getMonth() + 1).padStart(2, '0')}05`
  })()

  const linhas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Grifo//Gastos previstos//PT-BR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:grifo-previsto-${g.id}@grifo`,
    `DTSTAMP:${carimbo()}`,
    `DTSTART;VALUE=DATE:${fimDia}`,
    `DTEND;VALUE=DATE:${diaSeguinte}`,
    `SUMMARY:${icsTexto(`🔧 ${g.nome}`)}`,
    `DESCRIPTION:${icsTexto(`Gasto previsto no Grifo: ${fmtBRL(g.valorEstimado)} (${descreverIntervalo(g.intervaloMeses)}).`)}`,
    `RRULE:FREQ=MONTHLY;INTERVAL=${g.intervaloMeses}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsTexto(`${g.nome} chegando`)}`, `TRIGGER:-P${g.avisarDiasAntes}D`, 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsTexto(`Hoje: ${g.nome}`)}`, 'TRIGGER:PT9H', 'END:VALARM',
    'END:VEVENT',
  ]

  if (r.falta > 0) {
    linhas.push(
      'BEGIN:VEVENT',
      `UID:grifo-reserva-${g.id}@grifo`,
      `DTSTAMP:${carimbo()}`,
      `DTSTART;VALUE=DATE:${inicioReserva}`,
      `SUMMARY:${icsTexto(`💰 Reservar para ${g.nome}`)}`,
      `DESCRIPTION:${icsTexto(`Separar cerca de ${fmtBRL(r.reservaMensal)} este mês. Registre no Grifo em Caixinhas → Previstos.`)}`,
      `RRULE:FREQ=MONTHLY;UNTIL=${fimDia}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsTexto(`Reservar para ${g.nome}`)}`, 'TRIGGER:PT9H', 'END:VALARM',
      'END:VEVENT',
    )
  }

  linhas.push('END:VCALENDAR')
  return linhas.join('\r\n')
}

export function baixarICS(g: GastoPrevisto) {
  const blob = new Blob([gerarICS(g)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `grifo-${g.nome.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-')}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
