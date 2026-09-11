import React, { useRef, useState, useEffect } from "react";

export default function PrelistVideoPlayer({ src, name, theme }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const togglePlay = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const skipTime = (delta, e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(duration, videoRef.current.currentTime + delta)
    );
  };

  const handleSeek = (e) => {
    e?.stopPropagation();
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(duration, pos * duration));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const handleVolumeChange = (e) => {
    e?.stopPropagation();
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
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
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
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
      onClick={(e) => e.stopPropagation()}
    >
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        onClick={togglePlay}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          cursor: "pointer",
        }}
      />

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
