//! Convierte una imagen "de trabajo" (PSD, PSB o TIFF) en un JPEG chico, con los colores pasados a sRGB,
//! listo para mostrarse en pantalla completa. Esta hecho en Rust, sin depender de nada del sistema
//! operativo, para que ande igual en macOS y en Windows.
//!
//! Por que hace falta: el navegador embebido no sabe abrir un PSD/PSB (y en Windows tampoco un TIFF), y la
//! miniatura que esos archivos traen adentro es muy chica. Aca se lee la imagen compuesta real, se achica y
//! se guarda como JPEG (ver `convertir`). Los archivos pueden pesar varios GB, asi que cada canal se lee de
//! a uno y se achica enseguida, sin tener nunca la imagen entera en memoria mas de un canal a la vez.
//!
//! Formatos: PSD/PSB (imagen compuesta; 8 y 16 bits por canal; escala de grises, RGB y CMYK; datos crudos,
//! RLE y ZIP) y TIFF (8 y 16 bits; grises, RGB y CMYK; los tipos de compresion que sabe leer la libreria
//! `tiff`). El perfil de color incrustado (ICC) se usa para pasar todo a sRGB.

use std::fs::File;
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::path::Path;

use moxcms::{ColorProfile, Layout, TransformOptions};

/// Calidad del JPEG resultante (1 a 100).
const CALIDAD_JPEG: u8 = 88;

/// Cordura contra archivos corruptos o gigantescos: mas de esta cantidad de pixeles no se intenta.
const MAX_PIXELES: u64 = 1_000_000_000;

#[derive(Clone, Copy, Debug, PartialEq)]
enum Modo {
    Gris,
    Rgb,
    Cmyk,
}

impl Modo {
    fn canales(self) -> usize {
        match self {
            Modo::Gris => 1,
            Modo::Rgb => 3,
            Modo::Cmyk => 4,
        }
    }
}

/// La imagen ya achicada: un plano por canal, con valores de 0 a 65535.
struct Reducida {
    ancho: usize,
    alto: usize,
    modo: Modo,
    planos: Vec<Vec<u16>>,
    icc: Option<Vec<u8>>,
}

// ---------- achicar ----------

/// Para cada pixel de destino, desde que pixel de origen empieza y con que peso entra cada uno
/// (promedio por area: cada pixel de origen aporta segun cuanto de el cae dentro del de destino).
fn ventanas(origen: usize, destino: usize) -> Vec<(usize, Vec<f32>)> {
    let escala = origen as f64 / destino as f64;
    (0..destino)
        .map(|i| {
            let desde = i as f64 * escala;
            let hasta = ((i + 1) as f64 * escala).min(origen as f64);
            let primero = desde.floor() as usize;
            let ultimo = (hasta.ceil() as usize).min(origen);
            let mut pesos = Vec::with_capacity(ultimo - primero);
            let mut total = 0.0f64;
            for p in primero..ultimo {
                let solapa = ((p + 1) as f64).min(hasta) - (p as f64).max(desde);
                let w = solapa.max(0.0);
                pesos.push(w as f32);
                total += w;
            }
            if total > 0.0 {
                for w in pesos.iter_mut() {
                    *w = (*w as f64 / total) as f32;
                }
            }
            (primero, pesos)
        })
        .collect()
}

/// Achica un plano de `ancho` x `alto` a `nuevo_ancho` x `nuevo_alto` promediando por area.
fn reducir_plano(origen: &[u16], ancho: usize, alto: usize, nuevo_ancho: usize, nuevo_alto: usize) -> Vec<u16> {
    if nuevo_ancho == ancho && nuevo_alto == alto {
        return origen.to_vec();
    }
    let horizontal = ventanas(ancho, nuevo_ancho);
    let vertical = ventanas(alto, nuevo_alto);

    // Primera pasada: achicar cada fila a lo ancho.
    let mut intermedio = vec![0f32; alto * nuevo_ancho];
    for y in 0..alto {
        let fila = &origen[y * ancho..(y + 1) * ancho];
        let salida = &mut intermedio[y * nuevo_ancho..(y + 1) * nuevo_ancho];
        for (x, (primero, pesos)) in horizontal.iter().enumerate() {
            let mut suma = 0f32;
            for (k, w) in pesos.iter().enumerate() {
                suma += fila[primero + k] as f32 * w;
            }
            salida[x] = suma;
        }
    }

    // Segunda pasada: achicar a lo alto, sumando filas enteras (acceso siempre seguido).
    let mut resultado = vec![0u16; nuevo_ancho * nuevo_alto];
    let mut acumulador = vec![0f32; nuevo_ancho];
    for (y, (primero, pesos)) in vertical.iter().enumerate() {
        acumulador.iter_mut().for_each(|a| *a = 0.0);
        for (k, w) in pesos.iter().enumerate() {
            let fila = &intermedio[(primero + k) * nuevo_ancho..(primero + k + 1) * nuevo_ancho];
            for x in 0..nuevo_ancho {
                acumulador[x] += fila[x] * w;
            }
        }
        let salida = &mut resultado[y * nuevo_ancho..(y + 1) * nuevo_ancho];
        for x in 0..nuevo_ancho {
            salida[x] = acumulador[x].round().clamp(0.0, 65535.0) as u16;
        }
    }
    resultado
}

