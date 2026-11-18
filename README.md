# Karan P. — scroll-driven 3D portfolio

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · three.js

A quiet loader fades out and the page is ready: scroll to drive one full lap of a closed race circuit, ending back at the start line. Each stop tells one part of the story, and ten named slides (Lights out, Qualifying laps, Rookie season, Design sector, Full throttle, Current lap, Live on track, In the garage, Lap time, Finish line) cover education, four career chapters, nine projects on billboards, and the numbers. A chase camera follows a single car on grass and tarmac with real shadows.

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
| `src/data/story.ts` | All the words: stops, projects, skills, contact. Edit this first. Keep stops in the same order as `JOURNEY` in `lib/journey.ts`. Add a `url` to a project to show a link on its card. |
| `src/types/story.ts` | Types for the story data (discriminated union `Stop`). |
| `src/lib/journey.ts` | Pure `resolveJourney(progress)`: distance along the road, gaze, text fades, active project. |
| `src/lib/world/car.ts`, `rig.ts` | The hero car (wheels roll and steer), and the numbers tying car, camera and road together. |
| `src/lib/world/layout.ts` | The closed circuit: route, tile placement, scenery and billboards (pure data). The route builder throws if the lap does not close. |
| `src/lib/world/createWorld.ts` | three.js scene, lights, loading, disposal. |
| `src/lib/progress-store.ts` | External store; per-frame and coarse subscriptions. |
| `src/hooks/` | `useScrollProgress`, `useJourney`, `useMotionPreference`, `useLatest`. |
| `src/components/` | Header, HUD, loading screen, story overlay, project card, canvas. |

## Optional music


## Change the car

The car is `public/models/car/race.glb` from the Kenney Car Kit. To use another one, copy its `.glb` (and keep `Textures/colormap.png` beside it), change `HERO_CAR_URL` in `src/lib/world/rig.ts`, and keep the wheel node names (`wheel-front-left` and so on). If it looks too big or small on the road, adjust `CAR_SCALE`.

## Accessibility

Respects `prefers-reduced-motion`, has a Reduce motion button, and all story text is real HTML.

## Credits

3D models: Racing Kit and Car Kit by Kenney (CC0), https://kenney.nl. The garages keep the kit's own sample sign; swap those models if you want a different brand.

## Your images

Drop files in `public/` and they appear automatically; nothing else to wire up.

- **Project previews:** `public/previews/<project-id>.jpg`, about 16:10 (for example `landmark-builders.jpg`). Ids are in `src/data/story.ts`. Until a file exists the billboard shows a drawn browser frame.
- **Company logos:** `public/logos/sristhi-innovative.png`, `webcastle-media.png`, `impreza-technologies.png`. Square or transparent PNG/SVG works best (change the path in `story.ts` if you use another extension). Until a file exists a monogram shows instead.
