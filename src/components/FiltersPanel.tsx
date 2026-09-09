import { BRANDS, COUNTRIES, COUNTRY_LABELS, type Brand, type Country } from '../types'
import { useI18n } from '../i18n/I18nContext'

const CHANNELS = ['TV', 'Digital', 'Radio', 'Otro']

interface Props {
  brand: Brand
  country: Country
  channel: string
  onBrandChange: (b: Brand) => void
  onCountryChange: (c: Country) => void
  onChannelChange: (c: string) => void
}

/** Columna de filtros (0–15% del layout de escritorio; barra horizontal en mobile). */
export function FiltersPanel({ brand, country, channel, onBrandChange, onCountryChange, onChannelChange }: Props) {
  const { t } = useI18n()
  return (
    <aside className="filters-panel">
      <label className="filter-field">
        <span>{t('calendar.brand')}</span>
        <select value={brand} onChange={(e) => onBrandChange(e.target.value as Brand)}>
          {BRANDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span>{t('calendar.country')}</span>
        <select value={country} onChange={(e) => onCountryChange(e.target.value as Country)}>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {COUNTRY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
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
