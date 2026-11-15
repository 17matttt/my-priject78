import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { formatDate, parseAmount, todayIso } from '../lib/format'
import { Icon } from '../components/Icon'
import { Field, Segmented } from '../components/UI'

type ToolId = 'savings' | 'compound' | 'planner' | 'afford' | 'simulator'

const TOOLS: { id: ToolId; label: string; title: string; text: string }[] = [
  {
    id: 'savings',
    label: 'Épargne',
    title: 'Calculateur d’épargne',
    text: 'Capital de départ, versement mensuel et intérêts composés.',
  },
  {
    id: 'compound',
    label: 'Intérêts composés',
    title: 'Intérêts composés',
    text: 'Comparez l’effet de la fréquence de capitalisation.',
  },
  {
    id: 'planner',
    label: 'Budget',
    title: 'Planificateur mensuel',
    text: 'Répartissez votre revenu net entre besoins, envies et épargne.',
  },
  {
    id: 'afford',
    label: 'Capacité',
    title: 'Capacité d’achat',
    text: 'Estimez la mensualité maximale et le prix finançable.',
  },
  {
    id: 'simulator',
    label: 'Objectif',
    title: 'Simulateur d’objectif',
    text: 'Combien de temps pour atteindre votre montant cible ?',
  },
]

function n(value: string): number {
  return parseAmount(value)
}

