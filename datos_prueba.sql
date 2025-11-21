-- =================================================================
-- Script de Datos de Prueba para COCODI v1.0
-- =================================================================
-- Este script debe ejecutarse DESPUÉS de init.sql

-- Se utiliza DO $$...$$ para poder declarar variables y lógica.
DO $$
DECLARE
    -- Declaración de variables para almacenar IDs generados
    id_cal_1 INT;
    id_cal_2 INT;
    id_cal_3 INT;
    id_cal_4 INT;
    id_cal_5 INT;
    id_cal_6 INT;
    id_cal_7 INT;
    id_informe_1 INT;
    id_informe_2 INT;
    id_informe_3 INT;
BEGIN

-- =============================================================
-- SECCIÓN 1: Creación de Sesiones (Ordinarias y Extraordinarias)
-- =============================================================
RAISE NOTICE 'Creando datos para Calendario y Ejecución de Sesiones...';

-- CASO 1: CONAGUA (ID 14) - COCODI (ID 1) - Año 2024
-- 4 sesiones ordinarias, 3 realizadas y 1 programada.
INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal, estatus) VALUES (14, 1, 2024, 'Ordinaria', 1, 'Realizada') RETURNING id_calendario INTO id_cal_1;
INSERT INTO Ejecucion_Sesiones (id_calendario, numero_sesion_oficial, fecha_real, responsable) VALUES (id_cal_1, 'CONAGUA-COC-001-2024', '2024-03-15', 'Juan Pérez');

INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal, estatus) VALUES (14, 1, 2024, 'Ordinaria', 2, 'Realizada') RETURNING id_calendario INTO id_cal_2;
INSERT INTO Ejecucion_Sesiones (id_calendario, numero_sesion_oficial, fecha_real, responsable) VALUES (id_cal_2, 'CONAGUA-COC-002-2024', '2024-06-20', 'Juan Pérez');

INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal, estatus) VALUES (14, 1, 2024, 'Ordinaria', 3, 'Realizada') RETURNING id_calendario INTO id_cal_3;
INSERT INTO Ejecucion_Sesiones (id_calendario, numero_sesion_oficial, fecha_real, responsable) VALUES (id_cal_3, 'CONAGUA-COC-003-2024', '2024-09-18', 'Ana García');

INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal, estatus) VALUES (14, 1, 2024, 'Ordinaria', 4, 'Programada');

-- 1 sesión extraordinaria para CONAGUA en 2024
INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, estatus) VALUES (14, 1, 2024, 'Extraordinaria', 'Realizada') RETURNING id_calendario INTO id_cal_4;
INSERT INTO Ejecucion_Sesiones (id_calendario, numero_sesion_oficial, fecha_real, responsable) VALUES (id_cal_4, 'CONAGUA-COC-EXT-01-2024', '2024-10-05', 'Laura Martínez');

-- CASO 2: ASA (ID 1) - Junta de Gobierno (ID 2) - Año 2025
-- 4 sesiones ordinarias, todas programadas para el futuro.
INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal, estatus) VALUES (1, 2, 2025, 'Ordinaria', 1, 'Programada');
INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal, estatus) VALUES (1, 2, 2025, 'Ordinaria', 2, 'Programada');
INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal, estatus) VALUES (1, 2, 2025, 'Ordinaria', 3, 'Programada');
INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal, estatus) VALUES (1, 2, 2025, 'Ordinaria', 4, 'Programada');

-- CASO 3: LOTENAL (ID 56) - Junta Directiva (ID 6) - Año 2024
-- 2 sesiones realizadas, 2 programadas.
INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal, estatus) VALUES (56, 6, 2024, 'Ordinaria', 1, 'Realizada') RETURNING id_calendario INTO id_cal_5;
INSERT INTO Ejecucion_Sesiones (id_calendario, numero_sesion_oficial, fecha_real, responsable) VALUES (id_cal_5, 'LOTENAL-JD-01-2024', '2024-02-28', 'Carlos Rodríguez');
INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal, estatus) VALUES (56, 6, 2024, 'Ordinaria', 2, 'Realizada') RETURNING id_calendario INTO id_cal_6;
INSERT INTO Ejecucion_Sesiones (id_calendario, numero_sesion_oficial, fecha_real, responsable) VALUES (id_cal_6, 'LOTENAL-JD-02-2024', '2024-05-22', 'Carlos Rodríguez');

INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal, estatus) VALUES (56, 6, 2024, 'Ordinaria', 3, 'Programada');
INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, numero_ordinal, estatus) VALUES (56, 6, 2024, 'Ordinaria', 4, 'Programada');
-- 1 extraordinaria para LOTENAL en 2025
INSERT INTO Calendario_Sesiones (id_institucion, id_organo_colegiado, año, tipo_sesion, estatus) VALUES (56, 6, 2025, 'Extraordinaria', 'Programada') RETURNING id_calendario INTO id_cal_7;

-- =============================================================
-- SECCIÓN 2: Creación de Informes de Seguimiento
-- =============================================================
RAISE NOTICE 'Creando datos para Informes de Seguimiento...';

-- Informe 1: CONAGUA, asociado a la sesión id_cal_2, responsable Delegada (1)
INSERT INTO Informes_de_Seguimiento (id_institucion, id_organo_colegiado, id_responsable, tipo_informe, periodo, fecha_informe, descripcion)
VALUES (14, 1, 1, 'Informe de Autoevaluación', '2024', '2024-07-10', 'Revisión semestral del desempeño y control interno de la CONAGUA.')
RETURNING id_informe INTO id_informe_1;

-- Informe 2: LOTENAL, asociado a la sesión id_cal_5, responsable Comisaria (2)
INSERT INTO Informes_de_Seguimiento (id_institucion, id_organo_colegiado, id_responsable, tipo_informe, periodo, fecha_informe, descripcion)
VALUES (56, 6, 2, 'Informe de Estados Financieros', '2024', '2024-03-25', 'Análisis financiero del primer trimestre del año para la Lotería Nacional.')
RETURNING id_informe INTO id_informe_2;

-- Informe 3: ASA, sin sesión asociada directamente (ejemplo), responsable Comisaria (2)
INSERT INTO Informes_de_Seguimiento (id_institucion, id_organo_colegiado, id_responsable, tipo_informe, periodo, fecha_informe, descripcion)
VALUES (1, 2, 2, 'RAAD', '2023', '2024-01-30', 'Informe Anual de Actividades y Resultados de ASA correspondiente al ejercicio 2023.')
RETURNING id_informe INTO id_informe_3;


-- =============================================================
-- SECCIÓN 3: Creación de Recomendaciones
-- =============================================================
RAISE NOTICE 'Creando datos para Recomendaciones...';

-- ----------- Recomendaciones ASOCIADAS a Informes -----------
-- Asociadas al Informe 1 (CONAGUA)
INSERT INTO Recomendaciones (id_informe, id_institucion, id_organo_colegiado, descripcion, area_responsable_atencion, fecha_emision, fecha_compromiso, estatus, prioridad, tipo_recomendacion)
VALUES
(id_informe_1, 14, 1, 'Implementar un nuevo sistema de monitoreo de presas en tiempo real.', 'Gerencia de Infraestructura Hidráulica', '2024-07-11', '2025-06-30', 'En Proceso', 'Alta', 'De Mejora Continua'),
(id_informe_1, 14, 1, 'Actualizar los protocolos de respuesta a emergencias por inundaciones.', 'Coordinación de Protección Civil', '2024-07-11', '2024-12-15', 'Pendiente', 'Alta', 'Preventiva');

-- Asociadas al Informe 2 (LOTENAL)
INSERT INTO Recomendaciones (id_informe, id_institucion, id_organo_colegiado, descripcion, area_responsable_atencion, fecha_emision, fecha_compromiso, estatus, prioridad, tipo_recomendacion)
VALUES
(id_informe_2, 56, 6, 'Realizar la conciliación de las cuentas bancarias pendientes del mes de Febrero.', 'Departamento de Contabilidad', '2024-03-26', '2024-04-30', 'Completada', 'Media', 'Correctiva');

