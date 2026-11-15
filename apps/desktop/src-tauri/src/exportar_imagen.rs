//! Exporta una copia nueva del archivo original de una obra: en JPG o TIFF (con redimension
//! opcional y un metadato de copyright) o una copia exacta del archivo original, sin tocar nada.
//!
//! Para JPG y TIFF se reusa la misma representacion interna de pixeles que `imagen.rs` (que ya
//! sabe leer PSD/PSB y TIFF). Para JPG/RAW de camara (CR2/NEF/ARW/ORF/DNG) se usa el crate
//! `imagepipe`, que hace el demosaico, el balance de blancos y la conversion de color por su
//! cuenta y entrega una imagen ya en sRGB.

use std::path::Path;

use crate::imagen::{self, Lado, Modo, Reducida};

#[derive(Clone, Copy, Debug, PartialEq)]
enum Formato {
    Jpg,
    Tiff,
    Original,
}

fn formato_desde_texto(texto: &str) -> Result<Formato, String> {
    match texto {
        "jpg" => Ok(Formato::Jpg),
        "tiff" => Ok(Formato::Tiff),
        "original" => Ok(Formato::Original),
        _ => Err(format!("formato de exportacion no reconocido: {texto}")),
    }
}

fn lado_desde_texto(texto: &str) -> Result<Lado, String> {
    match texto {
        "corto" => Ok(Lado::Corto),
        "largo" => Ok(Lado::Largo),
        _ => Err(format!("lado de referencia no reconocido: {texto}")),
    }
}

/// El tag de copyright de TIFF y de Exif pide texto ASCII puro (asi es el formato desde siempre;
/// la biblioteca de TIFF directamente rechaza escribir el tag si no lo es). Por eso el copyright
/// que escribe el usuario se pasa por aca antes de guardarlo: cambia "©" por "(c)", le saca el
/// acento a las letras mas comunes del castellano y descarta cualquier otro caracter que no sea
/// ASCII (para no terminar escribiendo basura ilegible en el archivo).
fn a_ascii_seguro(texto: &str) -> String {
    let mut salida = String::with_capacity(texto.len());
    for c in texto.chars() {
        if c.is_ascii() {
            salida.push(c);
            continue;
        }
        let reemplazo = match c {
            '©' => "(c)",
            'á' => "a",
            'Á' => "A",
            'é' => "e",
            'É' => "E",
            'í' => "i",
            'Í' => "I",
            'ó' => "o",
            'Ó' => "O",
            'ú' | 'ü' => "u",
            'Ú' | 'Ü' => "U",
            'ñ' => "n",
            'Ñ' => "N",
            _ => continue,
        };
        salida.push_str(reemplazo);
    }
    salida
}

/// Decodifica y achica un archivo RAW de camara o JPG con `imagepipe`. El resultado ya viene en
/// sRGB con el balance de blancos y el gamma aplicados, asi que de aca en mas se lo trata como
/// "sin perfil de color" (`icc: None`): no hace falta ninguna conversion adicional.
fn leer_raw_o_jpeg(ruta: &Path, lado_maximo: u32, lado: Lado) -> Result<Reducida, String> {
    let mut pipeline =
        imagepipe::Pipeline::new_from_file(ruta).map_err(|e| format!("no se pudo leer el archivo: {e}"))?;
    let imagen16 = pipeline.output_16bit(None).map_err(|e| format!("no se pudo decodificar la imagen: {e}"))?;
    let (ancho, alto) = (imagen16.width, imagen16.height);
    if ancho == 0 || alto == 0 || (ancho as u64) * (alto as u64) > imagen::MAX_PIXELES {
        return Err("medidas de imagen no validas".into());
    }

    let pixeles = ancho * alto;
    let mut planos = vec![vec![0u16; pixeles]; 3];
    for (i, pixel) in imagen16.data.chunks_exact(3).enumerate() {
        planos[0][i] = pixel[0];
        planos[1][i] = pixel[1];
        planos[2][i] = pixel[2];
    }

    let (nuevo_ancho, nuevo_alto) = imagen::medidas_finales(ancho, alto, lado_maximo, lado);
    let planos = planos
        .into_iter()
        .map(|plano| imagen::reducir_plano(&plano, ancho, alto, nuevo_ancho, nuevo_alto))
        .collect();
    Ok(Reducida { ancho: nuevo_ancho, alto: nuevo_alto, modo: Modo::Rgb, planos, icc: None })
}

