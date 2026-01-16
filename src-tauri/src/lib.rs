use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

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

        if path.extension().map_or(false, |ext| ext == "md") {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;

            let filename = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();

            let updated_at = metadata
                .modified()
                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64)
                .unwrap_or(0);

            documents.push(Document {
                id: filename.clone(),
                title: filename, // Agora o título é SEMPRE o nome do arquivo
                doc_type: "note".to_string(),
                content,
                updated_at,
            });
        }
    }

    documents.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(documents)
}

#[tauri::command]
fn save_document(old_id: String, doc: Document) -> Result<String, String> {
    let notes_dir = ensure_notes_dir().map_err(|e| e.to_string())?;
    
    // O novo ID/Título limpo para ser usado como nome de arquivo
    let clean_title = doc.title.replace("/", "-").replace("\\", "-").trim().to_string();
    if clean_title.is_empty() {
        return Err("O título não pode estar vazio".to_string());
    }

    let old_path = notes_dir.join(format!("{}.md", old_id));
    let new_path = notes_dir.join(format!("{}.md", clean_title));

    // Se o ID mudou (título mudou), renomeia o arquivo
    if old_id != clean_title && old_path.exists() {
        fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    }

    // Salva o conteúdo no (novo) arquivo
    fs::write(&new_path, &doc.content).map_err(|e| e.to_string())?;

    // Retorna o novo ID para o frontend se atualizar
    Ok(clean_title)
}

#[tauri::command]
fn delete_document(id: String) -> Result<(), String> {
    let notes_dir = get_notes_dir();
    let file_path = notes_dir.join(format!("{}.md", id));

    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_documents,
            save_document,
            delete_document
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
