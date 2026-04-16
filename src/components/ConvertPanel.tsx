import { useState, useCallback } from "react";
import { Download, Zap } from "lucide-react";
import FileDropZone from "./FileDropZone";
import MediaPreview from "./MediaPreview";
import ProgressBar from "./ProgressBar";
import { convertVideoToAudio } from "@/lib/ffmpeg";
import { Button } from "@/components/ui/button";

export default function ConvertPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"mp3" | "wav" | "aac">("mp3");
  const [progress, setProgress] = useState(-1);
  const [result, setResult] = useState<string | null>(null);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setProgress(0);
    setResult(null);
    try {
      const blob = await convertVideoToAudio(file, format, setProgress);
      const url = URL.createObjectURL(blob);
      setResult(url);
      setProgress(-1);
    } catch (err) {
      console.error("Conversion failed:", err);
      setProgress(-1);
    }
  }, [file, format]);

  const handleDownload = () => {
    if (!result || !file) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = file.name.replace(/\.[^.]+$/, "") + "." + format;
    a.click();
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <FileDropZone
          onFileSelect={setFile}
          accept="video/*"
          label="Drop your video here"
          sublabel="Supports MP4, WebM, MOV, AVI and more"
          icon="video"
        />
      ) : (
        <>
          <MediaPreview file={file} onRemove={() => { setFile(null); setResult(null); }} />

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-muted-foreground">Output Format</label>
            <div className="flex gap-2">
              {(["mp3", "wav", "aac"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-mono font-medium uppercase transition-all ${
                    format === f
                      ? "gradient-primary text-primary-foreground shadow-glow"
                      : "bg-secondary text-secondary-foreground hover:bg-muted"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {progress >= 0 && <ProgressBar progress={progress} label="Converting..." />}

          <div className="flex gap-3">
            <Button
              onClick={handleConvert}
              disabled={progress >= 0}
              className="gradient-primary text-primary-foreground hover:opacity-90 shadow-glow flex-1"
              size="lg"
            >
              <Zap className="w-4 h-4 mr-2" />
              Extract Audio
            </Button>
            {result && (
              <Button onClick={handleDownload} variant="outline" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Download .{format}
              </Button>
            )}
          </div>

          {result && (
            <div className="rounded-xl bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground mb-2">Preview extracted audio:</p>
              <audio src={result} controls className="w-full" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