/// Medidas finales: el lado mas largo queda en `lado_maximo` como mucho (nunca se agranda).
fn medidas_finales(ancho: usize, alto: usize, lado_maximo: u32) -> (usize, usize) {
    let mayor = ancho.max(alto);
    let tope = lado_maximo.max(1) as usize;
    if mayor <= tope {
        return (ancho, alto);
    }
    let escala = tope as f64 / mayor as f64;
    (
        ((ancho as f64 * escala).round() as usize).max(1),
        ((alto as f64 * escala).round() as usize).max(1),
    )
}

// ---------- PSD / PSB ----------

fn u16_be(b: &[u8]) -> u16 {
    u16::from_be_bytes([b[0], b[1]])
}
fn u32_be(b: &[u8]) -> u32 {
    u32::from_be_bytes([b[0], b[1], b[2], b[3]])
}
fn u64_be(b: &[u8]) -> u64 {
    u64::from_be_bytes([b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7]])
}

fn leer_exacto<R: Read>(r: &mut R, n: usize) -> Result<Vec<u8>, String> {
    let mut v = vec![0u8; n];
    r.read_exact(&mut v).map_err(|e| format!("no se pudo leer el archivo: {e}"))?;
    Ok(v)
}

/// El perfil de color (recurso 1039 de Photoshop) dentro de la seccion de recursos de imagen.
fn buscar_icc_psd(recursos: &[u8]) -> Option<Vec<u8>> {
    let mut pos = 0usize;
    while pos + 12 <= recursos.len() && &recursos[pos..pos + 4] == b"8BIM" {
        let id = u16_be(&recursos[pos + 4..]);
        pos += 6;
        let largo_nombre = *recursos.get(pos)? as usize;
        pos += 1 + largo_nombre;
        if (1 + largo_nombre) % 2 != 0 {
            pos += 1;
        }
        if pos + 4 > recursos.len() {
            return None;
        }
        let tamano = u32_be(&recursos[pos..]) as usize;
        pos += 4;
        if pos + tamano > recursos.len() {
            return None;
        }
        if id == 1039 {
            return Some(recursos[pos..pos + tamano].to_vec());
        }
        pos += tamano + (tamano % 2);
    }
    None
}

/// Descomprime una fila PackBits/RLE hasta completar exactamente `salida.len()` bytes.
fn descomprimir_packbits(entrada: &[u8], salida: &mut [u8]) -> Result<(), String> {
    let mut pos = 0usize;
    let mut fuera = 0usize;
    while pos < entrada.len() && fuera < salida.len() {
        let n = entrada[pos];
        pos += 1;
        if n <= 127 {
            let cantidad = n as usize + 1;
            if pos + cantidad > entrada.len() || fuera + cantidad > salida.len() {
                return Err("datos RLE corruptos".into());
            }
            salida[fuera..fuera + cantidad].copy_from_slice(&entrada[pos..pos + cantidad]);
            pos += cantidad;
            fuera += cantidad;
        } else if n != 128 {
            let cantidad = 257 - n as usize;
            if pos >= entrada.len() || fuera + cantidad > salida.len() {
                return Err("datos RLE corruptos".into());
            }
            salida[fuera..fuera + cantidad].fill(entrada[pos]);
            pos += 1;
            fuera += cantidad;
        }
    }
    if fuera == salida.len() {
        Ok(())
    } else {
        Err("datos RLE incompletos".into())
    }
}

enum Compresion {
    Cruda,
    Rle { largos: Vec<u32>, siguiente: usize },
    Zip { con_prediccion: bool },
}

