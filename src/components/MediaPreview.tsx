import { useRef, useEffect, useState } from "react";
import { X, FileVideo, FileAudio } from "lucide-react";
import { formatTimeDisplay } from "@/lib/ffmpeg";

interface MediaPreviewProps {
  file: File;
  onRemove: () => void;
  onDurationChange?: (duration: number) => void;
  onTimeUpdate?: (time: number) => void;
  seekTo?: number;
}

export default function MediaPreview({ file, onRemove, onDurationChange, onTimeUpdate, seekTo }: MediaPreviewProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const isVideo = file.type.startsWith("video/");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (seekTo !== undefined && mediaRef.current) {
      mediaRef.current.currentTime = seekTo;
    }
  }, [seekTo]);

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      const dur = mediaRef.current.duration;
      setDuration(dur);
      onDurationChange?.(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      const t = mediaRef.current.currentTime;
      setCurrentTime(t);
      onTimeUpdate?.(t);
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-card shadow-card">
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {isVideo ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={url}
          controls
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          className="w-full max-h-[400px] object-contain bg-background"
        />
      ) : (
        <div className="p-8 flex flex-col items-center gap-4">
          <FileAudio className="w-16 h-16 text-accent" />
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            src={url}
            controls
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            className="w-full"
          />
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 bg-secondary/50">
        <div className="flex items-center gap-2">
          {isVideo ? <FileVideo className="w-4 h-4 text-primary" /> : <FileAudio className="w-4 h-4 text-accent" />}
          <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <span>{formatTimeDisplay(currentTime)} / {formatTimeDisplay(duration)}</span>
          <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
        </div>
      </div>
    </div>
  );
}