function Result({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className={`result-cell ${strong ? 'result-strong' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="result-value tnum">{value}</span>
      {hint ? <span className="muted result-hint">{hint}</span> : null}
    </div>
  )
}

export default function Tools() {
  const { money, data } = useData()
  const [tool, setTool] = useState<ToolId>('savings')

  // A. Épargne
  const [initial, setInitial] = useState('1000')
  const [monthly, setMonthly] = useState('200')
  const [rate, setRate] = useState('4')
  const [years, setYears] = useState('10')

  // B. Intérêts composés
  const [cInitial, setCInitial] = useState('5000')
  const [cRate, setCRate] = useState('5')
  const [cYears, setCYears] = useState('15')
  const [freq, setFreq] = useState('12')

  // C. Planificateur
  const [income, setIncome] = useState('2500')
  const [needsPct, setNeedsPct] = useState('50')
  const [wantsPct, setWantsPct] = useState('30')
  const [savePct, setSavePct] = useState('20')

  // D. Capacité d'achat
  const [netIncome, setNetIncome] = useState('2800')
  const [charges, setCharges] = useState('600')
  const [debtRate, setDebtRate] = useState('35')
  const [loanRate, setLoanRate] = useState('3.5')
  const [loanYears, setLoanYears] = useState('20')

  // E. Simulateur
  const [target, setTarget] = useState('20000')
  const [already, setAlready] = useState('3000')
  const [contribution, setContribution] = useState('400')
  const [simRate, setSimRate] = useState('3')

  const savings = useMemo(() => {
    const p = n(initial)
    const pmt = n(monthly)
    const r = n(rate) / 100 / 12
    const months = Math.max(0, Math.round(n(years) * 12))
    let future: number
    if (r === 0) future = p + pmt * months
    else future = p * Math.pow(1 + r, months) + pmt * ((Math.pow(1 + r, months) - 1) / r)
    const contributed = p + pmt * months
    return { future, contributed, interest: future - contributed, months }
  }, [initial, monthly, rate, years])

  const compound = useMemo(() => {
    const p = n(cInitial)
    const r = n(cRate) / 100
    const y = Math.max(0, n(cYears))
    const m = Math.max(1, n(freq))
    const future = p * Math.pow(1 + r / m, m * y)
    const simple = p * (1 + r * y)
    return { future, interest: future - p, simple, advantage: future - simple }
  }, [cInitial, cRate, cYears, freq])

  const planner = useMemo(() => {
    const total = n(income)
    const needs = (total * n(needsPct)) / 100
    const wants = (total * n(wantsPct)) / 100
    const save = (total * n(savePct)) / 100
    const sum = n(needsPct) + n(wantsPct) + n(savePct)
    return { total, needs, wants, save, sum }
  }, [income, needsPct, wantsPct, savePct])

  const afford = useMemo(() => {
    const incomeValue = n(netIncome)
    const chargeValue = n(charges)
    const maxPayment = Math.max(0, (incomeValue * n(debtRate)) / 100 - chargeValue)
    const monthlyRate = n(loanRate) / 100 / 12
    const months = Math.max(1, Math.round(n(loanYears) * 12))
    let capacity: number
    if (monthlyRate === 0) capacity = maxPayment * months
    else capacity = maxPayment * ((1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate)
    return { maxPayment, capacity, months, totalPaid: maxPayment * months }
  }, [netIncome, charges, debtRate, loanRate, loanYears])

  const simulator = useMemo(() => {
    const goal = n(target)
    const start = n(already)
    const pmt = n(contribution)
    const r = n(simRate) / 100 / 12
    const remaining = Math.max(0, goal - start)
    let months = 0
    if (remaining === 0) months = 0
    else if (pmt <= 0 && r <= 0) months = Infinity
    else {
      let balance = start
      let guard = 0
      while (balance < goal && guard < 1200) {
        balance = balance * (1 + r) + pmt
        months++
        guard++
      }
      if (balance < goal) months = Infinity
    }
    const date = Number.isFinite(months)
      ? new Date(new Date(todayIso()).getTime() + months * 30.44 * 86400000)
      : null
    const isoDate = date ? date.toISOString().slice(0, 10) : null
    return { months, date: isoDate, remaining }
  }, [target, already, contribution, simRate])

  const active = TOOLS.find((t) => t.id === tool)!

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Simulations</p>
          <h1 className="page-title">Outils financiers</h1>
          <p className="page-sub">Cinq calculateurs instantanés, calculés localement, sans envoi de données.</p>
        </div>
      </header>

      <Segmented
        value={tool}
        onChange={(value) => setTool(value as ToolId)}
        options={TOOLS.map((t) => ({ id: t.id, label: t.label }))}
      />

      <section className="card tool-card">
        <div className="tool-head">
          <div>
            <h2 className="section-title">{active.title}</h2>
            <p className="section-sub">{active.text}</p>
          </div>
          <span className="tool-badge">
            <Icon name="sparkles" size={14} />
            Résultats en direct
          </span>
        </div>

        {tool === 'savings' ? (
          <div className="tool-body">
            <div className="tool-inputs">
              <Field label="Capital de départ">
                <div className="input-affix">
                  <span>€</span>
                  <input className="input" inputMode="decimal" value={initial} onChange={(e) => setInitial(e.target.value)} />
                </div>
              </Field>
              <Field label="Versement mensuel">
                <div className="input-affix">
                  <span>€</span>
                  <input className="input" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
                </div>
              </Field>
              <Field label="Taux annuel">
                <div className="input-affix">
                  <span>%</span>
                  <input className="input" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
              </Field>
              <Field label="Durée (années)">
                <input className="input" inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} />
              </Field>
            </div>
            <div className="tool-results">
              <Result label="Capital final estimé" value={money(savings.future)} strong />
              <Result label="Total versé" value={money(savings.contributed)} hint={`${savings.months} versements`} />
              <Result label="Intérêts générés" value={money(savings.interest)} hint="gain des intérêts composés" />
              <Result
                label="Part des intérêts"
                value={`${savings.future > 0 ? Math.round((savings.interest / savings.future) * 100) : 0} %`}
                hint="du capital final"
              />
            </div>
          </div>
        ) : null}

        {tool === 'compound' ? (
          <div className="tool-body">
            <div className="tool-inputs">
              <Field label="Capital initial">
                <div className="input-affix">
                  <span>€</span>
                  <input className="input" inputMode="decimal" value={cInitial} onChange={(e) => setCInitial(e.target.value)} />
                </div>
              </Field>
              <Field label="Taux annuel">
                <div className="input-affix">
                  <span>%</span>
                  <input className="input" inputMode="decimal" value={cRate} onChange={(e) => setCRate(e.target.value)} />
                </div>
              </Field>
              <Field label="Durée (années)">
                <input className="input" inputMode="decimal" value={cYears} onChange={(e) => setCYears(e.target.value)} />
              </Field>
              <Field label="Capitalisation">
                <select className="select" value={freq} onChange={(e) => setFreq(e.target.value)}>
                  <option value="12">Mensuelle</option>
                  <option value="4">Trimestrielle</option>
                  <option value="2">Semestrielle</option>
                  <option value="1">Annuelle</option>
                </select>
              </Field>
            </div>
            <div className="tool-results">
              <Result label="Valeur acquise" value={money(compound.future)} strong />
              <Result label="Intérêts composés" value={money(compound.interest)} />
              <Result label="Intérêts simples" value={money(compound.simple - n(cInitial))} hint="sans capitalisation" />
              <Result label="Gain de la capitalisation" value={money(compound.advantage)} hint="vs intérêts simples" />
            </div>
          </div>
        ) : null}

        {tool === 'planner' ? (
          <div className="tool-body">
            <div className="tool-inputs">
              <Field label="Revenu net mensuel">
                <div className="input-affix">
                  <span>€</span>
                  <input className="input" inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} />
                </div>
              </Field>
              <Field label="Besoins (%)" hint="logement, courses, transports">
                <input className="input" inputMode="decimal" value={needsPct} onChange={(e) => setNeedsPct(e.target.value)} />
              </Field>
              <Field label="Envies (%)" hint="loisirs, restaurants, abonnements">
                <input className="input" inputMode="decimal" value={wantsPct} onChange={(e) => setWantsPct(e.target.value)} />
              </Field>
              <Field label="Épargne (%)" hint="objectif recommandé : 20 %">
                <input className="input" inputMode="decimal" value={savePct} onChange={(e) => setSavePct(e.target.value)} />
              </Field>
            </div>
            <div className="tool-results">
              <Result label="Total réparti" value={money(planner.total)} strong hint={`${Math.round(planner.sum)} % de votre revenu`} />
              <Result label="Besoins essentiels" value={money(planner.needs)} hint={`${needsPct} %`} />
              <Result label="Envies" value={money(planner.wants)} hint={`${wantsPct} %`} />
              <Result label="Épargne mensuelle" value={money(planner.save)} hint={`${savePct} %`} />
            </div>
            {Math.abs(planner.sum - 100) > 0.5 ? (
              <p className="hint hint-warn">
                Votre répartition atteint {Math.round(planner.sum)} % — ajustez les pourcentages pour totaliser 100 %.
              </p>
            ) : null}
          </div>
        ) : null}

        {tool === 'afford' ? (
          <div className="tool-body">
            <div className="tool-inputs">
              <Field label="Revenu net mensuel">
                <div className="input-affix">
                  <span>€</span>
                  <input className="input" inputMode="decimal" value={netIncome} onChange={(e) => setNetIncome(e.target.value)} />
                </div>
              </Field>
              <Field label="Charges déjà engagées">
                <div className="input-affix">
                  <span>€</span>
                  <input className="input" inputMode="decimal" value={charges} onChange={(e) => setCharges(e.target.value)} />
                </div>
              </Field>
              <Field label="Taux d'endettement max" hint="35 % est la norme bancaire">
                <div className="input-affix">
                  <span>%</span>
                  <input className="input" inputMode="decimal" value={debtRate} onChange={(e) => setDebtRate(e.target.value)} />
                </div>
              </Field>
              <Field label="Taux du crédit">
                <div className="input-affix">
                  <span>%</span>
                  <input className="input" inputMode="decimal" value={loanRate} onChange={(e) => setLoanRate(e.target.value)} />
                </div>
              </Field>
              <Field label="Durée (années)">
                <input className="input" inputMode="decimal" value={loanYears} onChange={(e) => setLoanYears(e.target.value)} />
              </Field>
            </div>
            <div className="tool-results">
              <Result label="Mensualité maximale" value={money(afford.maxPayment)} strong hint="après charges existantes" />
              <Result label="Montant finançable" value={money(afford.capacity)} hint={`sur ${afford.months} mois`} />
              <Result label="Coût total du crédit" value={money(afford.totalPaid)} hint="capital + intérêts" />
              <Result
                label="Budget immobilier indicatif"
                value={money(afford.capacity)}
                hint="hors frais et apport"
              />
            </div>
          </div>
        ) : null}

        {tool === 'simulator' ? (
          <div className="tool-body">
            <div className="tool-inputs">
              <Field label="Montant cible">
                <div className="input-affix">
                  <span>€</span>
                  <input className="input" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
                </div>
              </Field>
              <Field label="Déjà épargné">
                <div className="input-affix">
                  <span>€</span>
                  <input className="input" inputMode="decimal" value={already} onChange={(e) => setAlready(e.target.value)} />
                </div>
              </Field>
              <Field label="Versement mensuel">
                <div className="input-affix">
                  <span>€</span>
                  <input className="input" inputMode="decimal" value={contribution} onChange={(e) => setContribution(e.target.value)} />
                </div>
              </Field>
              <Field label="Rendement annuel">
                <div className="input-affix">
                  <span>%</span>
                  <input className="input" inputMode="decimal" value={simRate} onChange={(e) => setSimRate(e.target.value)} />
                </div>
              </Field>
            </div>
            <div className="tool-results">
              <Result
                label="Durée nécessaire"
                value={
                  !Number.isFinite(simulator.months)
                    ? '—'
                    : simulator.months === 0
                      ? 'Objectif atteint'
                      : `${simulator.months} mois`
                }
                strong
                hint={simulator.date ? `vers ${formatDate(simulator.date, 'long')}` : 'augmentez le versement mensuel'}
              />
              <Result label="Reste à financer" value={money(simulator.remaining)} />
              <Result
                label="Total versé"
                value={money(Math.min(simulator.remaining, n(contribution) * (Number.isFinite(simulator.months) ? simulator.months : 0)))}
                hint="hors rendement"
              />
              <Result label="Devise du profil" value={data.profile.currency} hint="modifiable dans Réglages" />
            </div>
          </div>
        ) : null}
      </section>

      <section className="card muted-card">
        <p className="hint">
          Ces simulateurs sont des estimations fournies à titre indicatif. Ils ne constituent pas un conseil financier et
          ne remplacent pas l’avis d’un professionnel. Aucune donnée n’est transmise : tous les calculs s’exécutent dans
          votre navigateur.
        </p>
      </section>
    </div>
  )
}
