//! Herramienta de prueba: convierte un PSD/PSB/TIFF a JPEG con el mismo codigo que usa el programa.
//! Uso: cargo run --release --example convertir_imagen -- ENTRADA.psb SALIDA.jpg [LADO_MAXIMO]
use std::path::Path;
use std::time::Instant;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 3 {
        eprintln!("uso: convertir_imagen ENTRADA SALIDA.jpg [LADO_MAXIMO]");
        std::process::exit(2);
    }
    let lado: u32 = args.get(3).and_then(|s| s.parse().ok()).unwrap_or(2400);
    let inicio = Instant::now();
    match app_lib::imagen::convertir(Path::new(&args[1]), lado) {
        Ok(bytes) => {
            std::fs::write(&args[2], &bytes).expect("no se pudo escribir la salida");
            println!("listo: {} bytes en {:.2} s", bytes.len(), inicio.elapsed().as_secs_f32());
        }
        Err(e) => {
            eprintln!("error: {e}");
            std::process::exit(1);
        }
    }
}
