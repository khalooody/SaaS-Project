import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app">
      <header className="app__header">
        <span className="app__badge">SaaS Project</span>
        <h1 className="app__title">React + TypeScript + Vite</h1>
        <p className="app__subtitle">
          Your frontend is set up and ready. Edit <code>src/App.tsx</code> and
          save to see hot module replacement in action.
        </p>
      </header>

      <section className="app__card">
        <button
          type="button"
          className="app__button"
          onClick={() => setCount((c) => c + 1)}
        >
          Count is {count}
        </button>
        <p className="app__hint">
          Next: add routing, an API layer, and your first feature.
        </p>
      </section>

      <footer className="app__footer">
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          React docs
        </a>
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          Vite docs
        </a>
      </footer>
    </main>
  )
}

export default App
