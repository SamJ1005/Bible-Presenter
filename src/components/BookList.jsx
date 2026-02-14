import React, { useEffect } from "react";

export default function BookList({ booksList = [], selectedBook, setSelectedBook, bookScrollRef, theme }) {
  
  // Auto-scroll to selected book
  useEffect(() => {
    if (bookScrollRef.current) {
      const selectedEl = bookScrollRef.current.querySelector(".book-item.selected");
      if (selectedEl) {
        const container = bookScrollRef.current;
        const offset = selectedEl.offsetTop;
        const height = selectedEl.clientHeight;
        const containerHeight = container.clientHeight;
        container.scrollTop = offset - (containerHeight / 2) + (height / 2);
      }
    }
  }, [selectedBook]);

  return (
    <div style={{ width: "50%", display: "flex", flexDirection: "column", minWidth: 0 }}>
      <h3 style={{ marginBottom: "10px", opacity: 0.8, fontSize: "1.1rem" }}>Books</h3>
      <div style={{ flex: 1, minHeight: 0, border: "1px solid #aaa", borderRadius: "6px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        
        <div ref={bookScrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", position: "relative", background: theme === "dark" ? "#0f0e0eff" : "#eee" }}>
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
                background: book === selectedBook ? (theme === "dark" ? "#3acc9298" : "#c0d5ffff") : "transparent",
              }}
            >
              {book}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
//This is the book list. The arrow key works here. The output is blank only in VerseList.jsx. check why the arrow buttons doesn't work in verselist.jsx