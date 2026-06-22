import { CameraAdapter, CameraState } from "./CameraAdapter";

export interface CameraHealthMetrics {
  permissionStatus: string;
  streamStatus: string;
  videoReadyState: number;
  fps: number;
  droppedFrames: number;
  lastFrameTimestamp: number;
  lastDetectionTimestamp: number;
  memoryUsageMB: number;
  errorReason: string | null;
}

export class CameraHealthService {
  private frameCount = 0;
  private lastFpsCheck = Date.now();
  private currentFps = 0;

  private droppedFrames = 0;
  private lastFrameTimestamp = 0;
  private lastDetectionTimestamp = 0;
  private errorReason: string | null = null;
  private permissionStatus = "UNKNOWN";

  /**
   * Called on every video frame requestAnimationFrame to calculate FPS.
   */
  public trackFrame(): void {
    this.frameCount++;
    this.lastFrameTimestamp = Date.now();

    const now = Date.now();
    if (now - this.lastFpsCheck >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsCheck = now;
    }
  }

  public trackDroppedFrame(): void {
    this.droppedFrames++;
  }

  public trackDetection(): void {
    this.lastDetectionTimestamp = Date.now();
  }

  public setPermissionStatus(status: "GRANTED" | "DENIED" | "REQUESTING" | "UNKNOWN" | "REVOKED"): void {
    this.permissionStatus = status;
  }

  public setError(reason: string | null): void {
    this.errorReason = reason;
  }

  public getHealth(adapter: CameraAdapter, videoEl: HTMLVideoElement | null): CameraHealthMetrics {
    const stream = adapter.getStream();
    
    // Estimate memory if performance.memory exists (Chrome only)
    const memInfo = (performance as any).memory;
    const memoryUsageMB = memInfo ? Math.round(memInfo.usedJSHeapSize / 1024 / 1024) : 0;

    let streamStatus = "OFFLINE";
    if (stream) {
      streamStatus = stream.active ? "ACTIVE" : "ENDED";
      const tracks = stream.getVideoTracks();
      if (tracks.length > 0 && tracks[0].readyState === "ended") {
        streamStatus = "TRACK_ENDED";
      }
    }

    return {
      permissionStatus: this.permissionStatus,
      streamStatus,
      videoReadyState: videoEl ? videoEl.readyState : 0,
      fps: this.currentFps,
      droppedFrames: this.droppedFrames,
      lastFrameTimestamp: this.lastFrameTimestamp,
      lastDetectionTimestamp: this.lastDetectionTimestamp,
      memoryUsageMB,
      errorReason: this.errorReason,
    };
  }
}
