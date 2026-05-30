import { useEffect, useState } from "react";
import { ArrowRightLeft, Download, Image, Minimize2, Music, Video, Zap } from "lucide-react";
import FileDropZone from "./FileDropZone";
import MediaPreview from "./MediaPreview";
import ProgressBar from "./ProgressBar";
import {
  AUDIO_FORMAT_OPTIONS,
  EXTRACT_AUDIO_OPTIONS,
  VIDEO_FORMAT_OPTIONS,
  compressAudio,
  compressVideo,
  convertAudioFormat,
  convertVideoFormat,
  convertVideoToGif,
  convertVideoToAudio,
  getCompressionEstimate,
  getMediaKind,
  getOutputExtension,
  type AudioConversionFormat,
  type ExtractAudioFormat,
  type VideoConversionFormat,
} from "@/lib/ffmpeg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

type ConvertMode =
  | "convert-video"
  | "convert-audio"
  | "extract-audio"
  | "create-gif"
  | "compress-video"
  | "compress-audio";

type ConversionResult = {
  url: string;
  extension: string;
  mimeType: string;
  outputKind: "video" | "audio" | "image";
  sizeBytes: number;
};

export default function ConvertPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
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
  const isCompressionMode =
    mode === "compress-video" || mode === "compress-audio";
  const isGifMode = mode === "create-gif";

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
        : mode === "create-gif"
          ? "Create GIF"
        : mode === "compress-video"
          ? "Compress video"
          : mode === "compress-audio"
            ? "Compress audio"
            : `Extract ${extractFormat.toUpperCase()} audio`;

  const progressLabel =
    mode === "extract-audio"
      ? "Extracting audio..."
      : mode === "create-gif"
        ? "Creating GIF..."
      : isCompressionMode
        ? "Compressing media..."
        : "Converting format...";

  const compressionEstimate =
    file && isCompressionMode ? getCompressionEstimate(file, duration) : null;

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
    setDuration(0);

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
      let mimeType: string;
      let outputKind: "video" | "audio" | "image";

      if (mode === "convert-video") {
        blob = await convertVideoFormat(file, videoFormat, setProgress);
        extension = getOutputExtension(videoFormat);
        mimeType = blob.type || `video/${extension}`;
        outputKind = "video";
      } else if (mode === "convert-audio") {
        blob = await convertAudioFormat(file, audioFormat, setProgress);
        extension = getOutputExtension(audioFormat);
        mimeType = blob.type || `audio/${extension}`;
        outputKind = "audio";
      } else if (mode === "compress-video") {
        const compressed = await compressVideo(file, duration, setProgress);
        blob = compressed.blob;
        extension = compressed.extension;
        mimeType = compressed.mimeType;
        outputKind = "video";
      } else if (mode === "create-gif") {
        const gif = await convertVideoToGif(file, setProgress);
        blob = gif.blob;
        extension = gif.extension;
        mimeType = gif.mimeType;
        outputKind = "image";
      } else if (mode === "compress-audio") {
        const compressed = await compressAudio(file, duration, setProgress);
        blob = compressed.blob;
        extension = compressed.extension;
        mimeType = compressed.mimeType;
        outputKind = "audio";
      } else {
        blob = await convertVideoToAudio(file, extractFormat, setProgress);
        extension = getOutputExtension(extractFormat);
        mimeType = blob.type || `audio/${extension}`;
        outputKind = "audio";
      }

      const url = URL.createObjectURL(blob);
      setResult({ url, extension, mimeType, outputKind, sizeBytes: blob.size });
      toast.success(
        isCompressionMode
          ? "Compression complete"
          : isGifMode
            ? "GIF created"
            : "Conversion complete",
        {
        description:
          isCompressionMode
            ? `Your smaller ${extension.toUpperCase()} ${outputKind} file is ready to preview and download.`
            : isGifMode
              ? "Your animated GIF is ready to preview and download."
            : outputKind === "video"
              ? `Your ${extension.toUpperCase()} video is ready to preview and download.`
              : `Your ${extension.toUpperCase()} audio is ready to preview and download.`,
        }
      );
    } catch (error) {
      console.error("Conversion failed:", error);
      toast.error(
        isCompressionMode
          ? "Compression failed"
          : isGifMode
            ? "GIF creation failed"
            : "Conversion failed",
        {
        description:
          error instanceof Error
            ? error.message
            : "This file could not be processed in the browser.",
        }
      );
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

  const savingsRatio =
    result && file ? Math.max(0, 1 - result.sizeBytes / file.size) : null;

  const modeCards =
    mediaKind === "video"
      ? [
          {
            id: "convert-video" as const,
            title: "Change video format",
            description: "Re-encode as MP4, WebM, or MOV.",
            icon: <ArrowRightLeft className="h-4 w-4 text-primary" />,
          },
          {
            id: "compress-video" as const,
            title: "Compress video size",
            description: "Shrink the file with automatic output settings.",
            icon: <Minimize2 className="h-4 w-4 text-primary" />,
          },
          {
            id: "create-gif" as const,
            title: "Create animated GIF",
            description: "Export the first 8 seconds as a looping GIF.",
            icon: <Image className="h-4 w-4 text-accent" />,
          },
          {
            id: "extract-audio" as const,
            title: "Extract audio only",
            description: "Pull the soundtrack out as audio.",
            icon: <Music className="h-4 w-4 text-accent" />,
          },
        ]
      : [
          {
            id: "convert-audio" as const,
            title: "Change audio format",
            description: "Switch between playback, editing, and archive formats.",
            icon: <ArrowRightLeft className="h-4 w-4 text-primary" />,
          },
          {
            id: "compress-audio" as const,
            title: "Compress audio size",
            description: "Reduce file size with automatic output settings.",
            icon: <Minimize2 className="h-4 w-4 text-primary" />,
          },
        ];

  return (
    <div className="space-y-6">
      {!file ? (
        <FileDropZone
          onFileSelect={handleFileSelect}
          accept="video/*,audio/*"
          label="Drop a video or audio file"
          sublabel="Convert, compress, or extract audio without leaving your browser"
          icon="both"
        />
      ) : (
        <>
          <MediaPreview
            file={file}
            onRemove={() => {
              setFile(null);
              setDuration(0);
              resetResult();
            }}
            onDurationChange={setDuration}
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

            <div className={`grid gap-3 ${mediaKind === "video" ? "md:grid-cols-4" : "md:grid-cols-2"}`}>
              {modeCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setMode(card.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    mode === card.id
                      ? "border-primary bg-primary/10 shadow-glow"
                      : "border-border hover:border-primary/40 hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {card.icon}
                    {card.title}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </button>
              ))}
            </div>

            {!isCompressionMode && !isGifMode && (
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
            )}

            {isCompressionMode && (
              <div className="space-y-3">
                {/* <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 text-sm text-muted-foreground">
                  Compression keeps the same file format and automatically uses one best-effort preset aimed at the
                  smallest practical result while preserving quality as much as possible. The app only keeps the result
                  when it is smaller than the original file.
                </div> */}
                {compressionEstimate && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Estimated compressed size
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          About {formatSize(compressionEstimate.expectedBytes)} as .{compressionEstimate.outputExtension}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Typical range: {formatSize(compressionEstimate.minBytes)} to {formatSize(compressionEstimate.maxBytes)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="rounded-full">
                        From {formatSize(file.size)}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {progress >= 0 && <ProgressBar progress={progress} label={progressLabel} />}

          <div className="flex gap-3">
            <Button
              onClick={runConversion}
              disabled={progress >= 0 || (isCompressionMode && duration <= 0)}
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
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Preview {isCompressionMode ? "compressed" : "converted"} result:
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary" className="rounded-full">
                    {formatSize(result.sizeBytes)} output
                  </Badge>
                  {isCompressionMode && savingsRatio !== null && (
                    <Badge variant="outline" className="rounded-full">
                      {Math.round(savingsRatio * 100)}% smaller than original
                    </Badge>
                  )}
                </div>
              </div>
              {result.outputKind === "image" ? (
                <img
                  src={result.url}
                  alt="Generated animated GIF"
                  className="w-full max-h-[320px] rounded-lg bg-background object-contain"
                />
              ) : result.outputKind === "video" ? (
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

function formatSize(sizeBytes: number): string {
  if (sizeBytes < 1000 * 1000) {
    return `${Math.max(1, Math.round(sizeBytes / 1000))} KB`;
  }

  return `${(sizeBytes / 1000 / 1000).toFixed(1)} MB`;
}
