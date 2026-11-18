import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { EngineAudio } from "@/lib/audio/engine";
import type { ProgressStore } from "@/lib/progress-store";

/** Set NEXT_PUBLIC_MUSIC_SRC (for example "/audio/music.mp3") to play a track under the engine. */
const MUSIC_SRC = process.env.NEXT_PUBLIC_MUSIC_SRC;

// Audio support never changes while the page is open, so there is nothing to subscribe to.
const subscribeNever = (): (() => void) => () => undefined;
const detectSupport = (): boolean => EngineAudio.isSupported();
const serverSupport = (): boolean => false;

/** Used when the browser cannot play audio, so the start-up still takes about as long. */
const SILENT_IGNITION_MS = 2800;

export interface EngineAudioControls {
  readonly supported: boolean;
  /** True once the engine has been started and sound is not muted. */
  readonly enabled: boolean;
  /** True once a music file has loaded, so a credit line can be shown. */
  readonly musicReady: boolean;
  /** Start the engine. Call it from a click handler. Resolves when the engine is idling. */
  readonly ignite: () => Promise<void>;
  /** Mute or unmute. */
  readonly toggle: () => void;
}

export function useEngineAudio(store: ProgressStore): EngineAudioControls {
  const audioRef = useRef<EngineAudio | null>(null);
  const mutedRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [musicReady, setMusicReady] = useState(false);
  // useSyncExternalStore keeps server and first client render identical, then updates.
  const supported = useSyncExternalStore(subscribeNever, detectSupport, serverSupport);

  // The car's speed shapes the engine; reaching a new stop or project rings a chime.
  useEffect(() => {
    let previous = store.getState().distance;
    const offFrame = store.subscribeFrame((state, _time, dt) => {
      const speed = dt > 0 ? (state.distance - previous) / dt : 0;
      previous = state.distance;
      audioRef.current?.setSpeed(speed);
    });
    const offCoarse = store.subscribeCoarse(() => {
      audioRef.current?.chime(store.getStopIndex() + Math.max(0, store.getProjectIndex()));
    });
    return () => {
      offFrame();
      offCoarse();
    };
  }, [store]);

  useEffect(
    () => () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    },
    [],
  );

  const ignite = useCallback(async () => {
    setStarted(true);
    if (!EngineAudio.isSupported()) {
      await new Promise<void>((resolve) => setTimeout(resolve, SILENT_IGNITION_MS));
      return;
    }
    try {
      audioRef.current ??= new EngineAudio({
        musicSrc: MUSIC_SRC,
        onMusicReady: () => setMusicReady(true),
      });
      audioRef.current.setMuted(mutedRef.current);
      await audioRef.current.ignite();
    } catch (error) {
      console.error("The engine sound could not start:", error);
    }
  }, []);

  const toggle = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    audioRef.current?.setMuted(next);
    setMuted(next);
  }, []);

  return { supported, enabled: started && !muted, musicReady, ignite, toggle };
}
