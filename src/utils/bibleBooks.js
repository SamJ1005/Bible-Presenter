// bibleBooks.js
export const bibleBooks = [
  { english: "Genesis", tamil: "ஆதியாகமம்" },
  { english: "Exodus", tamil: "யாத்திராகமம்" },
  { english: "Leviticus", tamil: "லேவியராகமம்" },
  { english: "Numbers", tamil: "எண்ணாகமம்" },
  { english: "Deuteronomy", tamil: "உபாகமம்" },

  { english: "Joshua", tamil: "யோசுவா" },
  { english: "Judges", tamil: "நியாயாதிபதிகள்" },
  { english: "Ruth", tamil: "ரூத்" },

  { english: "1 Samuel", tamil: "1 சாமுவேல்" },
  { english: "2 Samuel", tamil: "2 சாமுவேல்" },

  { english: "1 Kings", tamil: "1 இராஜாக்கள்" },
  { english: "2 Kings", tamil: "2 இராஜாக்கள்" },

  { english: "1 Chronicles", tamil: "1 நாளாகமம்" },
  { english: "2 Chronicles", tamil: "2 நாளாகமம்" },

  { english: "Ezra", tamil: "எஸ்ரா" },
  { english: "Nehemiah", tamil: "நெகேமியா" },
  { english: "Esther", tamil: "எஸ்தர்" },

  { english: "Job", tamil: "யோபு" },
  { english: "Psalm", tamil: "சங்கீதம்" },
  { english: "Proverbs", tamil: "நீதிமொழிகள்" },
  { english: "Ecclesiastes", tamil: "பிரசங்கி" },
  { english: "Song of Solomon", tamil: "உன்னதப்பாட்டு" },

  { english: "Isaiah", tamil: "எசாயா" },
  { english: "Jeremiah", tamil: "எரேமியா" },
  { english: "Lamentations", tamil: "புலம்பல்" },

  { english: "Ezekiel", tamil: "எசேக்கியேல்" },
  { english: "Daniel", tamil: "தானியேல்" },

  { english: "Hosea", tamil: "ஓசியா" },
  { english: "Joel", tamil: "யோவேல்" },
  { english: "Amos", tamil: "ஆமோஸ்" },
  { english: "Obadiah", tamil: "ஒபதியா" },
  { english: "Jonah", tamil: "யோனா" },
  { english: "Micah", tamil: "மீக்கா" },
  { english: "Nahum", tamil: "நாகூம்" },
  { english: "Habakkuk", tamil: "ஆபகூக்" },
  { english: "Zephaniah", tamil: "செப்பனியா" },
  { english: "Haggai", tamil: "ஆகாய்" },
  { english: "Zechariah", tamil: "சகரியா" },
  { english: "Malachi", tamil: "மல்கியா" },

  // NEW TESTAMENT
  { english: "Matthew", tamil: "மத்தேயு" },
  { english: "Mark", tamil: "மாற்கு" },
  { english: "Luke", tamil: "லூக்கா" },
  { english: "John", tamil: "யோவான்" },

  { english: "Acts", tamil: "அப்போஸ்தலர்" },

  { english: "Romans", tamil: "ரோமர்" },
  { english: "1 Corinthians", tamil: "1 கொரிந்தியர்" },
  { english: "2 Corinthians", tamil: "2 கொரிந்தியர்" },
  { english: "Galatians", tamil: "கலாத்தியர்" },
  { english: "Ephesians", tamil: "எபேசியர்" },
  { english: "Philippians", tamil: "பிலிப்பியர்" },
  { english: "Colossians", tamil: "கொலோசெயர்" },

  { english: "1 Thessalonians", tamil: "1 தெசலோனிக்கேயர்" },
  { english: "2 Thessalonians", tamil: "2 தெசலோனிக்கேயர்" },

  { english: "1 Timothy", tamil: "1 தீமொத்தேயு" },
  { english: "2 Timothy", tamil: "2 தீமொத்தேயு" },

  { english: "Titus", tamil: "தீத்து" },
  { english: "Philemon", tamil: "பிலேமோன்" },
  { english: "Hebrews", tamil: "எபிரேயர்" },

  { english: "James", tamil: "யாக்கோபு" },
  { english: "1 Peter", tamil: "1 பேதுரு" },
  { english: "2 Peter", tamil: "2 பேதுரு" },

  { english: "1 John", tamil: "1 யோவான்" },
  { english: "2 John", tamil: "2 யோவான்" },
  { english: "3 John", tamil: "3 யோவான்" },

  { english: "Jude", tamil: "யூதா" },
  { english: "Revelation", tamil: "வெளிப்படுத்தின விசேஷம்" },
];

// helper
export function getTamilBookName(englishName) {
  const found = bibleBooks.find(
    (b) => b.english.toLowerCase() === englishName.toLowerCase()
  );
  return found ? found.tamil : englishName;
}