/// Lee, uno por uno, los canales de la imagen compuesta de un PSD/PSB.
struct LectorPsd<'a> {
    origen: Box<dyn Read + 'a>,
    compresion: Compresion,
    ancho: usize,
    alto: usize,
    profundidad: u16,
}

impl<'a> LectorPsd<'a> {
    fn bytes_por_fila(&self) -> usize {
        self.ancho * (self.profundidad as usize / 8)
    }

    /// Una fila ya descomprimida (en bytes, tal como esta en el archivo).
    fn fila(&mut self, buf: &mut [u8]) -> Result<(), String> {
        match &mut self.compresion {
            Compresion::Cruda => self.origen.read_exact(buf).map_err(|e| format!("archivo cortado: {e}"))?,
            Compresion::Zip { con_prediccion } => {
                self.origen.read_exact(buf).map_err(|e| format!("datos ZIP corruptos: {e}"))?;
                if *con_prediccion {
                    if self.profundidad == 8 {
                        for i in 1..buf.len() {
                            buf[i] = buf[i].wrapping_add(buf[i - 1]);
                        }
                    } else {
                        let mut anterior = u16_be(&buf[0..2]);
                        for i in 1..buf.len() / 2 {
                            let actual = u16_be(&buf[i * 2..]).wrapping_add(anterior);
                            buf[i * 2..i * 2 + 2].copy_from_slice(&actual.to_be_bytes());
                            anterior = actual;
                        }
                    }
                }
            }
            Compresion::Rle { largos, siguiente } => {
                let largo = *largos.get(*siguiente).ok_or("faltan filas RLE")? as usize;
                *siguiente += 1;
                let mut comprimida = vec![0u8; largo];
                self.origen.read_exact(&mut comprimida).map_err(|e| format!("archivo cortado: {e}"))?;
                descomprimir_packbits(&comprimida, buf)?;
            }
        }
        Ok(())
    }

    /// El siguiente canal completo, en 16 bits (los de 8 bits se llevan a 0..65535).
    fn canal(&mut self) -> Result<Vec<u16>, String> {
        let mut plano = vec![0u16; self.ancho * self.alto];
        let mut fila = vec![0u8; self.bytes_por_fila()];
        for y in 0..self.alto {
            self.fila(&mut fila)?;
            let destino = &mut plano[y * self.ancho..(y + 1) * self.ancho];
            if self.profundidad == 8 {
                for (d, b) in destino.iter_mut().zip(fila.iter()) {
                    *d = *b as u16 * 257;
                }
            } else {
                for (d, par) in destino.iter_mut().zip(fila.chunks_exact(2)) {
                    *d = u16_be(par);
                }
            }
        }
        Ok(plano)
    }
}

