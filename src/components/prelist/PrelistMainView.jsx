import React from "react";
import PrelistFileCard from "./PrelistFileCard";
import PrelistVerseCard from "./PrelistVerseCard";

const PrelistMainView = ({ 
  prelistedItems,
  theme,
  bibleData,
  activeId,
  editingTextId,
  editingRefId,
  startEditingText,
  saveTextEdit,
  cancelTextEdit,
  applyStyle,
  tamilContentRef,
  englishContentRef,
  handleItemClick,
  handlePresent,
  itemRefs
}) => {
  // Helper to lookup verse text
  const getVerseText = (bookName, chapter, verse) => {
    if (!bibleData || !bibleData.books) return "Loading...";
    const book = bibleData.books.find((b) => b.name === bookName);
    if (!book) return "Book not found";
    const ch = book.chapters.find((c) => Number(c.chapter) === Number(chapter));
    if (!ch) return "Chapter not found";
    const v = ch.verses.find((v) => Number(v.verse) === Number(verse));
    return v ? v.text : "Verse not found";
  };

  return (
    <div style={{ flex: 1, padding: "5px" }}>
      <div
        style={{
          height: "calc(100vh - 100px)",
          overflowY: "auto",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {prelistedItems.map((item, i) => {
          // --- FILE RENDERING ---
          if (item.type === 'file') {
            return (
              <PrelistFileCard
                key={item.id || i}
                item={item}
                theme={theme}
                isActive={activeId === item.id}
                handlePresent={handlePresent}
                handleItemClick={handleItemClick}
                itemRefs={itemRefs}
              />
            );
          }

          // --- VERSE RENDERING ---
          let rawEnglish = "";
          let rawTamil = "";

          if (item.isMulti && item.versesPayload) {
            rawTamil = item.versesPayload.map(v =>
              item.versesPayload.length > 1 ? `${v.v}. ${v.tam}` : v.tam
            ).join("\n");

            rawEnglish = item.versesPayload.map(v =>
              item.versesPayload.length > 1 ? `${v.v}. ${v.eng}` : v.eng
            ).join("\n");
          } else {
            rawEnglish = getVerseText(item.book, item.chapter, item.verse);
            rawTamil = item.tamilText || "";
          }

          const displayEnglish = item.englishHtml || rawEnglish;
          const displayTamil = item.tamilHtml || rawTamil;

          const isEditing = editingTextId === item.id;

          return (
            <PrelistVerseCard
              key={item.id || i}
              item={item}
              theme={theme}
              isEditing={isEditing}
              isActive={activeId === item.id}
              displayEnglish={displayEnglish}
              displayTamil={displayTamil}
              editingRefId={editingRefId}
              startEditingText={startEditingText}
              saveTextEdit={saveTextEdit}
              cancelTextEdit={cancelTextEdit}
              applyStyle={applyStyle}
              tamilContentRef={tamilContentRef}
              englishContentRef={englishContentRef}
              handleItemClick={handleItemClick}
              handlePresent={handlePresent}
              itemRefs={itemRefs}
            />
          );
        })}

        {prelistedItems.length === 0 && (
          <div
            style={{
              textAlign: "center",
              marginTop: "100px",
              color: "#888",
              fontSize: "18px",
            }}
          >
            Search for a verse to add it to the list.
          </div>
        )}
      </div>
    </div>
  );
};

export default PrelistMainView;