/// Decodifica (segun la extension) y achica el archivo original para exportarlo a JPG o TIFF.
fn leer_para_exportar(ruta: &Path, lado_maximo: u32, lado: Lado) -> Result<Reducida, String> {
    let extension = ruta.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()).unwrap_or_default();
    match extension.as_str() {
        "psd" | "psb" => imagen::leer_psd(ruta, lado_maximo, lado),
        "tif" | "tiff" => imagen::leer_tiff(ruta, lado_maximo, lado),
        "jpg" | "jpeg" | "cr2" | "nef" | "arw" | "orf" | "dng" => leer_raw_o_jpeg(ruta, lado_maximo, lado),
        _ => Err("este formato de archivo todavia no esta soportado para exportar a JPG o TIFF".into()),
    }
}

/// Un segmento EXIF (APP1) minimo: una cabecera TIFF con un solo tag ASCII, el copyright. Los
/// "offset" de adentro son relativos al principio de esta cabecera (asi es el formato Exif).
fn exif_copyright(texto: &str) -> Vec<u8> {
    let mut cadena: Vec<u8> = texto.bytes().collect();
    cadena.push(0); // las cadenas ASCII de TIFF terminan en un byte 0.
    let cuenta = cadena.len() as u32;

    const COPYRIGHT: u16 = 33_432;
    const ASCII: u16 = 2;
    const TAMANO_IFD0: u32 = 2 + 12 + 4; // cantidad de tags (2) + 1 tag (12) + proximo IFD (4)
    const INICIO_CADENA: u32 = 8 + TAMANO_IFD0; // la cabecera TIFF mide 8 bytes.

    let mut tiff = Vec::new();
    tiff.extend_from_slice(b"II"); // little endian
    tiff.extend_from_slice(&42u16.to_le_bytes());
    tiff.extend_from_slice(&8u32.to_le_bytes()); // offset al IFD0

    tiff.extend_from_slice(&1u16.to_le_bytes()); // un solo tag
    tiff.extend_from_slice(&COPYRIGHT.to_le_bytes());
    tiff.extend_from_slice(&ASCII.to_le_bytes());
    tiff.extend_from_slice(&cuenta.to_le_bytes());
    if cuenta <= 4 {
        let mut valor = [0u8; 4];
        valor[..cadena.len()].copy_from_slice(&cadena);
        tiff.extend_from_slice(&valor);
    } else {
        tiff.extend_from_slice(&INICIO_CADENA.to_le_bytes());
    }
    tiff.extend_from_slice(&0u32.to_le_bytes()); // no hay otro IFD despues de este.

    if cuenta > 4 {
        tiff.extend_from_slice(&cadena);
    }
    tiff
}

fn a_jpeg_con_copyright(ancho: usize, alto: usize, rgb: &[u8], copyright: Option<&str>) -> Result<Vec<u8>, String> {
    let ancho16 = u16::try_from(ancho).map_err(|_| "imagen demasiado ancha")?;
    let alto16 = u16::try_from(alto).map_err(|_| "imagen demasiado alta")?;
    let mut salida = Vec::new();
    let mut codificador = jpeg_encoder::Encoder::new(&mut salida, imagen::CALIDAD_JPEG);
    codificador.set_sampling_factor(jpeg_encoder::SamplingFactor::R_4_4_4);
    if let Some(texto) = copyright.filter(|t| !t.trim().is_empty()) {
        codificador
            .add_exif_metadata(&exif_copyright(texto))
            .map_err(|e| format!("no se pudo escribir el copyright: {e}"))?;
    }
    codificador
        .encode(rgb, ancho16, alto16, jpeg_encoder::ColorType::Rgb)
        .map_err(|e| format!("no se pudo generar el JPEG: {e}"))?;
    Ok(salida)
}

fn a_tiff_con_copyright(ancho: usize, alto: usize, rgb: &[u8], copyright: Option<&str>) -> Result<Vec<u8>, String> {
    use tiff::encoder::{colortype, TiffEncoder};
    use tiff::tags::Tag;

    let mut bytes = Vec::new();
    {
        let mut codificador =
            TiffEncoder::new(std::io::Cursor::new(&mut bytes)).map_err(|e| format!("no se pudo iniciar el TIFF: {e}"))?;
        let mut imagen_tiff = codificador
            .new_image::<colortype::RGB8>(ancho as u32, alto as u32)
            .map_err(|e| format!("no se pudo iniciar el TIFF: {e}"))?;
        if let Some(texto) = copyright.filter(|t| !t.trim().is_empty()) {
            imagen_tiff
                .encoder()
                .write_tag(Tag::Copyright, texto)
                .map_err(|e| format!("no se pudo escribir el copyright: {e}"))?;
        }
        imagen_tiff.write_data(rgb).map_err(|e| format!("no se pudo generar el TIFF: {e}"))?;
    }
    Ok(bytes)
}

