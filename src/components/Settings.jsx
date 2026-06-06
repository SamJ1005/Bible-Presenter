import React, { useState } from "react";
import Login from "./Login/Login";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

// Reusable section card component
const SettingsCard = ({ title, children, style = {} }) => (
  <div style={{
    marginBottom: "20px",
    padding: "18px 20px",
    borderRadius: "10px",
    background: "rgba(128, 128, 128, 0.06)",
    border: "1px solid rgba(128, 128, 128, 0.15)",
    ...style
  }}>
    {title && (
      <h3 style={{
        margin: "0 0 14px 0",
        fontSize: "15px",
        fontWeight: 700,
        letterSpacing: "0.3px",
        opacity: 0.85,
        borderBottom: "1px solid rgba(128, 128, 128, 0.12)",
        paddingBottom: "10px"
      }}>
        {title}
      </h3>
    )}
    {children}
  </div>
);

// Font Offset Control with A+/a- buttons (matches playlist style)
const FontOffsetControl = ({ label, value, onChange, theme }) => {
  const offset = value || 0;

  const btnBase = {
    cursor: 'pointer',
    background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    lineHeight: 1,
    transition: 'all 0.2s ease',
    userSelect: 'none',
    outline: 'none',
    padding: '4px 8px',
  };

  const handleDelta = (delta) => {
    let next = offset + delta;
    if (next < -15) next = -15;
    if (next > 15) next = 15;
    onChange(next);
  };

  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ fontWeight: 600, fontSize: "13px", display: "block", marginBottom: "8px", opacity: 0.7 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* a- button */}
        <button
          style={{
            ...btnBase,
            color: theme === 'dark' ? '#00ff99' : '#505050ff',
            fontSize: '12px',
            height: '34px',
          }}
          onClick={() => handleDelta(-1)}
          title="Decrease font size"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme === 'dark' ? '#00ff99' : '#003399';
            e.currentTarget.style.background = theme === 'dark' ? 'rgba(0,255,153,0.1)' : 'rgba(0,51,153,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme === 'dark' ? '#444' : '#ccc';
            e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
          }}
        >
          a-
        </button>

        {/* Reset button */}
        <button
          style={{
            ...btnBase,
            height: '34px',
            fontSize: '14px',
            color: offset !== 0 ? '#ff9800' : (theme === 'dark' ? '#555' : '#999'),
            background: offset !== 0 ? (theme === 'dark' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)') : btnBase.background,
          }}
          onClick={() => onChange(0)}
          title="Reset to default (0)"
        >
          ↺
        </button>

        {/* Offset display */}
        <div style={{
          minWidth: '54px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme === 'dark' ? '#000' : '#fff',
          border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '700',
          color: offset > 0
            ? '#4caf50'
            : offset < 0
              ? '#ff9800'
              : (theme === 'dark' ? '#666' : '#999'),
        }}>
          {offset > 0 ? `+${offset}` : offset}
        </div>

        {/* A+ button */}
        <button
          style={{
            ...btnBase,
            color: theme === 'dark' ? '#bbb' : '#333',
            fontSize: '14px',
            height: '34px',
          }}
          onClick={() => handleDelta(1)}
          title="Increase font size"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme === 'dark' ? '#00ff99' : '#003399';
            e.currentTarget.style.background = theme === 'dark' ? 'rgba(0,255,153,0.1)' : 'rgba(0,51,153,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme === 'dark' ? '#444' : '#ccc';
            e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
          }}
        >
          A+
        </button>
      </div>
    </div>
  );
};

