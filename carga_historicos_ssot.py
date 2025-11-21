# -----------------------------------------------------------------------------
# SCRIPT DE CARGA HISTÓRICA SSOT (FASE 2) - VERSIÓN CORREGIDA (BUG DE TIPO)
#
# Autor: Desarrollador Python Senior (ETL)
#
# CAMBIOS (POST-ERROR):
# 1. CAMBIO CRÍTICO: Se fuerza la conversión del 'ID' de Excel a
#    un string (texto) usando str(int(row['ID'])) para evitar
#    el desajuste de tipo de dato (float vs. string) en el mapa de IDs.
# -----------------------------------------------------------------------------

import sys
import pandas as pd
import psycopg2
import psycopg2.extras

# --- CONFIGURACIÓN DE CONEXIÓN (PARA EJECUTAR DENTRO DE DOCKER) ---
DB_CONFIG = {
    "host": "db",
    "port": "5432",
    "dbname": "cocodi_db",
    "user": "cocodi_user",
    "password": "new_password_2025"
}

# --- CONSTANTES ---
EXCEL_SOURCE_FILE = 'bitacora_informes_OK.xlsx'
EXCEL_SHEET_NAME = 'Hoja1'

# Regla 2: Placeholder para campos NOT NULL que no existen en el histórico.
PLACEHOLDER_MIGRACION = 'No Definida (Migración Histórica)'
# Placeholder para fechas NOT NULL que no podemos inferir
PLACEHOLDER_FECHA = '1900-01-01'

def fetch_master_data_maps(cursor):
    """
    (Regla 1) Lee las tablas maestras para crear mapas de
    Nombre -> ID y evitar hardcodear llaves foráneas.
    """
    print("Obteniendo mapas de tablas maestras...")

    # 1. Mapa de Instituciones
    cursor.execute("SELECT id_institucion, nombre_institucion FROM instituciones")
    instituciones_data = cursor.fetchall()
    institucion_map = {nombre: inst_id for inst_id, nombre in instituciones_data}
    if not institucion_map:
        raise ValueError("La tabla 'instituciones' está vacía. No se puede continuar.")
    print(f"-> Mapa de 'instituciones' cargado ({len(institucion_map)} registros).")

    # 2. Mapa de Tipos de Informe
    cursor.execute("SELECT id_tipo_informe, nombre_informe FROM tipos_informe")
    tipos_informe_data = cursor.fetchall()
    tipo_informe_map = {nombre: tipo_id for tipo_id, nombre in tipos_informe_data}
    if not tipo_informe_map:
        raise ValueError("La tabla 'tipos_informe' está vacía. No se puede continuar.")
    print(f"-> Mapa de 'tipos_informe' cargado ({len(tipo_informe_map)} registros).")

    return institucion_map, tipo_informe_map

def prepare_informes_data(df, institucion_map, tipo_informe_map):
    """
    Prepara la lista de tuplas para la inserción masiva en 'informes'.
    Valida que todas las FKs existan en los mapas.
    """
    print("Preparando datos de 'informes' para inserción...")
    informes_para_insertar = []

    for index, row in df.iterrows():
        # (Regla 1) Mapear nombres a IDs
        institucion_id = institucion_map.get(row['INSTITUCIÓN'])
        tipo_informe_id = tipo_informe_map.get(row['TIPO DE INFORME'])
        
        # === INICIO DE CORRECCIÓN DE BUG DE TIPO ===
        # Convertimos el float 104.0 a int 104 y luego a string '104'
        id_informe_origen = str(int(row['ID']))
        # === FIN DE CORRECCIÓN DE BUG DE TIPO ===
        
        anio_informe = int(row['PERIODO'])
        titulo_informe = row.get('titulo_informe', PLACEHOLDER_MIGRACION)

        # Validación estricta
        if not institucion_id:
            raise ValueError(f"Error en Fila Excel {index+2}: Institución '{row['INSTITUCIÓN']}' no encontrada en la tabla 'instituciones'.")
        if not tipo_informe_id:
            raise ValueError(f"Error en Fila Excel {index+2}: Tipo de Informe '{row['TIPO DE INFORME']}' no encontrado en la tabla 'tipos_informe'.")

        fecha_placeholder = f"{anio_informe}-01-01"
        
        informes_para_insertar.append((
            id_informe_origen,
            institucion_id,
            tipo_informe_id,
            anio_informe,
            titulo_informe,
            fecha_placeholder
        ))

    print(f"-> {len(informes_para_insertar)} registros de 'informes' preparados.")
    return informes_para_insertar

