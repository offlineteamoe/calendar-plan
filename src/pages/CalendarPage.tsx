import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { usePresence } from '../hooks/usePresence'
import { useChanges } from '../hooks/useChanges'
import { useUndoRedo } from '../hooks/useUndoRedo'
import { useRole } from '../hooks/useRole'
import { useVersions } from '../hooks/useVersions'
import { AppHeader } from '../components/AppHeader'
import { CalendarGrid } from '../features/calendar/CalendarGrid'
import { CalendarScopeBar } from '../features/calendar/CalendarScopeBar'
import { VersionMetaModal } from '../features/calendar/VersionMetaModal'
import { PasswordConfirmModal } from '../components/PasswordConfirmModal'
import { FiltersPanel } from '../features/calendar/FiltersPanel'
import { SidePanel } from '../features/calendar/SidePanel'
import { applyChangeState } from '../lib/changelog'
import {
  createVersionFrom,
  deleteVersion,
  getMonth,
  setVersionStatus,
  updateVersionMeta,
  versionLabel,
  type Scope,
} from '../lib/store'
import { getMonthWeeks } from '../lib/dateUtils'
import {
  BRANDS,
  CHANNELS,
  COUNTRIES,
  COUNTRY_LABELS,
  LATAM_PARTS,
  type Brand,
  type ChangeRecord,
  type Country,
  type VersionEntry,
} from '../types'

type MobileTab = 'calendar' | 'detail'

