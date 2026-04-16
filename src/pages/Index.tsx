import { useState } from "react";
import { Film, Music, Scissors, Zap } from "lucide-react";
import ConvertPanel from "@/components/ConvertPanel";
import TrimPanel from "@/components/TrimPanel";

type Tab = "convert" | "trim";

const tabs: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "convert", label: "Convert", icon: <Zap className="w-5 h-5" />, desc: "Video → Audio" },
  { id: "trim", label: "Trim", icon: <Scissors className="w-5 h-5" />, desc: "Cut media" },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("convert");

  return (
    <div className="min-h-screen gradient-surface">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container max-w-4xl mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Film className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">MediaForge</h1>
              <p className="text-xs text-muted-foreground">Browser-powered media tools</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
            Runs locally
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
          <span className="text-gradient">Convert & Trim</span>
          <br />
          <span className="text-foreground">your media instantly</span>
        </h2>
        <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
          No uploads. No servers. Everything runs in your browser using WebAssembly.
          Your files never leave your device.
        </p>
      </section>

      {/* Tabs */}
      <div className="container max-w-4xl mx-auto px-4">
        <div className="flex gap-2 mb-8 justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? "gradient-primary text-primary-foreground shadow-glow"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`text-xs ${activeTab === tab.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {tab.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="pb-16">
          {activeTab === "convert" && <ConvertPanel />}
          {activeTab === "trim" && <TrimPanel />}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="container max-w-4xl mx-auto px-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Powered by FFmpeg.wasm</span>
          <span>•</span>
          <span>100% client-side</span>
          <span>•</span>
          <span>No data leaves your browser</span>
        </div>
      </footer>
    </div>
  );
}
