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

fn get_notes_dir() -> PathBuf {
    let home = dirs::home_dir().expect("Não foi possível encontrar o diretório home");
    home.join("Documents").join("NoteBan")
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

        // Suporta .json (novo formato) e .md (legado)
        let extension = path.extension().and_then(|s| s.to_str()).unwrap_or("");
        
        if extension == "json" {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            if let Ok(doc) = serde_json::from_str::<Document>(&content) {
                documents.push(doc);
            }
        } else if extension == "md" {
            // Migração implícita de arquivos .md legados
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
            let filename = path.file_stem().and_then(|s| s.to_str()).unwrap_or("unknown").to_string();
            let updated_at = metadata.modified()
                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64)
                .unwrap_or(0);

            documents.push(Document {
                id: Uuid::new_v4().to_string(), // Gera um UUID novo para o arquivo legado
                title: filename,
                doc_type: "note".to_string(),
                content,
                updated_at,
            });
            
            // Opcional: deletar o .md original após listar (ou deixar para o primeiro save)
            // Por segurança, vamos apenas listar. O primeiro Save salvará como .json.
        }
    }

    documents.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(documents)
}

#[tauri::command]
fn save_document(old_id: String, mut doc: Document) -> Result<String, String> {
    let notes_dir = ensure_notes_dir().map_err(|e| e.to_string())?;

    // Se a nota não tem ID (é nova ou migrada), gera um.
    if doc.id.is_empty() {
        doc.id = Uuid::new_v4().to_string();
    }

    let file_path = notes_dir.join(format!("{}.json", doc.id));
    
    // Se o old_id for diferente do novo id (e não for vazio), 
    // significa que estamos renomeando o ID (raro com UUID, mas bom ter)
    if !old_id.is_empty() && old_id != doc.id {
        let old_path = notes_dir.join(format!("{}.json", old_id));
        let old_md_path = notes_dir.join(format!("{}.md", old_id));
        
        if old_path.exists() {
            fs::remove_file(old_path).ok();
        }
        if old_md_path.exists() {
            fs::remove_file(old_md_path).ok();
        }
    }

    let json = serde_json::to_string_pretty(&doc).map_err(|e| e.to_string())?;
    fs::write(&file_path, json).map_err(|e| e.to_string())?;

    Ok(doc.id)
}

#[tauri::command]
fn delete_document(id: String) -> Result<(), String> {
    let notes_dir = get_notes_dir();
    
    // Tenta deletar tanto .json quanto .md legado
    let json_path = notes_dir.join(format!("{}.json", id));
    let md_path = notes_dir.join(format!("{}.md", id));

    if json_path.exists() {
        fs::remove_file(json_path).map_err(|e| e.to_string())?;
    }
    if md_path.exists() {
        fs::remove_file(md_path).ok(); // Ignora erro no MD se o JSON já foi deletado
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
