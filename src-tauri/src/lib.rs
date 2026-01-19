use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::UNIX_EPOCH;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Document {
    pub id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub doc_type: String,
    pub content: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct Frontmatter {
    id: String,
    title: String,
    #[serde(rename = "type")]
    doc_type: String,
    #[serde(rename = "updatedAt")]
    updated_at: u64,
}

fn get_notes_dir() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    home.join("Documents").join("Alchemy")
}

fn ensure_notes_dir() -> std::io::Result<PathBuf> {
    let path = get_notes_dir();
    if !path.exists() {
        fs::create_dir_all(&path)?;
    }
    Ok(path)
}

const SHOWCASE_CONTENT: &str = r#"---
id: welcome-showcase
title: "Alchemy Feature Showcase 🧪"
type: note
updatedAt: 1737300000000
---
# Alchemy Feature Showcase 🧪

This note demonstrates all the supported Markdown features in **Alchemy**.

## Typography

You can use **bold text**, *italic text*, and ~~strikethrough~~.  
Styles can be combined: ***bold and italic***.

---

## Headings

### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

---

## Lists

### Unordered
- Item 1
- Item 2
  - Subitem A
  - Subitem B

### Ordered
1. First Step
2. Second Step
3. Third Step

### Task List
- [x] Install Alchemy
- [x] Configure Editor extensions
- [ ] Write my first masterpiece
- [ ] Share with the world

---

## Code
Inline code looks like `const a = 1;`.

**JavaScript:**
```javascript
function alchemy() {
  const magic = true;
  return magic ? "Success" : "Try again";
}
```

**Rust:**
```rust
fn main() {
    println!("Hello from the backend!");
}
```

---

## Tables

| Component  | Status    | Priority |
| ---------- | --------- | -------- |
| Editor     | ✅ Ready   | High     |
| Sidebar    | ✅ Ready   | Medium   |
| Cloud Sync | ⏳ Pending | Low      |

---

## Quotes
> "Any sufficiently advanced technology is indistinguishable from magic."  
> — Arthur C. Clarke

## Links & Images
[Alchemy Repository](https://github.com/tauri-apps/tauri)

![Random Unsplash Image](https://images.unsplash.com/photo-1550684848-fac1c5b4e853?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60)
"#;

#[tauri::command]
fn list_documents() -> Result<Vec<Document>, String> {
    let notes_dir = ensure_notes_dir().map_err(|e| e.to_string())?;

    // Check if empty for seeding
    let entries_count = fs::read_dir(&notes_dir)
        .map_err(|e| e.to_string())?
        .count();

    if entries_count == 0 {
        let showcase_path = notes_dir.join("welcome-showcase.md");
        fs::write(showcase_path, SHOWCASE_CONTENT).map_err(|e| e.to_string())?;
    }

    let mut documents = Vec::new();
    let entries = fs::read_dir(&notes_dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let extension = path.extension().and_then(|s| s.to_str()).unwrap_or("");

        // --- JSON TO MD MIGRATION ---
        if extension == "json" {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(doc) = serde_json::from_str::<Document>(&content) {
                    // Convert to MD with Frontmatter
                    let frontmatter = Frontmatter {
                        id: doc.id.clone(),
                        title: doc.title.clone(),
                        doc_type: doc.doc_type.clone(),
                        updated_at: doc.updated_at,
                    };

                    let yaml = serde_yaml::to_string(&frontmatter).unwrap_or_default();
                    let new_content = format!("---\n{}---\n{}", yaml, doc.content);

                    let new_path = notes_dir.join(format!("{}.md", doc.id));
                    if fs::write(&new_path, new_content).is_ok() {
                        fs::remove_file(&path).ok(); // Delete old JSON
                    }

                    // Add to valid documents list
                    documents.push(doc);
                    continue;
                }
            }
        }

        if extension == "md" {
            let file_content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let doc_id = path.file_stem().and_then(|s| s.to_str()).unwrap_or("unknown").to_string();

            // Try parsing YAML frontmatter
            if file_content.starts_with("---") {
                if let Some(end_idx) = file_content[3..].find("---") {
                    let yaml_str = &file_content[3..end_idx+3];
                    let body = &file_content[end_idx+6..]; // Skip closing --- and newline

                    if let Ok(fm) = serde_yaml::from_str::<Frontmatter>(yaml_str) {
                        documents.push(Document {
                            id: fm.id,
                            title: fm.title,
                            doc_type: fm.doc_type,
                            content: body.trim_start().to_string(),
                            updated_at: fm.updated_at,
                        });
                        continue;
                    }
                }
            }

            // Fallback: Plain Markdown adoption
            // 1. Get updated_at from file metadata
            let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
            let updated_at = metadata.modified()
                .unwrap_or_else(|_| std::time::SystemTime::now())
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            // 2. Infer Title from first line
            let mut title = doc_id.clone();
            if let Some(first_line) = file_content.lines().next() {
                if first_line.starts_with("# ") {
                    title = first_line[2..].trim().to_string();
                }
            }

            documents.push(Document {
                id: doc_id,
                title,
                doc_type: "note".to_string(),
                content: file_content,
                updated_at,
            });
        }
    }

    documents.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(documents)
}

#[tauri::command]
fn save_document(old_id: String, mut doc: Document) -> Result<String, String> {
    let notes_dir = ensure_notes_dir().map_err(|e| e.to_string())?;

    if doc.id.is_empty() {
        doc.id = Uuid::new_v4().to_string();
    }

    // Prepare Frontmatter
    let frontmatter = Frontmatter {
        id: doc.id.clone(),
        title: doc.title.clone(),
        doc_type: doc.doc_type.clone(),
        updated_at: doc.updated_at,
    };

    let yaml = serde_yaml::to_string(&frontmatter).map_err(|e| e.to_string())?;
    let file_content = format!("---\n{}---\n{}", yaml, doc.content);

    // Save as .md using ID as filename (to ensure filesystem uniqueness)
    let file_path = notes_dir.join(format!("{}.md", doc.id));

    // If ID changed (e.g. migration), clear old file
    if !old_id.is_empty() && old_id != doc.id {
        let old_path = notes_dir.join(format!("{}.md", old_id));
        if old_path.exists() {
            fs::remove_file(old_path).ok();
        }
    }

    fs::write(&file_path, file_content).map_err(|e| e.to_string())?;

    Ok(doc.id)
}

#[tauri::command]
fn delete_document(id: String) -> Result<(), String> {
    let notes_dir = get_notes_dir();
    let md_path = notes_dir.join(format!("{}.md", id));
    if md_path.exists() {
        fs::remove_file(md_path).map_err(|e| e.to_string())?;
    }
    // Try cleaning up JSON if any remains
    let json_path = notes_dir.join(format!("{}.json", id));
    if json_path.exists() {
        fs::remove_file(json_path).ok();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_documents,
            save_document,
            delete_document
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
