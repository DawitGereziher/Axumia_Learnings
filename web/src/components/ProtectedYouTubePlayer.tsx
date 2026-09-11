'use client';

import React from 'react';

interface ProtectedYouTubePlayerProps {
  videoUrl: string;
  title?: string;
  style?: React.CSSProperties;
  autoplay?: boolean;
}

/**
 * ProtectedYouTubePlayer
 *
 * Embeds a YouTube video with maximum link/URL protection:
 *  1. Uses youtube-nocookie.com (privacy-enhanced, less branding)
 *  2. Blocks right-click anywhere on the player (no "Copy video address")
 *  3. Overlays transparent shields over ALL areas that would navigate to YouTube:
 *     - Top bar: title, avatar, share button (appear on hover)
 *     - Bottom-right: "Watch on YouTube" logo button + Share button
 *  4. No `title` attribute on the iframe (prevents tooltip showing the URL)
 *  5. sandbox attribute prevents top-level navigation so clicking any
 *     remaining YouTube links stays inside the iframe
 */
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

function buildEmbedUrl(url: string, autoplay = false): string {
  const id = extractYouTubeId(url);
  if (!id) return url; // fallback — pass through as-is
  const params = new URLSearchParams({
    rel: '0',              // no related videos
    modestbranding: '1',   // hide YouTube logo in control bar
    iv_load_policy: '3',   // hide annotations
    ...(autoplay ? { autoplay: '1' } : {}),
  });
  // youtube-nocookie.com = privacy-enhanced mode
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export default function ProtectedYouTubePlayer({
  videoUrl,
  title,
  style,
  autoplay = false,
}: ProtectedYouTubePlayerProps) {
  const embedUrl = buildEmbedUrl(videoUrl, autoplay);

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
      {/* ── YouTube Iframe (nocookie, sandboxed) ── */}
      <iframe
        src={embedUrl}
        // No title= attribute — prevents tooltip exposing the URL
        aria-label={title || 'Course Video'}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        // sandbox: allows scripts + same-origin (needed for YouTube player to work)
        // allow-popups is intentionally OMITTED so clicking YouTube links
        // inside the iframe cannot open new windows/tabs
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
        These are transparent (or gradient) divs layered on top of the iframe.
        They intercept pointer events so clicks on YouTube's own navigable
        UI elements (logo, share button, title bar) hit the shield instead.

        YouTube's control bar appears at the BOTTOM of the player on hover.
        The "Watch on YouTube" logo and Share button live in the bottom-right.
        The video title + share button appear at the TOP on hover.
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
          // Subtle gradient so it looks intentional if visible during hover
          background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%)',
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
          width: 220,   // wide enough to cover both the logo and share icon
          height: 52,   // height of the control bar
          zIndex: 20,
          pointerEvents: 'all',
          cursor: 'default',
          background: 'transparent',
        }}
      />

      {/* Full-width bottom strip — stops clicks on the bottom-centre seek-area
          from accidentally triggering the YouTube bar link on mobile */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 220, // leave the controls on the left (play, volume, time) accessible
          height: 10,
          zIndex: 18,
          pointerEvents: 'none', // pass through to iframe for seek bar
        }}
      />
    </div>
  );
}
