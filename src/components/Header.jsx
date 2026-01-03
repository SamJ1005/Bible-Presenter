export default function Header({
  theme,
  toggleTheme,
  activeTab,
  setActiveTab,
  openBlankPresentation,
  closePresentation,
}) {
  // ----- Colors for theme -----
  const bg = theme === "dark" ? "#0f0e0eff" : "#ffffff";
  const text = theme === "dark" ? "#fff" : "#000";
  const border = theme === "dark" ? "#555" : "#999";

  const tabActiveBg = theme === "dark" ? "#00ff99" : "#003399"; // tab highlight
  const tabHoverBg = theme === "dark" ? "#838383bd" : "#d3d3d3ff"; // hover background

  return (
    <header
      style={{
        background: bg,
        color: text,
        padding: "0 12px",
        fontSize: "20px",
        borderBottom: `1px solid ${border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        height: "60px",
        minHeight: "55px",
        flexShrink: 0,
      }}
    >
      {/* LEFT SIDE */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "center",
          height: "100%",
        }}
      >
        {/* Blank + Close buttons */}
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
              theme === "dark" ? "#0f0e0eff" : "#ffffff";
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

        {/* TABS */}
        <div style={{ display: "flex", gap: "12px" }}>
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
            "Pre-Listed",
            activeTab,
            setActiveTab,
            tabActiveBg,
            tabHoverBg,
            text
          )}
        </div>
      </div>

      {/* CENTER TITLE */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "26px",
          fontWeight: "500",
          whiteSpace: "nowrap",
          color: theme === "dark" ? "#00ff99" : "#003399",
        }}
      >
        Scripture Screen
      </div>

      {/* RIGHT THEME TOGGLE */}
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
          position: "absolute",
          right: "15px",
          top: "16px",
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
    </header>
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
        padding: "8px 14px",
        cursor: "pointer",
        borderRadius: "6px",

        // ACTIVE TEXT COLOR
        color: isActive ? tabActiveText : normalText,
        background: "transparent",
        transition: "0.25s",
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

//What is the problem in the render tab function?
