-- =================================================================
-- Script Definitivo - Modelo v16.2 (Mejoras en Directorio)
-- =================================================================

-- -----------------------------------------------------
-- Creación de Tablas
-- -----------------------------------------------------
DROP TABLE IF EXISTS Directorio_Contactos, Evidencias, Recomendaciones, Informes_de_Seguimiento, Ejecucion_Sesiones, Calendario_Sesiones, Institucion_Organos, Catalogo_Organos_Colegiados, Instituciones, Responsables CASCADE;

CREATE TABLE IF NOT EXISTS Responsables (
  id_responsable SERIAL PRIMARY KEY,
  nombre_responsable VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Instituciones (
  id_institucion SERIAL PRIMARY KEY,
  id_responsable INT NOT NULL,
  nombre_institucion VARCHAR(255) NOT NULL UNIQUE,
  siglas VARCHAR(50) NULL,
  CONSTRAINT fk_institucion_responsable FOREIGN KEY (id_responsable) REFERENCES Responsables (id_responsable)
);

CREATE TABLE IF NOT EXISTS Catalogo_Organos_Colegiados (
  id_organo_colegiado SERIAL PRIMARY KEY,
  nombre_organo VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Institucion_Organos (
  id_institucion INT NOT NULL,
  id_organo_colegiado INT NOT NULL,
  PRIMARY KEY (id_institucion, id_organo_colegiado),
  CONSTRAINT fk_vinculo_institucion FOREIGN KEY (id_institucion) REFERENCES Instituciones (id_institucion) ON DELETE CASCADE,
  CONSTRAINT fk_vinculo_organo FOREIGN KEY (id_organo_colegiado) REFERENCES Catalogo_Organos_Colegiados (id_organo_colegiado) ON DELETE CASCADE
);

-- AJUSTE: Se añade campo 'extension'
CREATE TABLE IF NOT EXISTS Directorio_Contactos (
    id_contacto SERIAL PRIMARY KEY,
    id_institucion INT NOT NULL,
    id_organo_colegiado INT NULL, 
    nombre_contacto VARCHAR(255) NOT NULL,
    telefono VARCHAR(40) NULL,
    extension VARCHAR(10) NULL,
    email VARCHAR(255) NULL,
    movil VARCHAR(50) NULL,
    direccion TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_directorio_institucion FOREIGN KEY (id_institucion) REFERENCES Instituciones (id_institucion) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Informes_de_Seguimiento (
  id_informe SERIAL PRIMARY KEY,
  id_institucion INT NOT NULL,
  id_organo_colegiado INT NOT NULL,
  id_responsable INT NOT NULL,
  tipo_informe VARCHAR(255) NOT NULL,
  periodo VARCHAR(50) NOT NULL,
  fecha_informe DATE NOT NULL,
  descripcion TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_informe_responsable FOREIGN KEY (id_responsable) REFERENCES Responsables (id_responsable),
  CONSTRAINT fk_informe_institucion_organo FOREIGN KEY (id_institucion, id_organo_colegiado) REFERENCES Institucion_Organos (id_institucion, id_organo_colegiado)
);

CREATE TABLE IF NOT EXISTS Recomendaciones (
  id_recomendacion SERIAL PRIMARY KEY,
  id_informe INT NULL,
  id_institucion INT NOT NULL,
  id_organo_colegiado INT NOT NULL,
  descripcion TEXT NOT NULL,
  area_responsable_atencion VARCHAR(255) NOT NULL,
  fecha_emision DATE NOT NULL,
  fecha_compromiso DATE NULL,
  estatus VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
  prioridad VARCHAR(50) DEFAULT 'Media',
  tipo_recomendacion VARCHAR(100) DEFAULT 'Correctiva',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_recomendacion_informe FOREIGN KEY (id_informe) REFERENCES Informes_de_Seguimiento (id_informe) ON DELETE SET NULL,
  CONSTRAINT fk_recomendacion_institucion_organo FOREIGN KEY (id_institucion, id_organo_colegiado) REFERENCES Institucion_Organos (id_institucion, id_organo_colegiado)
);

CREATE TABLE IF NOT EXISTS Calendario_Sesiones (
  id_calendario SERIAL PRIMARY KEY,
  id_institucion INT NOT NULL,
  id_organo_colegiado INT NOT NULL,
  año INT NOT NULL,
  tipo_sesion VARCHAR(50) NOT NULL,
  numero_ordinal INT NULL,
  estatus VARCHAR(50) NOT NULL DEFAULT 'Programada',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_calendario_institucion_organo FOREIGN KEY (id_institucion, id_organo_colegiado) REFERENCES Institucion_Organos (id_institucion, id_organo_colegiado),
  CONSTRAINT uq_sesion_planeada UNIQUE (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal)
);

CREATE TABLE IF NOT EXISTS Ejecucion_Sesiones (
  id_ejecucion SERIAL PRIMARY KEY,
  id_calendario INT NOT NULL UNIQUE,
  numero_sesion_oficial VARCHAR(100) NOT NULL,
  fecha_real DATE NOT NULL,
  responsable VARCHAR(255) NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_ejecucion_calendario FOREIGN KEY (id_calendario) REFERENCES Calendario_Sesiones (id_calendario)
);

CREATE TABLE IF NOT EXISTS Evidencias (
  id_evidencia SERIAL PRIMARY KEY,
  parent_id INT NOT NULL,
  parent_type VARCHAR(50) NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  url_almacenamiento VARCHAR(255) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);


-- -----------------------------------------------------
-- Carga de Datos Iniciales (Catálogos y Vínculos)
-- -----------------------------------------------------
INSERT INTO Responsables (id_responsable, nombre_responsable) VALUES (1, 'Delegada'), (2, 'Comisaria')
ON CONFLICT (id_responsable) DO UPDATE SET nombre_responsable = EXCLUDED.nombre_responsable;

INSERT INTO Instituciones (id_institucion, id_responsable, nombre_institucion, siglas) VALUES
(1, 2, 'Aeropuertos y Servicios Auxiliares', 'ASA'), (2, 2, 'Agencia Espacial Mexicana', 'AEM'), (3, 1, 'Agencia Nacional de Seguridad Industrial y de Protección al Medio Ambiente del Sector Hidrocarburos', 'ASEA'), (4, 1, 'Centro de Capacitación Cinematográfica', 'CCC'), (5, 2, 'Centro de Enseñanza Técnica Industrial', 'CETI'), (6, 2, 'Centro de Investigación en Química Aplicada', 'CIQA'), (7, 1, 'Compañía Operadora del Centro Cultural y Turístico de Tijuana', 'CECUT'), (8, 2, 'Centro de Producción de Programas Informativos y Especiales', 'CEPROPIE'), (9, 1, 'Comisión Intersecretarial para la Atención de Sequías e Inundaciones', 'CIASI'), (10, 2, 'Colegio de Postgraduados', 'COLPOS'), (11, 1, 'Colegio Superior Agropecuario del Estado de Guerrero', 'CSAEGRO'), (12, 1, 'Comité Nacional para el Desarrollo Sustentable de la Caña de Azúcar', 'CONADESUCA'), (13, 2, 'Comisión Nacional Forestal', 'CONAFOR'), (14, 1, 'Comisión Nacional del Agua', 'CONAGUA'), (15, 1, 'Comisión Nacional de Áreas Naturales Protegidas', 'CONANP'), (16, 1, 'Comisión Nacional de Acuacultura y Pesca', 'CONAPESCA'), (17, 2, 'Consejo Nacional para Prevenir la Discriminación', 'CONAPRED'), (18, 2, 'Consejo Nacional de Zonas Francas', 'CONAZA'), (19, 2, 'Consejo Nacional de Fomento Educativo', 'CONAFE'), (20, 1, 'Centro Cultural', 'CULTURA'), (21, 2, 'Diconsa', 'DICONSA'), (22, 1, 'Estudios Churubusco Azteca', 'ECHASA'), (23, 2, 'El Colegio de la Frontera Sur', 'ECOSUR'), (24, 1, 'Fideicomiso para la Cineteca Nacional', 'FICINE'), (25, 1, 'Fideicomiso 1490', 'FIDEICOMISO_1490'), (26, 2, 'Fideicomiso de Fomento Minero', 'FIFOMI'), (27, 2, 'Fideicomiso Fondo Nacional de Fomento Ejidal', 'FIFONAFE'), (28, 2, 'Financiera Nacional de Desarrollo Agropecuario, Rural, Forestal y Pesquero', 'FND'), (29, 2, 'Fondo de Capitalización e Inversión del Sector Rural', 'FOCIR'), (30, 2, 'Fondo Nacional para el Fomento de las Artesanías', 'FONART'), (31, 2, 'Fondo Nacional de Fomento al Turismo', 'FONATUR'), (32, 2, 'Fonatur Constructora', 'FONATUR CONSTRUCTORA'), (33, 2, 'Fonatur Infraestructura', 'FONATUR INFRAESTRUCTURA'), (34, 2, 'Fonatur Mantenimiento', 'FONATUR MANTENIMIENTO'), (35, 2, 'Fonatur Solar', 'FONATUR_SOLAR'), (36, 2, 'Fonatur Tren Maya', 'FONATUR_TREN_MAYA'), (37, 2, 'Grupo Aeroportuario de la Ciudad de México', 'GACM'), (38, 2, 'Hospital General de México', 'HGM'), (39, 2, 'Instituto Mexicano de Cinematografía', 'IMCINE'), (40, 2, 'Instituto Mexicano de la Juventud', 'IMJUVE'), (41, 2, 'Imprenta y Encuadernación Progreso', 'IMPRES'), (42, 1, 'Instituto Mexicano de la Radio', 'IMER'), (43, 1, 'Instituto Mexicano de Tecnología del Agua', 'IMTA'), (44, 1, 'Instituto Nacional de Antropología e Historia', 'INAH'), (45, 2, 'Instituto Nacional de Bellas Artes y Literatura', 'INBAL'), (46, 1, 'Instituto Nacional de Ecología y Cambio Climático', 'INECC'), (47, 2, 'Instituto Nacional para el Federalismo y el Desarrollo Municipal', 'INAFED'), (48, 2, 'Instituto Nacional de Investigaciones Forestales, Agrícolas y Pecuarias', 'INIFAP'), (49, 2, 'Instituto Nacional de Lenguas Indígenas', 'INALI'), (50, 1, 'Instituto Nacional de las Personas Adultas Mayores', 'INAPAM'), (51, 2, 'Instituto Nacional de los Pueblos Indígenas', 'INPI'), (52, 2, 'Instituto Nacional para la Educación de los Adultos', 'INEA'), (53, 1, 'Instituto Nacional de Pesca y Acuacultura', 'INAPESCA'), (54, 2, 'Instituto Nacional de Suelo Sustentable', 'INSUS'), (55, 2, 'Liconsa', 'LICONSA'), (56, 2, 'Lotería Nacional', 'LOTENAL'), (57, 2, 'Notimex', 'NOTIMEX'), (58, 2, 'Procuraduría Agraria', 'PA'), (59, 1, 'Procuraduría Federal de Protección al Ambiente', 'PROFEPA'), (60, 2, 'Pronósticos para la Asistencia Pública', 'PRONOSTICOS'), (61, 2, 'Productora Nacional de Biológicos Veterinarios', 'PRONABIVE'), (62, 1, 'Radio Educación', 'RADIO_EDUCACION'), (63, 2, 'Registro Agrario Nacional', 'RAN'), (64, 2, 'Servicios Aeroportuarios de la Ciudad de México', 'SACM'), (65, 1, 'Secretaría de Agricultura y Desarrollo Rural', 'SADER'), (66, 1, 'Servicio Geológico Mexicano', 'SGM'), (67, 1, 'Servicio Nacional de Sanidad, Inocuidad y Calidad Agroalimentaria', 'SENASICA'), (68, 1, 'Servicio de Información Agroalimentaria y Pesquera', 'SIAP'), (69, 2, 'Sistema Nacional para el Desarrollo Integral de la Familia', 'SNDIF'), (70, 2, 'Servicios a la Navegación en el Espacio Aéreo Mexicano', 'SENEAM'), (71, 2, 'Sistema Público de Radiodifusión del Estado Mexicano', 'SPR'), (72, 2, 'Talleres Gráficos de México', 'TGM'), (73, 2, 'Telecomunicaciones de México', 'TELECOMM'), (74, 2, 'Televisión Metropolitana', 'TELEVISION_METROPOLITANA')
ON CONFLICT (id_institucion) DO UPDATE SET 
nombre_institucion = EXCLUDED.nombre_institucion, 
siglas = EXCLUDED.siglas,
id_responsable = EXCLUDED.id_responsable;

INSERT INTO Catalogo_Organos_Colegiados (id_organo_colegiado, nombre_organo) VALUES
(1, 'COCODI'), (2, 'Junta de Gobierno'), (3, 'Comité de Dictamen de Asociados'), (4, 'Asamblea General de Accionistas'), (5, 'Comisión Intersecretarial'), (6, 'Junta Directiva'), (7, 'Consejo Técnico'), (8, 'Consejo Directivo'), (9, 'Consejo de Administración'), (10, 'Comité de Evaluación'), (11, 'Comité Técnico'), (12, 'Comisión Ejecutiva'), (13, 'Comisión Interna de Administración'), (14, 'SISTEMA INTERSECRETARIAL'), (15, 'Asamblea General de Asociados')
ON CONFLICT (id_organo_colegiado) DO UPDATE SET nombre_organo = EXCLUDED.nombre_organo;

INSERT INTO Institucion_Organos (id_institucion, id_organo_colegiado) VALUES
(1, 2), (2, 2), (3, 1), (3, 2), (4, 1), (4, 4), (4, 8), (5, 2), (6, 2), (7, 1), (7, 4), (8, 2), (9, 5), (10, 6), (11, 1), (12, 1), (12, 6), (13, 1), (13, 2), (14, 1), (14, 7), (15, 1), (16, 7), (17, 1), (18, 2), (19, 8), (20, 1), (21, 4), (21, 9), (22, 1), (22, 4), (23, 1), (23, 2), (24, 1), (25, 10), (26, 11), (27, 11), (28, 1), (29, 11), (30, 1), (30, 6), (31, 9), (32, 9), (33, 9), (34, 1), (35, 9), (36, 9), (37, 1), (38, 1), (39, 12), (40, 1), (41, 1), (42, 6), (43, 2), (44, 13), (45, 13), (46, 2), (47, 1), (48, 2), (49, 2), (50, 1), (50, 13), (51, 2), (52, 6), (53, 15), (54, 2), (55, 4), (55, 9), (56, 1), (56, 6), (57, 1), (58, 1), (59, 1), (60, 2), (61, 2), (62, 13), (63, 1), (64, 9), (65, 1), (66, 9), (67, 1), (68, 14), (69, 1), (70, 7), (71, 2), (72, 2), (73, 2), (74, 1), (74, 4), (74, 9)
ON CONFLICT (id_institucion, id_organo_colegiado) DO NOTHING;

