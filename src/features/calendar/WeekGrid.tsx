import type { ReactNode } from 'react'
import type { CalendarWeek } from '../../lib/dateUtils'
import { isoWeekNumber } from '../../lib/dateUtils'

/**
 * Primitiva de alineación: el calendario de la izquierda y las columnas
 * semanales de la derecha usan EXACTAMENTE la misma estructura vertical
 * (encabezado fijo + una fila por semana con `flex:1`), así que las semanas
 * quedan a la misma altura en ambos lados sin ajustes a ojo.
 */
export function WeekGrid({
  weeks,
  headerLabel,
  renderWeek,
}: {
  weeks: CalendarWeek[]
  headerLabel: ReactNode
  renderWeek: (week: CalendarWeek, index: number) => ReactNode
}) {
  return (
    <div className="week-grid">
      <div className="aligned-weekhead">{headerLabel}</div>
      <div className="aligned-weeks">
        {weeks.map((week, i) => (
          <div className="aligned-week" key={week.weekStart}>
            <span className="aligned-week-tag">S{isoWeekNumber(week.weekStart)}</span>
            <div className="aligned-week-body">{renderWeek(week, i)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