fn leer_psd(ruta: &Path, lado_maximo: u32) -> Result<Reducida, String> {
    let archivo = File::open(ruta).map_err(|e| format!("no se pudo abrir el archivo: {e}"))?;
    let mut lector = BufReader::with_capacity(1 << 20, archivo);

    let cabecera = leer_exacto(&mut lector, 26)?;
    if &cabecera[0..4] != b"8BPS" {
        return Err("no es un archivo PSD/PSB".into());
    }
    let version = u16_be(&cabecera[4..]);
    if version != 1 && version != 2 {
        return Err("version de PSD no reconocida".into());
    }
    let canales_archivo = u16_be(&cabecera[12..]) as usize;
    let alto = u32_be(&cabecera[14..]) as usize;
    let ancho = u32_be(&cabecera[18..]) as usize;
    let profundidad = u16_be(&cabecera[22..]);
    let modo_color = u16_be(&cabecera[24..]);

    let modo = match modo_color {
        1 => Modo::Gris,
        3 => Modo::Rgb,
        4 => Modo::Cmyk,
        _ => return Err("modo de color no soportado (solo escala de grises, RGB o CMYK)".into()),
    };
    if profundidad != 8 && profundidad != 16 {
        return Err(format!("{profundidad} bits por canal no soportado (solo 8 o 16)"));
    }
    if ancho == 0 || alto == 0 || (ancho as u64) * (alto as u64) > MAX_PIXELES {
        return Err("medidas de imagen no validas".into());
    }
    if canales_archivo < modo.canales() {
        return Err("faltan canales de color".into());
    }

    // Datos del modo de color: se saltean.
    let largo_modo = u32_be(&leer_exacto(&mut lector, 4)?) as i64;
    lector.seek(SeekFrom::Current(largo_modo)).map_err(|e| e.to_string())?;

    // Recursos de imagen: de ahi sale el perfil de color.
    let largo_recursos = u32_be(&leer_exacto(&mut lector, 4)?) as usize;
    let icc = if largo_recursos > 0 && largo_recursos <= 256 * 1024 * 1024 {
        buscar_icc_psd(&leer_exacto(&mut lector, largo_recursos)?)
    } else {
        lector.seek(SeekFrom::Current(largo_recursos as i64)).map_err(|e| e.to_string())?;
        None
    };

    // Capas y mascaras: puede pesar gigas y no hace falta, se saltea por su largo declarado.
    let largo_capas = if version == 1 {
        u32_be(&leer_exacto(&mut lector, 4)?) as u64
    } else {
        u64_be(&leer_exacto(&mut lector, 8)?)
    };
    lector
        .seek(SeekFrom::Current(i64::try_from(largo_capas).map_err(|_| "archivo no valido")?))
        .map_err(|e| e.to_string())?;

    // Imagen compuesta.
    let tipo_compresion = u16_be(&leer_exacto(&mut lector, 2)?);
    let compresion = match tipo_compresion {
        0 => Compresion::Cruda,
        1 => {
            let filas = canales_archivo * alto;
            let ancho_contador = if version == 1 { 2 } else { 4 };
            let tabla = leer_exacto(&mut lector, filas * ancho_contador)?;
            let largos = tabla
                .chunks_exact(ancho_contador)
                .map(|c| if ancho_contador == 2 { u16_be(c) as u32 } else { u32_be(c) })
                .collect();
            Compresion::Rle { largos, siguiente: 0 }
        }
        2 => Compresion::Zip { con_prediccion: false },
        3 => Compresion::Zip { con_prediccion: true },
        _ => return Err("compresion de la imagen no reconocida".into()),
    };
    let origen: Box<dyn Read> = match compresion {
        Compresion::Zip { .. } => Box::new(flate2::read::ZlibDecoder::new(lector)),
        _ => Box::new(lector),
    };
    let mut psd = LectorPsd { origen, compresion, ancho, alto, profundidad };

    let (nuevo_ancho, nuevo_alto) = medidas_finales(ancho, alto, lado_maximo);
    let mut planos = Vec::with_capacity(modo.canales());
    for _ in 0..modo.canales() {
        let mut plano = psd.canal()?;
        // En un PSD el CMYK se guarda invertido (255 = sin tinta): se lleva a "cantidad de tinta".
        if modo == Modo::Cmyk {
            plano.iter_mut().for_each(|v| *v = 65535 - *v);
        }
        planos.push(reducir_plano(&plano, ancho, alto, nuevo_ancho, nuevo_alto));
    }
    Ok(Reducida { ancho: nuevo_ancho, alto: nuevo_alto, modo, planos, icc })
}

// ---------- TIFF ----------

