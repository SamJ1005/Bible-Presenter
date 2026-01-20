// Utility to parse bible references with range and comma support
// e.g. "Gen 1:1-3", "1Chr 4:9-10", "John 3:16,17", "Matt 4 1,2,5"

export const parseReferenceIncludeRange = (input) => {
    if (!input || !String(input).trim()) return null;
    let t = String(input).trim().toLowerCase();
    
    // Normalize spaces but keep commas and hyphens safe
    // Replace non-syntax chars with space, but keep : , -
    t = t.replace(/[^\w\s:,-]/g, " ").replace(/\s+/g, " ").trim();

    // 1. Extract Book Name (letters + optional leading number)
    // Matches: "1cor", "gen", "song of songs" (handling basic spaces in names is tricky with regex alone if complex, keeping simple for now)
    // We assume standard names/abbrevs.
    // Let's split by first digit to separate book from numbers
    
    // Regex to separate Book and the "Rest" (References)
    // e.g. "1 cor 13:4-8,13" -> "1 cor" and "13:4-8,13"
    const splitMatch = t.match(/^([1-3]?\s*[a-z]+)\s*(.*)$/i);
    
    if (!splitMatch) return null;
    
    const bookPart = splitMatch[1].trim();
    const refPart = splitMatch[2].trim();
    
    if(!refPart) return null; // Only book?

    // 2. Parse Reference Part
    // It should start with Chapter. 
    // Patterns: "3", "3:16", "3 16", "3 16-18", "3:16,17"
    
    // Normalize separators in refPart: replace space with : if it looks like chap/verse sep? 
    // Actually, "3 16" -> "3:16". 
    // But "3:16" is standard.
    // "3 1,2" -> Chapter 3, verses 1,2.
    
    // Let's assume the FIRST number is ALWAYS Chapter.
    // Everything after is verses.
    
    // Regex to find Chapter Number at start of refPart
    const chapMatch = refPart.match(/^(\d+)(.*)$/);
    if(!chapMatch) return null;
    
    const chapter = Number(chapMatch[1]);
    let versesPart = chapMatch[2].trim();
    
    // Remove leading separator (: or space)
    versesPart = versesPart.replace(/^[:\s]+/, "");
    
    // 3. Parse Verses
    // If empty, return chapter only (start at 1)
    if(!versesPart) {
        return {
            book: bookPart,
            chapter: chapter,
            verses: [], // Whole chapter? Or just 1? Existing logic defaults to 1 usually. 
            // User context implies specific verses usually. Let's return empty verses to signal "whole chapter" or "invalid" depending on usage.
            // For now, let's treat as Verse 1 if simple map, or Handle in caller.
            verse: 1, 
            isMulti: false
        };
    }
    
    // Parse complex verse string: "1-3, 5, 8-10"
    const verses = [];
    
    // Split by comma
    const parts = versesPart.split(",");
    
    parts.forEach(part => {
        part = part.trim();
        if(!part) return;
        
        // Check for range "1-3"
        const rangeM = part.match(/^(\d+)\s*-\s*(\d+)$/);
        if(rangeM) {
            const start = Number(rangeM[1]);
            const end = Number(rangeM[2]);
            if(start <= end) {
                for(let i=start; i<=end; i++) verses.push(i);
            }
        } else {
            // Single number
            const nums = part.match(/(\d+)/);
            if(nums) verses.push(Number(nums[1]));
        }
    });
    
    // Unique and Sort
    const distinctVerses = [...new Set(verses)].sort((a,b)=>a-b);
    
    if(distinctVerses.length === 0) return null;

    return {
        book: bookPart,
        chapter: chapter,
        verse: distinctVerses[0], // Primary start verse for scrolling/indexing
        verseList: distinctVerses, // Full list
        isMulti: distinctVerses.length > 1
    };
};
