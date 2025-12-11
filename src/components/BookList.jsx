import React from "react";

export default function BookList({ booksList = [], selectedBook, setSelectedBook, bookScrollRef, theme }) {
  const sbWidth = 14;
  return (
    <div style={{ width: "180px", display: "flex", flexDirection: "column" }}>
      <h3 style={{ marginBottom: "10px" }}>Books</h3>

      <div style={{ position: "relative", height: "300px", border: "1px solid #aaa", borderRadius: "6px", overflow: "hidden", display: "flex" }}>
        <div ref={bookScrollRef} style={{ flex: 1, overflowY: "scroll", background: theme === "dark" ? "#0f0e0eff" : "#eee" }}>
          {booksList.map((book) => (
            <div
              className={`book-item ${book === selectedBook ? "selected" : ""}`}
              key={book}
              onClick={() => {
                setSelectedBook(book);
              }}
              style={{
                padding: "4px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                background: book === selectedBook ? (theme === "dark" ? "#00ff9933" : "#c0d5ffff") : "transparent",
              }}
            >
              {book}
            </div>
          ))}
        </div>

        <button onClick={() => (bookScrollRef.current.scrollTop -= 40)} style={{ position: "absolute", top: 0, right: 0, width: `${sbWidth}px`, height: "20px", background: theme === "dark" ? "#1e1e1e" : "#ddd", border: "none", color: theme === "dark" ? "#00ff99" : "#003399", cursor: "pointer", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
          ▲
        </button>
        <button onClick={() => (bookScrollRef.current.scrollTop += 40)} style={{ position: "absolute", bottom: 0, right: 0, width: `${sbWidth}px`, height: "20px", background: theme === "dark" ? "#1e1e1e" : "#ddd", border: "none", color: theme === "dark" ? "#00ff99" : "#003399", cursor: "pointer", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
          ▼
        </button>
      </div>
    </div>
  );
}
//This is the book list. The arrow key works here. The output is blank only in VerseList.jsx. check why the arrow buttons doesn't work in verselist.jsx