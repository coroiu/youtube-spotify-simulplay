import { YouTubePlayer } from './youtube-player';
import { SpotifyPlayer } from './spotify-player';
import { SyncController } from './sync-controller';

function parseYouTubeId(input: string): string {
  input = input.trim();
  try {
    const url = new URL(input);
    const v = url.searchParams.get('v');
    if (v) return v;
    // youtu.be/<id>
    if (url.hostname === 'youtu.be') return url.pathname.slice(1);
  } catch {
    // not a URL — treat as raw ID
  }
  return input;
}

function parseSpotifyUri(input: string): string {
  input = input.trim();
  // https://open.spotify.com/track/<id>?...
  const match = input.match(/open\.spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+)/);
  if (match) return `spotify:${match[1]}:${match[2]}`;
  return input; // assume already a URI
}

async function checkToken(): Promise<boolean> {
  try {
    const res = await fetch('/auth/token');
    return res.ok;
  } catch {
    return false;
  }
}

function setStatus(msg: string): void {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

function updateNowPlaying(name: string, artist: string, artUrl: string, isPlaying: boolean): void {
  const trackName = document.getElementById('track-name');
  const trackArtist = document.getElementById('track-artist');
  const trackArt = document.getElementById('track-art') as HTMLImageElement | null;
  const artPlaceholder = document.getElementById('art-placeholder');
  const playingDot = document.getElementById('playing-dot');

  if (trackName) trackName.textContent = name || '—';
  if (trackArtist) trackArtist.textContent = artist || '—';

  if (trackArt && artPlaceholder) {
    if (artUrl) {
      trackArt.src = artUrl;
      trackArt.style.display = 'block';
      artPlaceholder.style.display = 'none';
    } else {
      trackArt.style.display = 'none';
      artPlaceholder.style.display = 'flex';
    }
  }

  if (playingDot) {
    playingDot.className = isPlaying
      ? 'w-2 h-2 rounded-full bg-spotify playing'
      : 'w-2 h-2 rounded-full bg-cinema-600';
  }
}

async function init(): Promise<void> {
  const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement | null;
  const playBtn = document.getElementById('play-btn') as HTMLButtonElement | null;
  const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement | null;
  const ytInput = document.getElementById('youtube-input') as HTMLInputElement | null;
  const spInput = document.getElementById('spotify-input') as HTMLInputElement | null;

  const authenticated = await checkToken();

  if (!authenticated) {
    setStatus('Connect Spotify to begin.');
    connectBtn?.addEventListener('click', () => {
      window.location.href = '/auth/login';
    });
    return;
  }

  // Hide connect button once authenticated
  if (connectBtn) connectBtn.style.display = 'none';
  setStatus('Initializing players...');

  const ytPlayer = new YouTubePlayer('youtube-container', (state) => {
    setStatus(`YouTube: ${state}`);
  });

  const spPlayer = new SpotifyPlayer(async (state) => {
    setStatus(`Spotify: ${state}`);
    const raw = await spPlayer.getRawState();
    const track = raw?.track_window?.current_track;
    if (track) {
      const artUrl = track.album.images[0]?.url ?? '';
      updateNowPlaying(track.name, track.artists.map((a) => a.name).join(', '), artUrl, state === 'playing');
    } else {
      updateNowPlaying('—', '—', '', false);
    }
  });

  const controller = new SyncController(ytPlayer, spPlayer);
  controller.start();

  playBtn?.addEventListener('click', () => {
    const ytId = parseYouTubeId(ytInput?.value ?? '');
    const spUri = parseSpotifyUri(spInput?.value ?? '');

    if (ytId) ytPlayer.load(ytId);
    if (spUri) spPlayer.load(spUri);

    controller.play();
    setStatus('Playing...');

    const placeholder = document.getElementById('yt-placeholder');
    if (placeholder) placeholder.style.display = 'none';
  });

  pauseBtn?.addEventListener('click', () => {
    controller.pause();
    setStatus('Paused.');
  });

  setStatus('Ready. Enter a YouTube video and Spotify track, then press Play.');
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(console.error);
});
