import type { Migration } from "./0001_init.js";

export const migration0053ObraDetalleNuevosMediosRiguroso: Migration = {
  name: "0053_obra_detalle_nuevos_medios_riguroso",
  sql: `
ALTER TABLE obra_detalle ADD COLUMN naturaleza_obra TEXT;
ALTER TABLE obra_detalle ADD COLUMN componentes_entregados TEXT;
ALTER TABLE obra_detalle ADD COLUMN plan_preservacion_digital TEXT;
ALTER TABLE obra_detalle ADD COLUMN instrucciones_reinstalacion TEXT;
ALTER TABLE obra_detalle ADD COLUMN derechos_exhibicion TEXT;
ALTER TABLE obra_detalle ADD COLUMN duracion_loop TEXT;
ALTER TABLE obra_detalle ADD COLUMN especificaciones_video TEXT;
ALTER TABLE obra_detalle ADD COLUMN audio_canales TEXT;
ALTER TABLE obra_detalle ADD COLUMN entorno_lenguaje TEXT;
ALTER TABLE obra_detalle ADD COLUMN hardware_requerido TEXT;
ALTER TABLE obra_detalle ADD COLUMN conectividad TEXT;
ALTER TABLE obra_detalle ADD COLUMN dimensiones_espaciales TEXT;
ALTER TABLE obra_detalle ADD COLUMN condiciones_iluminacion TEXT;
ALTER TABLE obra_detalle ADD COLUMN acondicionamiento_acustico TEXT;
ALTER TABLE obra_detalle ADD COLUMN equipamiento_exhibicion TEXT;

INSERT INTO texto_ayuda (field_key, texto_es, texto_en) VALUES
  ('naturaleza_obra', 'Edicion limitada certificada: multiplo numerado con documentacion de autenticidad.
Pieza unica (site-specific): obra irrepetible concebida para un espacio determinado.
Software de codigo abierto o propietario: especificar la licencia bajo la que se distribuye el codigo.', 'Certified limited edition: numbered multiple with authenticity documentation.
Unique piece (site-specific): unrepeatable work conceived for a specific space.
Open-source or proprietary software: specify the license under which the code is distributed.'),
  ('componentes_entregados', 'Disco maestro (SSD/USB de conservacion), master digital alojado en nube privada, token o contrato digital (si aplica), y manual de instrucciones entregados junto con la obra.', 'Master drive (conservation SSD/USB), digital master hosted on a private cloud, token or digital contract (if applicable), and instruction manual delivered together with the piece.'),
  ('plan_preservacion_digital', 'Autorizacion del artista para migrar formatos, emular entornos operativos antiguos o actualizar hardware en el futuro sin alterar la integridad conceptual de la obra.', 'Artist''s authorization to migrate formats, emulate obsolete operating environments, or update hardware in the future without altering the piece''s conceptual integrity.'),
  ('instrucciones_reinstalacion', 'Diagrama tecnico de conexionado, alturas exactas de tiro de proyeccion y posicionamiento de altavoces para volver a montar la obra (score / installation manual).', 'Technical wiring diagram, exact projection throw heights, and speaker positioning to reinstall the piece (score / installation manual).'),
  ('derechos_exhibicion', 'Especificar si la compra incluye derechos de exhibicion publica en museos e instituciones, o unicamente la tenencia privada de la obra.', 'Specify whether the purchase includes public exhibition rights at museums and institutions, or only private possession of the piece.'),
  ('duracion_loop', 'Tiempo exacto de duracion (ej. 12 min 34 s) e indicacion de si es reproduccion en bucle continuo (loop) o con inicio y fin programado.', 'Exact running time (e.g. 12 min 34 s) and whether it plays in continuous loop or has a programmed start and end.'),
  ('especificaciones_video', 'Resolucion (4K UHD, Full HD 1080p) y relacion de aspecto (16:9, 4:3, 21:9).
Codecs: master de preservacion (ProRes 422 HQ / 4444) y de exhibicion (H.264 / H.265 / MP4).
Frame rate: 24, 30 o 60 fps.', 'Resolution (4K UHD, Full HD 1080p) and aspect ratio (16:9, 4:3, 21:9).
Codecs: preservation master (ProRes 422 HQ / 4444) and exhibition (H.264 / H.265 / MP4).
Frame rate: 24, 30 or 60 fps.'),
  ('audio_canales', 'Estereo, multicanal envolvente (5.1, 7.1), sonido binaural para auriculares, o pieza silente (mute).', 'Stereo, surround multichannel (5.1, 7.1), binaural sound for headphones, or silent piece (mute).'),
  ('entorno_lenguaje', 'Entorno o lenguaje de programacion utilizado: Unity, Unreal Engine, TouchDesigner, Processing, Max/MSP, Python, WebGL, etc.', 'Programming environment or language used: Unity, Unreal Engine, TouchDesigner, Processing, Max/MSP, Python, WebGL, etc.'),
  ('hardware_requerido', 'CPU/GPU recomendada, sensores de movimiento (Kinect, LiDAR, camaras web), microcontroladores (Arduino, Raspberry Pi), o gafas VR/AR.', 'Recommended CPU/GPU, motion sensors (Kinect, LiDAR, webcams), microcontrollers (Arduino, Raspberry Pi), or VR/AR headsets.'),
  ('conectividad', 'Dependencia de conexion a internet en tiempo real (APIs, feeds de datos, scraping) o ejecucion en local sin conexion (offline).', 'Real-time internet connection dependency (APIs, data feeds, scraping) or fully offline local execution.'),
  ('dimensiones_espaciales', 'Requerimiento minimo o recomendado de espacio para la instalacion (ej. dimensiones variables; sala recomendada de min. 6 x 4 m).', 'Minimum or recommended space requirement for the installation (e.g. variable dimensions; recommended room of at least 6 x 4 m).'),
  ('condiciones_iluminacion', 'Sala oscura (black box), luz tenue o penumbra, o luz de dia (white cube).', 'Dark room (black box), dim light or half-light, or daylight (white cube).'),
  ('acondicionamiento_acustico', 'Sala insonorizada, paneles acusticos, o uso exclusivo de cascos/auriculares.', 'Soundproofed room, acoustic panels, or headphones-only use.'),
  ('equipamiento_exhibicion', 'Proyeccion: tipo de proyector (lumenes minimos, optica corta/larga).
Pantallas: monitores (pulgadas, tipo OLED/IPS, o monitor CRT vintage si es parte estetica de la pieza).', 'Projection: projector type (minimum lumens, short/long throw optics).
Screens: monitors (inches, OLED/IPS type, or vintage CRT monitor if it is an aesthetic part of the piece).');

UPDATE texto_ayuda SET
  texto_es = 'Tipo de anclaje necesario (piso, pared, techo, suspendido) y especificaciones de la peana o plinto requerido para la instalacion.
Arte textil: sistema de suspension especifico, ej. varilla oculta de madera/metal, velcro de conservacion cosido, bastidor entelado, o caja de metacrilato/plexiglas.
Nuevos medios / instalaciones: mobiliario y estructura de montaje, ej. pedestales, soportes VESA de pared, cableado oculto o cajas de paso.',
  texto_en = 'Type of anchoring required (floor, wall, ceiling, suspended) and specifications of the pedestal or plinth needed for installation.
Textile art: specific suspension system, e.g. hidden wood/metal rod, sewn conservation velcro, stretched fabric frame, or acrylic/plexiglass box.
New media / installations: mounting furniture and structure, e.g. pedestals, wall VESA mounts, hidden cabling, or junction boxes.'
WHERE field_key = 'requisitos_instalacion';

UPDATE texto_ayuda SET
  texto_es = 'Fotografia/papel: inspeccion de esquinas, planitud del papel, huellas, arañazos o decoloraciones de esta copia.
Escultura: estabilidad estructural y estado de la patina o superficie de esta copia.
Dibujo: foxing (manchas de oxido/hongos), amarilleamiento por acidificacion, dobleces, rasgaduras o decoloracion por luz.
Textil/Ceramica: sensibilidad a la luz solar/UV en tintes textiles, o nivel de porosidad/absorcion de agua en ceramica.
Nuevos medios: estado fisico de los medios de almacenamiento entregados (SSD/USB) y verificacion de integridad de los archivos.',
  texto_en = 'Photography/paper: inspection of corners, paper flatness, fingerprints, scratches or discoloration on this copy.
Sculpture: structural stability and condition of the patina or surface of this copy.
Drawing: foxing (rust/mold spots), yellowing from acidification, creases, tears, or light-induced discoloration.
Textile/Ceramics: sensitivity to sunlight/UV in textile dyes, or porosity/water absorption level in ceramics.
New media: physical condition of the delivered storage media (SSD/USB) and file integrity verification.'
WHERE field_key = 'informe_conservacion';
`,
};
