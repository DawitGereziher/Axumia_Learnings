'use client';

import React, { useEffect, useRef, useState, useId } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export interface ProtectedYouTubePlayerProps {
  videoUrl: string;
  title?: string;
  style?: React.CSSProperties;
  autoplay?: boolean;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

/**
 * Singleton loader for YouTube IFrame Player API.
 * Ensures the external script is only loaded once across all instances.
 */
let ytApiPromise: Promise<any> | null = null;

function loadYouTubeIframeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }
  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise((resolve) => {
    const existingScript = document.getElementById('youtube-iframe-api-script');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousOnReady === 'function') previousOnReady();
      resolve(window.YT);
    };

    // Polling fallback in case API was already initialized or callback fired early
    const checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkInterval);
        resolve(window.YT);
      }
    }, 150);

    // Timeout safety fallback after 10s
    setTimeout(() => {
      clearInterval(checkInterval);
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
      }
    }, 10000);
  });

  return ytApiPromise;
}

/**
 * Extract 11-char YouTube ID from standard, embed, or short URLs.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

/**
 * Build privacy-enhanced, sandbox-safe YouTube embed URL with API enabled.
 */
function buildEmbedUrl(url: string, autoplay = false, origin = ''): string {
  const id = extractYouTubeId(url);
  if (!id) return url;
  const params = new URLSearchParams({
    rel: '0',              // no external related videos
    modestbranding: '1',   // minimize YouTube branding
    iv_load_policy: '3',   // hide annotations
    enablejsapi: '1',      // REQUIRED for postMessage & Iframe API control
    playsinline: '1',      // mobile plays inline
    ...(autoplay ? { autoplay: '1' } : {}),
    ...(origin ? { origin } : {}),
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

/**
 * ProtectedYouTubePlayer
 *
 * International-Grade YouTube Player with:
 *  1. youtube-nocookie.com privacy mode & minimal branding
 *  2. Right-click copy-link prevention
 *  3. Seamless YouTube IFrame API integration with onProgress and onEnded
 *  4. Shield overlays intercepting clickouts to YouTube logo and share sheet
 *  5. Graceful fallback if external JS API fails or is blocked
 */
export default function ProtectedYouTubePlayer({
  videoUrl,
  title,
  style,
  autoplay = false,
  onProgress,
  onEnded,
  onPlay,
  onPause,
}: ProtectedYouTubePlayerProps) {
  const reactId = useId();
  const iframeId = `yt-player-${reactId.replace(/:/g, '')}`;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentVideoIdRef = useRef<string | null>(extractYouTubeId(videoUrl));

  const [origin, setOrigin] = useState('');
  const [playerReady, setPlayerReady] = useState(false);

  // Stable callback refs to prevent stale closures in polling timer
  const onProgressRef = useRef(onProgress);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  const onEndedRef = useRef(onEnded);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);

  const onPlayRef = useRef(onPlay);
  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);

  const onPauseRef = useRef(onPause);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);

  // Set origin on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const videoId = extractYouTubeId(videoUrl);
  const embedUrl = buildEmbedUrl(videoUrl, autoplay, origin);

  // Helpers to poll and emit current progress
  const emitProgressNow = () => {
    try {
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === 'function' && typeof p.getDuration === 'function') {
        const cur = p.getCurrentTime();
        const dur = p.getDuration();
        if (typeof dur === 'number' && dur > 0 && typeof cur === 'number') {
          onProgressRef.current?.(cur, dur);
        }
      }
    } catch {
      /* cross-origin or player unmounted */
    }
  };

  const startPolling = () => {
    stopPolling();
    emitProgressNow();
    pollTimerRef.current = setInterval(() => {
      emitProgressNow();
    }, 4000);
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  // Initialize YouTube Iframe Player
  useEffect(() => {
    let isCancelled = false;

    loadYouTubeIframeApi()
      .then((YT) => {
        if (isCancelled || !iframeRef.current) return;

        // If player already exists, clean up previous
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          try { playerRef.current.destroy(); } catch {}
          playerRef.current = null;
        }

        playerRef.current = new YT.Player(iframeId, {
          events: {
            onReady: () => {
              if (isCancelled) return;
              setPlayerReady(true);
              // Send initial state if video is loaded
              emitProgressNow();
            },
            onStateChange: (event: any) => {
              if (isCancelled) return;
              // YT.PlayerState:
              // -1 = UNSTARTED, 0 = ENDED, 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 5 = CUED
              if (event.data === 1) {
                // PLAYING
                onPlayRef.current?.();
                startPolling();
              } else if (event.data === 2) {
                // PAUSED
                stopPolling();
                emitProgressNow();
                onPauseRef.current?.();
              } else if (event.data === 0) {
                // ENDED
                stopPolling();
                try {
                  const p = playerRef.current;
                  const dur = p && typeof p.getDuration === 'function' ? p.getDuration() : 0;
                  if (dur > 0) onProgressRef.current?.(dur, dur);
                } catch {}
                onEndedRef.current?.();
              }
            },
          },
        });
      })
      .catch(() => {
        // Fallback: Player still renders via standard iframe without JS API hooks
      });

    return () => {
      isCancelled = true;
      stopPolling();
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeId]);

  // Handle switching videoId when active lesson changes
  useEffect(() => {
    if (!videoId) return;

    if (currentVideoIdRef.current !== videoId) {
      currentVideoIdRef.current = videoId;
      stopPolling();

      const p = playerRef.current;
      if (p && typeof p.loadVideoById === 'function') {
        try {
          p.loadVideoById({
            videoId,
            startSeconds: 0,
          });
        } catch {
          // If loadVideoById fails, fallback to letting iframe src update
        }
      }
    }
  }, [videoId]);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 380,
        borderRadius: 12,
        overflow: 'hidden',
        background: '#000',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...style,
      }}
    >
      {/* ── YouTube Iframe (nocookie, sandboxed with enablejsapi=1) ── */}
      <iframe
        id={iframeId}
        ref={iframeRef}
        src={embedUrl}
        aria-label={title || 'Course Video'}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          pointerEvents: 'auto',
        }}
      />

      {/*
        ── Shield Overlays ──────────────────────────────────────────────────────
        These transparent/gradient layers intercept clicks on YouTube's external
        links (logo, avatar, channel, share) while keeping controls interactive.
      */}

      {/* Top bar shield — covers video title, channel avatar, share button */}
      <div
        aria-hidden="true"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 68,
          zIndex: 20,
          pointerEvents: 'all',
          cursor: 'default',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
        }}
      >
        {title && (
          <span style={{
            position: 'absolute',
            top: 12,
            left: 14,
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#e2e8f0',
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
          }}>
            {title}
          </span>
        )}
      </div>

      {/* Bottom-right shield — covers "Watch on YouTube" logo + Share button */}
      <div
        aria-hidden="true"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 220,
          height: 52,
          zIndex: 20,
          pointerEvents: 'all',
          cursor: 'default',
          background: 'transparent',
        }}
      />

      {/* Bottom strip protection */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 220,
          height: 10,
          zIndex: 18,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
