import { useState, useCallback } from "react";
import { Download, Scissors } from "lucide-react";
import FileDropZone from "./FileDropZone";
import MediaPreview from "./MediaPreview";
import TrimSlider from "./TrimSlider";
import ProgressBar from "./ProgressBar";
import { trimMedia } from "@/lib/ffmpeg";
import { Button } from "@/components/ui/button";

export default function TrimPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [progress, setProgress] = useState(-1);
  const [result, setResult] = useState<string | null>(null);

  const handleDurationChange = (dur: number) => {
    setDuration(dur);
    setEndTime(dur);
  };

  const handleTrim = useCallback(async () => {
    if (!file) return;
    setProgress(0);
    setResult(null);
    try {
      const blob = await trimMedia(file, startTime, endTime, setProgress);
      const url = URL.createObjectURL(blob);
      setResult(url);
      setProgress(-1);
    } catch (err) {
      console.error("Trim failed:", err);
      setProgress(-1);
    }
  }, [file, startTime, endTime]);

  const handleDownload = () => {
    if (!result || !file) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = "trimmed_" + file.name;
    a.click();
  };

  const isVideo = file?.type.startsWith("video/");

  return (
    <div className="space-y-6">
      {!file ? (
        <FileDropZone
          onFileSelect={(f) => { setFile(f); setResult(null); }}
          accept="video/*,audio/*"
          label="Drop your video or audio"
          sublabel="Trim any media file to the exact length you need"
          icon="both"
        />
      ) : (
        <>
          <MediaPreview
            file={file}
            onRemove={() => { setFile(null); setResult(null); setDuration(0); }}
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
              disabled={progress >= 0}
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
                <video src={result} controls className="w-full max-h-[300px] rounded-lg" />
              ) : (
                <audio src={result} controls className="w-full" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
