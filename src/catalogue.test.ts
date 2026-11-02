import { describe, expect, it } from 'vitest'
import { catalogue, summarizeCatalogue } from './catalogue'

describe('catalogue summary', () => {
  it('counts all extracted rows and topics without reading the study copy', () => {
    expect(summarizeCatalogue()).toMatchObject({ topicCount: 20, problemCount: 495 })
    expect(catalogue.topics[0].title).toBe('Beginner Problems')
    expect(catalogue.topics.at(-1)?.title).toBe('Maths')
  })

  it('keeps unbadged source rows ungraded rather than inventing a level', () => {
    expect(summarizeCatalogue().levels).toEqual({ basic: 84, core: 287, pro: 109, ungraded: 15 })
  })
})
