
-- =================================================================
-- Script Definitivo y Completo - Modelo v12.1 (Con Carga de Datos)
-- =================================================================

-- -----------------------------------------------------
-- Creación de Tablas
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Responsables (id_responsable SERIAL PRIMARY KEY, nombre_responsable VARCHAR(100) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS Instituciones (id_institucion SERIAL PRIMARY KEY, id_responsable INT NOT NULL, nombre_institucion VARCHAR(255) NOT NULL UNIQUE, siglas VARCHAR(50) NULL, CONSTRAINT fk_institucion_responsable FOREIGN KEY (id_responsable) REFERENCES Responsables (id_responsable));
CREATE TABLE IF NOT EXISTS Catalogo_Organos_Colegiados (id_organo_colegiado SERIAL PRIMARY KEY, nombre_organo VARCHAR(255) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS Institucion_Organos (id_institucion INT NOT NULL, id_organo_colegiado INT NOT NULL, PRIMARY KEY (id_institucion, id_organo_colegiado), CONSTRAINT fk_vinculo_institucion FOREIGN KEY (id_institucion) REFERENCES Instituciones (id_institucion) ON DELETE CASCADE, CONSTRAINT fk_vinculo_organo FOREIGN KEY (id_organo_colegiado) REFERENCES Catalogo_Organos_Colegiados (id_organo_colegiado) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS Informes_de_Seguimiento (id_informe SERIAL PRIMARY KEY, id_institucion INT NOT NULL, id_responsable INT NOT NULL, tipo_informe VARCHAR(255) NOT NULL, periodo VARCHAR(50) NOT NULL, fecha_informe DATE NOT NULL, activo BOOLEAN NOT NULL DEFAULT TRUE, fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, creado_por_usuario_id INT NULL, fecha_ultima_modificacion TIMESTAMP WITH TIME ZONE NULL, modificado_por_usuario_id INT NULL, CONSTRAINT fk_informe_institucion FOREIGN KEY (id_institucion) REFERENCES Instituciones (id_institucion), CONSTRAINT fk_informe_responsable FOREIGN KEY (id_responsable) REFERENCES Responsables (id_responsable));
CREATE TABLE IF NOT EXISTS Recomendaciones (id_recomendacion SERIAL PRIMARY KEY, id_informe INT NOT NULL, descripcion TEXT NOT NULL, area_responsable_atencion VARCHAR(255) NOT NULL, fecha_compromiso DATE NULL, estatus VARCHAR(50) NOT NULL DEFAULT 'Pendiente', prioridad VARCHAR(50) DEFAULT 'Media', tipo_recomendacion VARCHAR(100) DEFAULT 'Correctiva', observaciones TEXT NULL, activo BOOLEAN NOT NULL DEFAULT TRUE, fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, creado_por_usuario_id INT NULL, fecha_ultima_modificacion TIMESTAMP WITH TIME ZONE NULL, modificado_por_usuario_id INT NULL, CONSTRAINT fk_recomendacion_informe FOREIGN KEY (id_informe) REFERENCES Informes_de_Seguimiento (id_informe) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS Evidencias (id_evidencia SERIAL PRIMARY KEY, id_recomendacion INT NOT NULL, nombre_archivo VARCHAR(255) NOT NULL, url_almacenamiento VARCHAR(255) NOT NULL, tipo_evidencia VARCHAR(100) NOT NULL DEFAULT 'Soporte', fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, creado_por_usuario_id INT NULL, activo BOOLEAN NOT NULL DEFAULT TRUE, CONSTRAINT fk_evidencia_recomendacion FOREIGN KEY (id_recomendacion) REFERENCES Recomendaciones (id_recomendacion) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS Calendario_Sesiones (id_calendario SERIAL PRIMARY KEY, id_institucion INT NOT NULL, id_organo_colegiado INT NOT NULL, año INT NOT NULL, tipo_sesion VARCHAR(50) NOT NULL, numero_ordinal INT NULL, estatus VARCHAR(50) NOT NULL DEFAULT 'Programada', activo BOOLEAN NOT NULL DEFAULT TRUE, fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_calendario_institucion FOREIGN KEY (id_institucion) REFERENCES Instituciones (id_institucion), CONSTRAINT fk_calendario_organo FOREIGN KEY (id_organo_colegiado) REFERENCES Catalogo_Organos_Colegiados (id_organo_colegiado), CONSTRAINT uq_sesion_planeada UNIQUE (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal));
CREATE TABLE IF NOT EXISTS Ejecucion_Sesiones (id_ejecucion SERIAL PRIMARY KEY, id_calendario INT NOT NULL UNIQUE, numero_sesion_oficial VARCHAR(100) NOT NULL, fecha_real DATE NOT NULL, resumen_ejecutivo TEXT NULL, url_acta_firmada VARCHAR(255) NULL, activo BOOLEAN NOT NULL DEFAULT TRUE, fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, creado_por_usuario_id INT NULL, fecha_ultima_modificacion TIMESTAMP WITH TIME ZONE NULL, modificado_por_usuario_id INT NULL, CONSTRAINT fk_ejecucion_calendario FOREIGN KEY (id_calendario) REFERENCES Calendario_Sesiones (id_calendario));

-- -----------------------------------------------------
-- Carga de Datos Iniciales (Catálogos y Vínculos)
-- -----------------------------------------------------
INSERT INTO Responsables (id_responsable, nombre_responsable) VALUES (1, 'Delegada'), (2, 'Comisaria')
ON CONFLICT (id_responsable) DO UPDATE SET nombre_responsable = EXCLUDED.nombre_responsable;

INSERT INTO Instituciones (id_institucion, id_responsable, nombre_institucion, siglas) VALUES
(1, 1, 'Agencia Nacional de Seguridad Industrial y de Protección al Medio Ambiente del Sector Hidrocarburos', 'ASEA'),
(2, 1, 'Centro de Capacitación Cinematográfica, A.C.', 'CCC'),
(3, 1, 'Colegio Superior Agropecuario del Estado de Guerrero', 'CSAEGRO'),
(4, 1, 'Comisión Intersecretarial para la Atención de Sequías e Inundaciones', 'CIASI'),
(5, 1, 'Comisión Nacional de Acuacultura y Pesca', 'CONAPESCA'),
(6, 1, 'Comisión Nacional de Áreas Naturales Protegidas', 'CONANP'),
(7, 1, 'Comisión Nacional del Agua', 'CONAGUA'),
(8, 1, 'Comité Nacional para el Desarrollo Sustentable de la Caña de Azúcar', 'CONADESUCA'),
(9, 1, 'Compañía Operadora del Centro Cultural y Turístico de Tijuana, S.A. de C.V.', 'CECUT'),
(10, 1, 'Consejería Jurídica del Ejecutivo Federal', 'CJEF'),
(11, 1, 'Estudios Churubusco Azteca, S.A.', 'ECHASA'),
(12, 1, 'Fideicomiso para Apoyar los Programas, Proyectos y Acciones Ambientales de la Megalópolis', 'Fideicomiso 1490'),
(13, 1, 'Fideicomiso para la Cineteca Nacional', 'FICINE')
ON CONFLICT (id_institucion) DO UPDATE SET nombre_institucion = EXCLUDED.nombre_institucion;

INSERT INTO Catalogo_Organos_Colegiados (id_organo_colegiado, nombre_organo) VALUES
(1, 'Comité de Control al Desempeño Institucional'),
(2, 'Asamblea de Accionistas'),
(3, 'Consejo Directivo'),
(4, 'Comisión'),
(5, 'Consejo Técnico'),
(6, 'Junta Directiva'),
(7, 'Consejo de Administración'),
(8, 'Subcomité de Evaluación y Seguimiento de Proyectos')
ON CONFLICT (id_organo_colegiado) DO UPDATE SET nombre_organo = EXCLUDED.nombre_organo;

INSERT INTO Institucion_Organos (id_institucion, id_organo_colegiado) VALUES
(1, 1), (2, 1), (2, 2), (2, 3), (3, 1), (4, 4), (5, 1), (5, 5), (6, 1), (7, 1), (7, 5), (8, 1), (8, 6), (9, 1), (9, 2), (9, 7), (10, 1), (11, 1), (11, 2), (11, 7), (12, 5), (12, 8), (13, 5)
ON CONFLICT (id_institucion, id_organo_colegiado) DO NOTHING;
