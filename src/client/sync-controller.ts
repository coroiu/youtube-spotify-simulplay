import { YouTubePlayer, PlayerState as YTState } from './youtube-player';
import { SpotifyPlayer, PlayerState as SpState } from './spotify-player';

type Leader = 'youtube' | 'spotify';

const SYNC_INTERVAL_MS = 500;
const DRIFT_THRESHOLD_S = 1.5;

export class SyncController {
  private leader: Leader = 'youtube';
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private ignoreNextStateChange = false;

  constructor(
    private readonly yt: YouTubePlayer,
    private readonly sp: SpotifyPlayer
  ) {
    yt['onStateChange'] = (state: YTState) => this.onYTStateChange(state);
    sp['onStateChange'] = (state: SpState) => this.onSpStateChange(state);
  }

  start(): void {
    this.intervalId = setInterval(() => this.syncLoop(), SYNC_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  play(): void {
    this.yt.play();
    this.sp.play();
  }

  pause(): void {
    this.yt.pause();
    this.sp.pause();
  }

  seekTo(seconds: number): void {
    this.yt.seekTo(seconds);
    this.sp.seekTo(seconds * 1000);
  }

  private syncLoop(): void {
    const ytTime = this.yt.getCurrentTime();
    const spTime = this.sp.getCurrentTime() / 1000;

    const drift = Math.abs(ytTime - spTime);
    if (drift <= DRIFT_THRESHOLD_S) return;

    if (this.leader === 'youtube') {
      this.sp.seekTo(ytTime * 1000);
    } else {
      this.yt.seekTo(spTime);
    }
  }

  private onYTStateChange(state: YTState): void {
    this.leader = 'youtube';
    if (this.ignoreNextStateChange) {
      this.ignoreNextStateChange = false;
      return;
    }
    this.ignoreNextStateChange = true;
    if (state === 'playing') {
      this.sp.play();
    } else if (state === 'paused') {
      this.sp.pause();
    }
  }

  private onSpStateChange(state: SpState): void {
    this.leader = 'spotify';
    if (this.ignoreNextStateChange) {
      this.ignoreNextStateChange = false;
      return;
    }
    this.ignoreNextStateChange = true;
    if (state === 'playing') {
      this.yt.play();
    } else if (state === 'paused') {
      this.yt.pause();
    }
  }
}
