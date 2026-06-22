export type CameraState = "IDLE" | "REQUESTING_PERMISSION" | "ACTIVE" | "ERROR" | "STOPPED";

export interface CameraAdapterOptions {
  facingMode?: "user" | "environment";
  width?: { ideal: number };
  height?: { ideal: number };
}

export class CameraAdapter {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  
  constructor(private options: CameraAdapterOptions = { facingMode: "environment" }) {}

  public async start(videoEl: HTMLVideoElement): Promise<MediaStream> {
    console.log("[CameraAdapter] start() requested.");
    this.videoElement = videoEl;
    
    // Cleanup any existing stream to prevent duplicate locks
    this.stop();

    try {
      console.log("[CameraAdapter] Requesting navigator.mediaDevices.getUserMedia...");
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: this.options.facingMode,
          width: this.options.width,
          height: this.options.height,
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[CameraAdapter] Stream acquired. Tracks:", stream.getVideoTracks().map(t => t.label));
      
      this.stream = stream;
      this.videoElement.srcObject = stream;
      
      // Critical properties for iOS/Safari Autoplay
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      
      // Wait for play to begin
      await this.videoElement.play();
      console.log("[CameraAdapter] Video element playing successfully.");
      
      return stream;
    } catch (err: any) {
      console.error("[CameraAdapter] start() failed:", err);
      throw err;
    }
  }

  public stop(): void {
    console.log("[CameraAdapter] stop() requested.");
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.stop();
        console.log(`[CameraAdapter] Stopped track: ${track.label}`);
      });
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  public async restart(videoEl: HTMLVideoElement): Promise<MediaStream> {
    console.log("[CameraAdapter] restart() requested.");
    this.stop();
    return this.start(videoEl);
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }
}
