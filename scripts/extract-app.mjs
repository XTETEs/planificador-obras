import fs from 'node:fs';

const html = fs.readFileSync('app-source.html', 'utf8');
const match = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!match) {
  console.error('No script found');
  process.exit(1);
}

let code = match[1].trim();

// Remove createRoot render at end
code = code.replace(/createRoot\(document\.getElementById\(['"]root['"]\)\)\.render\(<App \/>\);?\s*$/, '');
// Remove createRoot import
code = code.replace(/import\s*\{\s*createRoot\s*\}\s*from\s*['"]react-dom\/client['"];?\r?\n?/, '');

// Add export default App
code = code.trim() + '\n\nexport default App;\n';

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('src/App.jsx created successfully. Length:', code.length);
