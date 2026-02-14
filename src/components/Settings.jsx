// Settings.jsx
import React from "react";

export default function SettingsPage({ settings, setSettings, theme, setTheme }) {
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

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "20px" }}>Settings</h2>

      {/* BACKGROUND OPTIONS */}
      <div style={{ marginBottom: "25px" }}>
        <label style={{ fontWeight: "bold", fontSize: "16px" }}>
          Background for Presentation:
        </label>

        {/* White Background */}
        <div style={{ marginTop: "8px" }}>
          <label>
            <input
              type="radio"
              name="bg"
              checked={settings.presentationBgType === "white"}
              onChange={() =>
                setSettings((prev) => ({
                  ...prev,
                  presentationBgType: "white",
                  presentationBgImage: null,
                  presentationTextColor: "black", // auto
                }))
              }
            />
            <span style={{ marginLeft: "8px" }}>White background</span>
          </label>
        </div>

        {/* Black Background */}
        <div style={{ marginTop: "8px" }}>
          <label>
            <input
              type="radio"
              name="bg"
              checked={settings.presentationBgType === "black"}
              onChange={() =>
                setSettings((prev) => ({
                  ...prev,
                  presentationBgType: "black",
                  presentationBgImage: null,
                  presentationTextColor: "white", // auto
                }))
              }
            />
            <span style={{ marginLeft: "8px" }}>Black background</span>
          </label>
        </div>

        {/* Custom Image */}
        <div style={{ marginTop: "8px" }}>
          <label>
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
            <span style={{ marginLeft: "8px" }}>Custom Image</span>
          </label>

          {settings.presentationBgType === "image" && (
            <div style={{ marginTop: "10px" }}>
              <input type="file" accept="image/*" onChange={handleBgUpload} />
            </div>
          )}

          {settings.presentationBgType === "image" &&
            settings.presentationBgImage && (
              <div style={{ marginTop: "10px" }}>
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
        <div style={{ marginTop: "8px" }}>
          <label>
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
            <span style={{ marginLeft: "8px" }}>Custom Color</span>
          </label>

          {settings.presentationBgType === "custom" && (
            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="color"
                value={settings.presentationBgColor || "#1a1a2e"}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    presentationBgColor: e.target.value,
                  }))
                }
                style={{ width: "50px", height: "35px", border: "none", cursor: "pointer" }}
              />
              <span style={{ fontSize: "13px", opacity: 0.7 }}>
                {settings.presentationBgColor || "#1a1a2e"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* FONT COLOR OPTIONS */}
      <div style={{ marginBottom: "25px" }}>
        <label style={{ fontWeight: "bold", fontSize: "16px" }}>
          Presentation Font Color:
        </label>

        <div style={{ marginTop: "8px" }}>
          <label>
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
            <span style={{ marginLeft: "8px" }}>White Text</span>
          </label>
        </div>

        <div style={{ marginTop: "8px" }}>
          <label>
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
            <span style={{ marginLeft: "8px" }}>Black Text</span>
          </label>
        </div>

        <div style={{ marginTop: "8px" }}>
          <label>
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
            <span style={{ marginLeft: "8px" }}>Custom Color</span>
          </label>

          {settings.presentationTextColor !== "white" && settings.presentationTextColor !== "black" && (
            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="color"
                value={settings.presentationTextColor || "#ffdd57"}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    presentationTextColor: e.target.value,
                  }))
                }
                style={{ width: "50px", height: "35px", border: "none", cursor: "pointer" }}
              />
              <span style={{ fontSize: "13px", opacity: 0.7 }}>
                {settings.presentationTextColor}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* TAMIL FONT SIZE */}
      <div style={{ marginBottom: "28px" }}>
        <label
          style={{
            fontWeight: "bold",
            fontSize: "16px",
            marginBottom: "8px",
            display: "block",
          }}
        >
          Tamil Verse Font Size (20 - 140px):
        </label>

        <input
          type="text"
          placeholder="20–140"
          value={settings.tamilFontSize}
          onChange={(e) => {
            let v = e.target.value;

            // Allow blank typing
            if (v === "") {
              setSettings((prev) => ({ ...prev, tamilFontSize: "" }));
              return;
            }

            // Reject non-numeric input
            if (!/^\d+$/.test(v)) return;

            let num = Number(v);

            // limit but do NOT auto-correct until blur
            setSettings((prev) => ({ ...prev, tamilFontSize: num }));
          }}
          onBlur={() => {
            let v = Number(settings.tamilFontSize);
            if (!v) v = 20;
            if (v < 20) v = 20;
            if (v > 140) v = 140;

            setSettings((prev) => ({ ...prev, tamilFontSize: v }));
          }}
          style={{
            width: "130px",
            padding: "7px",
            borderRadius: "6px",
            fontSize: "15px",
          }}
        />
      </div>

      {/* ENGLISH FONT SIZE */}
      <div style={{ marginBottom: "28px" }}>
        <label
          style={{
            fontWeight: "bold",
            fontSize: "16px",
            marginBottom: "8px",
            display: "block",
          }}
        >
          English Verse Font Size (18 - 120px):
        </label>

        <input
          type="text"
          placeholder="18–120"
          value={settings.englishFontSize}
          onChange={(e) => {
            let v = e.target.value;

            // Allow blank typing
            if (v === "") {
              setSettings((prev) => ({ ...prev, englishFontSize: "" }));
              return;
            }

            // Reject non-numeric input
            if (!/^\d+$/.test(v)) return;

            let num = Number(v);

            // limit but do NOT auto-correct until blur
            setSettings((prev) => ({ ...prev, englishFontSize: num }));
          }}
          onBlur={() => {
            let v = Number(settings.englishFontSize);
            if (!v) v = 18;
            if (v < 18) v = 18;
            if (v > 120) v = 120;

            setSettings((prev) => ({ ...prev, englishFontSize: v }));
          }}
          style={{
            width: "130px",
            padding: "7px",
            borderRadius: "6px",
            fontSize: "15px",
          }}
        />
      </div>

      {/* INDEX FONT SIZE */}
      <div style={{ marginBottom: "28px" }}>
        <label
          style={{
            fontWeight: "bold",
            fontSize: "16px",
            marginBottom: "8px",
            display: "block",
          }}
        >
          Index Font Size (10 - 60px):
        </label>

        <input
          type="text"
          placeholder="10–60"
          value={settings.indexFontSize}
          onChange={(e) => {
            let v = e.target.value;

            // Allow blank typing
            if (v === "") {
              setSettings((prev) => ({ ...prev, indexFontSize: "" }));
              return;
            }

            // Reject non-numeric input
            if (!/^\d+$/.test(v)) return;

            let num = Number(v);

            // limit but do NOT auto-correct unStil blur
            setSettings((prev) => ({ ...prev, indexFontSize: num }));
          }}
          onBlur={() => {
            let v = Number(settings.indexFontSize);
            if (!v) v = 10;
            if (v < 10) v = 10;
            if (v > 60) v = 60;

            setSettings((prev) => ({ ...prev, indexFontSize: v }));
          }}
          style={{
            width: "130px",
            padding: "7px",
            borderRadius: "6px",
            fontSize: "15px",
          }}
        />
      </div>

      {/* TRANSITION */}
      <div style={{ marginBottom: "25px" }}>
        <label style={{ fontWeight: "bold", fontSize: "16px" }}>
          <input
            type="checkbox"
            checked={settings.enableTransition}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                enableTransition: e.target.checked,
              }))
            }
            style={{ marginRight: "10px" }}
          />
          Enable Slide/Fade Transition
        </label>
      </div>

      {/* PRIMARY TRANSLATION */}
      <div style={{ marginBottom: "25px" }}>
        <label style={{ fontWeight: "bold", fontSize: "16px" }}>
          Primary Translation:
        </label>
        <br />
        <select
          value={settings.primaryTranslation}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              primaryTranslation: e.target.value,
            }))
          }
          style={{
            width: "200px",
            padding: "6px",
            marginTop: "5px",
            borderRadius: "4px",
          }}
        >
          <option value="Tamil">Tamil</option>
          <option value="English">English</option>
        </select>
      </div>

      {/* WATERMARK */}
      <div style={{ marginBottom: "25px" }}>
        <label style={{ fontWeight: "bold", fontSize: "16px" }}>
          Custom Watermark:
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
            width: "30%",
            padding: "8px",
            marginTop: "5px",
            borderRadius: "4px",
          }}
        />
      </div>
    </div>
  );
}
//The error i have pasted before is the full error in the terminal
