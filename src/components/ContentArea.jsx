import Editor from "./Editor";
import MageSwitcher from "./MageSwitcher";

function ContentArea({
  activeDoc,
  activeDocId,
  updateDocument,
  titleInputRef,
  editorRef,
  mageTheme,
  setMageTheme
}) {
  return (
    <main className="content-area">
      {!activeDoc ? (
        <div className="empty-view">
          <p className="empty-state">Choose a scroll or conjure a new one</p>
        </div>
      ) : (
        <div className="editor-container">
          <div className="content-drag-region" data-tauri-drag-region />
          <input
            ref={titleInputRef}
            className="editor-title"
            value={activeDoc.title}
            onChange={(e) => updateDocument(activeDocId, { title: e.target.value })}
            placeholder="Title"
          />
          <Editor
            ref={editorRef}
            key={activeDocId}
            content={activeDoc.content}
            onUpdate={(md) => updateDocument(activeDocId, { content: md })}
            placeholder="What kind of sorcery will you perform today?"
          />
        </div>
      )}

      <MageSwitcher
        currentTheme={mageTheme}
        onThemeChange={setMageTheme}
      />
    </main>
  );
}

export default ContentArea;
