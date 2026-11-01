import Icon from './Icon';

/** A glass info card: small icon + label, then content. */
export default function Card({ icon, title, wide = false, tone = '', delay = 0, children }) {
  return (
    <section className={`card ${wide ? 'wide' : ''} ${tone}`} style={{ '--delay': `${delay}ms` }}>
      <header className="card-head">
        <span className="card-icon"><Icon name={icon} /></span>
        <h3>{title}</h3>
      </header>
      <div className="card-body">{children}</div>
    </section>
  );
}