// Cloud SVG icon (matches the one from the playlist sidebar)
const CloudIcon = ({ size = 20, color = "#888" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
  </svg>
);

// Checkmark SVG
const CheckIcon = ({ size = 14, color = "#00ff99" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default function SettingsPage({ settings, setSettings, theme, setTheme, user }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [displays, setDisplays] = React.useState([]);

  React.useEffect(() => {
    if (window.api?.getDisplays) {
      window.api.getDisplays()
        .then(setDisplays)
        .catch(() => {
          // Electron main process may not have the handler yet (needs restart)
          console.warn('Display detection not available. Restart the app to enable.');
          setDisplays([]);
        });
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Background image uploader — stores base64 in settings (persisted to localStorage)
  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSettings((prev) => ({
        ...prev,
        presentationBgImage: reader.result,
        presentationBgImageName: file.name,
        presentationBgType: "image",
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleClearBgImage = () => {
    setSettings((prev) => ({
      ...prev,
      presentationBgImage: null,
      presentationBgImageName: null,
      presentationBgType: "black",
    }));
  };

  const isCloudSyncOn = settings.cloudSyncEnabled !== false;

  return (
    <div style={{ padding: "20px", maxHeight: "calc(100vh - 80px)", overflowY: "auto" }}>
      {/* Header: Title + Auth */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Settings</h2>
        <div>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px", opacity: 0.7 }}>{user.email}</span>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "rgba(128,128,128,0.3)",
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  transition: "all 0.2s"
                }}
              >
                Logout
              </button>

              {/* Logout Confirmation Dialog */}
              {showLogoutConfirm && (
                <div style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(4px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 2000
                }}
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  <div style={{
                    background: theme === "dark" ? "#1e1e1e" : "#fff",
                    color: theme === "dark" ? "#e0e0e0" : "#222",
                    borderRadius: "14px",
                    padding: "28px 32px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                    textAlign: "center",
                    maxWidth: "340px",
                    width: "90%"
                  }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ fontSize: "28px", marginBottom: "12px" }}>👋</div>
                    <div style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      marginBottom: "6px"
                    }}>
                      Are you sure you want to log out?
                    </div>
                    <div style={{
                      fontSize: "13px",
                      opacity: 0.6,
                      marginBottom: "22px",
                      lineHeight: 1.4
                    }}>
                      Your playlists are saved locally. Cloud sync will pause until you log in again.
                    </div>
                    <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                      <button
                        onClick={() => setShowLogoutConfirm(false)}
                        style={{
                          padding: "9px 22px",
                          borderRadius: "8px",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          borderColor: "rgba(128,128,128,0.3)",
                          background: "transparent",
                          color: "inherit",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: 600
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleLogout}
                        style={{
                          padding: "9px 22px",
                          borderRadius: "8px",
                          border: "none",
                          background: "#e74c3c",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: 600,
                          transition: "background 0.2s"
                        }}
                      >
                        Yes, Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#ecc906",
                color: "#000",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "14px",
                transition: "background 0.2s"
              }}
            >
              Login or Sign up
            </button>
          )}
        </div>
      </div>

      <Login isOpen={showLogin} onClose={() => setShowLogin(false)} />

      {/* Cloud Sync Card (full width, premium design) */}
      {user && (
        <div
          onClick={() => setSettings(prev => ({ ...prev, cloudSyncEnabled: !isCloudSyncOn }))}
          style={{
            marginBottom: "24px",
            padding: "16px 20px",
            borderRadius: "12px",
            background: isCloudSyncOn
              ? (theme === "dark"
                ? "linear-gradient(135deg, rgba(0, 255, 153, 0.08) 0%, rgba(0, 255, 153, 0.02) 100%)"
                : "linear-gradient(135deg, rgba(0, 51, 153, 0.06) 0%, rgba(0, 51, 153, 0.02) 100%)")
              : "rgba(128, 128, 128, 0.06)",
            border: isCloudSyncOn
              ? (theme === "dark" ? "1px solid rgba(0, 255, 153, 0.25)" : "1px solid rgba(0, 51, 153, 0.2)")
              : "1px solid rgba(128, 128, 128, 0.15)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            userSelect: "none"
          }}
        >
          {/* Cloud Icon Container */}
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: isCloudSyncOn
              ? (theme === "dark" ? "rgba(0, 255, 153, 0.12)" : "rgba(0, 51, 153, 0.1)")
              : "rgba(128, 128, 128, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.3s ease",
            position: "relative"
          }}>
            <CloudIcon
              size={24}
              color={isCloudSyncOn
                ? (theme === "dark" ? "#00ff99" : "#003399")
                : (theme === "dark" ? "#666" : "#999")}
            />
            {/* Sync checkmark badge */}
            {isCloudSyncOn && (
              <div style={{
                position: "absolute",
                bottom: "-2px",
                right: "-2px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: theme === "dark" ? "#0f0e0e" : "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: theme === "dark" ? "2px solid rgba(0, 255, 153, 0.4)" : "2px solid rgba(0, 51, 153, 0.3)"
              }}>
                <CheckIcon size={10} color={theme === "dark" ? "#00ff99" : "#003399"} />
              </div>
            )}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "15px",
              fontWeight: 700,
              marginBottom: "3px",
              color: isCloudSyncOn
                ? (theme === "dark" ? "#e0e0e0" : "#222")
                : (theme === "dark" ? "#888" : "#666")
            }}>
              Cloud Sync
              <span style={{
                marginLeft: "8px",
                fontSize: "11px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "10px",
                background: isCloudSyncOn
                  ? (theme === "dark" ? "rgba(0, 255, 153, 0.15)" : "rgba(0, 51, 153, 0.1)")
                  : "rgba(128, 128, 128, 0.12)",
                color: isCloudSyncOn
                  ? (theme === "dark" ? "#00ff99" : "#003399")
                  : (theme === "dark" ? "#666" : "#999"),
              }}>
                {isCloudSyncOn ? "ON" : "OFF"}
              </span>
            </div>
            <div style={{
              fontSize: "12px",
              opacity: 0.6,
              lineHeight: 1.4
            }}>
              {isCloudSyncOn
                ? "Playlists auto-sync when online • Available offline from last sync"
                : "Enable to automatically sync playlists across devices"}
            </div>
          </div>

          {/* Toggle Switch */}
          <div style={{
            width: "44px",
            height: "24px",
            borderRadius: "12px",
            background: isCloudSyncOn
              ? (theme === "dark" ? "#00ff99" : "#003399")
              : (theme === "dark" ? "#333" : "#ccc"),
            position: "relative",
            transition: "background 0.3s ease",
            flexShrink: 0
          }}>
            <div style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "#fff",
              position: "absolute",
              top: "2px",
              left: isCloudSyncOn ? "22px" : "2px",
              transition: "left 0.3s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
            }} />
          </div>
        </div>
      )}

      {/* THREE COLUMN LAYOUT */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "20px",
        alignItems: "flex-start"
      }}>
        {/* COLUMN 1 — Language & Display */}
        <div style={{ minWidth: 0 }}>

          {/* Primary Translation */}
          <SettingsCard title="Primary Language">
            <div style={{ fontSize: '12px', opacity: 0.65, marginBottom: '12px', lineHeight: 1.5 }}>
              Sets which language appears first — in the Bible tab and on-screen presentation.
            </div>
            {["Tamil", "English"].map((lang) => (
              <div key={lang} style={{ marginBottom: "10px" }}>
                <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="radio"
                    name="primaryTranslation"
                    checked={(settings.primaryTranslation || "Tamil") === lang}
                    onChange={() => setSettings((prev) => ({ ...prev, primaryTranslation: lang }))}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{lang}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>
                      {lang === "Tamil" ? "Tamil on left / top" : "English on left / top"}
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </SettingsCard>

          {/* Language Visibility */}
          <SettingsCard title="Show Languages">
            <div style={{ fontSize: '12px', opacity: 0.65, marginBottom: '12px', lineHeight: 1.5 }}>
              Toggle which languages are shown in the presentation.
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={settings.isTamilEnabled !== false}
                  onChange={(e) => setSettings((prev) => ({ ...prev, isTamilEnabled: e.target.checked }))}
                  style={{ width: '16px', height: '16px' }}
                />
                Show Tamil
              </label>
            </div>
            <div>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={settings.isEnglishEnabled !== false}
                  onChange={(e) => setSettings((prev) => ({ ...prev, isEnglishEnabled: e.target.checked }))}
                  style={{ width: '16px', height: '16px' }}
                />
                Show English
              </label>
            </div>
          </SettingsCard>

        </div>

        {/* COLUMN 2 — Presentation Appearance */}
        <div style={{ minWidth: 0 }}>

          {/* Background Options */}
          <SettingsCard title="Presentation Background">
            {/* White */}
            <div style={{ marginBottom: "8px" }}>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="radio"
                  name="bg"
                  checked={settings.presentationBgType === "white"}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      presentationBgType: "white",
                      presentationBgImage: null,
                      presentationTextColor: "black",
                    }))
                  }
                />
                <span>White background</span>
              </label>
            </div>

            {/* Black */}
            <div style={{ marginBottom: "8px" }}>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="radio"
                  name="bg"
                  checked={settings.presentationBgType === "black"}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      presentationBgType: "black",
                      presentationBgImage: null,
                      presentationTextColor: "white",
                    }))
                  }
                />
                <span>Black background</span>
              </label>
            </div>

            {/* Custom Image — gallery approach */}
            <div style={{ marginBottom: "8px" }}>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="radio"
                  name="bg"
                  checked={settings.presentationBgType === "image"}
                  onChange={() => setSettings((prev) => ({ ...prev, presentationBgType: "image" }))}
                />
                <span>Custom Image</span>
              </label>

              {/* Image Gallery */}
              <div style={{ marginTop: '10px', marginLeft: '4px' }}>
                {/* Stored image thumbnails */}
                {(settings.bgImageGallery || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    {(settings.bgImageGallery || []).map((img) => {
                      const isActive = settings.presentationBgImage === img.data;
                      return (
                        <div
                          key={img.id}
                          style={{ position: 'relative', cursor: 'pointer' }}
                          title={img.name}
                        >
                          <img
                            src={img.data}
                            alt={img.name}
                            onClick={() => setSettings((prev) => ({
                              ...prev,
                              presentationBgImage: img.data,
                              presentationBgImageName: img.name,
                              presentationBgType: 'image',
                            }))}
                            style={{
                              width: '80px',
                              height: '52px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: isActive ? '2px solid #00ff99' : '2px solid transparent',
                              display: 'block',
                              transition: 'border-color 0.2s',
                            }}
                          />
                          {/* Active badge */}
                          {isActive && (
                            <div style={{
                              position: 'absolute', top: 2, left: 2,
                              background: '#00ff99', color: '#000',
                              fontSize: '9px', fontWeight: 700,
                              padding: '1px 4px', borderRadius: '3px',
                            }}>✓</div>
                          )}
                          {/* Remove button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSettings((prev) => {
                                const gallery = (prev.bgImageGallery || []).filter(x => x.id !== img.id);
                                const wasActive = prev.presentationBgImage === img.data;
                                return {
                                  ...prev,
                                  bgImageGallery: gallery,
                                  presentationBgImage: wasActive ? (gallery[0]?.data || null) : prev.presentationBgImage,
                                  presentationBgImageName: wasActive ? (gallery[0]?.name || null) : prev.presentationBgImageName,
                                  presentationBgType: wasActive && gallery.length === 0 ? 'black' : prev.presentationBgType,
                                };
                              });
                            }}
                            style={{
                              position: 'absolute', top: 2, right: 2,
                              width: '16px', height: '16px',
                              background: 'rgba(231,76,60,0.85)', color: '#fff',
                              border: 'none', borderRadius: '50%', cursor: 'pointer',
                              fontSize: '10px', fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              lineHeight: 1, padding: 0,
                            }}
                          >×</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <label style={{
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '13px', padding: '6px 12px', borderRadius: '6px',
                  border: `1.5px dashed ${theme === 'dark' ? '#888' : '#666'}`,
                  color: theme === 'dark' ? '#eee' : '#555',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                }}>
                  + Add Image
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      files.forEach((file) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const newImg = { id: Date.now() + Math.random(), name: file.name, data: reader.result };
                          setSettings((prev) => ({
                            ...prev,
                            bgImageGallery: [...(prev.bgImageGallery || []), newImg],
                            // Auto-select the first added image
                            presentationBgImage: prev.presentationBgImage || reader.result,
                            presentationBgImageName: prev.presentationBgImageName || file.name,
                            presentationBgType: 'image',
                          }));
                        };
                        reader.readAsDataURL(file);
                      });
                      e.target.value = '';
                    }}
                  />
                </label>

                {(settings.bgImageGallery || []).length === 0 && (
                  <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '6px' }}>
                    Upload images to build a gallery. Click any thumbnail to use it.
                  </div>
                )}
              </div>
            </div>

            {/* Custom Color */}
            <div>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="radio"
                  name="bg"
                  checked={settings.presentationBgType === "custom"}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      presentationBgType: "custom",
                      presentationBgImage: null,
                      presentationBgColor: prev.presentationBgColor || "#1a1a2e",
                    }))
                  }
                />
                <span>Custom Color</span>
              </label>

              {settings.presentationBgType === "custom" && (
                <div style={{ marginTop: "8px", marginLeft: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="color"
                    value={settings.presentationBgColor || "#1a1a2e"}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        presentationBgColor: e.target.value,
                      }))
                    }
                    style={{ width: "40px", height: "30px", border: "none", cursor: "pointer", borderRadius: "4px" }}
                  />
                  <span style={{ fontSize: "12px", opacity: 0.6 }}>
                    {settings.presentationBgColor || "#1a1a2e"}
                  </span>
                </div>
              )}
            </div>
          </SettingsCard>

          {/* Font Color */}
          <SettingsCard title="Presentation Font Color">
            <div style={{ marginBottom: "8px" }}>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="radio"
                  name="fontColor"
                  checked={settings.presentationTextColor === "white"}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      presentationTextColor: "white",
                    }))
                  }
                />
                <span>White Text</span>
              </label>
            </div>

            <div style={{ marginBottom: "8px" }}>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="radio"
                  name="fontColor"
                  checked={settings.presentationTextColor === "black"}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      presentationTextColor: "black",
                    }))
                  }
                />
                <span>Black Text</span>
              </label>
            </div>

            <div>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="radio"
                  name="fontColor"
                  checked={settings.presentationTextColor !== "white" && settings.presentationTextColor !== "black"}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      presentationTextColor: prev.presentationTextColor && prev.presentationTextColor !== "white" && prev.presentationTextColor !== "black"
                        ? prev.presentationTextColor
                        : "#ffdd57",
                    }))
                  }
                />
                <span>Custom Color</span>
              </label>

              {settings.presentationTextColor !== "white" && settings.presentationTextColor !== "black" && (
                <div style={{ marginTop: "8px", marginLeft: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="color"
                    value={settings.presentationTextColor || "#ffdd57"}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        presentationTextColor: e.target.value,
                      }))
                    }
                    style={{ width: "40px", height: "30px", border: "none", cursor: "pointer", borderRadius: "4px" }}
                  />
                  <span style={{ fontSize: "12px", opacity: 0.6 }}>
                    {settings.presentationTextColor}
                  </span>
                </div>
              )}
            </div>
          </SettingsCard>

        </div>

        {/* COLUMN 3 — Output & General */}
        <div style={{ minWidth: 0 }}>

          {/* General Options */}
          <SettingsCard title="General">
            <div style={{ marginBottom: "16px" }}>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                <input
                  type="checkbox"
                  checked={settings.enableTransition}
                  onChange={(e) => setSettings((prev) => ({ ...prev, enableTransition: e.target.checked }))}
                  style={{ width: "16px", height: "16px" }}
                />
                Enable Slide/Fade Transition
              </label>
            </div>

            <div>
              <label style={{ fontWeight: 600, fontSize: "13px", display: "block", marginBottom: "6px" }}>
                Custom Watermark
              </label>
              <input
                type="text"
                value={settings.customWatermark || ""}
                placeholder="your watermark"
                onChange={(e) => setSettings((prev) => ({ ...prev, customWatermark: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  border: theme === 'dark' ? '1px solid #444' : '1px solid #ccc',
                  background: theme === 'dark' ? '#1a1a1a' : '#fff',
                  color: theme === 'dark' ? '#e0e0e0' : '#222',
                }}
              />
            </div>
          </SettingsCard>

          {/* Display Selection */}
          <SettingsCard title="Display Device">
            <select
              value={settings.preferredDisplayId || 'auto'}
              onChange={(e) => {
                const val = e.target.value;
                setSettings(prev => ({ ...prev, preferredDisplayId: val }));
                if (window.api?.setPreferredDisplay) window.api.setPreferredDisplay(val);
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: theme === 'dark' ? '1px solid #444' : '1px solid #ccc',
                background: theme === 'dark' ? '#1a1a1a' : '#fff',
                color: theme === 'dark' ? '#e0e0e0' : '#222',
                borderRadius: "6px",
                fontSize: "13px",
                outline: 'none'
              }}
            >
              <option value="auto">Auto (Prefer Secondary)</option>
              {displays.filter(d => d.isPrimary).map(d => (
                <option key={d.id} value={d.id}>Primary — {d.width}×{d.height}</option>
              ))}
              {displays.filter(d => !d.isPrimary).map((d, i) => (
                <option key={d.id} value={d.id}>Secondary{displays.filter(x => !x.isPrimary).length > 1 ? ` (${i + 1})` : ''} — {d.width}×{d.height}</option>
              ))}
            </select>
            <div style={{ fontSize: '11px', opacity: 0.55, marginTop: '6px' }}>
              'Auto' opens on the secondary monitor if available.
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
