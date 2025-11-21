# -----------------------------------------------------------------------------
# SCRIPT DE CARGA HISTORICA SSOT (FASE 2) - VERSION 2 (REMEDIACION)
#
# Autor: SRE
#
# CAMBIOS (v2.0):
# 1. Se anade 'ID ORGANO COLEGIADO' a las columnas requeridas.
# 2. Se lee el 'id_tipo_organo' del Excel.
# 3. Se anade 'id_tipo_organo' a la sentencia INSERT de 'informes'.
# 4. Se actualiza el 'dropna' para incluir la nueva columna.
# -----------------------------------------------------------------------------

import sys
import pandas as pd
import psycopg2
import psycopg2.extras

# --- CONFIGURACION DE CONEXION (PARA EJECUTAR DENTRO DE DOCKER) ---
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

PLACEHOLDER_MIGRACION = 'No Definida (Migracion Historica)'
PLACEHOLDER_FECHA = '1900-01-01'

def fetch_master_data_maps(cursor):
    """
    (Regla 1) Lee las tablas maestras para crear mapas de
    Nombre -> ID y evitar hardcodear llaves foraneas.
    """
    print("Obteniendo mapas de tablas maestras...")

    # 1. Mapa de Instituciones
    cursor.execute("SELECT id_institucion, nombre_institucion FROM instituciones")
    instituciones_data = cursor.fetchall()
    institucion_map = {nombre: inst_id for inst_id, nombre in instituciones_data}
    if not institucion_map:
        raise ValueError("La tabla 'instituciones' esta vacia. No se puede continuar.")
    print(f"-> Mapa de 'instituciones' cargado ({len(institucion_map)} registros).")

    # 2. Mapa de Tipos de Informe
    cursor.execute("SELECT id_tipo_informe, nombre_informe FROM tipos_informe")
    tipos_informe_data = cursor.fetchall()
    tipo_informe_map = {nombre: tipo_id for tipo_id, nombre in tipos_informe_data}
    if not tipo_informe_map:
        raise ValueError("La tabla 'tipos_informe' esta vacia. No se puede continuar.")
    print(f"-> Mapa de 'tipos_informe' cargado ({len(tipo_informe_map)} registros).")

    return institucion_map, tipo_informe_map

def prepare_informes_data(df, institucion_map, tipo_informe_map):
    """
    Prepara la lista de tuplas para la insercion masiva en 'informes'.
    """
    print("Preparando datos de 'informes' para insercion...")
    informes_para_insertar = []

    for index, row in df.iterrows():
        try:
            # (Regla 1) Mapear nombres a IDs
            institucion_id = institucion_map.get(row['INSTITUCIÓN'])
            tipo_informe_id = tipo_informe_map.get(row['TIPO DE INFORME'])

            # (Bug de Tipo Corregido)
            id_informe_origen = str(int(row['ID']))
            
            anio_informe = int(row['PERIODO'])
            titulo_informe = row.get('titulo_informe', PLACEHOLDER_MIGRACION)

            # <<< CAMBIO CLAVE 1: LEER EL ID DEL ORGANO DEL EXCEL >>>
            id_tipo_organo = int(row['ID ÓRGANO COLEGIADO'])
            # <<< FIN DEL CAMBIO >>>

            # Validacion estricta
            if not institucion_id:
                raise ValueError(f"Error en Fila Excel {index+2}: Institucion '{row['INSTITUCIÓN']}' no encontrada.")
            if not tipo_informe_id:
                raise ValueError(f"Error en Fila Excel {index+2}: Tipo de Informe '{row['TIPO DE INFORME']}' no encontrado.")
            if not id_tipo_organo:
                raise ValueError(f"Error en Fila Excel {index+2}: 'ID ÓRGANO COLEGIADO' esta vacio.")

            fecha_placeholder = f"{anio_informe}-01-01"

            # <<< CAMBIO CLAVE 2: ANADIR EL ID DE ORGANO AL TUPLE >>>
            informes_para_insertar.append((
                id_informe_origen,
                institucion_id,
                tipo_informe_id,
                anio_informe,
                titulo_informe,
                fecha_placeholder,
                id_tipo_organo  # <-- La nueva columna
            ))
            # <<< FIN DEL CAMBIO >>>
            
        except Exception as e:
            print(f"Error procesando la fila {index+2} del Excel: {e}", file=sys.stderr)
            print(f"Fila problematica: {row}", file=sys.stderr)
            raise

    print(f"-> {len(informes_para_insertar)} registros de 'informes' preparados.")
    return informes_para_insertar

