declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

export type PlayerState = 'playing' | 'paused' | 'unstarted';

export type StateChangeCallback = (state: PlayerState) => void;

export class YouTubePlayer {
  private player: YT.Player | null = null;
  private ready = false;
  private pendingVideoId: string | null = null;
  private onStateChange: StateChangeCallback | null = null;

  constructor(
    private readonly containerId: string,
    onStateChange?: StateChangeCallback
  ) {
    this.onStateChange = onStateChange ?? null;
    this.initAPI();
  }

  private initAPI(): void {
    if (window.YT && window.YT.Player) {
      this.createPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        this.createPlayer();
      };
    }
  }

  private createPlayer(): void {
    this.player = new window.YT.Player(this.containerId, {
      height: '360',
      width: '640',
      playerVars: { autoplay: 0, controls: 1 },
      events: {
        onReady: () => {
          this.ready = true;
          if (this.pendingVideoId) {
            this.load(this.pendingVideoId);
            this.pendingVideoId = null;
          }
        },
        onStateChange: (event: YT.OnStateChangeEvent) => {
          const state = this.mapState(event.data);
          this.onStateChange?.(state);
        },
      },
    });
  }

  private mapState(ytState: number): PlayerState {
    switch (ytState) {
      case window.YT.PlayerState.PLAYING:
        return 'playing';
      case window.YT.PlayerState.PAUSED:
        return 'paused';
      default:
        return 'unstarted';
    }
  }

  load(videoId: string): void {
    if (!this.ready || !this.player) {
      this.pendingVideoId = videoId;
      return;
    }
    this.player.cueVideoById(videoId);
  }

  play(): void {
    this.player?.playVideo();
  }

  pause(): void {
    this.player?.pauseVideo();
  }

  seekTo(seconds: number): void {
    this.player?.seekTo(seconds, true);
  }

  getCurrentTime(): number {
    return this.player?.getCurrentTime() ?? 0;
  }

  getDuration(): number {
    return this.player?.getDuration() ?? 0;
  }

  getState(): PlayerState {
    if (!this.player) return 'unstarted';
    const raw = this.player.getPlayerState();
    return this.mapState(raw);
  }
}
