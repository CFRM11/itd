// El frontend (web/) se sirve desde el propio binario; la API se consume por fetch.
// Aquí irían comandos nativos (#[tauri::command]) o plugins si se necesitan
// (p. ej. tauri-plugin-http para saltarse CORS, tauri-plugin-store para persistencia).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error al iniciar la aplicación Tauri");
}
