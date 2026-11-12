"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { Hud } from "@/components/Hud";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SiteHeader } from "@/components/SiteHeader";
import { StoryOverlay } from "@/components/StoryOverlay";
import { ProgressStoreProvider } from "@/context/ProgressContext";
import { CREDITS, SITE } from "@/data/story";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { TRACK_HEIGHT_VH } from "@/lib/journey";
import { createProgressStore } from "@/lib/progress-store";

// three.js is large and only runs in the browser, so load it on the client.
const WorldCanvas = dynamic(() => import("@/components/WorldCanvas"), { ssr: false });

type Phase = "loading" | "ready" | "failed";

/** Set NEXT_PUBLIC_MUSIC_CREDIT to the credit line for your music file. */
const MUSIC_CREDIT = process.env.NEXT_PUBLIC_MUSIC_CREDIT;

export function StoryExperience() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [store] = useState(createProgressStore);
  const { reduced, toggle: toggleMotion } = useMotionPreference();
  const audio = useAmbientAudio(store);
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadProgress, setLoadProgress] = useState(0);

  useScrollProgress(trackRef, store, reduced);

  const handleReady = useCallback(() => setPhase("ready"), []);
  const handleError = useCallback((error: Error) => {
    console.error("The 3D scene could not start:", error);
    setPhase("failed");
  }, []);

  const credits =
    audio.musicReady && MUSIC_CREDIT ? [...CREDITS, MUSIC_CREDIT] : CREDITS;

  return (
    <ProgressStoreProvider store={store}>
      {/* The tall track gives the page its scroll length; the stage stays on screen. */}
      <div ref={trackRef} className="relative" style={{ height: `${TRACK_HEIGHT_VH}vh` }}>
        <div className="sticky top-0 h-dvh w-full overflow-hidden bg-ink">
          <WorldCanvas
            reducedMotion={reduced}
            onProgress={setLoadProgress}
            onReady={handleReady}
            onError={handleError}
          />
          <StoryOverlay credits={credits} />
          <SiteHeader
            name={SITE.name}
            role={SITE.role}
            soundEnabled={audio.enabled}
            soundSupported={audio.supported}
            onToggleSound={audio.toggle}
            motionReduced={reduced}
            onToggleMotion={toggleMotion}
          />
          <Hud />
          {phase === "failed" && (
            <p
              role="alert"
              className="absolute inset-x-6 top-20 z-20 rounded-sm border border-signal/50 bg-ink/90 p-3 font-mono text-xs text-paper md:inset-x-16"
            >
              The 3D view could not start in this browser. The story still scrolls as text.
            </p>
          )}
          <LoadingScreen progress={loadProgress} visible={phase === "loading"} />
        </div>
      </div>
    </ProgressStoreProvider>
  );
}