def prepare_recomendaciones_data(df, ssot_id_map):
    """
    Prepara la lista de tuplas para 'recomendaciones' usando el mapa
    de IDs (id_origen -> informe_ssot_id) recién creado.
    """
    print("Preparando datos de 'recomendaciones' (esto puede tardar)...")
    recomendaciones_para_insertar = []

    for index, row in df.iterrows():
        # === INICIO DE CORRECCIÓN DE BUG DE TIPO ===
        # Usamos la misma conversión (float -> int -> string)
        id_informe_origen = str(int(row['ID']))
        # === FIN DE CORRECCIÓN DE BUG DE TIPO ===

        ssot_id = ssot_id_map.get(id_informe_origen)

        if not ssot_id:
            # ESTE MENSAJE AHORA NO DEBERÍA APARECER
            print(f"ADVERTENCIA: Se omitió el informe {id_informe_origen} (no se encontró en el mapa SSOT).", file=sys.stderr)
            continue

        try:
            emitidas = int(row['EMITIDAS'])
            atendidas = int(row['ATENDIDAS'])
            pendientes = emitidas - atendidas
            anio_informe = int(row['PERIODO'])

            if pendientes < 0:
                print(f"ADVERTENCIA: Informe {id_informe_origen} tiene más atendidas ({atendidas}) que emitidas ({emitidas}). Se asumirán 0 pendientes.", file=sys.stderr)
                pendientes = 0
                atendidas = emitidas 

        except ValueError:
            raise ValueError(f"Error en Fila Excel {index+2}: 'EMITIDAS' o 'ATENDIDAS' no son números válidos.")

        fecha_placeholder = f"{anio_informe}-01-01"

        # 1. Generar filas 'Pendiente'
        for _ in range(pendientes):
            recomendaciones_para_insertar.append((
                ssot_id, 'Pendiente', PLACEHOLDER_MIGRACION,
                PLACEHOLDER_MIGRACION, fecha_placeholder
            ))

        # 2. Generar filas 'Atendida'
        for _ in range(atendidas):
            recomendaciones_para_insertar.append((
                ssot_id, 'Atendida', PLACEHOLDER_MIGRACION,
                PLACEHOLDER_MIGRACION, fecha_placeholder
            ))

    print(f"-> {len(recomendaciones_para_insertar)} registros de 'recomendaciones' preparados.")
    return recomendaciones_para_insertar

