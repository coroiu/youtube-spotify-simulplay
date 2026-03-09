# YouTube + Spotify SimulPlay

Play a YouTube video and a Spotify track in sync. Both players stay locked together — seeking, pausing, or playing one automatically mirrors the action on the other.

## How it works

- An Express server handles Spotify OAuth and serves the single-page app
- The browser loads the YouTube IFrame API and Spotify Web Playback SDK directly from their CDNs
- A sync controller polls both players every 500ms and seeks the lagging one if drift exceeds 1.5s
- The most recently interacted-with player is the "leader"; the other follows

## Prerequisites

- Node.js 18+
- A [Spotify Developer app](https://developer.spotify.com/dashboard) with a redirect URI configured
- A Spotify Premium account (required by the Web Playback SDK)

## Setup

```sh
npm install
cp .env.example .env
```

Edit `.env`:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback
SESSION_SECRET=any_random_string
PORT=3000
```

In your Spotify app dashboard, add `http://localhost:3000/auth/callback` as a Redirect URI.

## HTTPS (required outside localhost)

The Spotify Web Playback SDK only works in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts). On `localhost` plain HTTP works fine. For any other host you need HTTPS.

The easiest way to get a locally-trusted certificate is [mkcert](https://github.com/FiloSottile/mkcert):

```sh
brew install mkcert       # or your OS equivalent
mkcert -install           # installs local CA (once)
mkcert localhost 127.0.0.1
```

This produces `localhost.pem` and `localhost-key.pem`. Point the server at them in `.env`:

```
HTTPS_KEY=localhost-key.pem
HTTPS_CERT=localhost.pem
SPOTIFY_REDIRECT_URI=https://localhost:3000/auth/callback
```

Update your Spotify app dashboard redirect URI to `https://localhost:3000/auth/callback` as well, then open `https://localhost:3000`.

## Running

**Development** (server + client bundler both in watch mode):

```sh
npm run dev
```

**Production build:**

```sh
npm run build
npm start
```

Open `http://localhost:3000`, click **Connect Spotify**, then enter a YouTube video URL/ID and a Spotify track URL/URI and press **Play**.

## Project structure

```
src/
  server/
    index.ts          Express app entry point
    auth.ts           Spotify OAuth routes (/auth/login, /auth/callback, /auth/token, /auth/refresh)
  client/
    index.ts          Browser entry point — wires UI to players
    youtube-player.ts Wrapper around YouTube IFrame API
    spotify-player.ts Wrapper around Spotify Web Playback SDK
    sync-controller.ts Drift detection and leader/follower sync logic
public/
  index.html          App shell
scripts/
  build-client.js     esbuild bundler script
```
