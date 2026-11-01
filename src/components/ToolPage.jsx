import { useState } from 'react';
import { getTool, getBody, STATUS_TONE } from '../data';
import { go } from '../router';
import Card from './Card';
import Icon from './Icon';
import ToolModel from './ToolModel';

const Row = ({ k, v }) => (v ? <div className="kv"><dt>{k}</dt><dd>{v}</dd></div> : null);

export default function ToolPage({ toolId }) {
  const tool = getTool(toolId);
  const body = getBody(tool.body);
  const [mode, setMode] = useState('standard');
  const [imgOk, setImgOk] = useState(true);

  const loc = tool.location;
  const coords = loc.coordinates
    ? `${Math.abs(loc.coordinates.latitude).toFixed(2)}°${loc.coordinates.latitude >= 0 ? 'N' : 'S'} · ${Math.abs(loc.coordinates.longitude).toFixed(2)}°${loc.coordinates.longitude >= 0 ? 'E' : 'W'}`
    : null;

  let i = 0;
  const d = () => (i++) * 60;

  return (
    <div className="screen tool-page">
      <header className="tool-top">
        <button className="btn ghost" onClick={() => go(`/body/${tool.body}`)}><span aria-hidden>←</span> Back to {body.name}</button>

        <div className="mode-toggle" role="tablist" aria-label="Detail level" data-mode={mode}>
          <span className="mode-pill" />
          <button role="tab" aria-selected={mode === 'standard'} onClick={() => setMode('standard')}>Standard</button>
          <button role="tab" aria-selected={mode === 'advanced'} onClick={() => setMode('advanced')}>Advanced</button>
        </div>

        <span className="crumb">{body.name} <i>/</i> {tool.shortName}</span>
      </header>

      <main className="tool-main">
        <section className="viewer-col">
          <div className="viewer">
            <ToolModel tool={tool} />
            <span className="viewer-tag">{tool.category}</span>
            <span className="viewer-hint"><Icon name="rotate" size={14} /> Drag to rotate · scroll to zoom</span>
          </div>

          <div className="name-card">
            <span className="eyebrow">{tool.agency} · {tool.country}</span>
            <h1>{tool.name}</h1>
            <div className="name-meta">
              <span className={`badge ${STATUS_TONE[tool.status.state]}`}>{tool.status.label}</span>
              <span className="chip">{loc.place}</span>
              <span className="chip">{tool.dates.launchYear}</span>
            </div>
          </div>
        </section>

        <section className="cards-col">
          <div className="cards" key={mode}>
            {mode === 'standard' ? (
              <>
                <Card icon="pin" title="Place" delay={d()}>
                  <p className="big">{loc.summary}</p>
                  {coords && <p className="sub">{coords} <span className="muted">(approx.)</span></p>}
                  {loc.distanceAU && <p className="sub">{loc.distanceAU} AU from the Sun</p>}
                </Card>

                <Card icon="calendar" title="Date" delay={d()}>
                  <p className="big">{tool.dates.label}</p>
                </Card>

                <Card icon="target" title="Goal" wide delay={d()}>
                  <p>{tool.goal}</p>
                </Card>

                <Card icon="book" title="Story" wide delay={d()}>
                  <p>{tool.story}</p>
                </Card>

                <Card icon="pulse" title="Status" wide tone={STATUS_TONE[tool.status.state]} delay={d()}>
                  <span className={`badge ${STATUS_TONE[tool.status.state]}`}>{tool.status.label}</span>
                  <p>{tool.status.summary}</p>
                </Card>

                {tool.instruments.length > 0 && (
                  <Card icon="flask" title="Instruments" wide delay={d()}>
                    <ul className="tags">{tool.instruments.map((x) => <li key={x}>{x}</li>)}</ul>
                  </Card>
                )}
              </>
            ) : (
              <>
                <Card icon="globe" title="Agency / Country" delay={d()}>
                  <p className="big">{tool.agency} / {tool.country}</p>
                </Card>

                <Card icon="rocket" title="Launch" delay={d()}>
                  <dl className="kvs">
                    <Row k="Date" v={tool.dates.launch} />
                    <Row k="Vehicle" v={tool.launchVehicle} />
                  </dl>
                </Card>

                {(tool.dates.landing || tool.dates.firstFlight) && (
                  <Card icon="calendar" title="Landing / Deployment" wide delay={d()}>
                    <dl className="kvs">
                      <Row k="Landing" v={tool.dates.landing} />
                      <Row k="First flight" v={tool.dates.firstFlight} />
                      <Row k="Location" v={loc.summary} />
                    </dl>
                  </Card>
                )}

                {tool.missionPurpose && (
                  <Card icon="target" title="Mission purpose" wide delay={d()}>
                    <p>{tool.missionPurpose}</p>
                  </Card>
                )}

                {tool.keyAchievements.length > 0 && (
                  <Card icon="flag" title="Key achievements" wide delay={d()}>
                    <ul className="bullets">{tool.keyAchievements.map((x) => <li key={x}>{x}</li>)}</ul>
                  </Card>
                )}

                {tool.whyLeftBehind && (
                  <Card icon="oneway" title="Why it did not return" wide delay={d()}>
                    <p>{tool.whyLeftBehind}</p>
                  </Card>
                )}

                <Card icon="pulse" title="Current status" wide tone={STATUS_TONE[tool.status.state]} delay={d()}>
                  <span className={`badge ${STATUS_TONE[tool.status.state]}`}>{tool.status.label}</span>
                  <p>{tool.status.details}</p>
                  <dl className="kvs">
                    <Row k="Last contact" v={tool.status.lastContact} />
                    <Row k="Mission ended" v={tool.status.missionEnded} />
                  </dl>
                </Card>

                {tool.importantDates.length > 0 && (
                  <Card icon="clock" title="Timeline" wide delay={d()}>
                    <ol className="timeline">
                      {tool.importantDates.map((x) => (
                        <li key={x.label + x.date}><b>{x.date}</b><span>{x.label}</span></li>
                      ))}
                    </ol>
                  </Card>
                )}

                {tool.instruments.length > 0 && (
                  <Card icon="flask" title="Instruments" wide delay={d()}>
                    <ul className="tags">{tool.instruments.map((x) => <li key={x}>{x}</li>)}</ul>
                  </Card>
                )}

                {tool.notes && (
                  <Card icon="note" title="Additional notes" wide delay={d()}>
                    <p>{tool.notes}</p>
                  </Card>
                )}

                {tool.image?.available && imgOk && (
                  <Card icon="image" title="Reference image" wide delay={d()}>
                    <img className="ref-img" src={`/images/${tool.image.file}`} alt={tool.image.caption || tool.name} onError={() => setImgOk(false)} />
                    {tool.image.caption && <p className="sub">{tool.image.caption}</p>}
                  </Card>
                )}

                {(tool.sources.length > 0 || tool.sourceNote || tool.image?.credit) && (
                  <Card icon="link" title="Sources & credits" wide delay={d()}>
                    {tool.sources.length > 0 && (
                      <ul className="links">
                        {tool.sources.map((s) => (
                          <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>
                        ))}
                      </ul>
                    )}
                    {tool.image?.credit && (
                      <p className="sub">Image credit: <a href={tool.image.credit} target="_blank" rel="noreferrer">{tool.image.credit}</a></p>
                    )}
                    {tool.sourceNote && <p className="sub">{tool.sourceNote}</p>}
                  </Card>
                )}

                <Card icon="hash" title="Record" delay={d()}>
                  <dl className="kvs">
                    <Row k="ID" v={tool.id} />
                    <Row k="Document" v={tool.sourceDocument} />
                  </dl>
                </Card>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
