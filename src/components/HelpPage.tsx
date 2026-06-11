import pageStyles from './StatsPage.module.css'

const SECTIONS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Basics',
    items: [
      ['Add a movie', 'Tap +, search TMDB — title, original title, year, runtime, genres, rating and source links fill in automatically.'],
      ['Edit', 'Tap any movie to edit its status and links.'],
      ['Status dot', 'The colored dot on the poster shows status — green = watched, orange = want.'],
      ['List', 'Each row shows everything at a glance: both titles, year, runtime, rating, countries, genres and links to KP / IMDb / TMDB / Wiki.'],
    ],
  },
  {
    title: 'Find & organize',
    items: [
      ['Search', 'Search by title, genre or keyword.'],
      ['Filters', 'The tune icon opens filters: status, year range, rating range, country. The badge shows active filters.'],
      ['Jump to letter', 'Tap the Films logo to jump to a letter in the list.'],
      ['Statistics', 'Open Statistics from the avatar menu for breakdowns of your collection.'],
    ],
  },
  {
    title: 'Data',
    items: [
      ['Where is my data?', 'In a Google Sheets file (db_films) in your own Google Drive — open and inspect it any time.'],
      ['Switch file', 'In Settings you can point the app at a different spreadsheet.'],
    ],
  },
]

export default function HelpPage() {
  return (
    <div className={pageStyles.page}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 32px' }}>
        {SECTIONS.map(s => (
          <section key={s.title} style={{ marginBottom: 22 }}>
            <p style={{
              fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em',
              textTransform: 'uppercase', color: 'var(--text-muted, #9ca3af)', marginBottom: 8,
            }}>{s.title}</p>
            {s.items.map(([term, text]) => (
              <div key={term} style={{ marginBottom: 12 }}>
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{term}</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #9ca3af)', marginTop: 2, lineHeight: 1.45 }}>{text}</p>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
