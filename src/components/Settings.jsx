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

// Reusable Font Size Input with Buttons
const FontSizeInput = ({ label, value, min, max, defaultValue, onChange, theme }) => {
  const btnStyle = {
    cursor: 'pointer',
    background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
    borderRadius: '6px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme === 'dark' ? '#eee' : '#333',
    fontSize: '18px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    userSelect: 'none',
    outline: 'none'
  };

  const handleUpdate = (delta) => {
    let next = Number(value) + delta;
    if (next < min) next = min;
    if (next > max) next = max;
    onChange(next);
  };

  return (
    <div style={{ marginBottom: "18px" }}>
      <label style={{ fontWeight: 600, fontSize: "13px", display: "block", marginBottom: "8px", opacity: 0.7 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          style={btnStyle}
          onClick={() => handleUpdate(-2)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme === 'dark' ? '#00ff99' : '#003399';
            e.currentTarget.style.background = theme === 'dark' ? 'rgba(0,255,153,0.1)' : 'rgba(0,51,153,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme === 'dark' ? '#444' : '#ccc';
            e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
          }}
        >
          -
        </button>
        <button
          style={{
            ...btnStyle,
            width: '30px',
            fontSize: '14px',
            color: value !== defaultValue ? '#ff9800' : (theme === 'dark' ? '#666' : '#999'),
            background: value !== defaultValue ? (theme === 'dark' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)') : btnStyle.background
          }}
          onClick={() => onChange(defaultValue)}
          title={`Reset to ${defaultValue}px`}
        >
          ↺
        </button>
        <div style={{
          minWidth: '60px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme === 'dark' ? '#000' : '#fff',
          border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
          borderRadius: '6px',
          fontSize: '15px',
          fontWeight: '700',
          color: theme === 'dark' ? '#00ff99' : '#003399'
        }}>
          {value}px
        </div>
        <button
          style={btnStyle}
          onClick={() => handleUpdate(2)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme === 'dark' ? '#00ff99' : '#003399';
            e.currentTarget.style.background = theme === 'dark' ? 'rgba(0,255,153,0.1)' : 'rgba(0,51,153,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme === 'dark' ? '#444' : '#ccc';
            e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
          }}
        >
          +
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Background image uploader
  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSettings((prev) => ({
        ...prev,
        presentationBgImage: reader.result,
        presentationBgType: "image",
      }));
    };
    reader.readAsDataURL(file);
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

      {/* TWO COLUMN LAYOUT */}
      <div style={{
        display: "flex",
        gap: "24px",
        alignItems: "flex-start"
      }}>
        {/* LEFT COLUMN — Presentation Settings */}
        <div style={{ flex: 1, minWidth: 0 }}>

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

            {/* Custom Image */}
            <div style={{ marginBottom: "8px" }}>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="radio"
                  name="bg"
                  checked={settings.presentationBgType === "image"}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      presentationBgType: "image",
                    }))
                  }
                />
                <span>Custom Image</span>
              </label>

              {settings.presentationBgType === "image" && (
                <div style={{ marginTop: "8px", marginLeft: "24px" }}>
                  <input type="file" accept="image/*" onChange={handleBgUpload} />
                </div>
              )}

              {settings.presentationBgType === "image" &&
                settings.presentationBgImage && (
                  <div style={{ marginTop: "8px", marginLeft: "24px" }}>
                    <img
                      src={settings.presentationBgImage}
                      alt="Preview"
                      style={{
                        width: "120px",
                        height: "80px",
                        objectFit: "cover",
                        borderRadius: "6px",
                        border: "1px solid #666",
                      }}
                    />
                  </div>
                )}
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

        {/* RIGHT COLUMN — Font Sizes & General */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Font Sizes */}
          <SettingsCard title="Font Sizes">
            <FontSizeInput
              label="Tamil Verse (20 – 140px)"
              value={settings.tamilFontSize}
              min={20}
              max={140}
              defaultValue={60}
              theme={theme}
              onChange={(v) => setSettings(prev => ({ ...prev, tamilFontSize: v }))}
            />
            <FontSizeInput
              label="English Verse (18 – 120px)"
              value={settings.englishFontSize}
              min={18}
              max={120}
              defaultValue={60}
              theme={theme}
              onChange={(v) => setSettings(prev => ({ ...prev, englishFontSize: v }))}
            />
            <FontSizeInput
              label="Index / Reference (10 – 60px)"
              value={settings.indexFontSize}
              min={10}
              max={60}
              defaultValue={24}
              theme={theme}
              onChange={(v) => setSettings(prev => ({ ...prev, indexFontSize: v }))}
            />
          </SettingsCard>

          {/* General Options */}
          <SettingsCard title="General">
            {/* Transition */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                <input
                  type="checkbox"
                  checked={settings.enableTransition}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      enableTransition: e.target.checked,
                    }))
                  }
                  style={{ width: "16px", height: "16px" }}
                />
                Enable Slide/Fade Transition
              </label>
            </div>

            {/* Primary Translation */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 600, fontSize: "13px", display: "block", marginBottom: "6px" }}>
                Primary Translation
              </label>
              <select
                value={settings.primaryTranslation}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    primaryTranslation: e.target.value,
                  }))
                }
                style={{
                  width: "160px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                <option value="Tamil">Tamil</option>
                <option value="English">English</option>
              </select>
            </div>

            {/* Watermark */}
            <div>
              <label style={{ fontWeight: 600, fontSize: "13px", display: "block", marginBottom: "6px" }}>
                Custom Watermark
              </label>
              <input
                type="text"
                value={settings.customWatermark}
                placeholder="Enter watermark text"
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    customWatermark: e.target.value,
                  }))
                }
                style={{
                  width: "100%",
                  maxWidth: "280px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
