<div style={{ width: "200px", display: "flex", flexDirection: "column", height: "100px" }}>
    <h3 style={{ marginTop: "25px" }}>Recent</h3>

    <div
        style={{
            position: "relative", // Necessary for absolute positioning of arrows
            height: "300px",
            border: "1px solid #aaa",
            borderRadius: "6px",
            overflow: "hidden", // Keeps corners rounded
            display: "flex",    // Ensures layout integrity
        }}
    >
        <div
            ref={recentScrollRef}
            style={{
                flex: 1,
                overflowY: "scroll",
                padding: "8px",
                borderRadius: "6px",
                background: theme === "dark" ? "#0f0e0eff" : "#fff",
                border: theme === "dark" ? "1px solid #555" : "1px solid #999",
            }}
        >
            <div style={{ maxHeight: "200px", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#999 #222" }}>
                {recent.length === 0 && <i>No recent verses</i>}
                {recent.map((ref, i) => (
                    <div
                        key={i}
                        style={{ padding: "4px 0", cursor: "pointer" }}
                        onClick={() => {
                            const split = ref.split(" ");
                            const book = split.slice(0, split.length - 1).join(" ");
                            const chapVerse = split[split.length - 1];
                            const [ch, v] = chapVerse.split(":");
                            setSelectedBook(book);
                            setSelectedChapter(Number(ch));
                            setSelectedVerse(Number(v));
                        }}
                    >
                        {ref}
                    </div>
                ))}
            </div>
        </div>

        <button
            onClick={() => scrollRecent(-1)}
            style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "15px",  // MUST MATCH SCROLLBAR CSS WIDTH
                height: "20px", // MUST MATCH SCROLLBAR CSS MARGIN-TOP
                background: "#1e1e1e", // Matches scrollbar track background
                border: "none",
                borderLeft: "1px solid #333", // Seamless look with track
                borderBottom: "1px solid #333", // subtle separator
                color: "#00ff99", // Arrow color
                cursor: "pointer",
                zIndex: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px",
            }}
        >
            ▲
        </button>

        <button
            onClick={() => scrollRecent(1)}
            style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "15px",  // MUST MATCH SCROLLBAR CSS WIDTH
                height: "20px", // MUST MATCH SCROLLBAR CSS MARGIN-BOTTOM
                background: "#1e1e1e", // Matches scrollbar track background
                border: "none",
                borderLeft: "1px solid #333",
                borderTop: "1px solid #333",
                color: "#00ff99",
                cursor: "pointer",
                zIndex: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px",
            }}
        >
            ▼
        </button>
    </div>
</div>