def prepare_recomendaciones_data(df, ssot_id_map):
    """
    Prepara la lista de tuplas para 'recomendaciones'
    """
    print("Preparando datos de 'recomendaciones'...")
    recomendaciones_para_insertar = []

    for index, row in df.iterrows():
        id_informe_origen = str(int(row['ID']))
        ssot_id = ssot_id_map.get(id_informe_origen)

        if not ssot_id:
            print(f"ADVERTENCIA: Se omitio el informe {id_informe_origen} (no se encontro en el mapa SSOT).", file=sys.stderr)
            continue

        try:
            emitidas = int(row['EMITIDAS'])
            atendidas = int(row['ATENDIDAS'])
            pendientes = emitidas - atendidas
            anio_informe = int(row['PERIODO'])

            if pendientes < 0:
                print(f"ADVERTENCIA: Informe {id_informe_origen} tiene mas atendidas ({atendidas}) que emitidas ({emitidas}). Se asumiran 0 pendientes.", file=sys.stderr)
                pendientes = 0
                atendidas = emitidas

            fecha_placeholder = f"{anio_informe}-01-01"

            # Generar filas 'Pendiente'
            for _ in range(pendientes):
                recomendaciones_para_insertar.append((
                    ssot_id, 'Pendiente', PLACEHOLDER_MIGRACION,
                    PLACEHOLDER_MIGRACION, fecha_placeholder
                ))

            # Generar filas 'Atendida'
            for _ in range(atendidas):
                recomendaciones_para_insertar.append((
                    ssot_id, 'Atendida', PLACEHOLDER_MIGRACION,
                    PLACEHOLDER_MIGRACION, fecha_placeholder
                ))
        except Exception as e:
            print(f"Error procesando recomendaciones para la fila {index+2}: {e}", file=sys.stderr)
            raise

    print(f"-> {len(recomendaciones_para_insertar)} registros de 'recomendaciones' preparados.")
    return recomendaciones_para_insertar