export function CalendarPage() {
  const { monthKey = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const { canEdit } = useRole()
  const queryClient = useQueryClient()

  const [brand, setBrand] = useState<Brand>(BRANDS[0])
  const [country, setCountry] = useState<Country>(COUNTRIES[0])
  const [channel, setChannel] = useState<string>(CHANNELS[0])
  const [versionId, setVersionId] = useState<string | null>(null)
  const [latamView, setLatamView] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('calendar')
  // Crear una versión pide nombre y descripción antes de copiarla; editar y
  // eliminar actúan sobre la que se elija en el menú, no solo sobre la abierta.
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [editingVersion, setEditingVersion] = useState<VersionEntry | null>(null)
  const [deletingVersion, setDeletingVersion] = useState<VersionEntry | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const monthQuery = useQuery({ queryKey: ['month', monthKey], queryFn: () => getMonth(monthKey), enabled: !!monthKey })
  // En vivo: si otra persona aprueba o devuelve a maybe un calendario, se ve
  // aquí sin recargar.
  const { versions } = useVersions(monthKey, brand, country)
  const version: VersionEntry | null = useMemo(() => {
    if (versions.length === 0) return null
    return versions.find((v) => v.version_id === versionId) ?? versions[versions.length - 1]
  }, [versions, versionId])

  // Cada calendario tiene sus propias versiones: al cambiar de marca o región
  // hay que soltar la que estaba abierta y caer en la última de la nueva.
  useEffect(() => {
    setVersionId(null)
  }, [brand, country])

  // Fuera de las regiones que componen LATAM, la vista agregada no aplica.
  useEffect(() => {
    if (!LATAM_PARTS.includes(country)) setLatamView(false)
  }, [country])

  const weeks = useMemo(() => getMonthWeeks(monthKey), [monthKey])

  const monthLabel = useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number)
    if (!y || !m) return monthKey
    const label = new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [monthKey, locale])

  const scope: Scope | null = version ? { versionId: version.version_id, brand, country } : null

  const whereLabel = `${monthLabel} · ${version?.letter ?? '—'} · ${brand} · ${
    latamView ? 'LATAM' : COUNTRY_LABELS[country]
  }`

  const presence = usePresence(
    monthKey,
    user ? { uid: user.uid, name: user.name, email: user.email, initials: user.initials } : null,
    whereLabel,
  ).filter((p) => p.uid !== user?.uid)

  // Un usuario de consulta solo recibe su propio rastro (ver useChanges), así
  // que no le llega la señal de "otra persona guardó algo". Para que no vea
  // datos viejos, sus consultas se refrescan solas cada minuto.
  const changes = useChanges(monthKey, { email: user?.email ?? '', isAdmin: canEdit })
  const lastForeignChange = changes.find((c) => c.user_email !== user?.email)?.change_id ?? null
  const myChanges = useMemo(() => changes.filter((c) => c.user_email === user?.email), [changes, user?.email])

  const refreshData = useCallback(() => {
    for (const key of ['plan', 'notas', 'escenarios', 'results', 'creative']) {
      void queryClient.invalidateQueries({ queryKey: [key, monthKey] })
    }
  }, [queryClient, monthKey])

  const author = useMemo(
    () => ({ email: user?.email ?? '', initials: user?.initials ?? '' }),
    [user?.email, user?.initials],
  )
  const undoRedo = useUndoRedo({ myEmail: user?.email ?? '', author, changes, onApplied: refreshData })

  const revertTo = useCallback(
    async (change: ChangeRecord) => {
      await applyChangeState(change, 'undo', author)
      refreshData()
    },
    [author, refreshData],
  )

  const status = version?.status ?? 'maybe'

  useEffect(() => {
    if (!lastForeignChange) return
    refreshData()
  }, [lastForeignChange, refreshData])

  const statusMutation = useMutation({
    mutationFn: () => {
      if (!version || !scope) throw new Error('sin version')
      return setVersionStatus(monthKey, version, scope, status === 'approved' ? 'maybe' : 'approved', author)
    },
  })

  const newVersionMutation = useMutation({
    mutationFn: (meta: { name: string; description: string }) => {
      if (!version) throw new Error('sin version')
      return createVersionFrom(monthKey, version, author, meta)
    },
    onSuccess: (created) => {
      setCreatingVersion(false)
      setVersionId(created.version_id)
      refreshData()
    },
  })

  const editVersionMutation = useMutation({
    mutationFn: (input: { version: VersionEntry; meta: { name: string; description: string } }) =>
      updateVersionMeta(monthKey, input.version, input.meta, author),
    onSuccess: () => setEditingVersion(null),
  })

  const deleteVersionMutation = useMutation({
    mutationFn: (target: VersionEntry) => deleteVersion(monthKey, target, author),
    onSuccess: (_data, target) => {
      setDeletingVersion(null)
      // Si borraste la que tenías abierta, cae en la primera que quede.
      if (target.version_id === versionId) setVersionId(null)
      refreshData()
    },
  })

  const nextLetter =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((l) => !versions.some((v) => v.letter === l)) ?? '?'

  if (monthQuery.isSuccess && !monthQuery.data) {
    return (
      <div className="shell">
        <AppHeader />
        <div className="centered">
          <div className="card" style={{ padding: 28, textAlign: 'center' }}>
            <h2>{t('notFound.title')}</h2>
            <Link to="/" className="btn btn-secondary" style={{ marginTop: 14, display: 'inline-flex' }}>
              {t('notFound.back')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <AppHeader
        start={
          <>
            <button className="btn-link header-back" onClick={() => navigate('/')}>
              ← {t('header.backToMonths')}
            </button>
            <span className="header-divider" />
            <span className="header-title">{monthLabel}</span>
          </>
        }
        presenceUsers={presence}
        monthKey={monthKey}
        myChanges={myChanges}
        onRevert={revertTo}
        undoRedo={undoRedo}
      />

      <div className="mobile-switch">
        <button className={mobileTab === 'calendar' ? 'is-active' : ''} onClick={() => setMobileTab('calendar')}>
          {t('mobile.calendarTab')}
        </button>
        <button className={mobileTab === 'detail' ? 'is-active' : ''} onClick={() => setMobileTab('detail')}>
          {t('mobile.detailTab')}
        </button>
      </div>

      <div className={`calendar-layout ${collapsed ? 'is-collapsed' : ''}`}>
        <div className="col">
          <FiltersPanel
            brand={brand}
            country={country}
            channel={channel}
            onBrandChange={setBrand}
            onCountryChange={setCountry}
            onChannelChange={setChannel}
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((v) => !v)}
          />
        </div>

        <div className={`col ${mobileTab === 'calendar' ? '' : 'is-mobile-hidden'}`}>
          <div className="panel">
            {version && scope ? (
              <>
                <CalendarScopeBar
                  brand={brand}
                  country={country}
                  channel={channel}
                  versions={versions}
                  version={version}
                  status={status}
                  onSelectVersion={(v) => setVersionId(v.version_id)}
                  onToggleStatus={() => statusMutation.mutate()}
                  onCreateVersion={() => setCreatingVersion(true)}
                  onEditVersion={(v) => setEditingVersion(v)}
                  onDeleteVersion={(v) => setDeletingVersion(v)}
                  creatingVersion={newVersionMutation.isPending}
                  latamView={latamView}
                  onToggleLatamView={() => setLatamView((v) => !v)}
                  latamAvailable={LATAM_PARTS.includes(country)}
                />
                <CalendarGrid
                  monthKey={monthKey}
                  scope={scope}
                  version={version}
                  channel={channel}
                  onChannelChange={setChannel}
                  latamView={latamView}
                />
              </>
            ) : (
              <div className="panel-body">
                <p className="muted">{t('common.loading')}</p>
              </div>
            )}
          </div>
        </div>

        <div className={`col ${mobileTab === 'detail' ? '' : 'is-mobile-hidden'}`}>
          {version && scope ? (
            <SidePanel monthKey={monthKey} scope={scope} version={version} weeks={weeks} latamView={latamView} />
          ) : (
            <aside className="panel">
              <div className="panel-body">
                <p className="muted">{t('common.loading')}</p>
              </div>
            </aside>
          )}
        </div>
      </div>

      {creatingVersion && version && (
        <VersionMetaModal
          letter={nextLetter}
          copiedFrom={version.letter}
          isPending={newVersionMutation.isPending}
          errorMessage={newVersionMutation.isError ? (newVersionMutation.error as Error).message : undefined}
          onSubmit={(meta) => newVersionMutation.mutate(meta)}
          onClose={() => setCreatingVersion(false)}
        />
      )}

      {editingVersion && (
        <VersionMetaModal
          letter={editingVersion.letter}
          initialName={editingVersion.name ?? ''}
          initialDescription={editingVersion.description ?? ''}
          isPending={editVersionMutation.isPending}
          errorMessage={editVersionMutation.isError ? (editVersionMutation.error as Error).message : undefined}
          onSubmit={(meta) => editVersionMutation.mutate({ version: editingVersion, meta })}
          onClose={() => setEditingVersion(null)}
        />
      )}

      {deletingVersion && (
        <PasswordConfirmModal
          title={t('version.deleteTitle', { letter: deletingVersion.letter })}
          warning={t('version.deleteWarning', { version: versionLabel(deletingVersion) })}
          confirmLabel={t('common.delete')}
          isPending={deleteVersionMutation.isPending}
          errorMessage={deleteVersionMutation.isError ? (deleteVersionMutation.error as Error).message : undefined}
          onConfirmed={() => deleteVersionMutation.mutate(deletingVersion)}
          onClose={() => setDeletingVersion(null)}
        />
      )}
    </div>
  )
}
