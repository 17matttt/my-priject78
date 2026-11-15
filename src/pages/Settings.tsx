import { useMemo, useRef, useState } from 'react'
import { useData } from '../context/DataContext'
import { CURRENCIES } from '../lib/constants'
import { downloadFile, formatDate, todayIso } from '../lib/format'
import { parseImport, serialize, transactionsToCsv } from '../lib/storage'
import { Icon } from '../components/Icon'
import { Badge, ConfirmDialog, Field, SectionHead, Toggle, useToast } from '../components/UI'

export default function Settings() {
  const { data, updateProfile, loadDemo, clearAll, importData } = useData()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(data.profile.name)
  const [confirm, setConfirm] = useState<'reset' | 'demo' | 'quit' | null>(null)

  const storageSize = useMemo(() => {
    const bytes = new Blob([serialize(data)]).size
    return bytes > 1024 ? `${(bytes / 1024).toFixed(1)} Ko` : `${bytes} o`
  }, [data])

  const counts = {
    transactions: data.transactions.length,
    goals: data.goals.length,
    subscriptions: data.subscriptions.length,
    budgets: data.budgets.length,
    events: data.events.length,
  }

  const exportCsv = () => {
    if (!data.transactions.length) {
      toast('Aucune transaction à exporter', 'warn')
      return
    }
    downloadFile(`vault-transactions-${todayIso()}.csv`, transactionsToCsv(data.transactions), 'text/csv;charset=utf-8')
    toast('Export CSV téléchargé')
  }

  const exportJson = () => {
    downloadFile(`vault-sauvegarde-${todayIso()}.json`, serialize(data), 'application/json')
    toast('Sauvegarde JSON téléchargée')
  }

  const onImport = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const next = parseImport(text)
      importData(next)
      setName(next.profile.name)
      toast('Sauvegarde importée')
    } catch {
      toast('Fichier invalide : sauvegarde JSON attendue', 'danger')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const confirmAction = () => {
    if (confirm === 'reset' || confirm === 'quit') {
      clearAll()
      setName('')
      toast(confirm === 'quit' ? 'Mode démonstration quitté' : 'Toutes les données ont été effacées')
    }
    if (confirm === 'demo') {
      loadDemo()
      toast('Données de démonstration chargées')
    }
    setConfirm(null)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Compte</p>
          <h1 className="page-title">Réglages</h1>
          <p className="page-sub">Profil, devise, confidentialité et gestion de vos données locales.</p>
        </div>
      </header>

      <section className="card">
        <SectionHead title="Profil" subtitle="Utilisé pour personnaliser votre espace" />
        <div className="settings-grid">
          <Field label="Nom affiché">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom"
              maxLength={40}
            />
          </Field>
          <div className="settings-inline">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                updateProfile({ name: name.trim() })
                toast('Profil mis à jour')
              }}
            >
              Enregistrer
            </button>
            <span className="muted">Aucun compte requis : ces informations restent sur cet appareil.</span>
          </div>
        </div>
      </section>

      <section className="card">
        <SectionHead title="Devise" subtitle="Tous les montants sont convertis à l’affichage" />
        <div className="settings-grid">
          <Field label="Devise principale" hint="EUR par défaut">
            <select
              className="select"
              value={data.profile.currency}
              onChange={(e) => {
                updateProfile({ currency: e.target.value })
                toast(`Devise : ${e.target.value}`)
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label} ({c.symbol})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="card">
        <SectionHead title="Confidentialité" subtitle="Masquez vos montants en un geste" />
        <div className="setting-row">
          <div>
            <span className="setting-title">Mode discret</span>
            <span className="muted">Remplace tous les montants par des puces à l’écran.</span>
          </div>
          <Toggle
            checked={data.profile.privacyMode}
            onChange={(value) => updateProfile({ privacyMode: value })}
            label="Activer le mode discret"
          />
        </div>
        <div className="setting-row">
          <div>
            <span className="setting-title">Stockage local uniquement</span>
            <span className="muted">
              Vos données ne quittent jamais ce navigateur. Elles sont conservées dans le stockage local du navigateur
              ({storageSize} actuellement).
            </span>
          </div>
          <Badge tone="ok">Local</Badge>
        </div>
      </section>

      <section className="card">
        <SectionHead title="Vos données" subtitle={`${counts.transactions} transactions · ${counts.goals} objectifs · ${counts.subscriptions} abonnements · ${counts.budgets} budgets · ${counts.events} événements`} />
        <div className="data-actions">
          <button type="button" className="btn btn-quiet" onClick={exportCsv}>
            <Icon name="download" size={15} />
            Exporter les transactions (CSV)
          </button>
          <button type="button" className="btn btn-quiet" onClick={exportJson}>
            <Icon name="download" size={15} />
            Sauvegarde complète (JSON)
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={15} />
            Importer une sauvegarde
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => onImport(e.target.files?.[0] ?? null)}
          />
        </div>
        <p className="hint">
          L’import remplace l’intégralité des données actuelles par le contenu du fichier. Exportez d’abord une
          sauvegarde si vous souhaitez conserver l’état actuel.
        </p>
      </section>

      <section className="card">
        <SectionHead
          title="Mode démonstration"
          subtitle="Des données d’exemple clairement identifiées pour découvrir l’application"
        />
        {data.demo ? (
          <div className="setting-row">
            <div>
              <span className="setting-title">
                Démonstration active <Badge tone="accent">Données fictives</Badge>
              </span>
              <span className="muted">
                Les montants affichés sont des exemples générés pour la visite guidée, pas vos données réelles.
              </span>
            </div>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirm('quit')}>
              Quitter la démo
            </button>
          </div>
        ) : (
          <div className="setting-row">
            <div>
              <span className="setting-title">Charger la démonstration</span>
              <span className="muted">Remplace vos données actuelles par un jeu d’exemple daté et cohérent.</span>
            </div>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirm('demo')}>
              Charger la démo
            </button>
          </div>
        )}
      </section>

      <section className="card danger-card">
        <SectionHead title="Zone sensible" subtitle="Ces actions sont définitives sur cet appareil" />
        <div className="setting-row">
          <div>
            <span className="setting-title">Réinitialiser toutes les données</span>
            <span className="muted">
              Supprime transactions, budgets, objectifs, abonnements et événements. Aucune récupération possible.
            </span>
          </div>
          <button type="button" className="btn btn-danger" onClick={() => setConfirm('reset')}>
            <Icon name="trash" size={15} />
            Tout effacer
          </button>
        </div>
      </section>

      <section className="card muted-card">
        <div className="about-row">
          <span className="brand-mark brand-mark-sm">V</span>
          <div>
            <strong>VAULT</strong>
            <p className="muted">
              YOUR MONEY. YOUR CONTROL. · Application locale, sans compte ni connexion bancaire. Dernière mise à jour
              des données : {formatDate(todayIso(), 'long')}.
            </p>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm === 'demo'
            ? 'Charger les données de démonstration ?'
            : confirm === 'quit'
              ? 'Quitter le mode démonstration ?'
              : 'Effacer toutes les données ?'
        }
        message={
          confirm === 'demo'
            ? 'Vos données actuelles seront remplacées par un jeu de données fictives clairement identifié.'
            : confirm === 'quit'
              ? 'Les données fictives seront supprimées afin de démarrer avec un espace vide et propre.'
              : 'Transactions, budgets, objectifs, abonnements et événements seront définitivement supprimés de cet appareil.'
        }
        confirmLabel={confirm === 'demo' ? 'Charger' : 'Confirmer'}
        tone="danger"
        onConfirm={confirmAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
