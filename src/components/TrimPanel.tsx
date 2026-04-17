import { useEffect, useState, useCallback } from "react";
import { Download, Scissors } from "lucide-react";
import FileDropZone from "./FileDropZone";
import MediaPreview from "./MediaPreview";
import TrimSlider from "./TrimSlider";
import ProgressBar from "./ProgressBar";
import { getMediaKind, trimMedia } from "@/lib/ffmpeg";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

interface TrimResult {
  url: string;
  extension: string;
  mimeType: string;
}

export default function TrimPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [progress, setProgress] = useState(-1);
  const [result, setResult] = useState<TrimResult | null>(null);

  useEffect(() => {
    return () => {
      if (result) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

  const clearResult = useCallback(() => {
    if (result) {
      URL.revokeObjectURL(result.url);
    }
    setResult(null);
  }, [result]);

  const handleDurationChange = (dur: number) => {
    setDuration(dur);
    setEndTime(dur);
  };

  const handleFileSelect = useCallback((nextFile: File) => {
    const mediaKind = getMediaKind(nextFile);
    if (!mediaKind) {
      toast.error("Unsupported file", {
        description: "Choose a video or audio file to trim.",
      });
      return;
    }

    clearResult();
    setFile(nextFile);
    setDuration(0);
    setStartTime(0);
    setEndTime(0);
  }, [clearResult]);

  const handleTrim = useCallback(async () => {
    if (!file) return;
    setProgress(0);
    clearResult();
    try {
      const trimmed = await trimMedia(file, startTime, endTime, setProgress);
      const url = URL.createObjectURL(trimmed.blob);
      setResult({
        url,
        extension: trimmed.extension,
        mimeType: trimmed.mimeType,
      });
      toast.success("Trim complete", {
        description: `Your trimmed ${getMediaKind(file)} is ready to preview and download.`,
      });
    } catch (err) {
      console.error("Trim failed:", err);
      toast.error("Trim failed", {
        description:
          err instanceof Error
            ? err.message
            : "This media file could not be trimmed in the browser.",
      });
    } finally {
      setProgress(-1);
    }
  }, [clearResult, file, startTime, endTime]);

  const handleDownload = () => {
    if (!result || !file) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `trimmed_${file.name.replace(/\.[^.]+$/, "")}.${result.extension}`;
    a.click();
  };

  const isVideo = file?.type.startsWith("video/");

  return (
    <div className="space-y-6">
      {!file ? (
        <FileDropZone
          onFileSelect={handleFileSelect}
          accept="video/*,audio/*"
          label="Drop your video or audio"
          sublabel="Trim any media file to the exact length you need"
          icon="both"
        />
      ) : (
        <>
          <MediaPreview
            file={file}
            onRemove={() => {
              setFile(null);
              clearResult();
              setDuration(0);
              setStartTime(0);
              setEndTime(0);
            }}
            onDurationChange={handleDurationChange}
          />

          <div className="rounded-xl bg-card p-5 shadow-card space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary" />
              Trim Range
            </h3>
            <TrimSlider
              duration={duration}
              startTime={startTime}
              endTime={endTime}
              onStartChange={setStartTime}
              onEndChange={setEndTime}
            />
          </div>

          {progress >= 0 && <ProgressBar progress={progress} label="Trimming..." />}

          <div className="flex gap-3">
            <Button
              onClick={handleTrim}
              disabled={progress >= 0 || endTime <= startTime}
              className="gradient-primary text-primary-foreground hover:opacity-90 shadow-glow flex-1"
              size="lg"
            >
              <Scissors className="w-4 h-4 mr-2" />
              Trim {isVideo ? "Video" : "Audio"}
            </Button>
            {result && (
              <Button onClick={handleDownload} variant="outline" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>

          {result && (
            <div className="rounded-xl bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground mb-2">Preview trimmed result:</p>
              {isVideo ? (
                <video src={result.url} controls className="w-full max-h-[300px] rounded-lg" />
              ) : (
                <audio src={result.url} controls className="w-full" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
