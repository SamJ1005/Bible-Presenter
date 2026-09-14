import React, { useState } from "react";
import { isMaintenanceAllowed } from "../utils/maintenanceAuth";

export default function Header({
  theme,
  toggleTheme,
  activeTab,
  setActiveTab,
  openBlankPresentation,
  closePresentation,
  settings,
  setSettings,
  user,
}) {
  // ----- Colors for theme -----
  const bg = theme === "dark" ? "#0f0e0eff" : "#ffffff";
  const text = theme === "dark" ? "#fff" : "#000";
  const border = theme === "dark" ? "#555" : "#999";

  const tabActiveBg = theme === "dark" ? "#00ff99" : "#003399"; // tab highlight
  const tabHoverBg = theme === "dark" ? "#838383bd" : "#d3d3d3ff"; // hover background

  const isBibleTab = activeTab === "bible";

  // Clamp helper for font offset
  const clampOffset = (v) => Math.max(-15, Math.min(15, v));

  // Maintenance tab access check (strictly Sam J only)
  const canAccessMaintenance = isMaintenanceAllowed(user);

  return (
    <header
      style={{
        background: bg,
        color: text,
        padding: "0 14px",
        fontSize: "20px",
        borderBottom: `1px solid ${border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: "60px",
        minHeight: "55px",
        flexShrink: 0,
        minWidth: "600px",
        position: "relative",
      }}
    >
      {/* LEFT SIDE: Buttons + Navi Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          height: "100%",
        }}
      >
        {/* Blank + Close buttons tightly clustered */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <HeaderIconButton
            onClick={openBlankPresentation}
            title="Blank Presentation"
            theme={theme}
          >
            ☐
          </HeaderIconButton>

          <HeaderIconButton
            onClick={closePresentation}
            title="Close Presentation"
            theme={theme}
          >
            ☒
          </HeaderIconButton>
        </div>

        {/* Subtle divider */}
        <div style={{ width: "1px", height: "18px", background: border, opacity: 0.35 }} />

        {/* TABS */}
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          {renderTab(
            "bible",
            "Bible",
            activeTab,
            setActiveTab,
            tabActiveBg,
            tabHoverBg,
            text
          )}
          {renderTab(
            "settings",
            "Settings",
            activeTab,
            setActiveTab,
            tabActiveBg,
            tabHoverBg,
            text
          )}
          {renderTab(
            "prelisted",
            "Playlist",
            activeTab,
            setActiveTab,
            tabActiveBg,
            tabHoverBg,
            text
          )}
          {canAccessMaintenance && renderTab(
            "maintenance",
            "Maintenance",
            activeTab,
            setActiveTab,
            tabActiveBg,
            tabHoverBg,
            text
          )}
        </div>
      </div>

      {/* CENTER: Scripture Screen Title Anchored to Center */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "22px",
          fontWeight: "700",
          letterSpacing: "0.5px",
          whiteSpace: "nowrap",
          color: theme === "dark" ? "#00ff99" : "#003399",
          pointerEvents: "none",
        }}
      >
        Scripture Screen
      </div>

      {/* RIGHT — Font controls (Bible tab only) + Theme Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>

        {/* Font Resize Controls — only visible in Bible tab */}
        {isBibleTab && settings && setSettings && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Tamil font control */}
            <FontMiniControl
              letter="அ"
              fontFamily="TamilBibleFont, Arial, sans-serif"
              value={settings.tamilFontOffset ?? 0}
              theme={theme}
              title="Tamil verse font size"
              onChange={(v) => setSettings(prev => ({ ...prev, tamilFontOffset: clampOffset(v) }))}
            />

            {/* Divider */}
            <div style={{ width: "1px", height: "28px", background: theme === "dark" ? "#444" : "#ccc" }} />

            {/* English font control */}
            <FontMiniControl
              letter="A"
              fontFamily="Arial, sans-serif"
              value={settings.englishFontOffset ?? 0}
              theme={theme}
              title="English verse font size"
              onChange={(v) => setSettings(prev => ({ ...prev, englishFontOffset: clampOffset(v) }))}
            />
          </div>
        )}

        {/* Dark Inner Theme Toggle Button (from toggles.dev with Blue & Green app colors) */}
        <DarkInnerToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
    </header>
  );
}

/* ----------------------------------------
   DarkInnerToggle — Animated split-contrast circular toggle
   Matches https://toggles.dev/r/dark-inner
----------------------------------------- */
function DarkInnerToggle({ theme, toggleTheme }) {
  const isDark = theme === "dark";
  const [hover, setHover] = React.useState(false);

  return (
    <button
      type="button"
      title={`Switch to ${isDark ? "Light" : "Dark"} Theme`}
      onClick={toggleTheme}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "transparent",
        border: "none",
        padding: "2px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        outline: "none",
        transition: "transform 0.2s ease, opacity 0.2s ease",
        transform: hover ? "scale(1.12)" : "scale(1)",
        opacity: hover ? 1 : 0.92,
      }}
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 32 32"
      >
        {/* Outer Circle Group - Rotates Clockwise (180deg) */}
        <g
          style={{
            transform: isDark ? "rotate(180deg)" : "rotate(0deg)",
            transformOrigin: "16px 16px",
            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Left half outer: Blue (#003399) in light mode, Green (#00ff99) in dark mode */}
          <path
            d="M 16,2 A 14,14 0 0,0 16,30 Z"
            fill={isDark ? "#00ff99" : "#003399"}
          />
          {/* Right half outer: Light/White in light mode, Dark/Black in dark mode */}
          <path
            d="M 16,2 A 14,14 0 0,1 16,30 Z"
            fill={isDark ? "#121620" : "#ffffff"}
          />
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke={isDark ? "#00ff99" : "#003399"}
            strokeWidth="1.5"
          />
        </g>

        {/* Inner Core Group - Rotates Counter-Clockwise (-180deg, OPPOSITE!) */}
        <g
          style={{
            transform: isDark ? "rotate(-180deg)" : "rotate(0deg)",
            transformOrigin: "16px 16px",
            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Left half inner: Light/White in light mode, Dark/Black in dark mode */}
          <path
            d="M 16,9 A 7,7 0 0,0 16,23 Z"
            fill={isDark ? "#121620" : "#ffffff"}
          />
          {/* Right half inner: Blue (#003399) in light mode, Green (#00ff99) in dark mode */}
          <path
            d="M 16,9 A 7,7 0 0,1 16,23 Z"
            fill={isDark ? "#00ff99" : "#003399"}
          />
        </g>
      </svg>
    </button>
  );
}

/* ----------------------------------------
   HeaderIconButton — Stateful button to avoid inline DOM style mutations
----------------------------------------- */
function HeaderIconButton({ onClick, title, theme, children }) {
  const [hovered, setHovered] = React.useState(false);
  const bg = hovered
    ? (theme === "dark" ? "#838383bd" : "#d3d3d3ff")
    : (theme === "dark" ? "#0f0e0eff" : "#ffffff");

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bg,
        color: theme === "dark" ? "#ffffff" : "#000000",
        border: `1px solid ${theme === "dark" ? "#555" : "#999"}`,
        padding: "4px 8px",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "18px",
        transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
      }}
    >
      {children}
    </button>
  );
}

/* ----------------------------------------
   FontMiniControl — compact +/- control with language letter
----------------------------------------- */
function FontMiniControl({ letter, fontFamily, value, onChange, theme, title }) {
  const accent = theme === "dark" ? "#00ff99" : "#003399";
  const mutedBg = theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const borderCol = theme === "dark" ? "#444" : "#ccc";

  const btnStyle = {
    cursor: "pointer",
    background: mutedBg,
    border: `1px solid ${borderCol}`,
    borderRadius: "5px",
    color: accent,
    fontWeight: "bold",
    fontSize: "13px",
    width: "22px",
    height: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    userSelect: "none",
    transition: "all 0.15s",
    padding: 0,
  };

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "3px" }}
      title={title}
    >
      {/* Language sample letter */}
      <span
        style={{
          fontFamily,
          fontSize: "15px",
          lineHeight: 1,
          opacity: 0.75,
          minWidth: "16px",
          textAlign: "center",
          color: value !== 0 ? accent : (theme === "dark" ? "#aaa" : "#555"),
          transition: "color 0.2s",
        }}
      >
        {letter}
      </span>

      {/* Decrease */}
      <button
        style={btnStyle}
        onClick={() => onChange(value - 1)}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderCol; }}
      >
        −
      </button>

      {/* Offset display */}
      <span
        style={{
          minWidth: "20px",
          textAlign: "center",
          fontSize: "11px",
          fontWeight: "700",
          color: value > 0 ? "#4caf50" : value < 0 ? "#ff9800" : (theme === "dark" ? "#555" : "#aaa"),
          lineHeight: 1,
        }}
        title={`Offset: ${value > 0 ? "+" : ""}${value}`}
      >
        {value > 0 ? `+${value}` : value === 0 ? "0" : value}
      </span>

      {/* Increase */}
      <button
        style={btnStyle}
        onClick={() => onChange(value + 1)}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderCol; }}
      >
        +
      </button>
    </div>
  );
}

/* ----------------------------------------
   Helper: Styles for small square buttons
----------------------------------------- */
function buttonStyle(theme) {
  return {
    background: theme === "dark" ? "#0f0e0e" : "#ffffff",
    color: theme === "dark" ? "#ffffff" : "#000000",
    border: `1px solid ${theme === "dark" ? "#555" : "#999"}`,
    padding: "4px 8px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "18px",
    transition: "0.25s",
  };
}

/* ----------------------------------------
   Helper: Render a tab with active color
----------------------------------------- */
function renderTab(
  id,
  label,
  activeTab,
  setActiveTab,
  tabActiveText, // active text color
  tabHoverBg, // hover background
  normalText, // normal text color
  theme
) {
  const isActive = activeTab === id;

  return (
    <div
      onClick={() => setActiveTab(id)}
      style={{
        padding: "5px 10px",
        cursor: "pointer",
        borderRadius: "6px",
        fontSize: "16px",
        fontWeight: isActive ? "600" : "500",

        // ACTIVE TEXT COLOR
        color: isActive ? tabActiveText : normalText,
        background: "transparent",
        transition: "0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = tabHoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </div>
  );
}