def main():
    """
    Función principal del ETL.
    """
    conn = None
    cursor = None
    print(f"--- Iniciando Carga Histórica (Fase 2) desde {EXCEL_SOURCE_FILE} (Hoja: {EXCEL_SHEET_NAME}) ---")

    try:
        # 1. Conectar a la Base de Datos
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False 
        cursor = conn.cursor()
        print(f"Conexión establecida a BBDD '{DB_CONFIG['dbname']}' en '{DB_CONFIG['host']}'.")

        # 2. (Regla 1) Obtener mapas de maestras
        institucion_map, tipo_informe_map = fetch_master_data_maps(cursor)

        # 3. Leer EXCEL
        print(f"Leyendo archivo fuente: {EXCEL_SOURCE_FILE}...")
        try:
            df = pd.read_excel(EXCEL_SOURCE_FILE, sheet_name=EXCEL_SHEET_NAME) 
            if df.empty:
                raise ValueError("El archivo Excel está vacío.")
        except FileNotFoundError:
            print(f"Error: No se encontró el archivo {EXCEL_SOURCE_FILE}. El contenedor no lo tiene.", file=sys.stderr)
            return
        except Exception as e:
            print(f"Error al leer el archivo Excel: {e}", file=sys.stderr)
            print(f"Asegúrate de que el archivo no esté corrupto y que la hoja se llame '{EXCEL_SHEET_NAME}'.", file=sys.stderr)
            return
            
        print(f"-> {len(df)} filas leídas del Excel.")


        # --- FASE DE TRANSFORMACIÓN (en memoria) ---
        print("Limpiando datos de Excel (eliminando filas nulas)...")
        
        required_cols = ['ID', 'INSTITUCIÓN', 'TIPO DE INFORME', 'PERIODO', 'EMITIDAS', 'ATENDIDAS']
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Error Crítico: La columna '{col}' no se encontró en el archivo Excel. Revisa los encabezados.")
        
        # --- CORRECCIÓN DE LIMPIEZA ---
        # Antes de dropear, llenamos NaN en las columnas de conteo con 0
        df['EMITIDAS'] = df['EMITIDAS'].fillna(0)
        df['ATENDIDAS'] = df['ATENDIDAS'].fillna(0)

        df_cleaned = df.dropna(subset=['ID', 'INSTITUCIÓN'])
        print(f"-> {len(df_cleaned)} filas válidas encontradas.")


        # 4. Preparar datos de 'informes' (Pase 1)
        informes_para_insertar = prepare_informes_data(df_cleaned, institucion_map, tipo_informe_map)


        # --- FASE DE CARGA (dentro de la transacción) ---

        print("\n--- Iniciando Transacción de Carga ---")
        
        # --- ACCIÓN PREVENTIVA ---
        # Ya que la última carga (fallida) hizo un COMMIT de los informes,
        # los borramos primero para evitar un error de 'ID_INFORME_ORIGEN' duplicado.
        print("Acción preventiva: Limpiando 'informes' de la carga anterior...")
        cursor.execute("TRUNCATE TABLE informes CASCADE")
        # (Usamos CASCADE para limpiar también la tabla 'recomendaciones' por si acaso)
        print("-> Tablas 'informes' y 'recomendaciones' truncadas.")


        # 5. Cargar 'informes' y obtener IDs de vuelta
        print(f"Cargando {len(informes_para_insertar)} registros en 'informes'...")

        query_informes = """
            INSERT INTO informes (
                id_informe_origen, institucion_id, tipo_informe_id,
                anio_informe, titulo_informe, fecha_informe
            )
            VALUES %s
            RETURNING id_informe_origen, informe_ssot_id
        """
        inserted_ids = psycopg2.extras.execute_values(
            cursor,
            query_informes,
            informes_para_insertar,
            template=None,
            fetch=True
        )

        print(f"-> {len(inserted_ids)} 'informes' insertados con éxito.")

        # 6. Crear mapa de IDs (Origen -> Nuevo ID SSOT)
        ssot_id_map = {id_origen: ssot_id for id_origen, ssot_id in inserted_ids}

        # 7. Preparar datos de 'recomendaciones' (Pase 2)
        recomendaciones_para_insertar = prepare_recomendaciones_data(df_cleaned, ssot_id_map)

        if not recomendaciones_para_insertar:
            print("No se generaron recomendaciones. Verifique los totales en el Excel.")
        else:
            # 8. Cargar 'recomendaciones'
            print(f"Cargando {len(recomendaciones_para_insertar)} registros en 'recomendaciones'...")
            query_recs = """
                INSERT INTO recomendaciones (
                    informe_id, estatus, descripcion,
                    area_responsable_atencion, fecha_emision
                )
                VALUES %s
            """
            psycopg2.extras.execute_values(
                cursor,
                query_recs,
                recomendaciones_para_insertar,
                template=None
            )
            print("-> 'recomendaciones' insertadas con éxito.")

        # 9. Si todo salió bien, confirmar la transacción
        conn.commit()
        print("\n--- TRANSACCIÓN COMPLETADA (COMMIT) ---")
        print("Carga histórica finalizada con éxito.")

    except (Exception, psycopg2.Error) as error:
        print(f"\n*** ERROR EN LA TRANSACCIÓN ***: {error}", file=sys.stderr)
        if conn:
            print("Revirtiendo cambios (ROLLBACK)...", file=sys.stderr)
            conn.rollback()
            print("--- TRANSACCIÓN REVERTIDA (ROLLBACK) ---")
        sys.exit(1)

    finally:
        # 10. Cerrar conexiones
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("Conexión a la base de datos cerrada.")


if __name__ == "__main__":
    if DB_CONFIG["host"] == "localhost":
        print("Error: El script está configurado para 'localhost'.", file=sys.stderr)
        print("Debe ejecutarse dentro de Docker para conectarse a 'db'.", file=sys.stderr)
        sys.exit(1)

    main()