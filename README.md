# SaaS Project

A React + TypeScript single-page application scaffolded with [Vite](https://vite.dev).

## Tech stack

- **React 19** — UI library
- **TypeScript** — type-safe JavaScript
- **Vite** — dev server and build tooling with HMR
- **Oxlint** — fast linter

## Getting started

Install dependencies:

```bash
npm install
```

Start the development server (with hot module replacement):

```bash
npm run dev
```

The app will be available at the URL printed in the terminal (default `http://localhost:5173`).

## Available scripts

| Command           | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR                 |
| `npm run build`   | Type-check and build for production into `dist/`   |
| `npm run preview` | Preview the production build locally               |
| `npm run lint`    | Run Oxlint over the codebase                       |

## Project structure

```
.
├── public/           # Static assets served as-is
├── src/
│   ├── assets/       # Imported assets (images, svgs)
│   ├── App.tsx       # Root application component
│   ├── main.tsx      # Application entry point
│   └── index.css     # Global styles
├── index.html        # HTML entry point
└── vite.config.ts    # Vite configuration
```
