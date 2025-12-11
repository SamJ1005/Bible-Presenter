export function parseTamilBible(json) {
  const result = {};

  json.chapters.forEach((ch) => {
    const chNum = parseInt(ch.chapter);
    result[chNum] = {};

    ch.verses.forEach((v) => {
      const vNum = parseInt(v.verse);
      result[chNum][vNum] = v.text;
    });
  });

  return result;
}
