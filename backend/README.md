# Cricket Backend (RapidAPI Integration)

## Architecture

- `backend/config` - environment + API client
- `backend/controllers` - request handlers
- `backend/services` - business logic + RapidAPI orchestration
- `backend/routes` - route composition
- `backend/utils` - cache, retry, normalizers, image mapping, pagination

## Run

1. Copy `.env.example` to `.env`
2. Fill `RAPID_API_KEY`
3. Install dependencies from project root:
   - `npm install`
4. Start backend:
   - `npm run dev:server`

## Required Endpoints

- `GET /api/matches/live`
- `GET /api/matches/upcoming`
- `GET /api/matches/ipl`
- `GET /api/match/:id`
- `GET /api/teams`
- `GET /api/team/:id/players` (alias provided via `/api/teams/:id/players`)

## Extra Endpoints

- `GET /api/matches/recent`
- `GET /api/series`
- `GET /api/series/leagues`
- `GET /api/series/ipl`
- `GET /api/search?q=virat&type=player`
- `GET /api/health`

## Query Features

- Pagination: `?page=1&limit=20`
- Search: `?q=mumbai` on teams and players endpoints

## Notes

- IPL filtering uses case-insensitive `IPL` text matching in series/match metadata.
- Team image mapping uses IPL team aliases to your local files in `public/assets/teams`.
- Player image mapping auto-indexes image files from `public/assets/players`.
