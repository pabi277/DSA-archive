import { createRoot } from 'react-dom/client'
import { catalogue, summarizeCatalogue } from './catalogue'
import './styles.css'

const summary = summarizeCatalogue()

function App() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 flex flex-col gap-3 sm:mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">DSA Archive</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your learning sheet</h1>
        <p className="max-w-2xl text-base-content/70">
          A clean-room catalogue of the topics and problem links you want to study. Progress and notes come later.
        </p>
      </header>

      <section aria-labelledby="catalogue-summary" className="mb-8">
        <h2 id="catalogue-summary" className="sr-only">Catalogue summary</h2>
        <p className="text-xl font-semibold" data-testid="catalogue-count">
          {summary.problemCount} problems · {summary.topicCount} topics
        </p>
        <p className="mt-1 text-sm text-base-content/65">Catalogue data is bundled with the site and available offline.</p>
      </section>

      <section aria-labelledby="topics-heading">
        <h2 id="topics-heading" className="mb-4 text-lg font-semibold">Topics</h2>
        <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {catalogue.topics.map((topic) => {
            const count = topic.subtopics.reduce((total, subtopic) => total + subtopic.problems.length, 0)
            return (
              <li key={topic.id}>
                <article className="card card-border bg-base-100 shadow-sm">
                  <div className="card-body flex-row items-center justify-between gap-3 p-4">
                    <h3 className="font-medium leading-snug">{topic.title}</h3>
                    <span className="badge badge-outline shrink-0">{count}</span>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
