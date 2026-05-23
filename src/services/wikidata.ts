/**
 * Wikidata SPARQL — auto-resolve Kinopoisk ID (P2603) and Wikipedia URLs
 * given an IMDb ID (P345).
 *
 * The SPARQL endpoint supports CORS, so this works from the browser.
 * Russian Wikipedia is preferred; English Wikipedia is the fallback.
 */

const SPARQL = 'https://query.wikidata.org/sparql'

export interface FilmLinks {
  kinopoisk_url: string | null
  wiki_url: string | null
}

export async function lookupFilmByImdbId(imdbId: string): Promise<FilmLinks> {
  const query = `
SELECT ?kpId ?articleRu ?articleEn WHERE {
  ?film wdt:P345 "${imdbId}" .
  OPTIONAL { ?film wdt:P2603 ?kpId }
  OPTIONAL {
    ?articleRu schema:about ?film ;
               schema:isPartOf <https://ru.wikipedia.org/> .
  }
  OPTIONAL {
    ?articleEn schema:about ?film ;
               schema:isPartOf <https://en.wikipedia.org/> .
  }
}
LIMIT 1`

  try {
    const res = await fetch(
      `${SPARQL}?query=${encodeURIComponent(query)}&format=json`,
      { headers: { Accept: 'application/sparql-results+json' } },
    )
    if (!res.ok) return { kinopoisk_url: null, wiki_url: null }

    const data = await res.json() as {
      results: {
        bindings: Array<{
          kpId?: { value: string }
          articleRu?: { value: string }
          articleEn?: { value: string }
        }>
      }
    }
    const b = data.results?.bindings?.[0]
    if (!b) return { kinopoisk_url: null, wiki_url: null }

    const kpId    = b.kpId?.value    ?? null
    const wikiRu  = b.articleRu?.value ?? null
    const wikiEn  = b.articleEn?.value ?? null

    return {
      kinopoisk_url: kpId ? `https://www.kinopoisk.ru/film/${kpId}/` : null,
      wiki_url: wikiRu ?? wikiEn,
    }
  } catch {
    return { kinopoisk_url: null, wiki_url: null }
  }
}