fn leer_tiff(ruta: &Path, lado_maximo: u32) -> Result<Reducida, String> {
    use tiff::decoder::{Decoder, DecodingResult};
    use tiff::tags::{PhotometricInterpretation, Tag};
    use tiff::ColorType;

    let archivo = File::open(ruta).map_err(|e| format!("no se pudo abrir el archivo: {e}"))?;
    // Los limites por defecto de la biblioteca (unos 256 MB) son chicos para un TIFF de trabajo de varias decenas de
    // megapixeles; el tamano ya se controla arriba con MAX_PIXELES.
    let mut decodificador = Decoder::new(BufReader::with_capacity(1 << 20, archivo))
        .map_err(|e| format!("no se pudo leer el TIFF: {e}"))?
        .with_limits(tiff::decoder::Limits::unlimited());
    let (ancho, alto) = decodificador.dimensions().map_err(|e| e.to_string())?;
    let (ancho, alto) = (ancho as usize, alto as usize);
    if ancho == 0 || alto == 0 || (ancho as u64) * (alto as u64) > MAX_PIXELES {
        return Err("medidas de imagen no validas".into());
    }
    let tipo = decodificador.colortype().map_err(|e| e.to_string())?;
    let (modo, muestras, bits) = match tipo {
        ColorType::Gray(b) => (Modo::Gris, 1usize, b),
        ColorType::GrayA(b) => (Modo::Gris, 2, b),
        ColorType::RGB(b) => (Modo::Rgb, 3, b),
        ColorType::RGBA(b) => (Modo::Rgb, 4, b),
        ColorType::CMYK(b) => (Modo::Cmyk, 4, b),
        ColorType::CMYKA(b) => (Modo::Cmyk, 5, b),
        _ => return Err("tipo de color de TIFF no soportado".into()),
    };
    if bits != 8 && bits != 16 {
        return Err(format!("{bits} bits por canal no soportado (solo 8 o 16)"));
    }
    let planar = decodificador
        .find_tag_unsigned::<u16>(Tag::PlanarConfiguration)
        .ok()
        .flatten()
        .unwrap_or(1);
    if planar != 1 {
        return Err("TIFF con canales separados no soportado".into());
    }
    let blanco_es_cero = matches!(
        decodificador.find_tag_unsigned::<u16>(Tag::PhotometricInterpretation).ok().flatten(),
        Some(v) if v == PhotometricInterpretation::WhiteIsZero.to_u16()
    ) && modo == Modo::Gris;
    let icc = decodificador.get_tag_u8_vec(Tag::IccProfile).ok().filter(|v| !v.is_empty());

    let datos = decodificador.read_image().map_err(|e| format!("no se pudo decodificar el TIFF: {e}"))?;
    let (nuevo_ancho, nuevo_alto) = medidas_finales(ancho, alto, lado_maximo);

    let mut planos = Vec::with_capacity(modo.canales());
    for canal in 0..modo.canales() {
        let mut plano = vec![0u16; ancho * alto];
        match &datos {
            DecodingResult::U8(v) => {
                for (i, d) in plano.iter_mut().enumerate() {
                    *d = v[i * muestras + canal] as u16 * 257;
                }
            }
            DecodingResult::U16(v) => {
                for (i, d) in plano.iter_mut().enumerate() {
                    *d = v[i * muestras + canal];
                }
            }
            _ => return Err("formato de muestras de TIFF no soportado".into()),
        }
        if blanco_es_cero {
            plano.iter_mut().for_each(|v| *v = 65535 - *v);
        }
        planos.push(reducir_plano(&plano, ancho, alto, nuevo_ancho, nuevo_alto));
    }
    Ok(Reducida { ancho: nuevo_ancho, alto: nuevo_alto, modo, planos, icc })
}

// ---------- color y JPEG ----------

fn a_ocho_bits(v: u16) -> u8 {
    ((v as u32 + 128) / 257) as u8
}

/// Los pixeles de la imagen achicada como RGB de 8 bits en sRGB (los tres valores de cada pixel seguidos).
fn a_srgb(reducida: &Reducida) -> Result<Vec<u8>, String> {
    let pixeles = reducida.ancho * reducida.alto;
    let canales = reducida.modo.canales();
    let mut intercalado = vec![0u16; pixeles * canales];
    for (c, plano) in reducida.planos.iter().enumerate() {
        for (i, v) in plano.iter().enumerate() {
            intercalado[i * canales + c] = *v;
        }
    }

    let con_perfil = reducida.icc.as_ref().and_then(|icc| ColorProfile::new_from_slice(icc).ok());
    let srgb = ColorProfile::new_srgb();
    let opciones = TransformOptions::default();

    let rgb16: Vec<u16> = if let Some(origen) = con_perfil {
        let capa_origen = match reducida.modo {
            Modo::Gris => Layout::Gray,
            Modo::Rgb => Layout::Rgb,
            Modo::Cmyk => Layout::Rgba,
        };
        match origen.create_transform_16bit(capa_origen, &srgb, Layout::Rgb, opciones) {
            Ok(transformacion) => {
                let mut salida = vec![0u16; pixeles * 3];
                transformacion.transform(&intercalado, &mut salida).map_err(|e| format!("color: {e}"))?;
                salida
            }
            Err(_) => sin_perfil(reducida.modo, &intercalado, pixeles),
        }
    } else {
        sin_perfil(reducida.modo, &intercalado, pixeles)
    };
    Ok(rgb16.into_iter().map(a_ocho_bits).collect())
}

