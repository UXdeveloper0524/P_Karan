import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AmbientAudio } from "@/lib/audio/ambient";
import type { ProgressStore } from "@/lib/progress-store";

/** Set NEXT_PUBLIC_MUSIC_SRC (for example "/audio/music.mp3") to play a real track. */
const MUSIC_SRC = process.env.NEXT_PUBLIC_MUSIC_SRC;

// Audio support never changes while the page is open, so there is nothing to subscribe to.
const subscribeNever = (): (() => void) => () => undefined;
const detectSupport = (): boolean => AmbientAudio.isSupported();
const serverSupport = (): boolean => false;

export interface AmbientAudioControls {
  readonly enabled: boolean;
  readonly supported: boolean;
  /** True once a music file has loaded, so a credit line can be shown. */
  readonly musicReady: boolean;
  readonly toggle: () => void;
}

export function useAmbientAudio(store: ProgressStore): AmbientAudioControls {
  const audioRef = useRef<AmbientAudio | null>(null);
  const enabledRef = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [musicReady, setMusicReady] = useState(false);
  // useSyncExternalStore keeps server and first client render identical, then updates.
  const supported = useSyncExternalStore(subscribeNever, detectSupport, serverSupport);

  // Scroll shapes the sound; reaching a new stop or project rings a chime.
  useEffect(() => {
    const offFrame = store.subscribeFrame((state) => {
      audioRef.current?.setIntensity(state.progress);
    });
    const offCoarse = store.subscribeCoarse(() => {
      if (!enabledRef.current) return;
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

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;

    if (next) {
      audioRef.current ??= new AmbientAudio({
        musicSrc: MUSIC_SRC,
        onMusicReady: () => setMusicReady(true),
      });
      void audioRef.current.start();
    } else {
      audioRef.current?.stop();
    }
    setEnabled(next);
  }, []);

  return { enabled, supported, musicReady, toggle };
}
