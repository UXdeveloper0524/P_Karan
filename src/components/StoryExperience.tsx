"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { Hud } from "@/components/Hud";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SiteHeader } from "@/components/SiteHeader";
import { StoryOverlay } from "@/components/StoryOverlay";
import { ProgressStoreProvider } from "@/context/ProgressContext";
import { CREDITS, SITE } from "@/data/story";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { TRACK_HEIGHT_VH } from "@/lib/journey";
import { createProgressStore } from "@/lib/progress-store";

// three.js is large and only runs in the browser, so load it on the client.
const WorldCanvas = dynamic(() => import("@/components/WorldCanvas"), { ssr: false });

type Phase = "loading" | "ready" | "failed";

export function StoryExperience() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [store] = useState(createProgressStore);
  const { reduced, toggle: toggleMotion } = useMotionPreference();
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadProgress, setLoadProgress] = useState(0);
  const [introDone, setIntroDone] = useState(false);

  useScrollProgress(trackRef, stageRef, store, reduced);

  const handleIntroDone = useCallback(() => {
    // Let the fade play before removing the loader from the page.
    window.setTimeout(() => setIntroDone(true), 1100);
  }, []);
  const handleReady = useCallback(() => setPhase("ready"), []);
  const handleError = useCallback((error: Error) => {
    console.error("The 3D scene could not start:", error);
    setPhase("failed");
  }, []);

  return (
    <ProgressStoreProvider store={store}>
      {/* The tall track gives the page its scroll length; the stage stays on screen. */}
      <div ref={trackRef} className="relative" style={{ height: `${TRACK_HEIGHT_VH}vh` }}>
        {/* svh keeps the stage the same height while the iOS toolbar moves; the canvas bleeds to lvh so no strip shows. */}
        <div ref={stageRef} className="sticky top-0 h-svh w-full overflow-x-clip bg-ink">
          <WorldCanvas
            reducedMotion={reduced}
            onProgress={setLoadProgress}
            onReady={handleReady}
            onError={handleError}
          />
          <StoryOverlay credits={CREDITS} />
          <SiteHeader
            name={SITE.name}
            role={SITE.role}
            motionReduced={reduced}
            onToggleMotion={toggleMotion}
          />
          <Hud />
          {phase === "failed" && (
            <p
              role="alert"
              className="absolute inset-x-6 top-20 z-20 rounded-sm border border-signal/50 bg-ink/90 p-3 text-xs text-paper md:inset-x-16"
            >
              The 3D view could not start in this browser. The story still scrolls as text.
            </p>
          )}
          {!introDone && phase !== "failed" && (
            <LoadingScreen progress={loadProgress} ready={phase === "ready"} onFinished={handleIntroDone} />
          )}
        </div>
      </div>
    </ProgressStoreProvider>
  );
}