/// Sin perfil de color (o con uno que no se pudo usar) se asume que ya esta en sRGB.
fn sin_perfil(modo: Modo, intercalado: &[u16], pixeles: usize) -> Vec<u16> {
    let mut salida = vec![0u16; pixeles * 3];
    for i in 0..pixeles {
        match modo {
            Modo::Gris => salida[i * 3..i * 3 + 3].fill(intercalado[i]),
            Modo::Rgb => salida[i * 3..i * 3 + 3].copy_from_slice(&intercalado[i * 3..i * 3 + 3]),
            Modo::Cmyk => {
                let (c, m, y, k) = (
                    intercalado[i * 4] as f32 / 65535.0,
                    intercalado[i * 4 + 1] as f32 / 65535.0,
                    intercalado[i * 4 + 2] as f32 / 65535.0,
                    intercalado[i * 4 + 3] as f32 / 65535.0,
                );
                for (j, tinta) in [c, m, y].into_iter().enumerate() {
                    salida[i * 3 + j] = ((1.0 - tinta) * (1.0 - k) * 65535.0).round() as u16;
                }
            }
        }
    }
    salida
}

fn a_jpeg(ancho: usize, alto: usize, rgb: &[u8]) -> Result<Vec<u8>, String> {
    let ancho16 = u16::try_from(ancho).map_err(|_| "imagen demasiado ancha")?;
    let alto16 = u16::try_from(alto).map_err(|_| "imagen demasiado alta")?;
    let mut salida = Vec::new();
    let mut codificador = jpeg_encoder::Encoder::new(&mut salida, CALIDAD_JPEG);
    codificador.set_sampling_factor(jpeg_encoder::SamplingFactor::R_4_4_4);
    codificador
        .encode(rgb, ancho16, alto16, jpeg_encoder::ColorType::Rgb)
        .map_err(|e| format!("no se pudo generar el JPEG: {e}"))?;
    Ok(salida)
}

/// Convierte el archivo (PSD, PSB o TIFF) en un JPEG sRGB cuyo lado mas largo mide `lado_maximo` como mucho.
/// Devuelve los bytes del JPEG, o un texto con el motivo si no se pudo (por ejemplo, formato no soportado).
pub fn convertir(ruta: &Path, lado_maximo: u32) -> Result<Vec<u8>, String> {
    let mut inicio = [0u8; 4];
    File::open(ruta)
        .and_then(|mut f| f.read_exact(&mut inicio))
        .map_err(|e| format!("no se pudo leer el archivo: {e}"))?;

    let reducida = if &inicio == b"8BPS" {
        leer_psd(ruta, lado_maximo)?
    } else if inicio == [0x49, 0x49, 0x2a, 0x00] || inicio == [0x4d, 0x4d, 0x00, 0x2a] || inicio == [0x49, 0x49, 0x2b, 0x00] || inicio == [0x4d, 0x4d, 0x00, 0x2b] {
        leer_tiff(ruta, lado_maximo)?
    } else {
        return Err("formato no soportado (se esperaba PSD, PSB o TIFF)".into());
    };
    let rgb = a_srgb(&reducida)?;
    a_jpeg(reducida.ancho, reducida.alto, &rgb)
}

// ---------- comandos de Tauri ----------

/// Convierte un PSD/PSB/TIFF a un JPEG chico en sRGB. Corre en otro hilo: un archivo grande tarda un rato y no
/// debe congelar la pantalla.
#[tauri::command]
pub async fn convertir_imagen_a_jpeg(ruta: String, lado_maximo: u32) -> Result<tauri::ipc::Response, String> {
    let bytes = tauri::async_runtime::spawn_blocking(move || convertir(Path::new(&ruta), lado_maximo))
        .await
        .map_err(|e| e.to_string())??;
    Ok(tauri::ipc::Response::new(bytes))
}

