// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { DATA_FILES, dataPath, missingDefaultFile } from './dataFiles.ts'
import { messages } from './messages.ts'

describe('dataPath', () => {
  it('points into the data folder at the repository root', () => {
    expect(dataPath(DATA_FILES.legend)).toMatch(/[/\\]data[/\\]legend-cards\.csv$/)
    expect(dataPath(DATA_FILES.inventory)).toMatch(/[/\\]data[/\\]art-inventory\.json$/)
  })
})

describe('missingDefaultFile', () => {
  const legend = { path: '/repo/data/legend-cards.csv', options: '--legend ve --cursed' }
  const cursed = { path: '/repo/data/cursed-cards.csv', options: '--legend ve --cursed' }

  it('gives null when every default file exists', () => {
    expect(missingDefaultFile([legend, cursed], () => true)).toBeNull()
  })

  it('gives the first missing file, before anything reads it', () => {
    const checked: string[] = []
    const exists = (path: string) => {
      checked.push(path)
      return path !== cursed.path
    }
    expect(missingDefaultFile([legend, cursed], exists)).toBe(cursed)
    expect(checked).toEqual([legend.path, cursed.path])
  })

  it('checks nothing when no default file is used, as with a file given by option', () => {
    const exists = () => {
      throw new Error('no default file should be checked')
    }
    expect(missingDefaultFile([], exists)).toBeNull()
  })
})

describe('the missing-file message', () => {
  it('names the file, says it is kept only on the owner’s machine, and names the options', () => {
    const message = messages.dataFileMissing('data/legend-cards.csv', '--legend ve --cursed')
    expect(message).toContain('"data/legend-cards.csv" bulunamadı')
    expect(message).toContain('yalnızca sahibin makinesinde durur')
    expect(message).toContain('--legend ve --cursed ile ver')
    expect(message).toContain('Hiçbir şey değişmedi.')
  })

  it('asks for the file itself when no option takes another one', () => {
    const message = messages.dataFileMissing('data/image-aliases.csv', null)
    expect(message).toContain('Dosyayı data/ klasörüne koyup tekrar çalıştır.')
    expect(message).not.toContain(' ile ver')
  })
})
