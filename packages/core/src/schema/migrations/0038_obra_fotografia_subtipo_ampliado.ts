import type { Migration } from "./0001_init.js";

// SQLite no permite ALTER de un CHECK existente: hay que reconstruir la
// tabla (mismo patron que 0027_estado_ampliado.ts). Se amplia
// subtipo_fotografia de 3 a 5 valores; los datos existentes se remapean
// (Analogica -> AnalogicaClasica, Digital -> DigitalFineArt, Sintografia
// sin cambios) y se agregan 2 opciones nuevas sin datos previos.
export const migration0038ObraFotografiaSubtipoAmpliado: Migration = {
  name: "0038_obra_fotografia_subtipo_ampliado",
  sql: `
CREATE TABLE obra_fotografia_new (
  obra_id INTEGER PRIMARY KEY REFERENCES obra(id) ON DELETE CASCADE,
  subtipo_fotografia TEXT NOT NULL CHECK (subtipo_fotografia IN ('AnalogicaClasica','DigitalFineArt','ProcesosHistoricos','Fotolibros','Sintografia')),
  fecha_captura TEXT,
  anio_toma INTEGER,
  fecha_edicion TEXT,
  software_edicion TEXT,
  datos_exif TEXT,
  dimensiones TEXT,
  tecnica TEXT,
  escala_por_tamanos TEXT
);

INSERT INTO obra_fotografia_new (obra_id, subtipo_fotografia, fecha_captura, anio_toma, fecha_edicion, software_edicion, datos_exif, dimensiones, tecnica, escala_por_tamanos)
SELECT obra_id,
  CASE subtipo_fotografia
    WHEN 'Analogica' THEN 'AnalogicaClasica'
    WHEN 'Digital' THEN 'DigitalFineArt'
    ELSE subtipo_fotografia
  END,
  fecha_captura, anio_toma, fecha_edicion, software_edicion, datos_exif, dimensiones, tecnica, escala_por_tamanos
FROM obra_fotografia;

DROP TABLE obra_fotografia;
ALTER TABLE obra_fotografia_new RENAME TO obra_fotografia;

UPDATE texto_ayuda
SET texto_es = 'Analogica clasica: copia a la gelatina de plata sobre pelicula. Digital Fine Art: capturada con sensor digital, se completan los datos EXIF automaticamente. Procesos historicos: cianotipias, platinotipias, gomas bicromatadas, ferrotipos y colodion humedo. Fotolibros: cajas numeradas y firmadas con series completas de un proyecto. Sintografia: generada integramente por inteligencia artificial, sin EXIF ni datos de herramienta.',
    texto_en = 'Classic analog: silver gelatin print on film. Digital Fine Art: captured with a digital sensor, EXIF data is filled in automatically. Historical processes: cyanotypes, platinotypes, gum bichromates, ferrotypes and wet collodion. Photobooks: numbered and signed boxes with a complete project series. Sintography: entirely AI-generated, no EXIF or tool data.'
WHERE field_key = 'subtipo_fotografia';
`,
};