/// Los bytes de un archivo (que el usuario eligio con el dialogo del sistema), sin pasar por JSON: para una foto
/// de varios MB es mucho mas rapido que mandar un numero por cada byte. `max_bytes` limita cuanto se lee (para
/// mirar solo el principio de un archivo enorme).
#[tauri::command]
pub fn leer_archivo_crudo(ruta: String, max_bytes: Option<u64>) -> Result<tauri::ipc::Response, String> {
    let archivo = File::open(ruta).map_err(|e| e.to_string())?;
    let mut bytes = Vec::new();
    match max_bytes {
        Some(max) => archivo.take(max).read_to_end(&mut bytes),
        None => BufReader::new(archivo).read_to_end(&mut bytes),
    }
    .map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[cfg(test)]
mod pruebas {
    use super::*;

    fn escribir_temporal(nombre: &str, contenido: &[u8]) -> std::path::PathBuf {
        let ruta = std::env::temp_dir().join(format!("galeris_imagen_{}_{nombre}", std::process::id()));
        std::fs::write(&ruta, contenido).unwrap();
        ruta
    }

    /// Un PSD (o PSB) minimo con una imagen RGB de `ancho` x `alto` donde cada pixel vale `(r, g, b)`.
    fn psd_rgb(ancho: u32, alto: u32, rgb: (u8, u8, u8), profundidad: u16, compresion: u16, version: u16) -> Vec<u8> {
        let mut v = Vec::new();
        v.extend_from_slice(b"8BPS");
        v.extend_from_slice(&version.to_be_bytes());
        v.extend_from_slice(&[0; 6]);
        v.extend_from_slice(&3u16.to_be_bytes()); // canales
        v.extend_from_slice(&alto.to_be_bytes());
        v.extend_from_slice(&ancho.to_be_bytes());
        v.extend_from_slice(&profundidad.to_be_bytes());
        v.extend_from_slice(&3u16.to_be_bytes()); // RGB
        v.extend_from_slice(&0u32.to_be_bytes()); // datos de modo de color
        v.extend_from_slice(&0u32.to_be_bytes()); // recursos
        if version == 1 {
            v.extend_from_slice(&0u32.to_be_bytes()); // capas
        } else {
            v.extend_from_slice(&0u64.to_be_bytes());
        }
        v.extend_from_slice(&compresion.to_be_bytes());
        let bytes_muestra = (profundidad / 8) as usize;
        let fila_bytes = ancho as usize * bytes_muestra;
        let valor = |c: usize| -> Vec<u8> {
            let x = [rgb.0, rgb.1, rgb.2][c];
            if bytes_muestra == 1 {
                vec![x]
            } else {
                (x as u16 * 257).to_be_bytes().to_vec()
            }
        };
        match compresion {
            0 => {
                for c in 0..3 {
                    for _ in 0..(ancho * alto) {
                        v.extend_from_slice(&valor(c));
                    }
                }
            }
            1 => {
                // RLE: una tanda repetida por fila (o varias si la fila pasa de 128 bytes).
                let mut filas: Vec<Vec<u8>> = Vec::new();
                for c in 0..3 {
                    for _ in 0..alto {
                        let mut fila = Vec::new();
                        let muestra = valor(c);
                        let mut restante = fila_bytes;
                        // Cada byte de la fila alterna segun la muestra: se escribe como literal para no complicar.
                        while restante > 0 {
                            let n = restante.min(128);
                            fila.push((n - 1) as u8);
                            for i in 0..n {
                                fila.push(muestra[(fila_bytes - restante + i) % bytes_muestra]);
                            }
                            restante -= n;
                        }
                        filas.push(fila);
                    }
                }
                for f in &filas {
                    if version == 1 {
                        v.extend_from_slice(&(f.len() as u16).to_be_bytes());
                    } else {
                        v.extend_from_slice(&(f.len() as u32).to_be_bytes());
                    }
                }
                for f in &filas {
                    v.extend_from_slice(f);
                }
            }
            _ => panic!("compresion de prueba no soportada"),
        }
        v
    }

    fn medidas_jpeg(jpeg: &[u8]) -> (u16, u16) {
        assert_eq!(&jpeg[0..2], &[0xff, 0xd8]);
        let mut pos = 2;
        while pos + 9 < jpeg.len() {
            assert_eq!(jpeg[pos], 0xff);
            let marcador = jpeg[pos + 1];
            let largo = u16::from_be_bytes([jpeg[pos + 2], jpeg[pos + 3]]) as usize;
            if marcador == 0xc0 || marcador == 0xc2 {
                return (
                    u16::from_be_bytes([jpeg[pos + 7], jpeg[pos + 8]]),
                    u16::from_be_bytes([jpeg[pos + 5], jpeg[pos + 6]]),
                );
            }
            pos += 2 + largo;
        }
        panic!("no se encontro el tamano del JPEG");
    }

    #[test]
    fn reducir_un_plano_uniforme_lo_deja_uniforme() {
        let origen = vec![40000u16; 100 * 60];
        let r = reducir_plano(&origen, 100, 60, 33, 20);
        assert_eq!(r.len(), 33 * 20);
        assert!(r.iter().all(|v| (*v as i32 - 40000).abs() <= 1));
    }

    #[test]
    fn reducir_promedia_por_area() {
        // Mitad izquierda 0, mitad derecha 65535: al achicar a 2 pixeles quedan 0 y 65535.
        let mut origen = vec![0u16; 10 * 4];
        for y in 0..4 {
            for x in 5..10 {
                origen[y * 10 + x] = 65535;
            }
        }
        let r = reducir_plano(&origen, 10, 4, 2, 1);
        assert_eq!(r, vec![0, 65535]);
        // A 3 pixeles el del medio mezcla los dos lados.
        let r3 = reducir_plano(&origen, 10, 4, 3, 1);
        assert_eq!(r3[0], 0);
        assert_eq!(r3[2], 65535);
        assert!(r3[1] > 20000 && r3[1] < 45000);
    }

    #[test]
    fn las_medidas_finales_no_agrandan_y_conservan_la_proporcion() {
        assert_eq!(medidas_finales(6000, 4000, 2400), (2400, 1600));
        assert_eq!(medidas_finales(4000, 6000, 2400), (1600, 2400));
        assert_eq!(medidas_finales(1000, 800, 2400), (1000, 800));
    }

    #[test]
    fn packbits_descomprime_literales_y_repeticiones() {
        let mut salida = [0u8; 7];
        // literal de 3 (1,2,3) + repeticion de 4 veces el 9
        descomprimir_packbits(&[2, 1, 2, 3, 253, 9], &mut salida).unwrap();
        assert_eq!(salida, [1, 2, 3, 9, 9, 9, 9]);
        assert!(descomprimir_packbits(&[2, 1], &mut salida).is_err());
    }

    #[test]
    fn psd_rgb_8_bits_crudo_se_convierte_y_se_achica() {
        let ruta = escribir_temporal("crudo.psd", &psd_rgb(40, 20, (200, 100, 50), 8, 0, 1));
        let jpeg = convertir(&ruta, 20).unwrap();
        assert_eq!(medidas_jpeg(&jpeg), (20, 10));
        std::fs::remove_file(ruta).ok();
    }

    #[test]
    fn psd_16_bits_con_rle_y_psb_se_convierten() {
        for (version, nombre) in [(1u16, "rle16.psd"), (2u16, "rle16.psb")] {
            let ruta = escribir_temporal(nombre, &psd_rgb(300, 10, (10, 200, 90), 16, 1, version));
            let jpeg = convertir(&ruta, 100).unwrap();
            assert_eq!(medidas_jpeg(&jpeg), (100, 3), "{nombre}");
            std::fs::remove_file(ruta).ok();
        }
    }

    #[test]
    fn el_color_de_un_psd_llega_al_jpeg() {
        let ruta = escribir_temporal("color.psd", &psd_rgb(16, 16, (250, 10, 10), 16, 0, 1));
        let bytes = convertir(&ruta, 16).unwrap();
        // Decodificar de nuevo con zune-jpeg (ya viene con la biblioteca tiff).
        let mut decodificador = zune_jpeg::JpegDecoder::new(zune_core::bytestream::ZCursor::new(&bytes));
        let pixeles = decodificador.decode().unwrap();
        assert!(pixeles[0] > 230 && pixeles[1] < 40 && pixeles[2] < 40, "{:?}", &pixeles[0..3]);
        std::fs::remove_file(ruta).ok();
    }

    #[test]
    fn un_archivo_que_no_es_de_imagen_da_error_claro() {
        let ruta = escribir_temporal("texto.psd", b"esto no es una imagen");
        assert!(convertir(&ruta, 100).unwrap_err().contains("formato no soportado"));
        std::fs::remove_file(ruta).ok();
        let cortado = escribir_temporal("cortado.psd", &psd_rgb(40, 20, (1, 2, 3), 8, 0, 1)[..60]);
        assert!(convertir(&cortado, 100).is_err());
        std::fs::remove_file(cortado).ok();
    }

    #[test]
    fn tiff_de_16_bits_se_convierte() {
        use tiff::encoder::{colortype, TiffEncoder};
        let ruta = std::env::temp_dir().join(format!("galeris_imagen_{}_prueba.tif", std::process::id()));
        {
            let archivo = File::create(&ruta).unwrap();
            let mut codificador = TiffEncoder::new(archivo).unwrap();
            let datos: Vec<u16> = (0..(60 * 40)).flat_map(|_| [50000u16, 20000, 10000]).collect();
            codificador.write_image::<colortype::RGB16>(60, 40, &datos).unwrap();
        }
        let bytes = convertir(&ruta, 30).unwrap();
        assert_eq!(medidas_jpeg(&bytes), (30, 20));
        std::fs::remove_file(ruta).ok();
    }
}
