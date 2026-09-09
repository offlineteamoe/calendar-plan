import { BRANDS, CHANNELS, COUNTRIES, COUNTRY_LABELS, type Brand, type Country } from '../../types'
import { useI18n } from '../../i18n/I18nContext'

interface Props {
  brand: Brand
  country: Country
  channel: string
  onBrandChange: (b: Brand) => void
  onCountryChange: (c: Country) => void
  onChannelChange: (c: string) => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

/** Columna de filtros (15% del layout). Se puede encoger a una franja angosta. */
export function FiltersPanel({
  brand,
  country,
  channel,
  onBrandChange,
  onCountryChange,
  onChannelChange,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const { t } = useI18n()

  if (collapsed) {
    return (
      <aside className="panel filters filters-collapsed">
        <button className="icon-btn" onClick={onToggleCollapsed} title={t('calendar.expandFilters')}>
          »
        </button>
        <span className="filters-rail-icon">{t('calendar.filters')}</span>
      </aside>
    )
  }

  return (
    <aside className="panel filters">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>{t('calendar.filters')}</h3>
        <button className="icon-btn" onClick={onToggleCollapsed} title={t('calendar.collapseFilters')}>
          «
        </button>
      </div>

      <label className="field">
        <span>{t('calendar.brand')}</span>
        <select value={brand} onChange={(e) => onBrandChange(e.target.value as Brand)}>
          {BRANDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>{t('calendar.country')}</span>
        <select value={country} onChange={(e) => onCountryChange(e.target.value as Country)}>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {COUNTRY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>{t('calendar.channel')}</span>
        <select value={channel} onChange={(e) => onChannelChange(e.target.value)}>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </aside>
  )
}
