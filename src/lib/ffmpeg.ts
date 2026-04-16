import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

export const getFFmpeg = async (
  onProgress?: (progress: number) => void
): Promise<FFmpeg> => {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.round(progress * 100));
    });
  }

  const coreURL = await toBlobURL(
    "/ffmpeg/ffmpeg-core.js",
    "text/javascript"
  );
  const wasmURL = await toBlobURL(
    "/ffmpeg/ffmpeg-core.wasm",
    "application/wasm"
  );

  await ffmpeg.load({ coreURL, wasmURL });
  return ffmpeg;
};

export const convertVideoToAudio = async (
  file: File,
  format: "mp3" | "wav" | "aac" = "mp3",
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ff = await getFFmpeg(onProgress);
  const inputName = "input" + getExtension(file.name);
  const outputName = `output.${format}`;

  await ff.writeFile(inputName, await fetchFile(file));
  await ff.exec(["-i", inputName, "-vn", "-acodec", format === "mp3" ? "libmp3lame" : format === "aac" ? "aac" : "pcm_s16le", "-q:a", "2", outputName]);
  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  const mimeMap = { mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac" };
  return new Blob([data], { type: mimeMap[format] });
};

export const trimMedia = async (
  file: File,
  startTime: number,
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ff = await getFFmpeg(onProgress);
  const ext = getExtension(file.name);
  const inputName = "input" + ext;
  const outputName = "output" + ext;

  await ff.writeFile(inputName, await fetchFile(file));
  const duration = endTime - startTime;
  await ff.exec([
    "-i", inputName,
    "-ss", formatTime(startTime),
    "-t", formatTime(duration),
    "-c", "copy",
    outputName,
  ]);
  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  return new Blob([data], { type: file.type });
};

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.substring(idx) : "";
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
}

export function formatTimeDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
