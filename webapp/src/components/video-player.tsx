"use client";

// Video player with resume and progress reporting.
//
// Reporting happens on a 10s throttle rather than on every `timeupdate` (which fires ~4x/second),
// plus an immediate flush on pause/ended/pagehide. The pagehide flush uses `sendBeacon` because a
// normal fetch is cancelled when the tab goes away — closing the tab mid-video is the common case,
// and without it the last 10s of watching would be lost.

import { useCallback, useEffect, useRef } from "react";

const HEARTBEAT_MS = 10_000;

type Props = {
  videoId: string;
  src: string;
  /** Resume point from a previous session. */
  initialPosition?: number;
  /** Called when the server reports this write completed the lesson. */
  onLessonComplete?: () => void;
};

export function VideoPlayer({ videoId, src, initialPosition = 0, onLessonComplete }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const lastSent = useRef(0);
  const resumed = useRef(false);
  const completeNotified = useRef(false);

  const send = useCallback(
    async (position: number, duration: number, useBeacon = false) => {
      const payload = JSON.stringify({ videoId, position, duration });
      lastSent.current = Date.now();

      if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/progress/heartbeat",
          new Blob([payload], { type: "application/json" })
        );
        return;
      }

      try {
        const res = await fetch("/api/progress/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { lessonComplete?: boolean };
        if (data.lessonComplete && !completeNotified.current) {
          completeNotified.current = true;
          onLessonComplete?.();
        }
      } catch {
        // A dropped heartbeat is not worth interrupting playback over; the next one carries the
        // same high-water mark anyway.
      }
    },
    [videoId, onLessonComplete]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const flush = (useBeacon = false) => {
      if (!el.duration || Number.isNaN(el.duration)) return;
      void send(el.currentTime, el.duration, useBeacon);
    };

    const onLoadedMetadata = () => {
      // Resume once, and never within the last 5s — landing on the end screen is not a resume.
      if (resumed.current || initialPosition <= 0) return;
      resumed.current = true;
      if (el.duration && initialPosition < el.duration - 5) el.currentTime = initialPosition;
    };

    const onTimeUpdate = () => {
      if (el.paused) return;
      if (Date.now() - lastSent.current < HEARTBEAT_MS) return;
      flush();
    };

    const onPause = () => flush();
    const onEnded = () => flush();
    const onPageHide = () => flush(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
    };

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [send, initialPosition]);

  // bg-black is deliberate and theme-invariant: it's the letterbox behind the video frames,
  // not a UI surface — the whiteboard renders are themselves dark-canvas.
  return (
    <video
      ref={ref}
      controls
      preload="metadata"
      className="w-full border border-border bg-black"
      src={src}
    />
  );
}
