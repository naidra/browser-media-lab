import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let progressHandler: ((progress: number) => void) | undefined;

export type MediaKind = "video" | "audio";
export type VideoConversionFormat = "mp4" | "webm" | "mov";
export type AudioConversionFormat = "mp3" | "wav" | "aac" | "flac";
export type ExtractAudioFormat = "mp3" | "wav" | "aac";

export interface FormatOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

interface OutputPreset {
  extension: string;
  mimeType: string;
  ffmpegArgs: string[];
  estimatedBitrateKbps?: number;
}

export interface ProcessedMediaResult {
  blob: Blob;
  extension: string;
  mimeType: string;
}

const videoConversionPresets: Record<VideoConversionFormat, OutputPreset> = {
  mp4: {
    extension: "mp4",
    mimeType: "video/mp4",
    ffmpegArgs: ["-c:v", "mpeg4", "-c:a", "aac", "-movflags", "+faststart"],
  },
  webm: {
    extension: "webm",
    mimeType: "video/webm",
    ffmpegArgs: ["-c:v", "libvpx", "-crf", "30", "-b:v", "0", "-c:a", "libvorbis"],
  },
  mov: {
    extension: "mov",
    mimeType: "video/quicktime",
    ffmpegArgs: ["-c:v", "mpeg4", "-c:a", "aac"],
  },
};

const audioConversionPresets: Record<AudioConversionFormat, OutputPreset> = {
  mp3: {
    extension: "mp3",
    mimeType: "audio/mpeg",
    ffmpegArgs: ["-vn", "-acodec", "libmp3lame", "-q:a", "2"],
  },
  wav: {
    extension: "wav",
    mimeType: "audio/wav",
    ffmpegArgs: ["-vn", "-acodec", "pcm_s16le"],
  },
  aac: {
    extension: "aac",
    mimeType: "audio/aac",
    ffmpegArgs: ["-vn", "-acodec", "aac", "-b:a", "192k"],
  },
  flac: {
    extension: "flac",
    mimeType: "audio/flac",
    ffmpegArgs: ["-vn", "-acodec", "flac"],
  },
};

const extractAudioPresets: Record<ExtractAudioFormat, OutputPreset> = {
  mp3: audioConversionPresets.mp3,
  wav: audioConversionPresets.wav,
  aac: audioConversionPresets.aac,
};

const DEFAULT_COMPRESSION_PROFILE = {
  targetSizeRatio: 0.52,
  targetRange: [0.38, 0.62] as [number, number],
};

export const VIDEO_FORMAT_OPTIONS: FormatOption<VideoConversionFormat>[] = [
  { value: "mp4", label: "MP4", description: "Best overall compatibility" },
  { value: "webm", label: "WebM", description: "Great for modern browsers" },
  { value: "mov", label: "MOV", description: "Handy for editing workflows" },
];

export const AUDIO_FORMAT_OPTIONS: FormatOption<AudioConversionFormat>[] = [
  { value: "mp3", label: "MP3", description: "Small size, widely supported" },
  { value: "wav", label: "WAV", description: "Uncompressed quality" },
  { value: "aac", label: "AAC", description: "Efficient for playback" },
  { value: "flac", label: "FLAC", description: "Lossless compression" },
];

export const EXTRACT_AUDIO_OPTIONS: FormatOption<ExtractAudioFormat>[] = [
  { value: "mp3", label: "MP3", description: "Fast export for sharing" },
  { value: "wav", label: "WAV", description: "Best for editing" },
  { value: "aac", label: "AAC", description: "Compact playback format" },
];

export const getFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg?.loaded) return ffmpeg;

  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    ffmpeg.on("progress", ({ progress }) => {
      progressHandler?.(Math.min(100, Math.round(progress * 100)));
    });
  }

  const coreURL = await toBlobURL(`${location.href}/ffmpeg/ffmpeg-core.js`, "text/javascript");
  const wasmURL = await toBlobURL(`${location.href}/ffmpeg/ffmpeg-core.wasm`, "application/wasm");

  await ffmpeg.load({ coreURL, wasmURL });
  return ffmpeg;
};

