import { Loader2 } from "lucide-react";

interface ProgressBarProps {
  progress: number;
  label: string;
}

export default function ProgressBar({ progress, label }: ProgressBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className="text-sm font-mono text-primary">{progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full gradient-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
