# Marinefin

A cinematic [Jellyfin](https://jellyfin.org) client that compiles to **one HTML file**.

Point it at any Jellyfin server, sign in, and stream movies, shows, music, photos, and Live TV. No backend of its own — the file is the app.

## Features

- Password login, public-user picker, and Quick Connect
- Home with continue watching, next up, latest libraries, recommendations
- Library browse with sort, filters, genres, and infinite scroll
- Movie / series / episode / collection / playlist / artist / album pages
- Custom video player: HLS + direct play, subtitles, audio tracks, quality, speed, chapters, skip intro/credits, next-episode autoplay, progress reporting
- Playback settings: max bitrate, resolution cap, play method, codecs, HDR, audio bitrate/channels, music bitrate, subtitle language/mode, burn-in
- Persistent music dock with queue
- Search, favorites, watch history, Live TV
- Accent themes and playback preferences, all stored locally
- Hash routing so the single file works on any static host

## Quick start

Requires [Bun](https://bun.sh) 1.4+.

```bash
bun install
bun run dev
```

Open the printed local URL (not `file://`). Jellyfin blocks browsers that load the client as a raw file.

## Single-file build

```bash
bun run build
```

The entire client — JS, CSS, and fonts — lands at `dist/index.html`. Host that file anywhere:

- `bun run preview` — local static server
- Drop it on GitHub Pages, Cloudflare Pages, Nginx, Caddy, or a NAS share
- Serve it from the Jellyfin server itself

Then open it over HTTP(S), enter your server URL, and sign in.

## Connecting to Jellyfin

1. Enter the full server URL, including protocol and port if needed (`http://192.168.1.12:8096` or `https://media.example.com`).
2. If the server sits behind a reverse proxy, include the subpath (`https://home.example.com/jellyfin`).
3. If the browser reports a network / CORS error, serve Marinefin over HTTP(S) and confirm the server allows remote connections. Opening `index.html` from disk will always fail.

A public demo is available from the login screen (`https://demo.jellyfin.org/stable`, user `demo`).

## Keyboard

| Key | Action |
| --- | --- |
| `/` | Focus search |
| Space / K | Play / pause |
| ← → | Seek 10s |
| ↑ ↓ | Volume |
| F | Fullscreen |
| M | Mute |
| N | Next episode |
| Esc | Leave player |

## Stack

Svelte 5 · Vite · TypeScript 7 · Bun · hls.js · `vite-plugin-singlefile`
