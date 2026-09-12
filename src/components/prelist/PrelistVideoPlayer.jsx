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
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState(null);
  const controlsTimeoutRef = useRef(null);
  const isRemoteUpdatingRef = useRef(false);
  const lastSyncRef = useRef(0);

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

  // Selecting an active card prepares playback and syncs presentation window
  useEffect(() => {
    const video = videoRef.current;
    if (!isActive || !video || !resolvedSrc) return;

    ensurePresented({ isPlaying: true, currentTime: video.currentTime || 0 });

    const startCardPlayback = () => {
      video.play().catch((err) => {
        console.warn("[PrelistVideoPlayer] Autoplay note:", err);
      });
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      startCardPlayback();
    } else {
      video.addEventListener("loadedmetadata", startCardPlayback, { once: true });
      return () => video.removeEventListener("loadedmetadata", startCardPlayback);
    }
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
        ...extra,
      });
    }
  };

  const togglePlay = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const willPlay = !isPlaying;
    ensurePresented({ isPlaying: willPlay, currentTime: videoRef.current.currentTime });

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
    const dur = getPlayableDuration() || duration || Infinity;
    const newTime = Math.max(0, Math.min(dur, cur + delta));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    sendSync("seek", newTime, isPlaying);
  };

  const handleSeek = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const dur = getPlayableDuration() || duration;
    if (!dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * dur;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    sendSync("seek", newTime, isPlaying);
  };

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
      onClick={(e) => {
        e.stopPropagation();
        ensurePresented();
      }}
    >
      <video
        ref={videoRef}
        src={resolvedSrc}
        key={resolvedSrc}
        preload="auto"
        muted={true}
        playsInline
        onClick={togglePlay}
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
          setIsPlaying(false);
          sendSync("pause", duration, false);
        }}
        onError={(e) => {
          const err = e.target.error;
          console.error("[PrelistVideoPlayer] video loading error:", err, resolvedSrc);
          setVideoError(err ? `Video error (${err.code}): Failed to load file` : "Failed to load video file");
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: videoError ? "none" : "block",
          cursor: "pointer",
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
          onClick={handleSeek}
          style={{
            width: "100%",
            height: "5px",
            background: "rgba(255, 255, 255, 0.3)",
            borderRadius: "3px",
            cursor: "pointer",
            position: "relative",
            transition: "height 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.height = "7px"; }}
          onMouseLeave={(e) => { e.currentTarget.style.height = "5px"; }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: "#00ff99",
              borderRadius: "3px",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: "-5px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "11px",
                height: "11px",
                borderRadius: "50%",
                background: "#ffffff",
                boxShadow: "0 0 4px rgba(0,0,0,0.5)",
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

          {/* Right Buttons: Volume, Fullscreen */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
