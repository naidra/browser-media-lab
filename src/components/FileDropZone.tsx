import { useCallback, useState } from "react";
import { Upload, Film, Music } from "lucide-react";

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept: string;
  label: string;
  sublabel: string;
  icon?: "video" | "audio" | "both";
}

export default function FileDropZone({ onFileSelect, accept, label, sublabel, icon = "both" }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center gap-4 p-12 
        rounded-2xl border-2 border-dashed cursor-pointer
        transition-all duration-300 group
        ${isDragging
          ? "border-primary bg-primary/10 shadow-glow scale-[1.01]"
          : "border-border hover:border-primary/50 hover:bg-secondary/50"
        }
      `}
    >
      <div className="flex items-center gap-3">
        {(icon === "video" || icon === "both") && (
          <Film className="w-8 h-8 text-primary transition-transform group-hover:scale-110" />
        )}
        {(icon === "audio" || icon === "both") && (
          <Music className="w-8 h-8 text-accent transition-transform group-hover:scale-110" />
        )}
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground mt-1">{sublabel}</p>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Upload className="w-4 h-4" />
        Browse Files
      </div>
      <input type="file" accept={accept} onChange={handleChange} className="hidden" />
    </label>
  );
}
