// Bible version definitions — all files served from public/bible/
export const BIBLE_VERSIONS = [
  {
    id: 'tamil-bsi',
    label: 'Tamil BSI',
    shortLabel: 'Tamil',
    lang: 'ta',
    file: './bible/tamil_bsi.xml',
    format: 'xml-zefania',
  },
  {
    id: 'english-kjv',
    label: 'English KJV',
    shortLabel: 'KJV',
    lang: 'en',
    file: './bible/kjv.json',
    format: 'json-books',
  },
  {
    id: 'english-nkjv',
    label: 'English NKJV',
    shortLabel: 'NKJV',
    lang: 'en',
    file: './bible/nkjv.json',
    format: 'json-nkjv',
  },
];

export const getVersionById = (id) =>
  BIBLE_VERSIONS.find((v) => v.id === id) || BIBLE_VERSIONS[0];
