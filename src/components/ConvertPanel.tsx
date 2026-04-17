import { useEffect, useState } from "react";
import { ArrowRightLeft, Download, Music, Video, Zap } from "lucide-react";
import FileDropZone from "./FileDropZone";
import MediaPreview from "./MediaPreview";
import ProgressBar from "./ProgressBar";
import {
  AUDIO_FORMAT_OPTIONS,
  EXTRACT_AUDIO_OPTIONS,
  VIDEO_FORMAT_OPTIONS,
  convertAudioFormat,
  convertVideoFormat,
  convertVideoToAudio,
  getMediaKind,
  getOutputExtension,
  type AudioConversionFormat,
  type ExtractAudioFormat,
  type VideoConversionFormat,
} from "@/lib/ffmpeg";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

type ConvertMode = "convert-video" | "convert-audio" | "extract-audio";
type ConversionResult = {
  url: string;
  extension: string;
  outputKind: "video" | "audio";
};

export default function ConvertPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ConvertMode>("convert-video");
  const [videoFormat, setVideoFormat] = useState<VideoConversionFormat>("mp4");
  const [audioFormat, setAudioFormat] = useState<AudioConversionFormat>("mp3");
  const [extractFormat, setExtractFormat] = useState<ExtractAudioFormat>("mp3");
  const [progress, setProgress] = useState(-1);
  const [result, setResult] = useState<ConversionResult | null>(null);

  useEffect(() => {
    return () => {
      if (result) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

  const mediaKind = file ? getMediaKind(file) : null;
  const formatOptions =
    mode === "convert-video"
      ? VIDEO_FORMAT_OPTIONS
      : mode === "convert-audio"
        ? AUDIO_FORMAT_OPTIONS
        : EXTRACT_AUDIO_OPTIONS;

  const selectedFormat =
    mode === "convert-video"
      ? videoFormat
      : mode === "convert-audio"
        ? audioFormat
        : extractFormat;

  const actionLabel =
    mode === "convert-video"
      ? `Convert to ${videoFormat.toUpperCase()}`
      : mode === "convert-audio"
        ? `Convert to ${audioFormat.toUpperCase()}`
        : `Extract ${extractFormat.toUpperCase()} audio`;

  const progressLabel =
    mode === "extract-audio" ? "Extracting audio..." : "Converting format...";

  const resetResult = () => {
    if (result) {
      URL.revokeObjectURL(result.url);
    }
    setResult(null);
  };

  const handleFileSelect = (nextFile: File) => {
    const nextKind = getMediaKind(nextFile);
    if (!nextKind) {
      toast.error("Unsupported file", {
        description: "Choose a video or audio file to convert.",
      });
      return;
    }

    resetResult();
    setFile(nextFile);

    if (nextKind === "audio") {
      setMode("convert-audio");
    } else {
      setMode("convert-video");
    }
  };

  const runConversion = async () => {
    if (!file || !mediaKind) return;

    setProgress(0);
    resetResult();

    try {
      let blob: Blob;
      let extension: string;
      let outputKind: "video" | "audio";

      if (mode === "convert-video") {
        blob = await convertVideoFormat(file, videoFormat, setProgress);
        extension = getOutputExtension(videoFormat);
        outputKind = "video";
      } else if (mode === "convert-audio") {
        blob = await convertAudioFormat(file, audioFormat, setProgress);
        extension = getOutputExtension(audioFormat);
        outputKind = "audio";
      } else {
        blob = await convertVideoToAudio(file, extractFormat, setProgress);
        extension = getOutputExtension(extractFormat);
        outputKind = "audio";
      }

      const url = URL.createObjectURL(blob);
      setResult({ url, extension, outputKind });
      toast.success("Conversion complete", {
        description:
          outputKind === "video"
            ? `Your ${extension.toUpperCase()} video is ready to preview and download.`
            : `Your ${extension.toUpperCase()} audio is ready to preview and download.`,
      });
    } catch (error) {
      console.error("Conversion failed:", error);
      toast.error("Conversion failed", {
        description:
          error instanceof Error
            ? error.message
            : "This file could not be converted in the browser.",
      });
    } finally {
      setProgress(-1);
    }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `${file.name.replace(/\.[^.]+$/, "")}.${result.extension}`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <FileDropZone
          onFileSelect={handleFileSelect}
          accept="video/*,audio/*"
          label="Drop a video or audio file"
          sublabel="Convert between formats or extract audio without leaving your browser"
          icon="both"
        />
      ) : (
        <>
          <MediaPreview
            file={file}
            onRemove={() => {
              setFile(null);
              resetResult();
            }}
          />

          <div className="rounded-2xl bg-card p-5 shadow-card space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Input detected
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                {mediaKind === "video" ? (
                  <Video className="h-4 w-4 text-primary" />
                ) : (
                  <Music className="h-4 w-4 text-accent" />
                )}
                {mediaKind === "video" ? "Video file" : "Audio file"}
              </span>
            </div>

            {mediaKind === "video" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  onClick={() => setMode("convert-video")}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    mode === "convert-video"
                      ? "border-primary bg-primary/10 shadow-glow"
                      : "border-border hover:border-primary/40 hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    Change video format
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Re-encode your video as MP4, WebM, or MOV.
                  </p>
                </button>
                <button
                  onClick={() => setMode("extract-audio")}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    mode === "extract-audio"
                      ? "border-primary bg-primary/10 shadow-glow"
                      : "border-border hover:border-primary/40 hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Music className="h-4 w-4 text-accent" />
                    Extract audio only
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Pull the soundtrack out as MP3, WAV, or AAC.
                  </p>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                  Change audio format
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Convert this audio file to the format that best fits playback, editing, or archiving.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">
                Output Format
              </label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {formatOptions.map((option) => {
                  const isSelected = selectedFormat === option.value;
                  const setFormat =
                    mode === "convert-video"
                      ? () => setVideoFormat(option.value as VideoConversionFormat)
                      : mode === "convert-audio"
                        ? () => setAudioFormat(option.value as AudioConversionFormat)
                        : () => setExtractFormat(option.value as ExtractAudioFormat);

                  return (
                    <button
                      key={option.value}
                      onClick={setFormat}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-glow"
                          : "border-border hover:border-primary/40 hover:bg-secondary/40"
                      }`}
                    >
                      <div className="text-sm font-mono font-semibold uppercase text-foreground">
                        {option.label}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {progress >= 0 && <ProgressBar progress={progress} label={progressLabel} />}

          <div className="flex gap-3">
            <Button
              onClick={runConversion}
              disabled={progress >= 0}
              className="gradient-primary text-primary-foreground hover:opacity-90 shadow-glow flex-1"
              size="lg"
            >
              <Zap className="w-4 h-4 mr-2" />
              {actionLabel}
            </Button>
            {result && (
              <Button onClick={handleDownload} variant="outline" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Download .{result.extension}
              </Button>
            )}
          </div>

          {result && (
            <div className="rounded-xl bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground mb-2">
                Preview converted result:
              </p>
              {result.outputKind === "video" ? (
                <video
                  src={result.url}
                  controls
                  className="w-full max-h-[320px] rounded-lg bg-background"
                />
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