def main():
    """
    Funcion principal del ETL.
    """
    conn = None
    cursor = None
    print(f"--- Iniciando Remediacion de Carga (v2) desde {EXCEL_SOURCE_FILE} ---")

    try:
        # 1. Conectar a la Base de Datos
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False # Transaccion ATOMICA
        cursor = conn.cursor()
        print(f"Conexion establecida a BBDD '{DB_CONFIG['dbname']}' en '{DB_CONFIG['host']}'.")

        # 2. (Regla 1) Obtener mapas de maestras
        institucion_map, tipo_informe_map = fetch_master_data_maps(cursor)

        # 3. Leer EXCEL
        print(f"Leyendo archivo fuente: {EXCEL_SOURCE_FILE}...")
        try:
            df = pd.read_excel(EXCEL_SOURCE_FILE, sheet_name=EXCEL_SHEET_NAME)
            if df.empty:
                raise ValueError("El archivo Excel esta vacio.")
        except FileNotFoundError:
            print(f"Error: No se encontro el archivo {EXCEL_SOURCE_FILE}. El contenedor no lo tiene.", file=sys.stderr)
            return
        except Exception as e:
            print(f"Error al leer el archivo Excel: {e}", file=sys.stderr)
            return

        print(f"-> {len(df)} filas leidas del Excel.")

        # --- FASE DE TRANSFORMACION (en memoria) ---
        print("Limpiando datos de Excel...")

        # <<< CAMBIO CLAVE 3: ANADIR LA COLUMNA A LA VALIDACION >>>
        required_cols = [
            'ID', 'INSTITUCIÓN', 'TIPO DE INFORME', 'PERIODO',
            'EMITIDAS', 'ATENDIDAS', 'ID ÓRGANO COLEGIADO'
        ]
        # <<< FIN DEL CAMBIO >>>
        
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Error Critico: La columna '{col}' no se encontro en el archivo Excel.")

        # Limpieza de nulos
        df['EMITIDAS'] = df['EMITIDAS'].fillna(0)
        df['ATENDIDAS'] = df['ATENDIDAS'].fillna(0)
        
        # <<< CAMBIO CLAVE 4: ANADIR LA COLUMNA AL 'DROPNA' >>>
        df_cleaned = df.dropna(subset=['ID', 'INSTITUCIÓN', 'ID ÓRGANO COLEGIADO'])
        # <<< FIN DEL CAMBIO >>>
        
        print(f"-> {len(df_cleaned)} filas validas encontradas.")

        # 4. Preparar datos de 'informes' (Pase 1)
        informes_para_insertar = prepare_informes_data(df_cleaned, institucion_map, tipo_informe_map)

        # --- FASE DE CARGA (dentro de la transaccion) ---
        print("\n--- Iniciando Transaccion de Carga ---")

        # --- ¡ACCION CONTROLADA! ---
        # El TRUNCATE es la clave de la remediacion.
        # Borrara los 105 informes "malos" (y sus 317 recomendaciones huerfanas).
        print("Accion de Remediacion: Limpiando datos de la carga anterior...")
        cursor.execute("TRUNCATE TABLE informes CASCADE")
        print("-> Tablas 'informes' y 'recomendaciones' truncadas (listas para recarga).")

        # 5. Cargar 'informes' y obtener IDs de vuelta
        print(f"Cargando {len(informes_para_insertar)} registros en 'informes' (Version Corregida)...")

        # <<< CAMBIO CLAVE 5: ANADIR LA COLUMNA AL INSERT SQL >>>
        query_informes = """
            INSERT INTO informes (
                id_informe_origen, institucion_id, tipo_informe_id,
                anio_informe, titulo_informe, fecha_informe,
                id_tipo_organo
            )
            VALUES %s
            RETURNING id_informe_origen, informe_ssot_id
        """
        # <<< FIN DEL CAMBIO >>>

        inserted_ids = psycopg2.extras.execute_values(
            cursor,
            query_informes,
            informes_para_insertar,
            template=None,
            fetch=True
        )

        print(f"-> {len(inserted_ids)} 'informes' insertados con exito (con ID de Organo).")

        # 6. Crear mapa de IDs (Origen -> Nuevo ID SSOT)
        ssot_id_map = {id_origen: ssot_id for id_origen, ssot_id in inserted_ids}

        # 7. Preparar datos de 'recomendaciones' (Pase 2)
        recomendaciones_para_insertar = prepare_recomendaciones_data(df_cleaned, ssot_id_map)

        if not recomendaciones_para_insertar:
            print("No se generaron recomendaciones.")
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
            print("-> 'recomendaciones' insertadas con exito.")

        # 9. Si todo salio bien, confirmar la transaccion
        conn.commit()
        print("\n--- TRANSACCION COMPLETADA (COMMIT) ---")
        print("Remediacion de carga historica finalizada con exito.")

    except (Exception, psycopg2.Error) as error:
        print(f"\n*** ERROR EN LA TRANSACCION ***: {error}", file=sys.stderr)
        if conn:
            print("Revirtiendo cambios (ROLLBACK)...", file=sys.stderr)
            conn.rollback()
            print("--- TRANSACCION REVERTIDA (ROLLBACK) ---")
        sys.exit(1)

    finally:
        # 10. Cerrar conexiones
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("Conexion a la base de datos cerrada.")


if __name__ == "__main__":
    main()