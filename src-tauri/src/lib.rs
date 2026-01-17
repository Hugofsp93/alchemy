use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
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

#[tauri::command]
fn list_documents() -> Result<Vec<Document>, String> {
    let notes_dir = ensure_notes_dir().map_err(|e| e.to_string())?;
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
                            content: body.trim_start().to_string(), // Remove extra initial newline
                            updated_at: fm.updated_at,
                        });
                        continue;
                    }
                }
            }
            // Fallback for old MD without frontmatter (legacy support)
            // We ignore them as we've handled pure MDs before.
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
