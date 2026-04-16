import { formatTimeDisplay } from "@/lib/ffmpeg";

interface TrimSliderProps {
  duration: number;
  startTime: number;
  endTime: number;
  onStartChange: (v: number) => void;
  onEndChange: (v: number) => void;
}

export default function TrimSlider({ duration, startTime, endTime, onStartChange, onEndChange }: TrimSliderProps) {
  if (duration <= 0) return null;

  const startPct = (startTime / duration) * 100;
  const endPct = (endTime / duration) * 100;

  return (
    <div className="space-y-4">
      <div className="relative h-10 rounded-lg bg-secondary overflow-hidden">
        {/* Selected range */}
        <div
          className="absolute top-0 h-full gradient-primary opacity-30 rounded"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />
        {/* Start handle */}
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={startTime}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (v < endTime - 0.5) onStartChange(v);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          style={{ clipPath: "inset(0 50% 0 0)" }}
        />
        {/* End handle */}
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={endTime}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (v > startTime + 0.5) onEndChange(v);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          style={{ clipPath: "inset(0 0 0 50%)" }}
        />
        {/* Visual handles */}
        <div
          className="absolute top-0 h-full w-1 bg-primary rounded-full shadow-glow"
          style={{ left: `${startPct}%` }}
        />
        <div
          className="absolute top-0 h-full w-1 bg-primary rounded-full shadow-glow"
          style={{ left: `${endPct}%` }}
        />
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Start</label>
          <span className="font-mono text-sm text-foreground bg-secondary px-2 py-1 rounded">
            {formatTimeDisplay(startTime)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Duration: {formatTimeDisplay(endTime - startTime)}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">End</label>
          <span className="font-mono text-sm text-foreground bg-secondary px-2 py-1 rounded">
            {formatTimeDisplay(endTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
