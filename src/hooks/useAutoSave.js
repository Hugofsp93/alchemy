import { useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useAutoSave(documentsRef, setDocuments, setActiveDocId) {
  const savingRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const isDirtyRef = useRef(false);
  const isExitingRef = useRef(false); // Blocks other saves when exiting

  // Refs needed for final flush (passed from UI)
  const currentDocRef = useRef(null);
  const titleInputRef = useRef(null);
  const editorRef = useRef(null);

  const saveDocToDisk = async (oldId, doc) => {
    if (savingRef.current || isExitingRef.current) return;
    savingRef.current = true;
    try {
      const newId = await invoke("save_document", { oldId: oldId, doc });
      isDirtyRef.current = false;
      if (newId !== doc.id) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, id: newId } : d))
        );
        setActiveDocId(newId);
      }
    } catch (err) {
      console.error("Error saving to disk:", err);
    } finally {
      savingRef.current = false;
    }
  };

  const debouncedSave = (id, doc) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    isDirtyRef.current = true;
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveDocToDisk(id, doc);
    }, 500);
  };

  // CLOSE INTERCEPTOR (FULL FLUSH)
  useEffect(() => {
    let unlisten;

    const setupCloseListener = async () => {
      const window = getCurrentWindow();
      unlisten = await window.onCloseRequested((event) => {
        if (isDirtyRef.current || savingRef.current) {
          event.preventDefault();
          if (isExitingRef.current) return;
          isExitingRef.current = true;

          if (import.meta.env.DEV) {
            console.log("⚠️ CLOSE DETECTED: Starting direct DOM flush...");
          }

          (async () => {
            if (currentDocRef.current) {
              const latestTitle = titleInputRef.current?.value ?? currentDocRef.current.title;
              // Safe optional chaining for editorRef
              const latestContent = editorRef.current?.getMarkdown?.() ?? currentDocRef.current.content;

              const flushDoc = {
                ...currentDocRef.current,
                title: latestTitle,
                content: latestContent,
                updatedAt: Date.now()
              };

              if (import.meta.env.DEV) {
                console.log("💾 Writing final data to disk...");
              }
              try {
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                await invoke("save_document", { oldId: flushDoc.id, doc: flushDoc });
                if (import.meta.env.DEV) {
                  console.log("✅ Flush complete. Exiting app.");
                }
              } catch (e) {
                console.error("❌ Fatal error in final flush:", e);
              }
            }

            isDirtyRef.current = false;
            await window.destroy();
          })();
        }
      });
    };

    setupCloseListener();
    return () => {
      if (typeof unlisten === 'function') unlisten();
    };
  }, []);

  return {
    saveDocToDisk,
    debouncedSave,
    currentDocRef,
    titleInputRef,
    editorRef,
    saveTimeoutRef,
    isDirtyRef
  };
}
