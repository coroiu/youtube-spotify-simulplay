declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

export type PlayerState = 'playing' | 'paused' | 'unstarted';

export type StateChangeCallback = (state: PlayerState) => void;

export class SpotifyPlayer {
  private player: Spotify.Player | null = null;
  private deviceId: string | null = null;
  private currentState: PlayerState = 'unstarted';
  private onStateChange: StateChangeCallback | null = null;

  constructor(onStateChange?: StateChangeCallback) {
    this.onStateChange = onStateChange ?? null;
    this.initSDK();
  }

  private initSDK(): void {
    if (window.Spotify) {
      this.createPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = () => this.createPlayer();
    }
  }

  private async createPlayer(): Promise<void> {
    const token = await this.fetchToken();
    if (!token) return;

    this.player = new window.Spotify.Player({
      name: 'SimulPlay',
      getOAuthToken: async (cb) => {
        const refreshed = await this.fetchToken();
        cb(refreshed ?? '');
      },
      volume: 0.8,
    });

    this.player.addListener('ready', ({ device_id }) => {
      this.deviceId = device_id;
      console.log('Spotify player ready, device:', device_id);
    });

    this.player.addListener('not_ready', ({ device_id }) => {
      console.warn('Spotify device went offline:', device_id);
    });

    this.player.addListener('player_state_changed', (state) => {
      if (!state) {
        this.currentState = 'unstarted';
        this.onStateChange?.(this.currentState);
        return;
      }
      this.currentState = state.paused ? 'paused' : 'playing';
      this.onStateChange?.(this.currentState);
    });

    await this.player.connect();
  }

  private async fetchToken(): Promise<string | null> {
    try {
      const res = await fetch('/auth/token');
      if (!res.ok) return null;
      const data = (await res.json()) as { access_token?: string };
      return data.access_token ?? null;
    } catch {
      return null;
    }
  }

  async load(trackUri: string): Promise<void> {
    if (!this.deviceId) {
      console.warn('Spotify device not ready');
      return;
    }
    const token = await this.fetchToken();
    if (!token) return;

    await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [trackUri] }),
      }
    );
  }

  play(): void {
    this.player?.resume();
  }

  pause(): void {
    this.player?.pause();
  }

  async seekTo(positionMs: number): Promise<void> {
    this.player?.seek(positionMs);
  }

  getCurrentTime(): number {
    // Synchronous estimate — state is updated via player_state_changed
    return 0;
  }

  getDuration(): number {
    return 0;
  }

  getState(): PlayerState {
    return this.currentState;
  }
}