-- ----------- Recomendaciones INDEPENDIENTES (id_informe es NULL) -----------
-- Recomendación para INAH (ID 44), VENCIDA
INSERT INTO Recomendaciones (id_informe, id_institucion, id_organo_colegiado, descripcion, area_responsable_atencion, fecha_emision, fecha_compromiso, estatus, prioridad, tipo_recomendacion)
VALUES
(NULL, 44, 13, 'Reforzar la seguridad en la zona arqueológica de Teotihuacán.', 'Dirección de Seguridad de Zonas Arqueológicas', '2024-01-15', '2024-08-30', 'Pendiente', 'Alta', 'Preventiva');

-- Recomendación para FONATUR Tren Maya (ID 36), En Proceso
INSERT INTO Recomendaciones (id_informe, id_institucion, id_organo_colegiado, descripcion, area_responsable_atencion, fecha_emision, fecha_compromiso, estatus, prioridad, tipo_recomendacion)
VALUES
(NULL, 36, 9, 'Presentar informe de avance de obra del Tramo 5.', 'Subdirección de Construcción', '2024-05-20', '2024-11-20', 'En Proceso', 'Media', 'Correctiva');

-- Recomendación para DICONSA (ID 21), Cerrada
INSERT INTO Recomendaciones (id_informe, id_institucion, id_organo_colegiado, descripcion, area_responsable_atencion, fecha_emision, fecha_compromiso, estatus, prioridad, tipo_recomendacion)
VALUES
(NULL, 21, 9, 'Optimizar la logística de distribución en la región sureste.', 'Gerencia de Logística', '2023-11-10', '2024-05-10', 'Cerrada', 'Baja', 'De Mejora Continua');

-- Recomendación para IMJUVE (ID 40), Cancelada
INSERT INTO Recomendaciones (id_informe, id_institucion, id_organo_colegiado, descripcion, area_responsable_atencion, fecha_emision, fecha_compromiso, estatus, prioridad, tipo_recomendacion)
VALUES
(NULL, 40, 1, 'Crear un nuevo programa de becas para jóvenes emprendedores.', 'Dirección de Programas Juveniles', '2024-02-01', '2024-09-01', 'Cancelada', 'Media', 'De Mejora Continua');


-- =============================================================
-- SECCIÓN 4: Creación de Contactos del Directorio
-- =============================================================
RAISE NOTICE 'Creando datos para Directorio de Contactos...';

-- Contactos para CONAGUA (ID 14)
-- Un contacto general de la institución (sin órgano colegiado)
INSERT INTO Directorio_Contactos (id_institucion, id_organo_colegiado, nombre_contacto, telefono, extension, email, movil, direccion)
VALUES
(14, NULL, 'Oficina de Atención Ciudadana CONAGUA', '5551744000', '1234', 'atencion@conagua.gob.mx', NULL, 'Av. Insurgentes Sur 2416, Copilco El Bajo, Coyoacán, CDMX');
-- Un contacto específico del COCODI de CONAGUA
INSERT INTO Directorio_Contactos (id_institucion, id_organo_colegiado, nombre_contacto, telefono, extension, email, movil, direccion)
VALUES
(14, 1, 'Lic. Ricardo Morales (Enlace COCODI)', '5551744000', '5678', 'ricardo.morales@conagua.gob.mx', '5512345678', 'Piso 5, Oficina de Control Interno');

-- Contactos para ASA (ID 1)
INSERT INTO Directorio_Contactos (id_institucion, id_organo_colegiado, nombre_contacto, telefono, extension, email, movil)
VALUES
(1, 2, 'Dra. Sofía Herrera (Secretaria Técnica JG)', '5524822400', '2250', 'sofia.herrera@asa.gob.mx', '5587654321');

-- Contactos para SADER (ID 65)
INSERT INTO Directorio_Contactos (id_institucion, id_organo_colegiado, nombre_contacto, telefono, extension, email, movil)
VALUES
(65, 1, 'Ing. Fernando Campos (Titular OIC)', '5538711000', '33456', 'fernando.campos@sader.gob.mx', '5555555555');

RAISE NOTICE 'Script de datos de prueba finalizado con éxito.';

END $$;