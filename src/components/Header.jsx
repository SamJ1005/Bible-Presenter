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
      }}
    >
      {/* LEFT SIDE: Buttons + Navi Tabs + Scripture Screen Title */}
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
          <button
            onClick={openBlankPresentation}
            title="Blank Presentation"
            style={buttonStyle(theme)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                theme === "dark" ? "#838383bd" : "#d3d3d3ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                theme === "dark" ? "#0f0e0e" : "#ffffff";
            }}
          >
            ☐
          </button>

          <button
            onClick={closePresentation}
            title="Close Presentation"
            style={buttonStyle(theme)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                theme === "dark" ? "#838383bd" : "#d3d3d3ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                theme === "dark" ? "#0f0e0eff" : "#ffffff";
            }}
          >
            ☒
          </button>
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
          {user && user.email === 'samjac75@gmail.com' && renderTab(
            "maintenance",
            "Maintenance",
            activeTab,
            setActiveTab,
            tabActiveBg,
            tabHoverBg,
            text
          )}
        </div>

        {/* Subtle divider */}
        <div style={{ width: "1px", height: "18px", background: border, opacity: 0.35 }} />

        {/* TITLE TEXT: Closer to left navigation */}
        <div
          style={{
            fontSize: "23px",
            fontWeight: "600",
            whiteSpace: "nowrap",
            color: theme === "dark" ? "#00ff99" : "#003399",
            marginLeft: "2px",
          }}
        >
          Scripture Screen
        </div>
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

        {/* Theme Toggle */}
        <div
          title="Switch Theme"
          onClick={toggleTheme}
          style={{
            width: "52px",
            height: "28px",
            background: theme === "dark" ? "#2b2b2b" : "#dddddd",
            borderRadius: "50px",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
            position: "relative",
            transition: "background 0.3s ease",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "18px",
              transform: `translateX(${
                theme === "dark" ? "24px" : "0px"
              }) rotate(${theme === "dark" ? "360deg" : "0deg"})`,
              transition: "0.35s",
            }}
          >
            {theme === "dark" ? "🌛" : "🌞"}
          </div>
        </div>
      </div>
    </header>
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
