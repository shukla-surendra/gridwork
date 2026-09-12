// Plain-text preview extraction for note/task descriptions. The actual
// editor everywhere in this app (Tasks and Notes both) is Tiptap
// (components/dashboard/editor/RichTextEditor.js), which stores content
// as HTML strings -- not Lexical JSON. This replaces the old
// extractTextFromLexicalJSON() helpers scattered across NotesPage.js,
// DashboardPage.js, NewNoteDrawer.js, and EditNoteDrawer.js, which
// expected a Lexical-shaped {root: {children: [...]}} object and silently
// returned an empty string (or, worse, the raw un-stripped HTML) for the
// real content format.
export function htmlToText(html, maxLength) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  return maxLength ? text.slice(0, maxLength) : text;
}
