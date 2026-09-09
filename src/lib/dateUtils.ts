// Utilidades de fecha para la grilla de calendario: semanas de lunes a
// domingo, incluyendo los días de fines de semana adyacentes que completan
// la primera/última semana del mes (mismo criterio que usaba la referencia
// BrandformanceOS en su PlanningView).

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function mondayOf(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay() // 0=domingo..6=sábado
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

/** Lunes de la semana actual — para prellenar campos de fecha en vez de dejarlos vacíos. */
export function currentWeekStart(): string {
  return toIsoDate(mondayOf(new Date()))
}

export interface CalendarWeek {
  weekStart: string // lunes, YYYY-MM-DD
  days: string[] // 7 fechas YYYY-MM-DD, lunes a domingo
}

/** monthKey: "2026-09" -> semanas completas (lun-dom) que tocan ese mes. */
export function getMonthWeeks(monthKey: string): CalendarWeek[] {
  const [year, month] = monthKey.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)

  const weeks: CalendarWeek[] = []
  let cursor = mondayOf(firstDay)
  const end = mondayOf(lastDay)

  while (cursor <= end) {
    const days: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor)
      d.setDate(d.getDate() + i)
      days.push(toIsoDate(d))
    }
    weeks.push({ weekStart: toIsoDate(cursor), days })
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() + 7)
  }
  return weeks
}

export function isoWeekNumber(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00')
  const target = new Date(date.valueOf())
  const dayNumber = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNumber + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const diff = target.valueOf() - firstThursday.valueOf()
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000))
}

export function isInMonth(dateStr: string, monthKey: string): boolean {
  return dateStr.startsWith(monthKey)
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export function weekdayLabel(index: number): string {
  return WEEKDAY_LABELS[index] ?? ''
}
