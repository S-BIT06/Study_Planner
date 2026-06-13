import { useMemo, useState } from 'react';
import type { ProfessionalYear, SyllabusTopic } from '../types';
import { minutesLabel } from '../services/scheduler';

export function SyllabusPage({
  topics,
  currentYear,
  plannedTopicIds
}: {
  topics: SyllabusTopic[];
  currentYear: ProfessionalYear;
  plannedTopicIds: Set<string>;
}) {
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('All subjects');
  const [type, setType] = useState('All types');

  const yearTopics = useMemo(() => topics.filter((topic) => topic.year === currentYear), [topics, currentYear]);
  const subjects = useMemo(() => ['All subjects', ...new Set(yearTopics.map((topic) => topic.subject))], [yearTopics]);
  const filtered = yearTopics.filter((topic) => {
    const matchesQuery = `${topic.title} ${topic.subject} ${topic.unit}`.toLowerCase().includes(query.toLowerCase());
    const matchesSubject = subject === 'All subjects' || topic.subject === subject;
    const matchesType = type === 'All types' || topic.type === type;
    return matchesQuery && matchesSubject && matchesType;
  });

  return (
    <div className="page-stack">
      <section className="section-card syllabus-intro">
        <span className="eyebrow">{currentYear}</span>
        <h2>Compact curriculum map</h2>
        <p>Browse planner-ready topic types. The bundled records are demonstration data until the verified NCISM import is completed.</p>
      </section>

      <section className="filter-panel">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics, units or subjects" />
        <div className="filter-row">
          <select value={subject} onChange={(event) => setSubject(event.target.value)}>
            {subjects.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {['All types', 'Theory', 'Practical', 'Clinical', 'Journal', 'Activity'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </section>

      <div className="topic-list">
        {filtered.map((topic) => (
          <article className="topic-card" key={topic.id}>
            <div className="topic-card__top">
              <span className={`type-badge type-badge--${topic.type.toLowerCase()}`}>{topic.type}</span>
              <span className="importance-label">{topic.importance}</span>
            </div>
            <h3>{topic.title}</h3>
            <p>{topic.subject} · {topic.paper} · {topic.unit}</p>
            <footer>
              <span>{minutesLabel(topic.estimatedMinutes)}</span>
              <span>{topic.difficulty} difficulty</span>
              <span className={plannedTopicIds.has(topic.id) ? 'planned-chip is-planned' : 'planned-chip'}>
                {plannedTopicIds.has(topic.id) ? 'In plan' : 'Available'}
              </span>
            </footer>
          </article>
        ))}
        {filtered.length === 0 && <div className="empty-inline">No syllabus topics match the current filters.</div>}
      </div>
    </div>
  );
}
