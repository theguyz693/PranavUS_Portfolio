// Builds a small catalogue slice (no photo URLs) for the CollectorHub demo.
import { readFileSync, writeFileSync } from 'node:fs'
const SRC = 'C:/hw_proj/apps/web/public/catalog/hotwheels.json'
const j = JSON.parse(readFileSync(SRC, 'utf8'))
const must = (r) => r[0] === 'HRY93' || /autozam|porsche 911|dream garage/i.test(r[2] + ' ' + r[4])
const picked = new Map()
j.rows.forEach((r, i) => { if (must(r) || i % 9 === 0) picked.set(r[0] + r[6], r) })
const entries = [...picked.values()].map(([toy, col, name, variant, series, seriesNum, year]) => ({
  key: `hw:${year}:${toy}`, source: 'catalog', name, variant, brand: 'Hot Wheels', series,
  seriesNumber: seriesNum, releaseYear: year, modelNumber: toy, collectorNumber: col,
}))
writeFileSync('src/demos/collector/catalog.json', JSON.stringify(entries))
console.log(entries.length, 'entries;', entries.filter((e) => /autozam|porsche 911/i.test(e.name)).map((e) => `${e.modelNumber} ${e.name} ${e.series} ${e.seriesNumber}`).slice(0, 6))
