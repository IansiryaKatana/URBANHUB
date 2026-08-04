# Urban Hub 360° VR Tour

Interactive multi-room virtual tour powered by [Photo Sphere Viewer](https://photo-sphere-viewer.js.org/) with the Virtual Tour plugin.

## Where it lives

| Surface | Path |
| --- | --- |
| Full-page tour | `/vr-tour` |
| Dialog teaser | International Students page → “Start VR Tour” |
| **Admin upload** | `/admin/vr-tour` |
| Database table | `website_vr_tour_rooms` (migration `045`) |
| Static fallback scene graph | [`src/data/vrTour.ts`](../src/data/vrTour.ts) |
| Static fallback image URLs | [`src/data/vrTourPanoramas.json`](../src/data/vrTourPanoramas.json) |
| Viewer | [`src/components/vr/VrTourViewer.tsx`](../src/components/vr/VrTourViewer.tsx) |
| Offline prep script | [`scripts/prep-vr-panoramas.mjs`](../scripts/prep-vr-panoramas.mjs) |

## Recommended: upload in Admin

1. Apply migration [`045_vr_tour_rooms.sql`](../supabase/migrations/045_vr_tour_rooms.sql) in the Supabase SQL editor (seeds Outside Front + Corridor).
2. Open **Admin → VR Tour**.
3. Click **Add room** (or edit an existing one).
4. Set a room ID like `03-gym`, display name, and category.
5. Click **Upload 360** and choose an equirectangular JPG/PNG/WebP (up to ~80MB).
   - The browser creates `-lg` (6144×3072), `-sm` (4096×2048), and `-thumb` (512×256) WebP files and uploads them to the `website` bucket under `vr-tour/`.
6. Add hotspot links (target room + yaw/pitch), mark a start room if needed, then **Save room**.
7. Place hotspots accurately with calibrate mode:
   - Open `/vr-tour?calibrate=1`
   - Click the panorama — a `{ nodeId, yaw, pitch }` snippet is copied
   - Paste the yaw/pitch into the room’s link fields in admin

The live tour prefers database rooms. If the table is empty or missing, it falls back to the static JSON/TS files.

## Alternative: CLI prep script

Still useful for bulk offline processing:

1. Drop equirectangular photos into `vr-source/` (e.g. `03-gym.jpg`).
2. Run `npm run prep:vr` (needs service role in `.env`).
3. Then create/update matching rows in **Admin → VR Tour** (or keep using the static `vrTour.ts` fallback).

## Viewer features

- Drag / swipe to look around
- Click / tap arrows to move between rooms
- Gallery strip of all rooms
- Gyroscope (phones, HTTPS)
- Cardboard-style stereo split
- Urban Hub logo covering the camera nadir watermark
- Analytics: `vr_tour_open`, `vr_tour_room` via `dataLayer`

## SEO

- [`044_vr_tour_seo_page.sql`](../supabase/migrations/044_vr_tour_seo_page.sql) — `/vr-tour` SEO row
- [`045_vr_tour_rooms.sql`](../supabase/migrations/045_vr_tour_rooms.sql) — admin-managed rooms table