async function runFFmpegJob<T>(
  onProgress: ((progress: number) => void) | undefined,
  job: (ff: FFmpeg) => Promise<T>
): Promise<T> {
  progressHandler = onProgress;
  onProgress?.(0);

  try {
    const ff = await getFFmpeg();
    const result = await job(ff);
    onProgress?.(100);
    return result;
  } finally {
    progressHandler = undefined;
  }
}

async function transcodeFile(
  file: File,
  preset: OutputPreset,
  onProgress?: (progress: number) => void
): Promise<ProcessedMediaResult> {
  const inputName = `input${getExtension(file.name) || ".bin"}`;
  const outputName = `output.${preset.extension}`;

  return runFFmpegJob(onProgress, async (ff) => {
    await ff.writeFile(inputName, await fetchFile(file));

    try {
      await ff.exec(["-i", inputName, ...preset.ffmpegArgs, outputName]);
      const data = await ff.readFile(outputName);
      return {
        blob: new Blob([data], { type: preset.mimeType }),
        extension: preset.extension,
        mimeType: preset.mimeType,
      };
    } finally {
      await safelyDeleteFile(ff, inputName);
      await safelyDeleteFile(ff, outputName);
    }
  });
}

export const trimMedia = async (
  file: File,
  startTime: number,
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<ProcessedMediaResult> => {
  const mediaKind = getMediaKind(file);
  if (!mediaKind) {
    throw new Error("Please choose a supported audio or video file to trim.");
  }

  const preset = getTrimPreset(file);
  const inputName = `input${getExtension(file.name) || ".bin"}`;
  const outputName = `output.${preset.extension}`;

  if (endTime <= startTime) {
    throw new Error("Choose a trim range longer than 0 seconds.");
  }

  return runFFmpegJob(onProgress, async (ff) => {
    await ff.writeFile(inputName, await fetchFile(file));

    try {
      await ff.exec([
        "-i", inputName,
        "-ss", formatTime(startTime),
        "-to", formatTime(endTime),
        "-map", "0:v:0?",
        "-map", "0:a:0?",
        ...preset.ffmpegArgs,
        "-avoid_negative_ts", "make_zero",
        outputName,
      ]);
      const data = await ff.readFile(outputName);
      return {
        blob: new Blob([data], { type: preset.mimeType }),
        extension: preset.extension,
        mimeType: preset.mimeType,
      };
    } finally {
      await safelyDeleteFile(ff, inputName);
      await safelyDeleteFile(ff, outputName);
    }
  });
};

export const convertVideoFormat = async (
  file: File,
  format: VideoConversionFormat,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  if (getMediaKind(file) !== "video") {
    throw new Error("Please choose a video file to convert video formats.");
  }

  const result = await transcodeFile(file, videoConversionPresets[format], onProgress);
  return result.blob;
};

export const convertAudioFormat = async (
  file: File,
  format: AudioConversionFormat,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  if (getMediaKind(file) !== "audio") {
    throw new Error("Please choose an audio file to convert audio formats.");
  }

  const result = await transcodeFile(file, audioConversionPresets[format], onProgress);
  return result.blob;
};

export const convertVideoToAudio = async (
  file: File,
  format: ExtractAudioFormat = "mp3",
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  if (getMediaKind(file) !== "video") {
    throw new Error("Audio extraction is only available for video files.");
  }

  const result = await transcodeFile(file, extractAudioPresets[format], onProgress);
  return result.blob;
};

export const convertVideoToGif = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<ProcessedMediaResult> => {
  if (getMediaKind(file) !== "video") {
    throw new Error("GIF export is only available for video files.");
  }

  const inputName = `input${getExtension(file.name) || ".bin"}`;
  const outputName = "output.gif";

  return runFFmpegJob(onProgress, async (ff) => {
    await ff.writeFile(inputName, await fetchFile(file));

    try {
      await ff.exec([
        "-i", inputName,
        "-t", "8",
        "-vf", "fps=12,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
        "-loop", "0",
        outputName,
      ]);
      const data = await ff.readFile(outputName);
      return {
        blob: new Blob([data], { type: "image/gif" }),
        extension: "gif",
        mimeType: "image/gif",
      };
    } finally {
      await safelyDeleteFile(ff, inputName);
      await safelyDeleteFile(ff, outputName);
    }
  });
};

export const compressVideo = async (
  file: File,
  durationSeconds: number,
  onProgress?: (progress: number) => void
): Promise<ProcessedMediaResult> => {
  if (getMediaKind(file) !== "video") {
    throw new Error("Please choose a video file to compress.");
  }

  const sourceBitrate = getSourceBitrate(file.size, durationSeconds);
  const targetTotalBitrate = getTargetBitrate(
    sourceBitrate,
    DEFAULT_COMPRESSION_PROFILE.targetSizeRatio,
    256
  );

  const attempts = buildVideoCompressionAttempts(file, targetTotalBitrate);

  for (const preset of attempts) {
    const result = await transcodeFile(file, preset, onProgress);
    if (result.blob.size < file.size) {
      return result;
    }
  }

  throw new Error("This video is already optimized and could not be compressed to a smaller size.");
};

export const compressAudio = async (
  file: File,
  durationSeconds: number,
  onProgress?: (progress: number) => void
): Promise<ProcessedMediaResult> => {
  if (getMediaKind(file) !== "audio") {
    throw new Error("Please choose an audio file to compress.");
  }

  const sourceBitrate = getSourceBitrate(file.size, durationSeconds);
  const attempts = buildAudioCompressionAttempts(
    file,
    sourceBitrate,
    DEFAULT_COMPRESSION_PROFILE.targetSizeRatio
  );

  for (const preset of attempts) {
    const result = await transcodeFile(file, preset, onProgress);
    if (result.blob.size < file.size) {
      return result;
    }
  }

  throw new Error("This audio file is already optimized and could not be compressed to a smaller size.");
};

export function getCompressionEstimate(
  file: File,
  durationSeconds: number
): { minBytes: number; maxBytes: number; expectedBytes: number; outputExtension: string } | null {
  const mediaKind = getMediaKind(file);
  if (!mediaKind || durationSeconds <= 0) {
    return null;
  }

  const sourceBitrate = getSourceBitrate(file.size, durationSeconds);
  const attempts =
    mediaKind === "video"
      ? buildVideoCompressionAttempts(
          file,
          getTargetBitrate(
            sourceBitrate,
            DEFAULT_COMPRESSION_PROFILE.targetSizeRatio,
            256
          )
        )
      : buildAudioCompressionAttempts(
          file,
          sourceBitrate,
          DEFAULT_COMPRESSION_PROFILE.targetSizeRatio
        );

  const estimatedSizes = attempts
    .map((attempt) => getEstimatedSizeBytes(attempt, durationSeconds))
    .filter((size): size is number => typeof size === "number")
    .sort((a, b) => a - b);

  if (estimatedSizes.length === 0) {
    return null;
  }

  return {
    minBytes: estimatedSizes[0],
    maxBytes: estimatedSizes[estimatedSizes.length - 1],
    expectedBytes: estimatedSizes[Math.min(estimatedSizes.length - 1, 1)] ?? estimatedSizes[0],
    outputExtension: attempts[0]?.extension ?? getCompressionOutputExtension(file),
  };
}

export function getMediaKind(file: File): MediaKind | null {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

export function getOutputExtension(
  format: VideoConversionFormat | AudioConversionFormat | ExtractAudioFormat
): string {
  const extension =
    videoConversionPresets[format as VideoConversionFormat]?.extension ||
    audioConversionPresets[format as AudioConversionFormat]?.extension ||
    extractAudioPresets[format as ExtractAudioFormat]?.extension;

  if (!extension) {
    throw new Error(`Unsupported output format: ${format}`);
  }

  return extension;
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.substring(idx) : "";
}

function getNormalizedExtension(filename: string): string {
  return getExtension(filename).slice(1).toLowerCase();
}

function getTrimPreset(file: File): OutputPreset {
  const mediaKind = getMediaKind(file);
  const normalizedExtension = getNormalizedExtension(file.name);

  if (mediaKind === "audio") {
    if (normalizedExtension === "wav") return audioConversionPresets.wav;
    if (normalizedExtension === "aac") return audioConversionPresets.aac;
    if (normalizedExtension === "flac") return audioConversionPresets.flac;
    return audioConversionPresets.mp3;
  }

  if (normalizedExtension === "webm") return videoConversionPresets.webm;
  if (normalizedExtension === "mov") return videoConversionPresets.mov;
  return videoConversionPresets.mp4;
}

function getCompressionOutputExtension(file: File): string {
  const normalizedExtension = getNormalizedExtension(file.name);
  if (normalizedExtension === "m4a") return "aac";
  if (normalizedExtension) return normalizedExtension;
  return getMediaKind(file) === "video" ? "mp4" : "mp3";
}

function getSourceBitrate(sizeBytes: number, durationSeconds: number): number {
  if (durationSeconds <= 0) {
    throw new Error("Media duration is required for compression.");
  }

  return Math.max(32, Math.floor((sizeBytes * 8) / 1000 / durationSeconds));
}

function getTargetBitrate(sourceBitrateKbps: number, ratio: number, minBitrateKbps: number): number {
  return Math.max(minBitrateKbps, Math.floor(sourceBitrateKbps * ratio * 0.92));
}

function buildVideoCompressionAttempts(file: File, targetTotalBitrateKbps: number): OutputPreset[] {
  const outputExtension = getCompressionOutputExtension(file);
  const videoShare = 0.82;
  const audioBitrate = Math.max(48, Math.min(128, Math.floor(targetTotalBitrateKbps * 0.18)));
  const videoBitrate = Math.max(180, Math.floor(targetTotalBitrateKbps * videoShare));
  const lowerVideoBitrate = Math.max(140, Math.floor(videoBitrate * 0.72));
  const lowerAudioBitrate = Math.max(40, Math.floor(audioBitrate * 0.75));

  if (outputExtension === "webm") {
    return [
      {
        extension: "webm",
        mimeType: "video/webm",
        ffmpegArgs: [
          "-c:v", "libvpx",
          "-deadline", "good",
          "-cpu-used", "2",
          "-b:v", `${videoBitrate}k`,
          "-crf", "34",
          "-c:a", "libvorbis",
          "-b:a", `${audioBitrate}k`,
        ],
        estimatedBitrateKbps: videoBitrate + audioBitrate + 24,
      },
      {
        extension: "webm",
        mimeType: "video/webm",
        ffmpegArgs: [
          "-c:v", "libvpx",
          "-deadline", "good",
          "-cpu-used", "4",
          "-b:v", `${lowerVideoBitrate}k`,
          "-crf", "38",
          "-c:a", "libvorbis",
          "-b:a", `${lowerAudioBitrate}k`,
        ],
        estimatedBitrateKbps: lowerVideoBitrate + lowerAudioBitrate + 24,
      },
    ];
  }

  if (outputExtension === "mov") {
    return [
      {
        extension: "mov",
        mimeType: "video/quicktime",
        ffmpegArgs: [
          "-c:v", "mpeg4",
          "-b:v", `${videoBitrate}k`,
          "-maxrate", `${videoBitrate}k`,
          "-bufsize", `${videoBitrate * 2}k`,
          "-c:a", "aac",
          "-b:a", `${audioBitrate}k`,
        ],
        estimatedBitrateKbps: videoBitrate + audioBitrate + 16,
      },
      {
        extension: "mov",
        mimeType: "video/quicktime",
        ffmpegArgs: [
          "-c:v", "mpeg4",
          "-b:v", `${lowerVideoBitrate}k`,
          "-maxrate", `${lowerVideoBitrate}k`,
          "-bufsize", `${lowerVideoBitrate * 2}k`,
          "-c:a", "aac",
          "-b:a", `${lowerAudioBitrate}k`,
        ],
        estimatedBitrateKbps: lowerVideoBitrate + lowerAudioBitrate + 16,
      },
    ];
  }

  return [
    {
      extension: "mp4",
      mimeType: "video/mp4",
      ffmpegArgs: [
        "-c:v", "mpeg4",
        "-b:v", `${videoBitrate}k`,
        "-maxrate", `${videoBitrate}k`,
        "-bufsize", `${videoBitrate * 2}k`,
        "-c:a", "aac",
        "-b:a", `${audioBitrate}k`,
        "-movflags", "+faststart",
      ],
      estimatedBitrateKbps: videoBitrate + audioBitrate + 12,
    },
    {
      extension: "mp4",
      mimeType: "video/mp4",
      ffmpegArgs: [
        "-c:v", "mpeg4",
        "-b:v", `${lowerVideoBitrate}k`,
        "-maxrate", `${lowerVideoBitrate}k`,
        "-bufsize", `${lowerVideoBitrate * 2}k`,
        "-c:a", "aac",
        "-b:a", `${lowerAudioBitrate}k`,
        "-movflags", "+faststart",
      ],
      estimatedBitrateKbps: lowerVideoBitrate + lowerAudioBitrate + 12,
    },
  ];
}

function buildAudioCompressionAttempts(
  file: File,
  sourceBitrateKbps: number,
  ratio: number
): OutputPreset[] {
  const outputExtension = getCompressionOutputExtension(file);
  const primaryBitrate = getTargetBitrate(sourceBitrateKbps, ratio, 48);
  const fallbackBitrate = Math.max(40, Math.floor(primaryBitrate * 0.7));

  if (outputExtension === "wav") {
    return [
      {
        extension: "wav",
        mimeType: "audio/wav",
        ffmpegArgs: ["-vn", "-acodec", "adpcm_ima_wav"],
        estimatedBitrateKbps: Math.max(64, Math.floor(sourceBitrateKbps * 0.28)),
      },
    ];
  }

  if (outputExtension === "flac") {
    return [
      {
        extension: "flac",
        mimeType: "audio/flac",
        ffmpegArgs: ["-vn", "-acodec", "flac", "-compression_level", "12"],
        estimatedBitrateKbps: Math.max(96, Math.floor(sourceBitrateKbps * 0.7)),
      },
    ];
  }

  if (outputExtension === "aac") {
    return [
      {
        extension: "aac",
        mimeType: "audio/aac",
        ffmpegArgs: ["-vn", "-acodec", "aac", "-b:a", `${primaryBitrate}k`],
        estimatedBitrateKbps: primaryBitrate + 6,
      },
      {
        extension: "aac",
        mimeType: "audio/aac",
        ffmpegArgs: ["-vn", "-acodec", "aac", "-b:a", `${fallbackBitrate}k`],
        estimatedBitrateKbps: fallbackBitrate + 6,
      },
    ];
  }

  return [
    {
      extension: "mp3",
      mimeType: "audio/mpeg",
      ffmpegArgs: ["-vn", "-acodec", "libmp3lame", "-b:a", `${primaryBitrate}k`],
      estimatedBitrateKbps: primaryBitrate + 4,
    },
    {
      extension: "mp3",
      mimeType: "audio/mpeg",
      ffmpegArgs: ["-vn", "-acodec", "libmp3lame", "-b:a", `${fallbackBitrate}k`],
      estimatedBitrateKbps: fallbackBitrate + 4,
    },
  ];
}

function getEstimatedSizeBytes(preset: OutputPreset, durationSeconds: number): number | null {
  if (!preset.estimatedBitrateKbps || durationSeconds <= 0) {
    return null;
  }

  const dataBytes = (preset.estimatedBitrateKbps * 1000 * durationSeconds) / 8;
  const containerOverheadBytes = Math.max(4 * 1024, Math.round(dataBytes * 0.015));
  return Math.max(1, Math.round(dataBytes + containerOverheadBytes));
}

async function safelyDeleteFile(ff: FFmpeg, fileName: string) {
  try {
    await ff.deleteFile(fileName);
  } catch {
    // Ignore cleanup errors if the file was never created.
  }
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
}

export function formatTimeDisplay(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  return `${m}:${s.toString().padStart(2, "0")}`;
}
