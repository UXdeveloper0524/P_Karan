"use client";

import { useEffect, useRef } from "react";
import { useJourneyFrame } from "@/hooks/useJourney";
import { useLatest } from "@/hooks/useLatest";
import { createWorld, type WorldHandle } from "@/lib/world/createWorld";

interface WorldCanvasProps {
  readonly reducedMotion: boolean;
  readonly onProgress: (fraction: number) => void;
  readonly onReady: () => void;
  readonly onError: (error: Error) => void;
}

/** Owns the three.js scene: creates it once, resizes it, draws it every frame, cleans it up. */
export default function WorldCanvas({
  reducedMotion,
  onProgress,
  onReady,
  onError,
}: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldHandle | null>(null);

  const reducedRef = useLatest(reducedMotion);
  const onProgressRef = useLatest(onProgress);
  const onReadyRef = useLatest(onReady);
  const onErrorRef = useLatest(onError);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new AbortController();

    createWorld(canvas, {
      reducedMotion: reducedRef.current,
      signal: controller.signal,
      onProgress: (fraction) => onProgressRef.current(fraction),
    })
      .then((world) => {
        if (controller.signal.aborted) {
          world.dispose();
          return;
        }
        worldRef.current = world;
        world.resize(canvas.clientWidth, canvas.clientHeight);
        world.setReducedMotion(reducedRef.current);
        onReadyRef.current();
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        onErrorRef.current(error instanceof Error ? error : new Error(String(error)));
      });

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      worldRef.current?.resize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(canvas);

    return () => {
      controller.abort();
      observer.disconnect();
      worldRef.current?.dispose();
      worldRef.current = null;
    };
  }, [reducedRef, onProgressRef, onReadyRef, onErrorRef]);

  useEffect(() => {
    worldRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useJourneyFrame((state, time, dt) => {
    worldRef.current?.update(state, time, dt);
  });

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-x-0 top-0 block h-lvh w-full" />;
}
