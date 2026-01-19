import { useState, useRef, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const documentsRef = useRef([]); // Always fresh for creating new notes calculation

  // 1. Initial Load
  useEffect(() => {
    invoke("list_documents")
      .then((docs) => {
        setDocuments(docs);
        documentsRef.current = docs;
        if (docs.length > 0 && !activeDocId) {
          setActiveDocId(docs[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // 2. Focus Refresh - Sync with disk when window gets focus
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const diskDocs = await invoke("list_documents");
        setDocuments((currentDocs) => {
          const validIds = new Set(diskDocs.map((d) => d.id));
          const preservedDocs = currentDocs.filter((doc) => validIds.has(doc.id));
          const currentIds = new Set(currentDocs.map((d) => d.id));
          const newDocs = diskDocs.filter((d) => !currentIds.has(d.id));

          if (preservedDocs.length === currentDocs.length && newDocs.length === 0) return currentDocs;

          const merged = [...preservedDocs, ...newDocs];
          merged.sort((a, b) => b.updatedAt - a.updatedAt);
          documentsRef.current = merged;
          return merged;
        });
      } catch (e) {
        console.error("Error syncing on focus:", e);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // 3. Derived State
  const activeDoc = useMemo(() => documents.find((doc) => doc.id === activeDocId), [documents, activeDocId]);

  const sortedDocs = useMemo(() => {
    return [...documents].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [documents]);

  // 4. Operations (State Only)
  const createNoteState = () => {
    const newId = crypto.randomUUID();
    const currentDocs = documentsRef.current;

    // Auto-increment logic
    const numbers = currentDocs.map((doc) => {
      const match = doc.title.match(/Alchemy\s+(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const noteNumberString = String(nextNumber).padStart(4, "0");

    const newTitle = `Alchemy ${noteNumberString}`;
    const maxExistingTimestamp = currentDocs.reduce((max, d) => Math.max(max, d.updatedAt), 0);
    const timestamp = Math.max(Date.now(), maxExistingTimestamp + 1);

    const newDoc = { id: newId, title: newTitle, type: "note", content: "", updatedAt: timestamp };

    setDocuments((prev) => {
      const updated = [newDoc, ...prev];
      documentsRef.current = updated;
      return updated;
    });
    setActiveDocId(newId);

    return newDoc;
  };

  const updateDocState = (id, updates) => {
    const docIndex = documents.findIndex((d) => d.id === id);
    if (docIndex === -1) return null;
    const oldDoc = documents[docIndex];

    // Guard against identical logic
    if (updates.content !== undefined && updates.content === oldDoc.content) return null;

    const now = Date.now();
    const newDoc = { ...oldDoc, ...updates, updatedAt: now };

    setDocuments((prev) => {
      const newAll = [...prev];
      const idx = newAll.findIndex((d) => d.id === id);
      if (idx !== -1) newAll[idx] = newDoc;
      documentsRef.current = newAll;
      return newAll;
    });

    return newDoc;
  };

  const deleteDocState = async (id) => {
    try {
      await invoke("delete_document", { id });
      setDocuments((prev) => {
        const remaining = prev.filter((doc) => doc.id !== id);
        const nextId = remaining.length > 0 ? remaining[0].id : null;
        setActiveDocId(nextId);
        documentsRef.current = remaining;
        return remaining;
      });
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  return {
    documents,
    setDocuments,
    activeDocId,
    setActiveDocId,
    activeDoc,
    sortedDocs,
    documentsRef,
    createNoteState,
    updateDocState,
    deleteDocState
  };
}
