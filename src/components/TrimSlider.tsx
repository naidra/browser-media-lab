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
      <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/15 px-2 py-1 font-semibold text-primary">
              Start
            </span>
            <span>Start the drag from the middle toward the left side, then stop where the trim should begin.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/15 px-2 py-1 font-semibold text-accent">
              End
            </span>
            <span>Start the drag from the middle toward the right side, then stop where the trim should end.</span>
          </div>
        </div>
      </div>

      <div className="relative h-12 rounded-xl border border-border/70 bg-secondary overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1/2 border-r border-border/60 bg-primary/6" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-accent/8" />
        <div className="absolute inset-x-0 top-4 flex items-center justify-between px-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">
          <span>Start Zone</span>
          <span>End Zone</span>
        </div>

        {/* Selected range */}
        <div
          className="absolute top-0 h-full gradient-primary opacity-30 rounded"
          style={{ left: `${startPct}%`, width: `${Math.max(endPct - startPct, 0)}%` }}
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
          aria-label="Trim start time. Click or drag from the middle toward the left side."
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
          aria-label="Trim end time. Click or drag from the middle toward the right side."
        />
        {/* Visual handles */}
        <div
          className="absolute top-0 h-full w-1.5 bg-primary rounded-full shadow-glow"
          style={{ left: `${startPct}%` }}
        />
        <div
          className="absolute top-0 h-full w-1.5 rounded-full bg-accent shadow-glow"
          style={{ left: `${endPct}%` }}
        />
        <div className="pointer-events-none absolute bottom-2 left-[calc(50%-1px)] top-2 w-px bg-border/80" />
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
