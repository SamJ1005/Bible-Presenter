import React from "react";

export default function UpdateNotificationModal({
  updateInfo,
  onClose,
  theme = "dark",
}) {
  if (!updateInfo || !updateInfo.updateAvailable) return null;

  const isDark = theme === "dark";

  const handleDownload = () => {
    const targetUrl = updateInfo.downloadUrl || updateInfo.releaseUrl;
    if (window.electron?.openExternalUrl) {
      window.electron.openExternalUrl(targetUrl);
    } else if (window.api?.openExternalUrl) {
      window.api.openExternalUrl(targetUrl);
    } else {
      window.open(targetUrl, "_blank");
    }
  };

  const handleViewRelease = () => {
    const targetUrl = updateInfo.releaseUrl;
    if (window.electron?.openExternalUrl) {
      window.electron.openExternalUrl(targetUrl);
    } else if (window.api?.openExternalUrl) {
      window.api.openExternalUrl(targetUrl);
    } else {
      window.open(targetUrl, "_blank");
    }
  };

  const handleRemindLater = () => {
    try {
      // Snooze this specific version for 24 hours
      localStorage.setItem(
        "snooze_update",
        JSON.stringify({
          version: updateInfo.latestVersion,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.warn("Could not save snooze state:", e);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: isDark ? "#1a1a1f" : "#ffffff",
          color: isDark ? "#f1f1f1" : "#1e1e1e",
          borderRadius: "14px",
          boxShadow: isDark
            ? "0 20px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)"
            : "0 20px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
          animation: "fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: isDark
              ? "1px solid rgba(255, 255, 255, 0.08)"
              : "1px solid rgba(0, 0, 0, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: isDark ? "rgba(0, 255, 153, 0.15)" : "rgba(0, 51, 153, 0.1)",
                color: isDark ? "#00ff99" : "#003399",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: "bold",
              }}
            >
              🚀
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
                New Version Available!
              </h2>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "12px",
                  opacity: 0.65,
                }}
              >
                A newer build of Scripture Screen is ready for download.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close"
            style={{
              background: "transparent",
              border: "none",
              color: isDark ? "#aaa" : "#666",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* Version Badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
              border: isDark
                ? "1px solid rgba(255, 255, 255, 0.08)"
                : "1px solid rgba(0, 0, 0, 0.06)",
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "16px",
            }}
          >
            <div>
              <span style={{ fontSize: "11px", opacity: 0.6, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Current Installed
              </span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: isDark ? "#aaa" : "#555" }}>
                v{updateInfo.currentVersion}
              </span>
            </div>

            <div style={{ fontSize: "16px", opacity: 0.4 }}>→</div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "11px", opacity: 0.6, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Latest Release
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: isDark ? "#00ff99" : "#007733",
                }}
              >
                v{updateInfo.latestVersion}
              </span>
            </div>
          </div>

          {/* Release Notes */}
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                opacity: 0.75,
                marginBottom: "6px",
              }}
            >
              What's New:
            </div>
            <div
              style={{
                maxHeight: "140px",
                overflowY: "auto",
                background: isDark ? "#121215" : "#f8f9fa",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(0, 0, 0, 0.08)",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "12px",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
                color: isDark ? "#ccc" : "#333",
              }}
            >
              {updateInfo.releaseNotes || "Performance enhancements, bug fixes, and stability improvements."}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: "16px 24px 20px",
            borderTop: isDark
              ? "1px solid rgba(255, 255, 255, 0.08)"
              : "1px solid rgba(0, 0, 0, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <button
            onClick={handleRemindLater}
            style={{
              padding: "9px 15px",
              fontSize: "13px",
              fontWeight: 500,
              background: "transparent",
              border: isDark ? "1px solid #444" : "1px solid #ccc",
              borderRadius: "7px",
              color: isDark ? "#aaa" : "#666",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Remind Me Later
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleViewRelease}
              style={{
                padding: "9px 14px",
                fontSize: "13px",
                fontWeight: 600,
                background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                border: "none",
                borderRadius: "7px",
                color: isDark ? "#ddd" : "#444",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              View on GitHub
            </button>

            <button
              onClick={handleDownload}
              style={{
                padding: "9px 18px",
                fontSize: "13px",
                fontWeight: 700,
                background: isDark ? "#00ff99" : "#003399",
                color: isDark ? "#000" : "#fff",
                border: "none",
                borderRadius: "7px",
                cursor: "pointer",
                boxShadow: isDark
                  ? "0 4px 12px rgba(0, 255, 153, 0.25)"
                  : "0 4px 12px rgba(0, 51, 153, 0.25)",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>⬇ Download Update</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
