# Karan P. — scroll-driven 3D portfolio

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · three.js

Scroll to drive one lap of a race circuit. Each stop tells one part of the story, and the gallery straight shows eight billboards, one per project. The camera rides at car height on grass and tarmac with real shadows, so it never feels like it is floating.

## Run (Windows, macOS, Linux)

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

Production: `npm run build && npm start`. Checks: `npm run typecheck`, `npm run lint`.

## Where things live

| Path | What it does |
| --- | --- |
| `src/data/story.ts` | All the words: stops, projects, skills, contact. Edit this first. |
| `src/types/story.ts` | Types for the story data (discriminated union `Stop`). |
| `src/lib/journey.ts` | Pure `resolveJourney(progress)`: distance along the road, gaze, text fades, active project. |
| `src/lib/world/layout.ts` | The circuit: route, tile placement, scenery and billboards (pure data). |
| `src/lib/world/createWorld.ts` | three.js scene, lights, loading, disposal. |
| `src/lib/progress-store.ts` | External store; per-frame and coarse subscriptions. |
| `src/lib/audio/ambient.ts` | Web Audio ambient chord and chimes. |
| `src/hooks/` | `useScrollProgress`, `useJourney`, `useAmbientAudio`, `useMotionPreference`, `useLatest`. |
| `src/components/` | Header, HUD, loading screen, story overlay, project card, canvas. |

## Optional music

Copy `.env.example` to `.env.local`, drop a file in `public/audio/`, and set the variables. Without them, sound is generated in the browser. Sound starts only after the visitor presses the Sound button.

## Accessibility

Respects `prefers-reduced-motion`, has a Reduce motion button, and all story text is real HTML.

## Credits

3D models: Racing Kit by Kenney (CC0), https://kenney.nl. The garages keep the kit's own sample sign; swap those models if you want a different brand.
