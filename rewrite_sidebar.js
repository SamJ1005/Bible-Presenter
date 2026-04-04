const fs = require('fs');
const file = 'src/components/prelist/PrelistSidebar.jsx';
let content = fs.readFileSync(file, 'utf8');

const s1 = '{/* Queue Selector Dropdown / Rename Input / Create Input */}';
const s2 = '{/* Manual Save to Cloud */}';
const s3 = '{/* Create New Queue */}';
const s4 = '{/* Rename Queue */}';
const s5 = '</div>\r\n      )}\r\n\r\n      {/* Cloud Playlists Panel (Collapsible) */}';
const s5_alt = '</div>\n      )}\n\n      {/* Cloud Playlists Panel (Collapsible) */}';

let endToken = content.includes(s5) ? s5 : s5_alt;

const p1 = content.indexOf(s1);
const p2 = content.indexOf(s2);
const p3 = content.indexOf(s3);
const p4 = content.indexOf(s4);
const p5 = content.indexOf(endToken);

if (p1 > -1 && p2 > -1 && p3 > -1 && p4 > -1 && p5 > -1) {
  const listMatch = content.substring(p1, p2);
  const saveMatch = content.substring(p2, p3);
  const createMatch = content.substring(p3, p4);
  const bottomMatch = content.substring(p4, p5);

  const newLayout = `
          {/* TOP ROW: List and Add List */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
            ${listMatch.trim()}
            
            ${createMatch.trim()}
          </div>

          {/* BOTTOM ROW: Other Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', paddingBottom: '4px' }}>
            ${bottomMatch.trim()}
            
            ${saveMatch.trim()}
          </div>
`;

  const sStart = '<div style={{\n          display: \'flex\',\n          alignItems: \'center\',\n          gap: \'6px\',\n          padding: \'8px 8px 6px 8px\',\n          borderBottom: theme === \'dark\' ? \'1px solid #333\' : \'1px solid #e0e0e0\',\n          marginBottom: \'0\',\n          flexWrap: \'nowrap\',\n          minHeight: \'36px\'\n        }}>';
  const sStart_alt = sStart.replace(/\n/g, '\\r\\n');

  let startStr = content.includes(sStart) ? sStart : content.includes(sStart.replace(/\n/g, '\r\n')) ? sStart.replace(/\n/g, '\r\n') : null;

  if (startStr) {
    const parentReplacement = `<div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '10px 8px 8px 8px',
          borderBottom: theme === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
          marginBottom: '0',
        }}>` + newLayout;
    
    // Replace the slice from startStr to endToken
    const startIdx = content.indexOf(startStr);
    const result = content.substring(0, startIdx) + parentReplacement + "\\n        " + endToken + content.substring(p5 + endToken.length);
    fs.writeFileSync(file, result.replace(/\\n        /g, '\n        '));
    console.log("Successfully updated layout.");
  } else {
    console.log("Failed to match parent wrapper string.");
  }
} else {
  console.log("Failed to extract buttons.", { p1, p2, p3, p4, p5 });
}