/// Exporta una copia nueva de la imagen de una obra, a partir de su archivo original.
///
/// Con `formato = "original"` se copia el archivo tal cual (bytes identicos) y no se usan ni
/// `lado` ni `medida` ni `copyright`. Con `"jpg"` o `"tiff"` se decodifica el archivo, se lo
/// achica si hace falta (nunca se agranda) y se guarda con el copyright indicado, si se cargo uno.
fn exportar_imagen(
    ruta_original: &str,
    ruta_destino: &str,
    formato: &str,
    lado: Option<&str>,
    medida: Option<u32>,
    copyright: Option<&str>,
) -> Result<(), String> {
    let formato = formato_desde_texto(formato)?;
    let origen = Path::new(ruta_original);
    let destino = Path::new(ruta_destino);

    if formato == Formato::Original {
        return std::fs::copy(origen, destino).map(|_| ()).map_err(|e| format!("no se pudo copiar el archivo: {e}"));
    }

    let lado = lado_desde_texto(lado.unwrap_or_default())?;
    let medida = medida.ok_or_else(|| "falta la medida en pixeles".to_string())?;
    let copyright = copyright.map(a_ascii_seguro);

    let reducida = leer_para_exportar(origen, medida, lado)?;
    let rgb = imagen::a_srgb(&reducida)?;
    let bytes = match formato {
        Formato::Jpg => a_jpeg_con_copyright(reducida.ancho, reducida.alto, &rgb, copyright.as_deref())?,
        Formato::Tiff => a_tiff_con_copyright(reducida.ancho, reducida.alto, &rgb, copyright.as_deref())?,
        Formato::Original => unreachable!(),
    };
    std::fs::write(destino, bytes).map_err(|e| format!("no se pudo guardar el archivo: {e}"))
}

