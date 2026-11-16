import { useMemo, useState } from 'react'
import { Mail, Star, TrendingUp, Users } from 'lucide-react'
import { Avatar, Badge, Btn, PageHeader, Panel, SearchInput } from '../components/UI'
import { Sparkline } from '../components/Charts'
import { useApp } from '../context/AppContext'

export function Team() {
  const { data, money } = useApp()
  const [query, setQuery] = useState('')

  const members = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = data.team.filter((m) =>
      needle ? `${m.name} ${m.role} ${m.email}`.toLowerCase().includes(needle) : true,
    )
    return [...list].sort((a, b) => b.revenue - a.revenue)
  }, [data.team, query])

  const revenue = data.team.reduce((sum, m) => sum + m.revenue, 0)
  const deals = data.team.reduce((sum, m) => sum + m.deals, 0)
  const rating =
    data.team.length > 0
      ? data.team.reduce((sum, m) => sum + m.rating, 0) / data.team.length
      : 0

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Team"
        subtitle="Agents and administrators working the portfolio."
        actions={<Btn variant="soft" icon={<Users size={16} />}>Invite teammate</Btn>}
      />

      <div className="stat-grid stat-grid-3">
        <div className="stat-card stat-light">
          <p className="stat-label">Closed deals</p>
          <strong className="stat-value">{deals}</strong>
          <p className="stat-hint">Across all agents</p>
        </div>
        <div className="stat-card stat-light">
          <p className="stat-label">Commission volume</p>
          <strong className="stat-value">{money(revenue, true)}</strong>
          <p className="stat-hint">Lifetime, tracked</p>
        </div>
        <div className="stat-card stat-light">
          <p className="stat-label">Average rating</p>
          <strong className="stat-value">{rating.toFixed(1)}</strong>
          <p className="stat-hint">Client satisfaction</p>
        </div>
      </div>

      <Panel
        tone="glass"
        title="Directory"
        subtitle={`${data.team.length} people`}
        actions={<SearchInput value={query} onChange={setQuery} placeholder="Search team…" />}
      >
        <div className="team-grid">
          {members.map((member) => (
            <article className="team-card" key={member.id}>
              <header>
                <div className="team-avatar">
                  <Avatar name={member.name} hue={member.hue} size={52} />
                  <span className={`presence presence-${member.presence}`} aria-label={member.presence} />
                </div>
                <div className="team-id">
                  <strong>{member.name}</strong>
                  <small>{member.role}</small>
                </div>
              </header>

              <div className="team-metrics">
                <div>
                  <span>Deals</span>
                  <strong>{member.deals}</strong>
                </div>
                <div>
                  <span>Revenue</span>
                  <strong>{money(member.revenue, true)}</strong>
                </div>
                <div>
                  <span>Rating</span>
                  <strong className="team-rating">
                    <Star size={13} /> {member.rating.toFixed(1)}
                  </strong>
                </div>
              </div>

              <div className="team-spark">
                <Sparkline
                  values={[
                    member.deals * 0.5,
                    member.deals * 0.7,
                    member.deals * 0.6,
                    member.deals * 0.9,
                    member.deals,
                  ]}
                />
              </div>

              <footer>
                <a className="team-mail" href={`mailto:${member.email}`}>
                  <Mail size={14} /> {member.email}
                </a>
                <Badge tone={member.presence === 'online' ? 'success' : 'neutral'}>
                  {member.presence}
                </Badge>
              </footer>
            </article>
          ))}
        </div>

        <div className="table-wrap team-table">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Deals</th>
                <th>Revenue</th>
                <th>Rating</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={`row-${member.id}`}>
                  <td>
                    <div className="cell-person">
                      <Avatar name={member.name} hue={member.hue} size={32} />
                      <div>
                        <strong>{member.name}</strong>
                        <small>{member.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>{member.role}</td>
                  <td>{member.deals}</td>
                  <td className="cell-strong">{money(member.revenue, true)}</td>
                  <td>
                    <span className="team-rating">
                      <Star size={13} /> {member.rating.toFixed(1)}
                    </span>
                  </td>
                  <td>
                    <Badge tone={member.presence === 'online' ? 'success' : 'neutral'}>
                      {member.presence}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel tone="glass" title="Top performers" subtitle="Ranked by commission volume">
        <ul className="rank-list">
          {members.slice(0, 4).map((member, index) => (
            <li key={`rank-${member.id}`}>
              <span className="rank-num">{index + 1}</span>
              <Avatar name={member.name} hue={member.hue} size={34} />
              <div className="rank-main">
                <strong>{member.name}</strong>
                <small>{member.role}</small>
              </div>
              <div className="rank-bar">
                <span
                  style={{
                    width: `${Math.max(6, (member.revenue / (members[0]?.revenue || 1)) * 100)}%`,
                  }}
                />
              </div>
              <strong className="rank-value">{money(member.revenue, true)}</strong>
              <TrendingUp size={15} className="rank-icon" />
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}
