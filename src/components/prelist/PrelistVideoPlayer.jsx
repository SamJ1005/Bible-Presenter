import React, { useRef, useState, useEffect } from "react";
import { toStreamableMediaUrl } from "../../utils/mediaUrl";

export default function PrelistVideoPlayer({ src, rawPath, name, theme, item, isActive, onPresent }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const resolvedSrc = toStreamableMediaUrl(src, rawPath || item?.path);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLooping, setIsLooping] = useState(Boolean(item?.isLooping));
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPercent, setScrubPercent] = useState(null);
  const progressBarRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const isRemoteUpdatingRef = useRef(false);
  const lastSyncRef = useRef(0);

  useEffect(() => {
    if (item?.isLooping !== undefined) {
      setIsLooping(Boolean(item.isLooping));
    }
  }, [item?.isLooping]);

  useEffect(() => {
    setVideoError(null);
  }, [resolvedSrc]);

  const getPlayableDuration = (video = videoRef.current) => {
    if (!video) return 0;
    if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;
    const ranges = video.seekable;
    if (ranges?.length) {
      const end = ranges.end(ranges.length - 1);
      if (Number.isFinite(end) && end > 0) return end;
    }
    return 0;
  };

  // Card selection only highlights locally - does not auto-trigger secondary presentation screen
  useEffect(() => {
    // Secondary screen remains untouched until user explicitly plays or presents
  }, [isActive, resolvedSrc]);

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const sendSync = (action, time, playing) => {
    if (isRemoteUpdatingRef.current) return;
    if (window.electron?.sendVideoCommand) {
      window.electron.sendVideoCommand({
        action,
        currentTime: time,
        isPlaying: playing,
        isLooping,
      });
    }
  };

  // Listen to remote commands from presentation window
  useEffect(() => {
    if (!window.electron?.onVideoCommand) return;

    const cleanup = window.electron.onVideoCommand((cmd) => {
      if (!videoRef.current || !isActive) return;
      isRemoteUpdatingRef.current = true;
      try {
        if (cmd.action === "play") {
          if (cmd.currentTime !== undefined && Math.abs(videoRef.current.currentTime - cmd.currentTime) > 0.5) {
            videoRef.current.currentTime = cmd.currentTime;
            setCurrentTime(cmd.currentTime);
          }
          videoRef.current.play().catch(() => {});
          setIsPlaying(true);
        } else if (cmd.action === "pause") {
          videoRef.current.pause();
          setIsPlaying(false);
          if (cmd.currentTime !== undefined && Math.abs(videoRef.current.currentTime - cmd.currentTime) > 0.5) {
            videoRef.current.currentTime = cmd.currentTime;
            setCurrentTime(cmd.currentTime);
          }
        } else if (cmd.action === "seek") {
          if (cmd.currentTime !== undefined) {
            videoRef.current.currentTime = cmd.currentTime;
            setCurrentTime(cmd.currentTime);
          }
          if (cmd.isPlaying) {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
          } else {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        } else if (cmd.action === "sync") {
          if (cmd.currentTime !== undefined && Math.abs(videoRef.current.currentTime - cmd.currentTime) > 1.0) {
            videoRef.current.currentTime = cmd.currentTime;
            setCurrentTime(cmd.currentTime);
          }
        } else if (cmd.action === "loop") {
          if (cmd.isLooping !== undefined) {
            setIsLooping(!!cmd.isLooping);
          }
        }
      } finally {
        setTimeout(() => { isRemoteUpdatingRef.current = false; }, 80);
      }
    });

    return cleanup;
  }, [isActive]);

  // Pause playback if the card is no longer active
  useEffect(() => {
    if (!isActive && isPlaying && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const ensurePresented = (extra = {}) => {
    if (onPresent) {
      onPresent({
        currentTime: videoRef.current?.currentTime || 0,
        volume: isMuted ? 0 : volume,
        isMuted,
        isLooping,
        ...extra,
      });
    }
  };

  const toggleLoop = (e) => {
    e?.stopPropagation();
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    ensurePresented({ isLooping: nextLoop });
    if (window.electron?.sendVideoCommand) {
      window.electron.sendVideoCommand({
        action: "loop",
        isLooping: nextLoop,
      });
    }
  };

  const togglePlay = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const willPlay = !isPlaying;

    if (willPlay && (videoRef.current.ended || (duration > 0 && Math.abs(videoRef.current.currentTime - duration) < 0.2))) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      sendSync("seek", 0, true);
    }

    ensurePresented({ isPlaying: willPlay, currentTime: videoRef.current.currentTime, isLooping });

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      sendSync("pause", videoRef.current.currentTime, false);
    } else {
      videoRef.current.play().catch((err) => console.warn("Video play error:", err));
      setIsPlaying(true);
      sendSync("play", videoRef.current.currentTime, true);
    }
  };

  const skipTime = (delta, e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const cur = Number.isFinite(videoRef.current.currentTime) ? videoRef.current.currentTime : (currentTime || 0);
    const dur = getPlayableDuration() || duration;
    const maxTime = dur > 0 ? dur : Math.max(0, cur + delta);
    const newTime = Math.max(0, Math.min(maxTime, cur + delta));
    try {
      videoRef.current.currentTime = newTime;
    } catch (err) {
      console.warn("[PrelistVideoPlayer] skipTime error:", err);
    }
    setCurrentTime(newTime);
    sendSync("seek", newTime, isPlaying);
  };

  const getScrubPos = (clientX) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    if (!rect.width) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsScrubbing(true);
    const pos = getScrubPos(e.clientX);
    setScrubPercent(pos * 100);
    const dur = getPlayableDuration() || duration;
    if (dur > 0 && videoRef.current) {
      const newTime = pos * dur;
      try { videoRef.current.currentTime = newTime; } catch {}
      setCurrentTime(newTime);
    }
  };

  const handlePointerMove = (e) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    const pos = getScrubPos(e.clientX);
    setScrubPercent(pos * 100);
    const dur = getPlayableDuration() || duration;
    if (dur > 0 && videoRef.current) {
      const newTime = pos * dur;
      try { videoRef.current.currentTime = newTime; } catch {}
      setCurrentTime(newTime);
    }
  };

  const handlePointerUp = (e) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsScrubbing(false);
    const pos = getScrubPos(e.clientX);
    setScrubPercent(null);
    const dur = getPlayableDuration() || duration;
    if (dur > 0 && videoRef.current) {
      const newTime = pos * dur;
      try { videoRef.current.currentTime = newTime; } catch {}
      setCurrentTime(newTime);
      sendSync("seek", newTime, isPlaying);
    }
  };

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Allow roll-wheel to move timeline smoothly when cursor is over the scrubber
  useEffect(() => {
    const bar = progressBarRef.current;
    if (!bar) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const video = videoRef.current;
      if (!video) return;

      const dur = getPlayableDuration(video) || duration;
      if (!dur || dur <= 0) return;

      // deltaY < 0 is scroll up (forward), deltaY > 0 is scroll down (backward)
      const step = Math.min(Math.max(dur * 0.015, 1), 5);
      const direction = e.deltaY < 0 ? 1 : -1;
      const newTime = Math.min(Math.max(video.currentTime + direction * step, 0), dur);

      try {
        video.currentTime = newTime;
      } catch {}
      setCurrentTime(newTime);
      sendSync("seek", newTime, isPlayingRef.current);
    };

    bar.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      bar.removeEventListener("wheel", handleWheel);
    };
  }, [duration]);

  const handleTimeUpdate = () => {
    const cur = videoRef.current?.currentTime || 0;
    setCurrentTime(cur);
    const playableDuration = getPlayableDuration();
    if (playableDuration && playableDuration !== duration) setDuration(playableDuration);
    if (isActive && isPlaying) {
      const now = Date.now();
      if (now - lastSyncRef.current > 1000) {
        lastSyncRef.current = now;
        sendSync("sync", cur, true);
      }
    }
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (window.electron?.sendVideoCommand) {
      window.electron.sendVideoCommand({
        action: "volume",
        volume: nextMute ? 0 : volume,
        isMuted: nextMute,
      });
    }
  };

  const handleVolumeChange = (e) => {
    e?.stopPropagation();
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    const nextMute = newVol === 0;
    setIsMuted(nextMute);
    if (window.electron?.sendVideoCommand) {
      window.electron.sendVideoCommand({
        action: "volume",
        volume: newVol,
        isMuted: nextMute,
      });
    }
  };

  const toggleFullscreen = (e) => {
    e?.stopPropagation();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn("Fullscreen request failed:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {}
      }
    };
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        background: "#000000",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
        userSelect: "none",
      }}
    >
      <video
        ref={videoRef}
        src={resolvedSrc}
        key={resolvedSrc}
        preload="auto"
        muted={true}
        playsInline
        loop={isLooping}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          const video = videoRef.current;
          setDuration(getPlayableDuration(video));
          setCurrentTime(video?.currentTime || 0);
          setVideoError(null);
        }}
        onLoadedData={() => {
          setDuration(getPlayableDuration());
          setVideoError(null);
        }}
        onProgress={() => setDuration(getPlayableDuration())}
        onDurationChange={() => setDuration(getPlayableDuration())}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          if (isLooping && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
            sendSync("seek", 0, true);
          } else {
            setIsPlaying(false);
          }
        }}
        onError={(e) => {
          const err = e.target.error;
          console.error("[PrelistVideoPlayer] video loading error:", err, resolvedSrc);
          setVideoError(
            err?.code === 4 || (resolvedSrc && resolvedSrc.startsWith('local-file:'))
              ? "Video unavailable on this device (available on original device only)"
              : err ? `Video error (${err.code}): Failed to load file` : "Failed to load video file"
          );
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: videoError ? "none" : "block",
          cursor: "default",
        }}
      />

      {videoError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            color: "#ff6b6b",
            fontSize: "12px",
            textAlign: "center",
            background: "rgba(0,0,0,0.85)",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "20px" }}>⚠</span>
          <span>{videoError}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setVideoError(null);
              if (videoRef.current) {
                videoRef.current.load();
              }
            }}
            style={{
              padding: "4px 10px",
              background: "#333",
              border: "1px solid #555",
              borderRadius: "4px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "11px",
            }}
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Center Big Play Button (shown when paused) */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(0, 0, 0, 0.65)",
            border: "2px solid rgba(255, 255, 255, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#ffffff",
            fontSize: "22px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)"; }}
        >
          ▶
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
          padding: "8px 12px 10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          opacity: showControls || !isPlaying ? 1 : 0,
          transition: "opacity 0.25s ease",
          zIndex: 10,
        }}
      >
        {/* Progress Bar / Scrubber */}
        <div
          ref={progressBarRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: "100%",
            height: isScrubbing ? "7px" : "5px",
            background: "rgba(255, 255, 255, 0.3)",
            borderRadius: "3px",
            cursor: "pointer",
            position: "relative",
            transition: "height 0.15s ease",
            touchAction: "none",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.height = "7px"; }}
          onMouseLeave={(e) => { if (!isScrubbing) e.currentTarget.style.height = "5px"; }}
        >
          <div
            style={{
              width: `${isScrubbing && scrubPercent !== null ? scrubPercent : progressPercent}%`,
              height: "100%",
              background: "#00ff99",
              borderRadius: "3px",
              position: "relative",
              transition: isScrubbing ? "none" : "width 0.1s linear",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: "-6px",
                top: "50%",
                transform: "translateY(-50%)",
                width: isScrubbing ? "13px" : "11px",
                height: isScrubbing ? "13px" : "11px",
                borderRadius: "50%",
                background: "#ffffff",
                boxShadow: isScrubbing ? "0 0 8px #00ff99" : "0 0 4px rgba(0,0,0,0.5)",
                transition: "transform 0.1s ease, width 0.1s ease, height 0.1s ease",
              }}
            />
          </div>
        </div>

        {/* Controls Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#ffffff",
            fontSize: "12px",
          }}
        >
          {/* Left Buttons: Play/Pause, -10s, +10s, Time */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? "Pause" : "Play"}
              style={btnControlStyle}
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>

            <button
              type="button"
              onClick={(e) => skipTime(-10, e)}
              title="Rewind 10 seconds"
              style={btnControlStyle}
            >
              ↺ 10s
            </button>

            <button
              type="button"
              onClick={(e) => skipTime(10, e)}
              title="Forward 10 seconds"
              style={btnControlStyle}
            >
              10s ↻
            </button>

            <span style={{ fontSize: "11px", fontWeight: "600", opacity: 0.9, marginLeft: "4px" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Buttons: Loop, Volume, Fullscreen */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={toggleLoop}
              title={isLooping ? "Loop: On (Click to play once)" : "Loop: Off (Click to loop video)"}
              style={{
                ...btnControlStyle,
                color: isLooping ? "#00ff99" : "#ffffff",
                background: isLooping ? "rgba(0, 255, 153, 0.2)" : "rgba(255, 255, 255, 0.08)",
                border: isLooping ? "1px solid rgba(0, 255, 153, 0.5)" : "1px solid rgba(255, 255, 255, 0.18)",
                opacity: isLooping ? 1 : 0.75,
                padding: "4px 6px",
                borderRadius: "4px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: isLooping ? "0 0 8px rgba(0, 255, 153, 0.3)" : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                if (!isLooping) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = isLooping ? "1" : "0.75";
                if (!isLooping) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                }
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? "Unmute" : "Mute"}
                style={btnControlStyle}
              >
                {isMuted || volume === 0 ? "🔇" : volume > 0.5 ? "🔊" : "🔉"}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "55px",
                  accentColor: "#00ff99",
                  cursor: "pointer",
                  height: "4px",
                }}
              />
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              style={btnControlStyle}
            >
              {isFullscreen ? "🗗" : "⛶"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const btnControlStyle = {
  background: "transparent",
  border: "none",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "bold",
  padding: "3px 6px",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  outline: "none",
  opacity: 0.9,
  transition: "opacity 0.15s, transform 0.15s",
};