/// Version de `exportar_imagen` expuesta a la pantalla. Corre en otro hilo: los archivos de
/// trabajo pueden pesar varios GB y no hay que congelar la pantalla mientras se procesan.
#[tauri::command]
pub async fn exportar_imagen_obra(
    ruta_original: String,
    ruta_destino: String,
    formato: String,
    lado: Option<String>,
    medida: Option<u32>,
    copyright: Option<String>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        exportar_imagen(&ruta_original, &ruta_destino, &formato, lado.as_deref(), medida, copyright.as_deref())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod pruebas {
    use super::*;

    /// Lee a mano el tag Copyright de un segmento armado por `exif_copyright`. No se usa el
    /// decodificador completo de la biblioteca `tiff` porque ese esta pensado para decodificar
    /// una imagen entera (pide tags como el ancho que un segmento Exif minimo no tiene); esto
    /// prueba exactamente lo que `exif_copyright` escribe, nada mas.
    fn leer_copyright_de_segmento_exif(segmento: &[u8]) -> String {
        assert_eq!(&segmento[0..2], b"II");
        assert_eq!(u16::from_le_bytes([segmento[2], segmento[3]]), 42);
        let ifd = u32::from_le_bytes([segmento[4], segmento[5], segmento[6], segmento[7]]) as usize;
        assert_eq!(u16::from_le_bytes([segmento[ifd], segmento[ifd + 1]]), 1); // un solo tag
        let entrada = ifd + 2;
        assert_eq!(u16::from_le_bytes([segmento[entrada], segmento[entrada + 1]]), 33_432); // Copyright
        assert_eq!(u16::from_le_bytes([segmento[entrada + 2], segmento[entrada + 3]]), 2); // ASCII
        let cuenta = u32::from_le_bytes([
            segmento[entrada + 4],
            segmento[entrada + 5],
            segmento[entrada + 6],
            segmento[entrada + 7],
        ]) as usize;
        let valor = &segmento[entrada + 8..entrada + 12];
        let bytes = if cuenta <= 4 {
            valor[..cuenta - 1].to_vec()
        } else {
            let offset = u32::from_le_bytes([valor[0], valor[1], valor[2], valor[3]]) as usize;
            segmento[offset..offset + cuenta - 1].to_vec()
        };
        String::from_utf8(bytes).unwrap()
    }

    #[test]
    fn el_segmento_exif_lleva_el_copyright_como_texto_ascii() {
        let segmento = exif_copyright("Copyright Juan Brath 2026");
        assert_eq!(leer_copyright_de_segmento_exif(&segmento), "Copyright Juan Brath 2026");
    }

    #[test]
    fn el_segmento_exif_tambien_funciona_con_un_texto_muy_corto() {
        // Un texto de 3 caracteres (+ el 0 final = 4 bytes) entra entero en el campo de valor,
        // sin necesitar un offset a datos aparte: es el caso limite de la codificacion.
        let segmento = exif_copyright("abc");
        assert_eq!(leer_copyright_de_segmento_exif(&segmento), "abc");
    }

    #[test]
    fn el_copyright_se_pasa_a_ascii_antes_de_escribirlo() {
        assert_eq!(a_ascii_seguro("© Juan Brath 2026"), "(c) Juan Brath 2026");
        assert_eq!(a_ascii_seguro("José Núñez"), "Jose Nunez");
    }

    #[test]
    fn formato_original_copia_el_archivo_sin_cambiar_un_byte() {
        let origen = std::env::temp_dir().join(format!("recer_export_{}_origen.bin", std::process::id()));
        let destino = std::env::temp_dir().join(format!("recer_export_{}_destino.bin", std::process::id()));
        let contenido = b"contenido cualquiera, no tiene que ser una imagen de verdad para esta prueba";
        std::fs::write(&origen, contenido).unwrap();

        exportar_imagen(
            &origen.to_string_lossy(),
            &destino.to_string_lossy(),
            "original",
            None,
            None,
            None,
        )
        .unwrap();

        assert_eq!(std::fs::read(&destino).unwrap(), contenido);
        std::fs::remove_file(&origen).ok();
        std::fs::remove_file(&destino).ok();
    }

    #[test]
    fn exporta_un_tiff_a_jpg_achicado_con_copyright() {
        use tiff::encoder::{colortype, TiffEncoder};
        let origen = std::env::temp_dir().join(format!("recer_export_{}_origen.tif", std::process::id()));
        {
            let archivo = std::fs::File::create(&origen).unwrap();
            let mut codificador = TiffEncoder::new(archivo).unwrap();
            let datos: Vec<u16> = (0..(60 * 40)).flat_map(|_| [50000u16, 20000, 10000]).collect();
            codificador.write_image::<colortype::RGB16>(60, 40, &datos).unwrap();
        }
        let destino = std::env::temp_dir().join(format!("recer_export_{}_destino.jpg", std::process::id()));

        exportar_imagen(&origen.to_string_lossy(), &destino.to_string_lossy(), "jpg", Some("largo"), Some(30), Some("© Juan Brath 2026"))
            .unwrap();

        let bytes = std::fs::read(&destino).unwrap();
        assert_eq!(&bytes[0..2], &[0xff, 0xd8]); // es un JPEG de verdad
        assert!(bytes.windows(4).any(|w| w == b"Exif")); // el segmento con el copyright quedo adentro

        std::fs::remove_file(&origen).ok();
        std::fs::remove_file(&destino).ok();
    }

    #[test]
    fn exporta_un_tiff_a_tiff_achicado_con_copyright_legible() {
        use tiff::decoder::Decoder;
        use tiff::encoder::{colortype, TiffEncoder};
        use tiff::tags::Tag;

        let origen = std::env::temp_dir().join(format!("recer_export_{}_origen2.tif", std::process::id()));
        {
            let archivo = std::fs::File::create(&origen).unwrap();
            let mut codificador = TiffEncoder::new(archivo).unwrap();
            let datos: Vec<u16> = (0..(20 * 10)).flat_map(|_| [10000u16, 20000, 30000]).collect();
            codificador.write_image::<colortype::RGB16>(20, 10, &datos).unwrap();
        }
        let destino = std::env::temp_dir().join(format!("recer_export_{}_destino2.tif", std::process::id()));

        exportar_imagen(&origen.to_string_lossy(), &destino.to_string_lossy(), "tiff", Some("largo"), Some(10), Some("© Juan Brath 2026"))
            .unwrap();

        let mut decodificador = Decoder::new(std::fs::File::open(&destino).unwrap()).unwrap();
        assert_eq!(decodificador.dimensions().unwrap(), (10, 5)); // lado largo (20) llevado a 10: el corto queda en 5
        let copyright = decodificador.get_tag_ascii_string(Tag::Copyright).unwrap();
        assert_eq!(copyright, "(c) Juan Brath 2026"); // el "©" se pasa a ASCII antes de escribirlo

        std::fs::remove_file(&origen).ok();
        std::fs::remove_file(&destino).ok();
    }

    #[test]
    fn un_formato_de_archivo_no_soportado_da_error_claro() {
        let origen = std::env::temp_dir().join(format!("recer_export_{}_origen.heic", std::process::id()));
        std::fs::write(&origen, b"lo que sea").unwrap();
        match leer_para_exportar(&origen, 1000, Lado::Largo) {
            Err(motivo) => assert_eq!(motivo, "este formato de archivo todavia no esta soportado para exportar a JPG o TIFF"),
            Ok(_) => panic!("se esperaba un error"),
        }
        std::fs::remove_file(&origen).ok();
    }
}
