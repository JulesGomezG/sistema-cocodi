from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import psycopg2
import psycopg2.extras
from werkzeug.utils import secure_filename
import datetime
import traceback
import pandas as pd
import json
import re
import math
from datetime import date

# --- CONFIGURACIÓN DE LA APP ---
app = Flask(__name__, static_folder='frontend', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

try:
    # Asegúrate de que 'mapeo_final.json' esté en la misma carpeta que app.py
    with open('mapeo_final.json', 'r', encoding='utf-8') as f:
        mapeo_datos = json.load(f)
    print("✅ Diccionario de mapeo 'mapeo_final.json' cargado correctamente.")
except FileNotFoundError:
    print("⚠️ Error: El archivo 'mapeo_final.json' no se encontró. La carga masiva fallará.")
    mapeo_datos = {}

def get_db_connection():
    """Crea una conexión a la base de datos."""
    return psycopg2.connect(os.environ.get('DATABASE_URL'))

# =============================================================
# ENDPOINTS PARA SERVIR EL FRONTEND
# =============================================================
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_frontend_files(path):
    full_path = os.path.join(app.static_folder, path)
    if os.path.exists(full_path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# =============================================================
# ENDPOINTS PARA MANEJO DE ARCHIVOS (v2.0 AJUSTADO)
# =============================================================
@app.route('/api/upload', methods=['POST'])
def upload_file():
    files = request.files.getlist('files')
    if not files or files[0].filename == '':
        return jsonify({"error": "No se encontraron archivos"}), 400

    parent_type = request.form.get('parent_type')
    parent_id = request.form.get('parent_id', type=int)

    if not parent_type or not parent_id:
        return jsonify({"error": "Faltan datos para la carga"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            new_ids = []
            for file in files:
                if file:
                    filename = secure_filename(file.filename)
                    target_folder = os.path.join(app.config['UPLOAD_FOLDER'], parent_type)
                    os.makedirs(target_folder, exist_ok=True)
                    file_path = os.path.join(target_folder, filename)
                    file.save(file_path)
                    relative_path = os.path.join(parent_type, filename).replace("\\", "/")
                    sql = "INSERT INTO evidencias (parent_id, parent_type, nombre_archivo, url_almacenamiento) VALUES (%s, %s, %s, %s) RETURNING id_evidencia;"
                    cur.execute(sql, (parent_id, parent_type, filename, relative_path))
                    new_id = cur.fetchone()[0]
                    new_ids.append(new_id)
            conn.commit()
    finally:
        conn.close()
    return jsonify({"message": "Archivos subidos", "id_evidencias": new_ids}), 201

@app.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    return send_from_directory(os.path.abspath(app.config['UPLOAD_FOLDER']), filename)

@app.route('/api/evidencias', methods=['GET'])
def obtener_evidencias():
    parent_type = request.args.get('parent_type')
    parent_id = request.args.get('parent_id', type=int)
    if not parent_type or not parent_id:
        return jsonify({"error": "Faltan parámetros"}), 400
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT * FROM evidencias WHERE parent_type = %s AND parent_id = %s AND activo = TRUE;", (parent_type, parent_id))
            evidencias = [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify(evidencias)


def construir_mapeo_oficial(cur):
    """
    Construye los diccionarios de mapeo desde la BD, con claves 'sanitizadas'
    para ser inmune a espacios extra o caracteres invisibles.
    """
    mapeo = {'instituciones': {}, 'organos': {}, 'tipos_informe': {}}
    
    # Mapeo de Instituciones
    cur.execute("SELECT id_institucion, nombre_institucion FROM instituciones;")
    for id_inst, nombre_inst in cur.fetchall():
        if nombre_inst:
            nombre_sanitizado = re.sub(r'\s+', ' ', nombre_inst.replace('\xa0', ' ')).strip().upper()
            mapeo['instituciones'][nombre_sanitizado] = {'id': id_inst, 'nombre_oficial': nombre_inst}

    # Mapeo de Órganos
    cur.execute("SELECT id_tipo_organo, nombre FROM tipos_organo_gobierno;")
    for id_org, nombre_org in cur.fetchall():
        if nombre_org:
            nombre_sanitizado = re.sub(r'\s+', ' ', nombre_org.replace('\xa0', ' ')).strip().upper()
            mapeo['organos'][nombre_sanitizado] = {'id': id_org, 'nombre_oficial': nombre_org}

    # NUEVO: Mapeo de Tipos de Informe
    cur.execute("SELECT id_tipo_informe, nombre_informe FROM tipos_informe;")
    for id_tipo, nombre_tipo in cur.fetchall():
        if nombre_tipo:
            nombre_sanitizado = re.sub(r'\s+', ' ', nombre_tipo.replace('\xa0', ' ')).strip().upper()
            mapeo['tipos_informe'][nombre_sanitizado] = {'id': id_tipo, 'nombre_oficial': nombre_tipo}
            
    print("✅ Diccionario de mapeo oficial y sanitizado (instituciones, organos, tipos_informe) construido desde la BD.")
    return mapeo

# =============================================================
# ENDPOINTS PARA CARGA MASIVA DE DATOS (HISTÓRICOS)
# =============================================================

def process_sesiones_file(cur, file, mapeo_datos):
    """
    Procesa, valida e inserta los datos del archivo de sesiones.
    VERSIÓN REFACTORIZADA (FASE A - PASO 2):
    1. Añade validación explícita de columnas requeridas ANTES de usarlas.
    """
    filename = file.filename.lower()
    try:
        if filename.endswith('.xlsx'):
            df = pd.read_excel(file)
        elif filename.endswith('.csv'):
            df = pd.read_csv(file, encoding='latin-1')
        else:
            return {"status": "error", "message": "Formato de archivo no soportado. Por favor, suba un .xlsx o .csv"}
    except Exception as e:
        return {"status": "error", "message": f"Error al leer el archivo: {str(e)}"}

    # Sanitizar columnas PRIMERO
    df.columns = [str(col).strip().upper() for col in df.columns]

    # --- INICIO DE CORRECCIÓN (FASE A, PASO 2) ---
    # Validar que las columnas que USAREMOS existan después de la sanitización
    columnas_requeridas = ['INSTITUCIÓN', 'TIPO DE ÓRGANO COLEGIADO', 'FECHA', 'AÑO']
    columnas_faltantes = [col for col in columnas_requeridas if col not in df.columns]
    
    if columnas_faltantes:
        return {"status": "error", "message": f"El archivo de sesiones no es válido. Faltan las siguientes columnas: {', '.join(columnas_faltantes)}"}
    # --- FIN DE CORRECCIÓN ---

    # Ahora podemos usar 'drop_duplicates' y acceder a las columnas con seguridad
    df = df[~(df['INSTITUCIÓN'] == 'INSTITUCIÓN')]
    df.drop_duplicates(subset=['INSTITUCIÓN', 'TIPO DE ÓRGANO COLEGIADO', 'FECHA'], keep='first', inplace=True)
    df.reset_index(drop=True, inplace=True)

    for index, row in df.iterrows():
        try:
            # --- INICIO DE CORRECCIÓN (FASE A, PASO 2): Validar NaT / NaN ---
            # (Aplicamos la misma lógica de 'informes' para robustez)
            nombre_inst_val = row['INSTITUCIÓN']
            nombre_org_val = row['TIPO DE ÓRGANO COLEGIADO']
            fecha_val = row['FECHA']
            año_val = row['AÑO']

            if pd.isna(nombre_inst_val) or pd.isna(nombre_org_val) or pd.isna(fecha_val) or pd.isna(año_val):
                raise ValueError("La fila contiene celdas vacías en columnas clave (Institución, Órgano, Fecha o Año).")
            
            nombre_inst_raw = str(nombre_inst_val)
            nombre_org_raw = str(nombre_org_val)
            # --- FIN DE CORRECCIÓN ---
            
            nombre_inst_sanitizado = re.sub(r'\s+', ' ', nombre_inst_raw.replace('\xa0', ' ')).strip().upper()
            nombre_org_sanitizado = re.sub(r'\s+', ' ', nombre_org_raw.replace('\xa0', ' ')).strip().upper()

            institucion_mapeada = mapeo_datos['instituciones'].get(nombre_inst_sanitizado)
            organo_mapeado = mapeo_datos['organos'].get(nombre_org_sanitizado)

            if not institucion_mapeada or not organo_mapeado:
                raise ValueError(f"No se encontró un catálogo oficial para: '{nombre_inst_raw}' | '{nombre_org_raw}'.")

            id_institucion = institucion_mapeada['id']
            id_tipo_organo = organo_mapeado['id']
            
            sql_check = "SELECT 1 FROM institucion_organos WHERE id_institucion = %s AND id_tipo_organo = %s"
            cur.execute(sql_check, (id_institucion, id_tipo_organo))
            if cur.fetchone() is None:
                raise ValueError(f"La combinación '{institucion_mapeada['nombre_oficial']}' y '{organo_mapeado['nombre_oficial']}' no es válida.")

            tipo_sesion_str = str(row.get('TIPO DE SESIÓN', '')).strip().upper()
            id_tipo_sesion = 2 if 'EXTRAORDINARIA' in tipo_sesion_str else 1
            
            fecha_sesion = pd.to_datetime(fecha_val).strftime('%Y-%m-%d')
            
            nombre_oficial = f"Sesión Histórica - {tipo_sesion_str.title() if tipo_sesion_str else 'N/A'}"
            
            sql_insert = """
                INSERT INTO sesiones (id_institucion, id_tipo_organo, id_tipo_sesion, fecha_realizada, año, estatus, usuario_creacion, nombre_oficial_sesion)
                VALUES (%s, %s, %s, %s, %s, 'Realizada', 'carga_masiva', %s);
            """
            cur.execute(sql_insert, (id_institucion, id_tipo_organo, id_tipo_sesion, fecha_sesion, int(año_val), nombre_oficial))

        except Exception as e:
            return {"status": "error", "message": f"Error en la fila {index + 2}: {str(e)}"}
    
    return {"status": "success", "message": f"Se procesaron e insertaron {len(df)} registros de sesiones."}



# (Asegúrate de tener 'import pandas as pd' al inicio de tu app.py)
def process_informes_file(cur, file, mapeo_datos):
    """
    Procesa, valida e inserta los datos del archivo de informes.
    VERSIÓN REFACTORIZADA SSOT (FASE A - v3):
    1. Añade validación pd.isna() para manejar celdas vacías ('NaT' / 'NaN').
    2. Inserta el informe "padre" sin los totales.
    3. Captura el 'informe_ssot_id' retornado.
    4. Inserta 'N' recomendaciones "hijo" (atendidas y pendientes).
    """
    filename = file.filename.lower()
    try:
        if filename.endswith('.xlsx'):
            df = pd.read_excel(file)
        elif filename.endswith('.csv'):
            df = pd.read_csv(file, encoding='latin-1')
        else:
            return {"status": "error", "message": "Formato de archivo no soportado. Por favor, suba un .xlsx o .csv"}
    except Exception as e:
        return {"status": "error", "message": f"Error al leer el archivo: {str(e)}"}

    df.columns = [str(col).strip().upper() for col in df.columns]
    df.reset_index(drop=True, inplace=True)
    
    REC_PLACEHOLDER_DESC = "N/A"
    REC_PLACEHOLDER_AREA = "N/A"

    sql_insert_rec = """
        INSERT INTO recomendaciones (
            informe_id, id_institucion, id_tipo_organo,
            descripcion, area_responsable_atencion, estatus,
            usuario_creacion
        ) VALUES (%s, %s, %s, %s, %s, %s, 'carga_masiva');
    """

    registros_procesados = 0
    recomendaciones_creadas = 0

    for index, row in df.iterrows():
        try:
            # --- INICIO DE CORRECCIÓN (v3): Validar NaT / NaN ---
            institucion_val = row['INSTITUCIÓN']
            tipo_informe_val = row['TIPO DE INFORME']
            id_organo_val = row['ID ÓRGANO COLEGIADO']
            periodo_val = row['PERIODO']
            fecha_val = row['FECHA']
            
            if pd.isna(institucion_val):
                raise ValueError("La columna 'INSTITUCIÓN' está vacía o es inválida.")
            if pd.isna(tipo_informe_val):
                raise ValueError("La columna 'TIPO DE INFORME' está vacía o es inválida.")
            if pd.isna(id_organo_val):
                 raise ValueError("La columna 'ID ÓRGANO COLEGIADO' está vacía o es inválida.")
            if pd.isna(periodo_val):
                 raise ValueError("La columna 'PERIODO' está vacía o es inválida.")
            if pd.isna(fecha_val):
                 raise ValueError("La columna 'FECHA' está vacía o es inválida.")
            
            institucion_nombre_raw = str(institucion_val)
            tipo_informe_raw = str(tipo_informe_val)
            # --- FIN DE CORRECCIÓN (v3) ---

            institucion_sanitizada = re.sub(r'\s+', ' ', institucion_nombre_raw.replace('\xa0', ' ')).strip().upper()
            tipo_informe_sanitizado = re.sub(r'\s+', ' ', tipo_informe_raw.replace('\xa0', ' ')).strip().upper()

            institucion_mapeada = mapeo_datos['instituciones'].get(institucion_sanitizada)
            tipo_informe_mapeado = mapeo_datos['tipos_informe'].get(tipo_informe_sanitizado)
            
            if not institucion_mapeada:
                raise ValueError(f"No se encontró un catálogo oficial para la institución: '{institucion_nombre_raw}'.")
            if not tipo_informe_mapeado:
                raise ValueError(f"No se encontró un catálogo oficial para el tipo de informe: '{tipo_informe_raw}'.")

            id_institucion = institucion_mapeada['id']
            id_tipo_informe = tipo_informe_mapeado['id']
            id_tipo_organo = int(id_organo_val)

            cur.execute("SELECT 1 FROM institucion_organos WHERE id_institucion = %s AND id_tipo_organo = %s", (id_institucion, id_tipo_organo))
            if cur.fetchone() is None:
                raise ValueError(f"La combinación de la institución '{institucion_mapeada['nombre_oficial']}' y el órgano ID '{id_tipo_organo}' no es un vínculo válido.")
            
            periodo_int = int(periodo_val)
            periodo_str = str(periodo_int)
            fecha_informe = pd.to_datetime(fecha_val).strftime('%Y-%m-%d')
            
            emitidas = int(row.get('EMITIDAS', 0))
            atendidas = int(row.get('ATENDIDAS', 0))
            pendientes = max(0, emitidas - atendidas)
            periodicidad_placeholder = 'No especificado' 

            sql_insert_informe = """
                INSERT INTO informes (
                    institucion_id, id_tipo_organo, tipo_informe_id, 
                    anio_informe, periodo_reportado, fecha_informe, 
                    usuario_creacion, periodicidad
                ) VALUES (%s, %s, %s, %s, %s, %s, 'carga_masiva', %s)
                RETURNING informe_ssot_id;
            """
            
            cur.execute(sql_insert_informe, (
                id_institucion, id_tipo_organo, id_tipo_informe,
                periodo_int, periodo_str, fecha_informe,
                periodicidad_placeholder
            ))
            
            new_informe_id = cur.fetchone()[0]
            
            for _ in range(atendidas):
                cur.execute(sql_insert_rec, (
                    new_informe_id, id_institucion, id_tipo_organo,
                    REC_PLACEHOLDER_DESC, REC_PLACEHOLDER_AREA, 'Atendida'
                ))
            
            for _ in range(pendientes):
                cur.execute(sql_insert_rec, (
                    new_informe_id, id_institucion, id_tipo_organo,
                    REC_PLACEHOLDER_DESC, REC_PLACEHOLDER_AREA, 'Pendiente'
                ))

            registros_procesados += 1
            recomendaciones_creadas += (atendidas + pendientes)

        except Exception as e:
            return {"status": "error", "message": f"Error en la fila {index + 2} del archivo de informes: {str(e)}"}
    
    return {"status": "success", "message": f"Se procesaron {registros_procesados} informes, creando un total de {recomendaciones_creadas} recomendaciones."}
    
@app.route('/api/bulk-upload', methods=['POST'])
def bulk_upload_file():
    print("\n---[DEBUG] INICIANDO RUTA /api/bulk-upload ---", flush=True)

    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No se encontró el archivo en la petición (llave 'file')"}), 400
    
    file = request.files['file']
    upload_type = request.form.get('type')

    if file.filename == '':
        return jsonify({"status": "error", "message": "El nombre del archivo está vacío"}), 400

    if upload_type not in ['sesiones', 'informes']:
        return jsonify({"status": "error", "message": f"Tipo de carga no válido o no especificado. Se recibió: '{upload_type}'"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            mapeo_datos = construir_mapeo_oficial(cur)
            
            if upload_type == 'sesiones':
                # Pasamos el objeto 'file' completo
                result = process_sesiones_file(cur, file, mapeo_datos)
            else:
                # Pasamos el objeto 'file' completo
                result = process_informes_file(cur, file, mapeo_datos)

            if result['status'] == 'error':
                conn.rollback()
                return jsonify(result), 400
            
            conn.commit()
            return jsonify(result), 200

    except Exception as e:
        conn.rollback()
        error_details = traceback.format_exc()
        print(f"Error fatal en bulk_upload_file: {error_details}", flush=True)
        return jsonify({"status": "error", "message": f"Error inesperado en el servidor: {str(e)}"}), 500
    
    finally:
        if conn:
            conn.close()
            
            
# =============================================================
# ENDPOINTS DE CATÁLOGOS
# =============================================================

@app.route('/api/responsables', methods=['GET'])
def obtener_responsables():
    id_ramo = request.args.get('id_ramo', type=int)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # Si se proporciona un id_ramo, se filtran los responsables
            if id_ramo:
                sql = """
                    SELECT DISTINCT r.id_responsable, r.nombre 
                    FROM responsables r
                    JOIN instituciones i ON r.id_responsable = i.id_responsable
                    WHERE i.id_ramo = %s AND r.activo = TRUE 
                    ORDER BY r.nombre;
                """
                cur.execute(sql, (id_ramo,))
            else:
                # Si no, se obtienen todos como antes
                sql = 'SELECT id_responsable, nombre FROM responsables WHERE activo = TRUE ORDER BY nombre;'
                cur.execute(sql)
            
            responsables = [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify(responsables)

@app.route('/api/instituciones', methods=['GET'])
def obtener_instituciones():
    id_dg = request.args.get('id_dg', type=int)
    id_ramo = request.args.get('id_ramo', type=int)
    responsable_id = request.args.get('responsable_id', type=int)
    
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # La consulta ahora une todas las tablas necesarias para filtrar
            sql = """
                SELECT 
                    i.id_institucion, i.siglas, UPPER(i.nombre_institucion) as nombre_institucion,
                    r.id_ramo, r.nombre_ramo,
                    d.id_dg, d.nombre_dg,
                    n.id_naturaleza, n.nombre as nombre_naturaleza,
                    njd.id_naturaleza_juridica, njd.nombre as nombre_naturaleza_juridica,
                    resp.id_responsable, resp.nombre as nombre_responsable
                FROM instituciones i
                JOIN responsables resp ON i.id_responsable = resp.id_responsable
                JOIN ramos r ON i.id_ramo = r.id_ramo
                JOIN dgs d ON r.id_dg = d.id_dg
                JOIN naturalezas n ON i.id_naturaleza = n.id_naturaleza
                JOIN naturalezas_juridicas_desglose njd ON i.id_naturaleza_juridica = njd.id_naturaleza_juridica
            """
            params = []
            where_clauses = ["i.activo = TRUE"]
            
            # Construcción dinámica de la cláusula WHERE
            if id_dg:
                where_clauses.append("d.id_dg = %s")
                params.append(id_dg)
            if id_ramo:
                where_clauses.append("i.id_ramo = %s")
                params.append(id_ramo)
            if responsable_id:
                where_clauses.append("i.id_responsable = %s")
                params.append(responsable_id)

            if len(where_clauses) > 1:
                sql += " WHERE " + " AND ".join(where_clauses)

            sql += " ORDER BY nombre_institucion;"
            
            cur.execute(sql, tuple(params))
            instituciones = [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify(instituciones)

@app.route('/api/organos-colegiados', methods=['GET'])
def obtener_organos_filtrados():
    institucion_id = request.args.get('institucion_id', type=int)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            if institucion_id:
                # --- INICIO DE LA CORRECCIÓN ---
                # Se añaden los alias 'AS' para que los nombres de las columnas coincidan con el frontend
                sql = """
                    SELECT
                        t2.id_tipo_organo AS id_organo_colegiado,
                        t2.nombre AS nombre_organo,
                        t2.id_padre 
                    FROM institucion_organos AS t1 
                    JOIN tipos_organo_gobierno AS t2 ON t1.id_tipo_organo = t2.id_tipo_organo 
                    WHERE t1.id_institucion = %s ORDER BY t2.nombre;
                """
                # --- FIN DE LA CORRECCIÓN ---
                cur.execute(sql, (institucion_id,))
            else:
                # --- INICIO DE LA CORRECCIÓN ---
                # También se añaden alias a la consulta general para consistencia
                sql = """
                    SELECT
                        id_tipo_organo AS id_organo_colegiado,
                        nombre AS nombre_organo,
                        id_padre
                    FROM tipos_organo_gobierno
                    WHERE activo = TRUE ORDER BY nombre;
                """
                # --- FIN DE LA CORRECCIÓN ---
                cur.execute(sql)
            organos = [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify(organos)

@app.route('/api/tipos-informe', methods=['GET'])
def obtener_tipos_informe():
    """
    Obtiene el catálogo de tipos de informe válidos para una institución específica,
    consultando la tabla de vinculación 'institucion_tipo_informe_valido'.
    Requiere el parámetro 'id_institucion'.
    """
    id_institucion = request.args.get('id_institucion', type=int)

    # Validación del parámetro obligatorio
    if id_institucion is None:
        return jsonify({"error": "El parámetro 'id_institucion' es requerido."}), 400

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # Consulta que une la tabla de vínculo con la tabla de tipos de informe
            sql = """
                SELECT
                    ti.id_tipo_informe,
                    ti.nombre_informe
                FROM institucion_tipo_informe_valido itiv
                JOIN tipos_informe ti ON itiv.id_tipo_informe = ti.id_tipo_informe
                WHERE itiv.id_institucion = %s AND ti.activo = TRUE
                ORDER BY ti.nombre_informe;
            """
            cur.execute(sql, (id_institucion,))
            items = [dict(row) for row in cur.fetchall()]

    except Exception as e:
        # Asegúrate de tener 'import traceback' al inicio de tu app.py
        import traceback
        print(f"Error en obtener_tipos_informe: {traceback.format_exc()}")
        return jsonify({"error": "Error interno del servidor al buscar tipos de informe."}), 500
    finally:
        if conn:
            conn.close()

    return jsonify(items)
    
# =============================================================
# NUEVOS ENDPOINTS DE CATÁLOGOS (v2.0)
# =============================================================

@app.route('/api/dgs', methods=['GET'])
def obtener_dgs():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute('SELECT * FROM dgs WHERE activo = TRUE ORDER BY nombre_dg;')
            items = [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify(items)

@app.route('/api/ramos', methods=['GET'])
def obtener_ramos():
    id_dg = request.args.get('id_dg', type=int)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            sql = 'SELECT * FROM ramos WHERE activo = TRUE'
            params = []
            if id_dg:
                sql += ' AND id_dg = %s'
                params.append(id_dg)
            sql += ' ORDER BY nombre_ramo;'
            cur.execute(sql, params)
            items = [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify(items)

@app.route('/api/naturalezas', methods=['GET'])
def obtener_naturalezas():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute('SELECT * FROM naturalezas ORDER BY nombre;')
            items = [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify(items)

@app.route('/api/naturalezas-juridicas', methods=['GET'])
def obtener_naturalezas_juridicas():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute('SELECT * FROM naturalezas_juridicas_desglose WHERE activo = TRUE ORDER BY nombre;')
            items = [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify(items)





# =============================================================
# Endpoint para el Dashboard DETALLADO (CORREGIDO v7: SQL Completo en AMBOS modos)
@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    conn = None
    try:
        conn = get_db_connection()
        año = request.args.get('año', default=datetime.date.today().year, type=int)
        año_str = str(año)
        filter_dg_id = request.args.get('id_dg', type=int)
        filter_ramo_id = request.args.get('id_ramo', type=int)
        filter_responsable_id = request.args.get('responsable_id', type=int)
        filter_institucion_id = request.args.get('institucion_id', type=int)

        if not filter_dg_id or not año:
            return jsonify({"error": "Se requiere seleccionar Año y DG."}), 400

        dashboard_data = {}

        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # --- Base Query (Contexto General) ---
            base_joins = """
                FROM instituciones i
                JOIN ramos r ON i.id_ramo = r.id_ramo
                JOIN dgs d ON r.id_dg = d.id_dg
                LEFT JOIN responsables resp ON i.id_responsable = resp.id_responsable
            """
            where_conditions = ["i.activo = TRUE", "d.id_dg = %s"]
            where_params = [filter_dg_id]
            
            if filter_ramo_id: where_conditions.append("r.id_ramo = %s"); where_params.append(filter_ramo_id)
            if filter_responsable_id: where_conditions.append("i.id_responsable = %s"); where_params.append(filter_responsable_id)
            if filter_institucion_id: where_conditions.append("i.id_institucion = %s"); where_params.append(filter_institucion_id)
            
            where_string = " AND ".join(where_conditions)
            cte_instituciones_filtradas = f"WITH InstitucionesFiltradas AS (SELECT i.id_institucion, i.nombre_institucion, r.nombre_ramo {base_joins} WHERE {where_string})"
            base_params_tuple = tuple(where_params)

            # === KPIs Principales ===
            sql_kpi_sesiones = f"""
                {cte_instituciones_filtradas}
                SELECT
                    COUNT(CASE WHEN s.id_tipo_sesion = 1 THEN 1 END) as ordinarias_realizadas,
                    COUNT(CASE WHEN s.id_tipo_sesion = 2 THEN 1 END) as extraordinarias_realizadas
                FROM sesiones s
                WHERE s.id_institucion IN (SELECT id_institucion FROM InstitucionesFiltradas)
                    AND s.año = %s AND s.estatus = 'Realizada' AND s.activo = TRUE;
            """
            cur.execute(sql_kpi_sesiones, base_params_tuple + (año,))
            kpi_sesiones_data = cur.fetchone()
            dashboard_data['kpi_total_sesiones_ordinarias'] = kpi_sesiones_data['ordinarias_realizadas'] or 0
            dashboard_data['kpi_total_sesiones_extraordinarias'] = kpi_sesiones_data['extraordinarias_realizadas'] or 0

            # KPI Recomendaciones
            sql_kpi_recs = f"""
                {cte_instituciones_filtradas}
                , RealRecs AS (
                    SELECT 
                        COUNT(CASE WHEN estatus IN ('Completada', 'Cerrada', 'Atendida') THEN 1 END) as atendidas, 
                        COUNT(*) as emitidas 
                    FROM recomendaciones
                    WHERE id_institucion IN (SELECT id_institucion FROM InstitucionesFiltradas) 
                    AND activo = TRUE
                )
                SELECT atendidas as total_atendidas, emitidas as total_emitidas FROM RealRecs;
            """
            cur.execute(sql_kpi_recs, base_params_tuple)
            kpi_recs_data = cur.fetchone()
            total_emitidas = kpi_recs_data['total_emitidas'] or 0
            total_atendidas = kpi_recs_data['total_atendidas'] or 0
            dashboard_data['kpi_avance_recomendaciones_pct'] = round((total_atendidas / total_emitidas * 100) if total_emitidas > 0 else 0, 2)
            dashboard_data['kpi_recs_atendidas'] = total_atendidas
            dashboard_data['kpi_recs_emitidas'] = total_emitidas

            # === ALERTA FOCOS ROJOS ===
            sql_focos_rojos = f"""
                {cte_instituciones_filtradas}
                , InstConSesiones AS (
                    SELECT DISTINCT id_institucion 
                    FROM sesiones 
                    WHERE año = %s AND id_tipo_sesion = 1 AND estatus = 'Realizada' AND activo = TRUE
                )
                , InstConInformes AS (
                    SELECT DISTINCT institucion_id 
                    FROM informes 
                    WHERE periodo_reportado = %s AND activo = TRUE
                )
                SELECT nombre_institucion, nombre_ramo 
                FROM InstitucionesFiltradas
                WHERE id_institucion NOT IN (SELECT id_institucion FROM InstConSesiones)
                  AND id_institucion NOT IN (SELECT institucion_id FROM InstConInformes)
                ORDER BY nombre_ramo, nombre_institucion;
            """
            cur.execute(sql_focos_rojos, base_params_tuple + (año, año_str))
            dashboard_data['tabla_focos_rojos'] = [dict(row) for row in cur.fetchall()]

            

            # === Gráficos de Desglose ===
            sql_sesiones_ord_por_organo = f"""
                {cte_instituciones_filtradas}
                SELECT tog.nombre as tipo_organo, COUNT(s.id_sesion) as sesiones_count
                FROM sesiones s JOIN tipos_organo_gobierno tog ON s.id_tipo_organo = tog.id_tipo_organo
                WHERE s.id_institucion IN (SELECT id_institucion FROM InstitucionesFiltradas)
                    AND s.año = %s AND s.estatus = 'Realizada' AND s.activo = TRUE AND s.id_tipo_sesion = 1
                GROUP BY tog.nombre HAVING COUNT(s.id_sesion) > 0 ORDER BY sesiones_count DESC;
            """
            cur.execute(sql_sesiones_ord_por_organo, base_params_tuple + (año,))
            dashboard_data['grafico_sesiones_ord_por_organo_esp'] = [dict(row) for row in cur.fetchall()]

            sql_sesiones_ext_por_organo = f"""
                {cte_instituciones_filtradas}
                SELECT tog.nombre as tipo_organo, COUNT(s.id_sesion) as sesiones_count
                FROM sesiones s JOIN tipos_organo_gobierno tog ON s.id_tipo_organo = tog.id_tipo_organo
                WHERE s.id_institucion IN (SELECT id_institucion FROM InstitucionesFiltradas)
                    AND s.año = %s AND s.estatus = 'Realizada' AND s.activo = TRUE AND s.id_tipo_sesion = 2
                GROUP BY tog.nombre HAVING COUNT(s.id_sesion) > 0 ORDER BY sesiones_count DESC;
            """
            cur.execute(sql_sesiones_ext_por_organo, base_params_tuple + (año,))
            dashboard_data['grafico_sesiones_ext_por_organo_esp'] = [dict(row) for row in cur.fetchall()]

            sql_grafico_informes = f"""
                {cte_instituciones_filtradas}
                SELECT ti.nombre_informe AS tipo, COUNT(inf.informe_ssot_id) AS conteo
                FROM informes inf JOIN tipos_informe ti ON inf.tipo_informe_id = ti.id_tipo_informe
                WHERE inf.institucion_id IN (SELECT id_institucion FROM InstitucionesFiltradas)
                    AND inf.periodo_reportado = %s AND inf.activo = TRUE
                GROUP BY ti.nombre_informe HAVING COUNT(inf.informe_ssot_id) > 0 ORDER BY conteo DESC;
            """
            cur.execute(sql_grafico_informes, base_params_tuple + (año_str,))
            dashboard_data['grafico_informes_por_tipo'] = [dict(row) for row in cur.fetchall()]
            
            sql_grafico_avance_recs = f"""
                {cte_instituciones_filtradas}
                , RealRecs AS (
                    SELECT ti.nombre_informe, COUNT(r.id_recomendacion) as emitidas,
                        COUNT(CASE WHEN r.estatus IN ('Completada', 'Cerrada', 'Atendida') THEN 1 END) as atendidas
                    FROM recomendaciones r JOIN informes i ON r.informe_id = i.informe_ssot_id
                    JOIN tipos_informe ti ON i.tipo_informe_id = ti.id_tipo_informe
                    WHERE r.id_institucion IN (SELECT id_institucion FROM InstitucionesFiltradas) AND r.activo = TRUE
                    GROUP BY ti.nombre_informe
                )
                SELECT nombre_informe, emitidas as total_emitidas, atendidas as total_atendidas FROM RealRecs WHERE emitidas > 0 ORDER BY total_emitidas DESC;
            """
            cur.execute(sql_grafico_avance_recs, base_params_tuple)
            dashboard_data['grafico_avance_recomendaciones_por_tipo'] = [dict(row) for row in cur.fetchall()]
            
            # === AQUÍ ESTÁ LA RECUPERACIÓN DEL BOTÓN COMPARATIVO ===
            # Se ejecuta SOLO si se ha filtrado por Ramo pero NO por Institución específica
            dashboard_data['comparative_stats'] = None
            dashboard_data['institution_comparison_stats'] = None

            if filter_dg_id and filter_ramo_id and not filter_responsable_id and not filter_institucion_id:
                print("Activando Modo Comparativo de Ramo (Sprint 7)...")
                
                # 1. COMPARATIVA DE RESPONSABLES (Delegada vs Comisaria)
                stats_comparativos = {}
                for resp_id in [1, 2]: # 1=Delegada, 2=Comisaria
                    # Usamos CTEs independientes para no mezclar lógicas
                    sql_comp_resp = """
                        WITH InstResp AS (
                            SELECT id_institucion FROM instituciones 
                            WHERE id_ramo = %s AND id_responsable = %s AND activo = TRUE
                        )
                        SELECT
                            (SELECT COUNT(*) FROM sesiones s WHERE s.id_institucion IN (SELECT id_institucion FROM InstResp) AND s.año = %s AND s.id_tipo_sesion = 1 AND s.estatus = 'Realizada' AND s.activo = TRUE) as ords,
                            (SELECT COUNT(*) FROM sesiones s WHERE s.id_institucion IN (SELECT id_institucion FROM InstResp) AND s.año = %s AND s.id_tipo_sesion = 2 AND s.estatus = 'Realizada' AND s.activo = TRUE) as exts,
                            (SELECT COUNT(*) FROM informes i WHERE i.institucion_id IN (SELECT id_institucion FROM InstResp) AND i.periodo_reportado = %s AND i.activo = TRUE) as infs,
                            (SELECT COUNT(*) FROM recomendaciones r WHERE r.id_institucion IN (SELECT id_institucion FROM InstResp) AND r.activo = TRUE) as rec_emit,
                            (SELECT COUNT(*) FROM recomendaciones r WHERE r.id_institucion IN (SELECT id_institucion FROM InstResp) AND r.activo = TRUE AND r.estatus IN ('Completada', 'Cerrada', 'Atendida')) as rec_aten
                    """
                    cur.execute(sql_comp_resp, (filter_ramo_id, resp_id, año, año, año_str))
                    res = cur.fetchone()
                    
                    resp_stats = {
                        'kpi_sesiones_ordinarias': res['ords'],
                        'kpi_sesiones_extraordinarias': res['exts'],
                        'kpi_informes_entregados': res['infs'],
                        'kpi_avance_pct': round((res['rec_aten'] / res['rec_emit'] * 100), 2) if res['rec_emit'] > 0 else 0
                    }
                    stats_comparativos[f"resp_{resp_id}"] = resp_stats
                
                dashboard_data['comparative_stats'] = stats_comparativos

                # 2. COMPARATIVA POR INSTITUCIÓN (Gráficos horizontales)
                sql_inst_comparison = """
                    SELECT 
                        i.id_institucion, i.siglas,
                        -- Sesiones Ordinarias
                        (SELECT COUNT(*) FROM sesiones s WHERE s.id_institucion = i.id_institucion AND s.año = %s AND s.id_tipo_sesion = 1 AND s.estatus = 'Realizada' AND s.activo = TRUE) as sesiones_ordinarias,
                        -- Sesiones Extraordinarias
                        (SELECT COUNT(*) FROM sesiones s WHERE s.id_institucion = i.id_institucion AND s.año = %s AND s.id_tipo_sesion = 2 AND s.estatus = 'Realizada' AND s.activo = TRUE) as sesiones_extraordinarias,
                        -- Informes
                        (SELECT COUNT(*) FROM informes inf WHERE inf.institucion_id = i.id_institucion AND inf.periodo_reportado = %s AND inf.activo = TRUE) as informes_count,
                        -- Recomendaciones (Total histórico para eficiencia)
                        (SELECT COUNT(*) FROM recomendaciones r WHERE r.id_institucion = i.id_institucion AND r.activo = TRUE) as total_emitidas,
                        (SELECT COUNT(*) FROM recomendaciones r WHERE r.id_institucion = i.id_institucion AND r.activo = TRUE AND r.estatus IN ('Completada', 'Cerrada', 'Atendida')) as total_atendidas
                    FROM instituciones i
                    WHERE i.id_ramo = %s AND i.activo = TRUE
                    ORDER BY i.siglas;
                """
                cur.execute(sql_inst_comparison, (año, año, año_str, filter_ramo_id))
                rows = cur.fetchall()
                
                # Post-procesamiento para calcular porcentaje
                comparison_list = []
                for row in rows:
                    item = dict(row)
                    emit = item['total_emitidas']
                    aten = item['total_atendidas']
                    item['recs_avance_pct'] = round((aten / emit * 100), 2) if emit > 0 else 0
                    comparison_list.append(item)
                
                dashboard_data['institution_comparison_stats'] = comparison_list

            return jsonify(dashboard_data)

    except Exception as e:
        print(f"Error en get_dashboard_stats: {traceback.format_exc()}")
        return jsonify({"error": "Error interno"}), 500
    finally:
        if conn: conn.close()
# =============================================================
# FIN DE LA FUNCIÓN
# =============================================================


# --- INICIO: ENDPOINT DASHBOARD GLOBAL (v4 - Añadidos Focos Rojos y Sesiones x Tipo Órgano) ---
# === REFACTORIZADO A SSOT PURO (FASE B - PASO 3.5 - CORRECCIÓN LÓGICA SSOT (JOINs y AÑO)) ===
# =============================================================
# === INICIO DE LA FUNCIÓN CORREGIDA (LÓGICA HÍBRIDA v7 - FINAL) ===
# =============================================================
# --- INICIO: ENDPOINT DASHBOARD GLOBAL (v4 - Añadidos Focos Rojos y Sesiones x Tipo Órgano) ---
# =============================================================
# === [INICIO DE CAMBIO] - Modificación de get_dashboard_global_stats ===
# =============================================================
@app.route('/api/dashboard/global_stats', methods=['GET'])
def get_dashboard_global_stats():
    conn = get_db_connection()
    try:
        año_param = request.args.get('año')
        current_year = int(año_param) if año_param else datetime.date.today().year
        global_data = {}

        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # 0. Obtener DGs (Base para todos los andamiajes)
            cur.execute("SELECT id_dg, siglas_dg FROM dgs WHERE activo = TRUE ORDER BY siglas_dg;")
            all_dgs_dict = {row['id_dg']: dict(row) for row in cur.fetchall()}

            # 1. Distribución (Ya usaba LEFT JOIN, OK)
            cur.execute("""
                SELECT d.id_dg, COUNT(i.id_institucion) as institution_count 
                FROM dgs d 
                LEFT JOIN ramos r ON d.id_dg = r.id_dg 
                LEFT JOIN instituciones i ON r.id_ramo = i.id_ramo AND i.activo = TRUE 
                WHERE d.activo = TRUE 
                GROUP BY d.id_dg;
            """)
            dist_inst_raw = {row['id_dg']: row['institution_count'] for row in cur.fetchall()}
            global_data["distribucion_instituciones_dg"] = [
                {'id_dg': k, 'siglas_dg': v['siglas_dg'], 'institution_count': dist_inst_raw.get(k, 0)} 
                for k, v in all_dgs_dict.items()
            ]

            # 2. Focos Rojos (Ya usaba LEFT JOIN, OK)
            sql_focos_rojos = """
                WITH InstConActividadSesiones AS (
                    SELECT DISTINCT i.id_institucion FROM instituciones i
                    JOIN sesiones s ON i.id_institucion = s.id_institucion
                    WHERE s.año = %s AND s.id_tipo_sesion = 1 AND s.estatus = 'Realizada' AND s.activo = TRUE
                ), InstConActividadInformes AS (
                    SELECT DISTINCT institucion_id FROM informes WHERE periodo_reportado = %s AND activo = TRUE
                )
                SELECT d.id_dg, COUNT(DISTINCT i.id_institucion) as focos_rojos_count
                FROM dgs d
                LEFT JOIN ramos r ON d.id_dg = r.id_dg
                LEFT JOIN instituciones i ON r.id_ramo = i.id_ramo AND i.activo = TRUE
                WHERE d.activo = TRUE
                  AND i.id_institucion NOT IN (SELECT id_institucion FROM InstConActividadSesiones)
                  AND i.id_institucion NOT IN (SELECT institucion_id FROM InstConActividadInformes)
                GROUP BY d.id_dg;
            """
            cur.execute(sql_focos_rojos, (current_year, str(current_year)))
            focos_rojos_raw = {row['id_dg']: row['focos_rojos_count'] for row in cur.fetchall()}
            
            global_data["focos_rojos_dg"] = []
            for dg_id, dg_data in all_dgs_dict.items():
                count = focos_rojos_raw.get(dg_id, 0)
                total = dist_inst_raw.get(dg_id, 0)
                pct = round((count / total * 100), 1) if total > 0 else 0
                global_data["focos_rojos_dg"].append({
                    'id_dg': dg_id, 
                    'siglas_dg': dg_data['siglas_dg'], 
                    'focos_rojos_count': count, 
                    'total_instituciones': total, 
                    'porcentaje_focos_rojos': pct
                })

            # 3. Sesiones Ordinarias (CORREGIDO: LEFT JOIN desde DGs)
            sql_ses = """
                SELECT d.id_dg, COUNT(s.id_sesion) as count 
                FROM dgs d 
                LEFT JOIN ramos r ON d.id_dg = r.id_dg 
                LEFT JOIN instituciones i ON r.id_ramo = i.id_ramo 
                LEFT JOIN sesiones s ON i.id_institucion = s.id_institucion 
                     AND s.año = %s AND s.id_tipo_sesion = 1 AND s.estatus = 'Realizada' AND s.activo = TRUE
                WHERE d.activo = TRUE 
                GROUP BY d.id_dg;
            """
            cur.execute(sql_ses, (current_year,))
            ses_raw = {row['id_dg']: row['count'] for row in cur.fetchall()}
            global_data["sesiones_ordinarias_dg"] = [{'id_dg': k, 'siglas_dg': v['siglas_dg'], 'realizadas_ordinarias_count': ses_raw.get(k, 0)} for k, v in all_dgs_dict.items()]

            # 4. Sesiones Extraordinarias (CORREGIDO: LEFT JOIN desde DGs)
            sql_ext = """
                SELECT d.id_dg, COUNT(s.id_sesion) as count 
                FROM dgs d 
                LEFT JOIN ramos r ON d.id_dg = r.id_dg 
                LEFT JOIN instituciones i ON r.id_ramo = i.id_ramo 
                LEFT JOIN sesiones s ON i.id_institucion = s.id_institucion 
                     AND s.año = %s AND s.id_tipo_sesion = 2 AND s.estatus = 'Realizada' AND s.activo = TRUE
                WHERE d.activo = TRUE 
                GROUP BY d.id_dg;
            """
            cur.execute(sql_ext, (current_year,))
            ext_raw = {row['id_dg']: row['count'] for row in cur.fetchall()}
            global_data["sesiones_extraordinarias_dg"] = [{'id_dg': k, 'siglas_dg': v['siglas_dg'], 'realizadas_extraordinarias_count': ext_raw.get(k, 0)} for k, v in all_dgs_dict.items()]

            # 5. Sesiones por Tipo (REFACTORIZADO: Matriz DG x Grupo)
            # Generamos una matriz de TODAS las DGs contra TODOS los grupos de órganos
            # AHORA INCLUYE DESGLOSE POR TIPO DE SESIÓN (Ord vs Ext)
            sql_ses_tipo = """
                WITH GruposOrgano AS (
                    SELECT 'COCODI' as grupo UNION SELECT 'Órgano de Gobierno' UNION SELECT 'Otros Órganos Colegiados'
                ),
                Matriz AS (
                    SELECT d.id_dg, d.siglas_dg, g.grupo 
                    FROM dgs d CROSS JOIN GruposOrgano g
                    WHERE d.activo = TRUE
                ),
                SesionesFiltradas AS (
                    SELECT d.id_dg, 
                           CASE 
                               WHEN s.id_tipo_organo = 1 THEN 'COCODI'
                               WHEN s.id_tipo_organo = 2 THEN 'Órgano de Gobierno'
                               ELSE 'Otros Órganos Colegiados'
                           END as grupo,
                           s.id_sesion,
                           s.id_tipo_sesion -- NECESARIO PARA EL CONTEO CONDICIONAL
                    FROM sesiones s
                    JOIN instituciones i ON s.id_institucion = i.id_institucion
                    JOIN ramos r ON i.id_ramo = r.id_ramo
                    JOIN dgs d ON r.id_dg = d.id_dg
                    WHERE s.año = %s AND s.estatus = 'Realizada' AND s.activo = TRUE
                )
                SELECT 
                    m.id_dg, m.siglas_dg, m.grupo as tipo_organo_agrupado, 
                    COUNT(sf.id_sesion) as sesiones_count, -- Total
                    COUNT(CASE WHEN sf.id_tipo_sesion = 1 THEN 1 END) as sesiones_ord_count, -- Ordinarias
                    COUNT(CASE WHEN sf.id_tipo_sesion = 2 THEN 1 END) as sesiones_ext_count  -- Extraordinarias
                FROM Matriz m
                LEFT JOIN SesionesFiltradas sf ON m.id_dg = sf.id_dg AND m.grupo = sf.grupo
                GROUP BY m.id_dg, m.siglas_dg, m.grupo
                ORDER BY m.siglas_dg;
            """
            cur.execute(sql_ses_tipo, (current_year,))
            global_data["sesiones_por_tipo_organo_dg"] = [dict(row) for row in cur.fetchall()]
            
            # 6. Informes Entregados (REFACTORIZADO: Matriz DG x Tipo Informe)
            sql_inf = """
                WITH Tipos AS (
                    SELECT id_tipo_informe, nombre_informe FROM tipos_informe WHERE activo = TRUE
                ),
                Matriz AS (
                    SELECT d.id_dg, d.siglas_dg, t.id_tipo_informe, t.nombre_informe
                    FROM dgs d CROSS JOIN Tipos t
                    WHERE d.activo = TRUE
                ),
                InformesFiltrados AS (
                    SELECT d.id_dg, inf.tipo_informe_id, inf.institucion_id
                    FROM informes inf
                    JOIN instituciones i ON inf.institucion_id = i.id_institucion
                    JOIN ramos r ON i.id_ramo = r.id_ramo
                    JOIN dgs d ON r.id_dg = d.id_dg
                    WHERE inf.periodo_reportado = %s AND inf.activo = TRUE
                )
                SELECT 
                    m.id_dg, m.siglas_dg, m.id_tipo_informe, m.nombre_informe,
                    COUNT(DISTINCT inf.institucion_id) as delivered_count
                FROM Matriz m
                LEFT JOIN InformesFiltrados inf ON m.id_dg = inf.id_dg AND m.id_tipo_informe = inf.tipo_informe_id
                GROUP BY m.id_dg, m.siglas_dg, m.id_tipo_informe, m.nombre_informe
                ORDER BY m.siglas_dg, m.nombre_informe;
            """
            cur.execute(sql_inf, (str(current_year),))
            global_data["informes_entregados_dg"] = [dict(row) for row in cur.fetchall()]

            # 7. Estadísticas de Recomendaciones (REFACTORIZADO: DGs LEFT JOIN RecsFiltradas)
            sql_recs_stats = """
                WITH RecsFiltradas AS (
                    SELECT rec.id_recomendacion, rec.estatus, rec.fecha_emision, d.id_dg
                    FROM recomendaciones rec
                    JOIN instituciones i ON rec.id_institucion = i.id_institucion
                    JOIN ramos r ON i.id_ramo = r.id_ramo
                    JOIN dgs d ON r.id_dg = d.id_dg
                    LEFT JOIN informes inf ON rec.informe_id = inf.informe_ssot_id
                    WHERE rec.activo = TRUE
                      AND (inf.anio_informe = %s OR (rec.informe_id IS NULL AND EXTRACT(YEAR FROM rec.fecha_emision) = %s))
                )
                SELECT 
                    d.id_dg, d.siglas_dg,
                    COUNT(rf.id_recomendacion) as emitidas_count,
                    COUNT(CASE WHEN rf.estatus IN ('Completada', 'Cerrada', 'Atendida') THEN 1 END) as atendidas_count,
                    CASE 
                        WHEN COUNT(rf.id_recomendacion) > 0 
                        THEN ROUND((COUNT(CASE WHEN rf.estatus IN ('Completada', 'Cerrada', 'Atendida') THEN 1 END)::DECIMAL / COUNT(rf.id_recomendacion)) * 100, 2)
                        ELSE 0 
                    END as efficiency_pct
                FROM dgs d
                LEFT JOIN RecsFiltradas rf ON d.id_dg = rf.id_dg
                WHERE d.activo = TRUE
                GROUP BY d.id_dg, d.siglas_dg
                ORDER BY d.siglas_dg;
            """
            cur.execute(sql_recs_stats, (current_year, current_year))
            recs_stats_data = [dict(row) for row in cur.fetchall()]
            global_data["recomendaciones_stats_dg"] = recs_stats_data
            global_data["total_recomendaciones_emitidas"] = sum(item['emitidas_count'] for item in recs_stats_data)

            # 8. Eficiencia y Volumen por Origen (REFACTORIZADO: Matriz DG x Origen)
            sql_recs_tipo = """
                WITH Origenes AS (
                    SELECT nombre_informe FROM tipos_informe WHERE activo = TRUE
                    UNION SELECT 'Independiente'
                ),
                Matriz AS (
                    SELECT d.id_dg, d.siglas_dg, o.nombre_informe
                    FROM dgs d CROSS JOIN Origenes o
                    WHERE d.activo = TRUE
                ),
                RecsClasificadas AS (
                    SELECT 
                        d.id_dg, 
                        rec.id_recomendacion, 
                        rec.estatus,
                        CASE 
                            WHEN rec.informe_id IS NOT NULL THEN ti.nombre_informe
                            ELSE (
                                SELECT ti_sub.nombre_informe
                                FROM institucion_tipo_informe_valido itiv
                                JOIN tipos_informe ti_sub ON itiv.id_tipo_informe = ti_sub.id_tipo_informe
                                WHERE itiv.id_institucion = rec.id_institucion
                                ORDER BY ti_sub.id_tipo_informe ASC LIMIT 1
                            )
                        END as origen_real
                    FROM recomendaciones rec
                    JOIN instituciones i ON rec.id_institucion = i.id_institucion
                    JOIN ramos r ON i.id_ramo = r.id_ramo
                    JOIN dgs d ON r.id_dg = d.id_dg
                    LEFT JOIN informes inf ON rec.informe_id = inf.informe_ssot_id
                    LEFT JOIN tipos_informe ti ON inf.tipo_informe_id = ti.id_tipo_informe
                    WHERE rec.activo = TRUE
                      AND (inf.anio_informe = %s OR (rec.informe_id IS NULL AND EXTRACT(YEAR FROM rec.fecha_emision) = %s))
                )
                SELECT 
                    m.siglas_dg, m.nombre_informe,
                    COUNT(rc.id_recomendacion) as total_emitidas,
                    COUNT(CASE WHEN rc.estatus IN ('Completada', 'Cerrada', 'Atendida') THEN 1 END) as total_atendidas,
                    CASE 
                        WHEN COUNT(rc.id_recomendacion) > 0 
                        THEN ROUND((COUNT(CASE WHEN rc.estatus IN ('Completada', 'Cerrada', 'Atendida') THEN 1 END)::DECIMAL / COUNT(rc.id_recomendacion)) * 100, 2)
                        ELSE 0 
                    END as efficiency_pct
                FROM Matriz m
                LEFT JOIN RecsClasificadas rc ON m.id_dg = rc.id_dg AND m.nombre_informe = rc.origen_real
                GROUP BY m.siglas_dg, m.nombre_informe
                ORDER BY m.siglas_dg, m.nombre_informe;
            """
            cur.execute(sql_recs_tipo, (current_year, current_year))
            global_data["grafico_eficiencia_recs_por_tipo_dg"] = [dict(row) for row in cur.fetchall()]

        return jsonify(global_data)
    except Exception as e:
        print(f"Error global stats: {traceback.format_exc()}")
        return jsonify({"error": "Error interno"}), 500
    finally:
        if conn: conn.close()
# =============================================================
# --- FIN: ENDPOINT DASHBOARD GLOBAL ---



# =============================================================
# === INICIO BLOQUE SPRINT 2: FUNCIONES DE AYUDA KPI ===
# =============================================================

def safe_pct(numerador, denominador):
    """ Calcula el porcentaje de forma segura, evitando división por cero. """
    if not isinstance(numerador, (int, float)):
        numerador = 0
    if not isinstance(denominador, (int, float)) or denominador == 0:
        return 0.0
    return round((numerador / denominador) * 100, 1)

def safe_delta(actual, anterior):
    """ Calcula el delta (diferencia) de forma segura. """
    if not isinstance(actual, (int, float)):
        actual = 0.0
    if not isinstance(anterior, (int, float)):
        anterior = 0.0
    return round(actual - anterior, 1)

# =============================================================
# === FIN BLOQUE SPRINT 2 ===
# =============================================================



# =============================================================
# === INICIO: NUEVOS ENDPOINTS PARA GRÁFICOS DE TENDENCIA ===
# =============================================================

@app.route('/api/dashboard/tendencia/sesiones_ord', methods=['GET'])
def get_tendencia_sesiones_ord():
    """ Obtiene la tendencia histórica de sesiones ORDINARIAS. """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # Filtra por id_tipo_sesion = 1 (Ordinaria)
            sql = """
                SELECT 
                    año, 
                    COUNT(id_sesion) as sesiones_count
                FROM sesiones
                WHERE 
                    id_tipo_sesion = 1 
                    AND estatus = 'Realizada' 
                    AND activo = TRUE
                GROUP BY año
                ORDER BY año;
            """
            cur.execute(sql)
            data = [dict(row) for row in cur.fetchall()]
            return jsonify(data)
    except Exception as e:
        print(f"Error en get_tendencia_sesiones_ord: {e}")
        return jsonify({"error": "Error interno al obtener tendencia de sesiones ord."}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/dashboard/tendencia/sesiones_ext', methods=['GET'])
def get_tendencia_sesiones_ext():
    """ Obtiene la tendencia histórica de sesiones EXTRAORDINARIAS. """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # Filtra por id_tipo_sesion = 2 (Extraordinaria)
            sql = """
                SELECT 
                    año, 
                    COUNT(id_sesion) as sesiones_count
                FROM sesiones
                WHERE 
                    id_tipo_sesion = 2 
                    AND estatus = 'Realizada' 
                    AND activo = TRUE
                GROUP BY año
                ORDER BY año;
            """
            cur.execute(sql)
            data = [dict(row) for row in cur.fetchall()]
            return jsonify(data)
    except Exception as e:
        print(f"Error en get_tendencia_sesiones_ext: {e}")
        return jsonify({"error": "Error interno al obtener tendencia de sesiones ext."}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/dashboard/tendencia/informes', methods=['GET'])
def get_tendencia_informes():
    """ Obtiene la tendencia histórica de informes entregados. """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            sql = """
                SELECT 
                    anio_informe as year, 
                    COUNT(informe_ssot_id) as informes_count
                FROM informes
                WHERE activo = TRUE
                GROUP BY anio_informe
                ORDER BY anio_informe;
            """
            cur.execute(sql)
            data = [dict(row) for row in cur.fetchall()]
            return jsonify(data)
    except Exception as e:
        print(f"Error en get_tendencia_informes: {e}")
        return jsonify({"error": "Error interno al obtener tendencia de informes."}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/dashboard/tendencia/recomendaciones', methods=['GET'])
def get_tendencia_recomendaciones():
    """ Obtiene la tendencia histórica de recomendaciones (Híbrido). """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # Usamos la misma lógica HÍBRIDA que en el dashboard global
            sql = """
                WITH HybridRecs AS (
                    -- Universo 1: Carga Masiva (SSOT)
                    SELECT 
                        rec.id_recomendacion,
                        inf.anio_informe
                    FROM recomendaciones rec
                    JOIN informes inf ON rec.informe_id = inf.informe_ssot_id
                    WHERE rec.activo = TRUE
                    UNION ALL
                    -- Universo 2: Manuales (Independientes)
                    SELECT
                        rec.id_recomendacion,
                        EXTRACT(YEAR FROM rec.fecha_emision) as anio_informe
                    FROM recomendaciones rec
                    WHERE rec.informe_id IS NULL
                    AND rec.activo = TRUE
                )
                SELECT 
                    anio_informe as year,
                    COUNT(id_recomendacion) as recomendaciones_count
                FROM HybridRecs
                WHERE anio_informe IS NOT NULL
                GROUP BY anio_informe
                ORDER BY anio_informe;
            """
            cur.execute(sql)
            data = [dict(row) for row in cur.fetchall()]
            return jsonify(data)
    except Exception as e:
        print(f"Error en get_tendencia_recomendaciones: {e}")
        return jsonify({"error": "Error interno al obtener tendencia de recomendaciones."}), 500
    finally:
        if conn:
            conn.close()
            
     
            
# =============================================================
# === FIN: NUEVOS ENDPOINTS PARA GRÁFICOS DE TENDENCIA ===
# =============================================================

# =============================================================
# === INICIO: NUEVO ENDPOINT (RECOMENDACIONES ATENDIDAS) ===
# =============================================================

@app.route('/api/dashboard/tendencia/recomendaciones_atendidas', methods=['GET'])
def get_tendencia_recomendaciones_atendidas():
    """ Obtiene la tendencia histórica de recomendaciones ATENDIDAS (Híbrido). """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # Usamos la misma lógica HÍBRIDA, pero filtramos por estatus
            sql = """
                WITH HybridRecs AS (
                    -- Universo 1: Carga Masiva (SSOT)
                    SELECT 
                        rec.id_recomendacion,
                        inf.anio_informe
                    FROM recomendaciones rec
                    JOIN informes inf ON rec.informe_id = inf.informe_ssot_id
                    WHERE rec.activo = TRUE
                      AND rec.estatus IN ('Completada', 'Cerrada', 'Atendida')

                    UNION ALL
                    
                    -- Universo 2: Manuales (Independientes)
                    SELECT
                        rec.id_recomendacion,
                        EXTRACT(YEAR FROM rec.fecha_emision) as anio_informe
                    FROM recomendaciones rec
                    WHERE rec.informe_id IS NULL
                    AND rec.activo = TRUE
                      AND rec.estatus IN ('Completada', 'Cerrada', 'Atendida')
                )
                SELECT 
                    anio_informe as year,
                    COUNT(id_recomendacion) as recomendaciones_count
                FROM HybridRecs
                WHERE anio_informe IS NOT NULL
                GROUP BY anio_informe
                ORDER BY anio_informe;
            """
            cur.execute(sql)
            data = [dict(row) for row in cur.fetchall()]
            return jsonify(data)
    except Exception as e:
        print(f"Error en get_tendencia_recomendaciones_atendidas: {e}")
        return jsonify({"error": "Error interno al obtener tendencia de recomendaciones atendidas."}), 500
    finally:
        if conn:
            conn.close()

# =============================================================
# === FIN: NUEVO ENDPOINT ===
# =============================================================

# Función auxiliar para obtener todas las DGs activas (necesaria para el cálculo de sesiones)
#def fetch_all_active_dgs(cursor):
#    cursor.execute("SELECT id_dg, siglas_dg FROM dgs WHERE activo = TRUE ORDER BY siglas_dg;")
#    return {row['id_dg']: row for row in cursor.fetchall()}
# --- FIN: NUEVO ENDPOINT PARA DASHBOARD GLOBAL ---


# =============================================================
# === INICIO BLOQUE SPRINT 5: ENDPOINT DE RENDIMIENTO (LÓGICA DE ANTIGÜEDAD DEFINITIVA) ===
# =============================================================
@app.route('/api/dashboard/rendimiento', methods=['GET'])
def get_dashboard_rendimiento():
    """
    Endpoint para la pestaña de Rendimiento (Sprint 5 - FINAL).
    - CORRECCIÓN ANTIGÜEDAD: La antigüedad ahora se calcula usando
      'informes.fecha_informe' (si existe) o 'recomendaciones.fecha_emision'
      (si es independiente), filtrando fechas '1900-01-01'.
    """
    conn = None
    try:
        año_actual_str = request.args.get('año_actual')
        if not año_actual_str:
            return jsonify({'error': 'El parámetro "año_actual" es requerido.'}), 400
            
        año_actual = int(año_actual_str)
        año_anterior = año_actual - 1
        
        conn = get_db_connection()
        response = {
            'año_actual': año_actual,
            'año_anterior': año_anterior
        }

        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            
            # --- 1. KPIs de RIESGO (Snapshot - Hoy) ---
            # (Widget 2: Inventario Total Pendiente) y (Widget 4: Antigüedad Promedio)
            kpi_riesgo_snapshot_query = """
                SELECT 
                    COUNT(*) as inventario_total_pendiente,
                    
                    -- INICIO CORRECCIÓN SPRINT 5 --
                    COALESCE(
                        AVG(
                            NOW()::date - 
                            CASE
                                -- 1. Si está ligada a un informe, usar la fecha del informe
                                WHEN r.informe_id IS NOT NULL THEN i.fecha_informe
                                -- 2. Si es independiente, usar su propia fecha de emisión
                                ELSE r.fecha_emision
                            END
                        )
                        -- 3. Filtrar los datos sucios (de independientes) y nulos de informes
                        FILTER (WHERE
                            CASE
                                WHEN r.informe_id IS NOT NULL THEN i.fecha_informe IS NOT NULL
                                ELSE r.fecha_emision > '1901-01-01'
                            END
                        ), 0
                    ) as antiguedad_promedio_dias
                    -- FIN CORRECCIÓN SPRINT 5 --

                FROM recomendaciones r
                LEFT JOIN informes i ON r.informe_id = i.informe_ssot_id
                WHERE r.estatus = 'Pendiente'
                  AND r.activo = TRUE;
            """
            cur.execute(kpi_riesgo_snapshot_query)
            data_riesgo = cur.fetchone()
            response['inventario_total_pendiente'] = int(data_riesgo['inventario_total_pendiente'])
            response['antiguedad_promedio_inventario'] = int(data_riesgo['antiguedad_promedio_dias'])

            # --- 2. KPIs YoY (Tasa Cohorte, Focos Rojos) ---
            for año in [año_actual, año_anterior]:
                key = 'actual' if año == año_actual else 'anterior'
                año_str = str(año) # for periodo_reportado

                # 2a. Tasa de Atención de Cohorte (Widget 1)
                kpi_cohorte_query = """
                    WITH HybridRecs AS (
                        SELECT rec.estatus, inf.anio_informe
                        FROM recomendaciones rec JOIN informes inf ON rec.informe_id = inf.informe_ssot_id
                        WHERE rec.activo = TRUE AND inf.anio_informe = %s
                        UNION ALL
                        SELECT rec.estatus, EXTRACT(YEAR FROM rec.fecha_emision) as anio_informe
                        FROM recomendaciones rec
                        WHERE rec.informe_id IS NULL AND rec.activo = TRUE AND EXTRACT(YEAR FROM rec.fecha_emision) = %s
                    )
                    SELECT
                        COUNT(*) as emitidas_cohorte,
                        COUNT(CASE WHEN estatus IN ('Completada', 'Cerrada', 'Atendida') THEN 1 END) as atendidas_cohorte
                    FROM HybridRecs;
                """
                cur.execute(kpi_cohorte_query, (año, año))
                data_cohorte = cur.fetchone()
                response[f'tasa_atencion_cohorte_{key}_pct'] = safe_pct(
                    data_cohorte.get('atendidas_cohorte', 0), 
                    data_cohorte.get('emitidas_cohorte', 0)
                )

                # 2b. Focos Rojos (Widget 3)
                kpi_focos_rojos_query = """
                    WITH InstSinSesionOrd AS (
                        SELECT DISTINCT i.id_institucion FROM instituciones i
                        WHERE i.activo = TRUE AND NOT EXISTS (
                            SELECT 1 FROM sesiones s
                            WHERE s.id_institucion = i.id_institucion AND s.año = %s
                              AND s.id_tipo_sesion = 1 AND s.estatus = 'Realizada' AND s.activo = TRUE
                        )
                    ), InstConInformesFaltantes AS (
                        SELECT i.id_institucion FROM instituciones i
                        JOIN institucion_tipo_informe_valido itiv ON i.id_institucion = itiv.id_institucion
                        LEFT JOIN (
                            SELECT institucion_id, COUNT(DISTINCT tipo_informe_id) as delivered_types_count
                            FROM informes WHERE periodo_reportado = %s AND activo = TRUE
                            GROUP BY institucion_id
                        ) inf_delivered ON i.id_institucion = inf_delivered.institucion_id
                        WHERE i.activo = TRUE
                        GROUP BY i.id_institucion, COALESCE(inf_delivered.delivered_types_count, 0)
                        HAVING COUNT(itiv.id_tipo_informe) > COALESCE(inf_delivered.delivered_types_count, 0)
                    )
                    SELECT
                        (SELECT COUNT(DISTINCT id_institucion) FROM InstSinSesionOrd
                         WHERE id_institucion IN (SELECT id_institucion FROM InstConInformesFaltantes)) as focos_rojos_count,
                        (SELECT COUNT(*) FROM instituciones WHERE activo = TRUE) as total_instituciones;
                """
                cur.execute(kpi_focos_rojos_query, (año, año_str))
                data_focos = cur.fetchone()
                response[f'focos_rojos_{key}_pct'] = safe_pct(
                    data_focos.get('focos_rojos_count', 0),
                    data_focos.get('total_instituciones', 0)
                )
                response[f'focos_rojos_{key}_count'] = int(data_focos.get('focos_rojos_count', 0))

        # --- 3. Calcular Deltas ---
        response['delta_tasa_atencion_cohorte_pct'] = safe_delta(
            response.get('tasa_atencion_cohorte_actual_pct', 0.0),
            response.get('tasa_atencion_cohorte_anterior_pct', 0.0)
        )
        response['delta_focos_rojos_pct'] = safe_delta(
            response.get('focos_rojos_actual_pct', 0.0),
            response.get('focos_rojos_anterior_pct', 0.0)
        )
        
        return jsonify(response)

    except Exception as e:
        if conn:
            conn.rollback()
        error_details = traceback.format_exc()
        print(f"--- ERROR DETALLADO EN /api/dashboard/rendimiento (Sprint 5) ---")
        print(error_details)
        return jsonify({"error": f"Error interno del servidor al procesar datos de rendimiento."}), 500
    finally:
        if conn:
            conn.close()
# =============================================================
# === FIN BLOQUE SPRINT 5 ===
# =============================================================


            
# =============================================================
# ENDPOINTS DE SESIONES (v2.0 REESTRUCTURADO)
# =============================================================
@app.route('/api/sesiones', methods=['GET'])
def obtener_sesiones():
    """
    VERSIÓN FINAL: Usa una plantilla en memoria para garantizar la vista de 4 trimestres
    y la fusiona con los datos reales de la BD. No crea registros en la BD.
    """
    año = request.args.get('año', type=int)
    institucion_id = request.args.get('institucion_id', type=int)
    organo_id = request.args.get('organo_id', type=int)

    if not all([año, institucion_id, organo_id]):
        return jsonify({"error": "Faltan parámetros (año, institucion_id, organo_id)."}), 400
    
    conn = get_db_connection()
    try:
        # 1. Crear la plantilla ideal en memoria.
        periodos_map = {1: 'Primer Trimestre', 2: 'Segundo Trimestre', 3: 'Tercer Trimestre', 4: 'Cuarto Trimestre'}
        plantilla_trimestral = {i: {
            "id_sesion": f"programada_{i}", "año": año, "estatus": "Programada",
            "nombre_oficial_sesion": None, "numero_ordinal": i, "periodo": periodos_map[i],
            "fecha_realizada": None, "id_tipo_sesion": 1, "tipo_sesion": "Ordinaria"
        } for i in range(1, 5)}

        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # 2. Consultar los datos reales.
            sql_get_reales = """
                SELECT s.id_sesion, s.año, s.estatus, s.nombre_oficial_sesion, s.numero_ordinal, 
                       s.fecha_realizada, ts.id_tipo_sesion, ts.nombre_sesion AS tipo_sesion
                FROM sesiones s JOIN tipos_sesion ts ON s.id_tipo_sesion = ts.id_tipo_sesion
                WHERE s.año = %s AND s.id_institucion = %s AND s.id_tipo_organo = %s AND s.activo = TRUE;
            """
            cur.execute(sql_get_reales, (año, institucion_id, organo_id))
            sesiones_reales_raw = cur.fetchall()

            # 3. Separar y fusionar.
            ordinarias_reales = sorted([dict(s) for s in sesiones_reales_raw if s['id_tipo_sesion'] == 1], key=lambda x: x.get('fecha_realizada') or date.max)
            extraordinarias_reales = [dict(s) for s in sesiones_reales_raw if s['id_tipo_sesion'] == 2]

            for index, sesion_real in enumerate(ordinarias_reales):
                ordinal_a_reemplazar = index + 1
                if ordinal_a_reemplazar in plantilla_trimestral:
                    sesion_real['numero_ordinal'] = plantilla_trimestral[ordinal_a_reemplazar]['numero_ordinal']
                    sesion_real['periodo'] = plantilla_trimestral[ordinal_a_reemplazar]['periodo']
                    plantilla_trimestral[ordinal_a_reemplazar] = sesion_real
            
            # 4. Construir la respuesta final.
            resultado_final = list(plantilla_trimestral.values())
            resultado_final.extend(extraordinarias_reales)
            return jsonify(resultado_final)

    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Error en obtener_sesiones: {error_details}")
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()
            
            


@app.route('/api/sesiones/ordinaria', methods=['POST'])
def crear_sesion_ordinaria():
    """Crea una nueva sesión ordinaria realizada."""
    data = request.form.to_dict()
    # El campo 'id_sesion_programada' ya no es necesario para la consulta, solo para la lógica del frontend
    required_fields = ['año', 'institucion_id', 'organo_id', 'numero_sesion_oficial', 'fecha_realizada']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Faltan campos para crear sesión ordinaria"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # CORRECCIÓN: Se cambia UPDATE por INSERT, similar a 'extraordinaria' pero con id_tipo_sesion = 1
            sql = """
                INSERT INTO sesiones (
                    año, id_institucion, id_tipo_organo, id_tipo_sesion,
                    estatus, nombre_oficial_sesion, fecha_realizada, usuario_creacion
                ) VALUES (%s, %s, %s, 1, 'Realizada', %s, %s, %s) RETURNING id_sesion;
            """
            cur.execute(sql, (
                data['año'], data['institucion_id'], data['organo_id'],
                data['numero_sesion_oficial'], data['fecha_realizada'], data.get('usuario_creacion', 'sistema')
            ))
            new_id = cur.fetchone()[0]
            conn.commit()
            # Se devuelve un código 201 (Created) y el nuevo ID real de la base de datos.
            return jsonify({"message": "Sesión ordinaria creada.", "id_sesion": new_id}), 201
    except Exception as e:
        conn.rollback()
        print(f"Error en crear_sesion_ordinaria: {traceback.format_exc()}")
        return jsonify({"error": "Error interno del servidor"}), 500
    finally:
        if conn:
            conn.close()
            

@app.route('/api/sesiones/extraordinaria', methods=['POST'])
def crear_sesion_extraordinaria():
    """Crea una nueva sesión extraordinaria realizada."""
    data = request.form.to_dict()
    required_fields = ['año', 'institucion_id', 'organo_id', 'numero_sesion_oficial', 'fecha_realizada']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Faltan campos para crear sesión extraordinaria"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                INSERT INTO sesiones (
                    año, id_institucion, id_tipo_organo, id_tipo_sesion,
                    estatus, nombre_oficial_sesion, fecha_realizada, usuario_creacion
                ) VALUES (%s, %s, %s, 2, 'Realizada', %s, %s, %s) RETURNING id_sesion;
            """
            cur.execute(sql, (
                data['año'], data['institucion_id'], data['organo_id'],
                data['numero_sesion_oficial'], data['fecha_realizada'], data.get('usuario_creacion', 'sistema')
            ))
            new_id = cur.fetchone()[0]
            conn.commit()
            return jsonify({"message": "Sesión extraordinaria creada.", "id_sesion": new_id}), 201
    except Exception as e:
        conn.rollback()
        print(f"Error en crear_sesion_extraordinaria: {traceback.format_exc()}")
        return jsonify({"error": "Error interno del servidor"}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/sesiones/<int:id_sesion>', methods=['PUT'])
def actualizar_sesion(id_sesion):
    """
    Actualiza una sesión existente. Usado principalmente para marcar una sesión 'Programada' como 'Realizada'.
    """
    data = request.form.to_dict()
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Construcción dinámica de la consulta para actualizar solo los campos enviados
            update_fields = []
            params = []
            
            if 'nombre_oficial_sesion' in data:
                update_fields.append("nombre_oficial_sesion = %s")
                params.append(data['nombre_oficial_sesion'])
            if 'fecha_realizada' in data:
                update_fields.append("fecha_realizada = %s")
                params.append(data['fecha_realizada'])
                update_fields.append("estatus = 'Realizada'") # Si se registra una fecha, se marca como realizada
            if 'estatus' in data:
                update_fields.append("estatus = %s")
                params.append(data['estatus'])

            if not update_fields:
                return jsonify({"error": "No hay campos para actualizar"}), 400

            # Añadir el usuario de actualización a los parámetros
            update_fields.append("usuario_actualizacion = %s")
            params.append(data.get('usuario_actualizacion', 'sistema'))
            update_fields.append("fecha_actualizacion = NOW()")

            params.append(id_sesion)
            
            sql = f"UPDATE sesiones SET {', '.join(update_fields)} WHERE id_sesion = %s;"
            
            cur.execute(sql, params)
            conn.commit()
            
            return jsonify({"message": "Sesión actualizada.", "id_sesion": id_sesion})
    except Exception as e:
        conn.rollback()
        print(f"Error en actualizar_sesion: {traceback.format_exc()}")
        return jsonify({"error": "Error interno del servidor"}), 500
    finally:
        if conn:
            conn.close()
            
            
            
# =============================================================
# ENDPOINTS PARA FILTROS DINÁMICOS DE SESIONES
# =============================================================

@app.route('/api/sesiones/responsables_por_ano/<int:ano>', methods=['GET'])
def obtener_responsables_por_ano(ano):
    """
    Obtiene la lista ÚNICA de responsables que tienen al menos una sesión
    registrada en el año especificado. Ideal para poblar filtros en cascada.
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            sql = """
                SELECT DISTINCT
                    r.id_responsable,
                    r.nombre as nombre_responsable  -- Aseguramos consistencia en el nombre del campo
                FROM responsables r
                JOIN instituciones i ON r.id_responsable = i.id_responsable
                JOIN sesiones s ON i.id_institucion = s.id_institucion
                WHERE s.año = %s AND r.activo = TRUE AND s.activo = TRUE
                ORDER BY r.nombre;
            """
            cur.execute(sql, (ano,))
            responsables = [dict(row) for row in cur.fetchall()]
            # Devolvemos directamente la lista, como hacen las otras funciones de poblarSelect
            return jsonify(responsables)
    except Exception as e:
        print(f"Error en obtener_responsables_por_ano: {traceback.format_exc()}")
        return jsonify({"error": "Error interno del servidor"}), 500
    finally:
        if conn:
            conn.close()



# =============================================================
# ENDPOINTS DE INFORMES Y RECOMENDACIONES (v2.0 REESTRUCTURADO)
# =============================================================


@app.route('/api/informes', methods=['GET', 'POST'])
def manejar_informes():
    """
    Controlador para OBTENER (GET) la lista de informes (grid)
    y CREAR (POST) un nuevo informe (modal).
    Versión SSOT Puro:
    - GET: Lee de 'informes' y calcula los contadores desde 'recomendaciones'.
    - POST: Escribe en 'informes' (padre) y crea los 'N' hijos en 'recomendaciones'.
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            
            # --- LÓGICA GET (PARA EL GRID DE INFORMES) ---
            if request.method == 'GET':
                # Esta SQL es la que habíamos parchado por la regresión.
                # Ahora la estamos añadiendo al lugar correcto.
                sql = """
                    SELECT 
                        i.informe_ssot_id AS id_informe, 
                        i.institucion_id AS id_institucion, 
                        i.id_tipo_organo, 
                        i.tipo_informe_id AS id_tipo_informe,
                        i.periodicidad, i.periodo_reportado, i.fecha_informe, i.descripcion, i.activo,
                        
                        -- Contadores VIVOS (SSOT Puro)
                        (SELECT COUNT(*) FROM recomendaciones r 
                         WHERE r.informe_id = i.informe_ssot_id AND r.activo = TRUE) AS recomendaciones_emitidas,
                        (SELECT COUNT(*) FROM recomendaciones r 
                         WHERE r.informe_id = i.informe_ssot_id AND r.activo = TRUE AND r.estatus IN ('Completada', 'Cerrada', 'Atendida')) AS recomendaciones_atendidas,
                        
                        UPPER(inst.nombre_institucion) as nombre_institucion, inst.siglas,
                        tog.nombre as nombre_organo,
                        ti.nombre_informe,
                        resp.nombre as nombre_responsable,
                        d.id_dg,
                        r.id_ramo,
                        resp.id_responsable,
                        r.nombre_ramo,
                        d.siglas_dg, 
                        r.numero_ramo
                    FROM informes i
                    JOIN instituciones inst ON i.institucion_id = inst.id_institucion
                    JOIN tipos_organo_gobierno tog ON i.id_tipo_organo = tog.id_tipo_organo
                    JOIN tipos_informe ti ON i.tipo_informe_id = ti.id_tipo_informe
                    JOIN responsables resp ON inst.id_responsable = resp.id_responsable
                    JOIN ramos r ON inst.id_ramo = r.id_ramo
                    JOIN dgs d ON r.id_dg = d.id_dg
                """
                
                filters = ["i.activo = TRUE"]
                params = []
                
                if request.args.get('periodo_reportado'):
                    filters.append("i.periodo_reportado = %s")
                    params.append(request.args.get('periodo_reportado'))
                if request.args.get('id_dg'):
                    filters.append("d.id_dg = %s")
                    params.append(request.args.get('id_dg', type=int))
                if request.args.get('id_ramo'):
                    filters.append("r.id_ramo = %s")
                    params.append(request.args.get('id_ramo', type=int))
                if request.args.get('responsable_id'):
                    filters.append("resp.id_responsable = %s")
                    params.append(request.args.get('responsable_id', type=int))
                if request.args.get('institucion_id'):
                    filters.append("i.institucion_id = %s")
                    params.append(request.args.get('institucion_id', type=int))
                if request.args.get('organo_id'):
                    filters.append("i.id_tipo_organo = %s")
                    params.append(request.args.get('organo_id', type=int))
                
                if len(filters) > 1:
                    sql += " WHERE " + " AND ".join(filters)
                
                sql += " ORDER BY i.fecha_informe DESC;"
                
                cur.execute(sql, tuple(params))
                informes = [dict(row) for row in cur.fetchall()]
                return jsonify(informes)
            
            # --- LÓGICA POST (PARA EL MODAL 'NUEVO INFORME') ---
            if request.method == 'POST':
                data = request.form.to_dict()
                
                sql_insert = """
                    INSERT INTO informes 
                    (periodo_reportado, periodicidad, institucion_id, id_tipo_organo, tipo_informe_id, 
                     descripcion, fecha_informe, anio_informe, usuario_creacion)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING informe_ssot_id;
                """
                anio_informe = int(data['periodo_reportado'])
                # --- CORRECCIÓN BUG 1: Capturamos la fecha del informe ---
                fecha_informe_padre = data['fecha_informe']

                cur.execute(sql_insert, (
                    data['periodo_reportado'], data.get('periodicidad', 'Anual'), data['id_institucion'], data['id_tipo_organo'], 
                    data['id_tipo_informe'], data.get('descripcion'), fecha_informe_padre, 
                    anio_informe, 'usuario_sistema'
                ))
                new_id = cur.fetchone()[0]
                
                emitidas = int(data.get('recomendaciones_emitidas', 0))
                atendidas = int(data.get('recomendaciones_atendidas', 0))
                pendientes = max(0, emitidas - atendidas)

                if emitidas > 0:
                    # --- CORRECCIÓN BUG 1: Añadimos fecha_emision al INSERT del hijo ---
                    sql_insert_rec = """
                        INSERT INTO recomendaciones (
                            informe_id, id_institucion, id_tipo_organo,
                            descripcion, area_responsable_atencion, estatus,
                            fecha_emision, usuario_creacion
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'usuario_sistema');
                    """
                    # Insertar Atendidas
                    for _ in range(atendidas):
                        cur.execute(sql_insert_rec, (
                            new_id, data['id_institucion'], data['id_tipo_organo'],
                            'N/A', 'N/A', 'Atendida', fecha_informe_padre
                        ))
                    # Insertar Pendientes
                    for _ in range(pendientes):
                        cur.execute(sql_insert_rec, (
                            new_id, data['id_institucion'], data['id_tipo_organo'],
                            'N/A', 'N/A', 'Pendiente', fecha_informe_padre
                        ))
                # --- FIN DE CORRECCIÓN ---

                conn.commit()
                return jsonify({"message": "Informe creado.", "id_informe": new_id}), 201
                
    except Exception as e:
        conn.rollback()
        print(f"Error en manejar_informes: {traceback.format_exc()}")
        return jsonify({"error": "Error interno del servidor"}), 500
    finally:
        conn.close()

@app.route('/api/recomendaciones', methods=['GET'])
def obtener_recomendaciones():
    """
    Obtiene una lista de recomendaciones filtrada por varios parámetros.
    Utilizado por la vista principal Y la vista de detalle de informe.
    ASEGURA QUE SOLO SE MUESTREN LAS ACTIVAS y filtra por informe_id si se provee.
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # --- INICIO DE CORRECCIÓN (REGRESIÓN SSOT) ---
            # Se actualiza rec.id_informe -> rec.informe_id
            sql = """
                SELECT
                    rec.id_recomendacion, rec.informe_id, rec.descripcion,
                    rec.area_responsable_atencion, rec.fecha_emision, rec.fecha_compromiso,
                    rec.estatus, rec.prioridad, rec.tipo_recomendacion,
                    inst.siglas, inst.id_institucion,
                    tog.nombre as nombre_organo, tog.id_tipo_organo,
                    resp.id_responsable,
                    (SELECT COUNT(*) FROM evidencias ev
                     WHERE ev.parent_type = 'recomendacion' AND ev.parent_id = rec.id_recomendacion AND ev.activo = TRUE) as evidencias_count
                FROM recomendaciones rec
                JOIN instituciones inst ON rec.id_institucion = inst.id_institucion
                JOIN tipos_organo_gobierno tog ON rec.id_tipo_organo = tog.id_tipo_organo
                JOIN responsables resp ON inst.id_responsable = resp.id_responsable
                JOIN ramos r ON inst.id_ramo = r.id_ramo
                JOIN dgs d ON r.id_dg = d.id_dg
            """
            
            filters = ["rec.activo = TRUE"] 
            params = []
            
            informe_id_filtro = request.args.get('informe_id', type=int)
            if informe_id_filtro:
                filters.append("rec.informe_id = %s") # <- CORREGIDO
                params.append(informe_id_filtro)
            else:
                if request.args.get('año'):
                    filters.append("EXTRACT(YEAR FROM rec.fecha_emision) = %s")
                    params.append(request.args.get('año'))
                if request.args.get('id_dg'):
                    filters.append("d.id_dg = %s")
                    params.append(request.args.get('id_dg', type=int))
                if request.args.get('id_ramo'):
                    filters.append("r.id_ramo = %s")
                    params.append(request.args.get('id_ramo', type=int))
                if request.args.get('responsable_id'):
                    filters.append("resp.id_responsable = %s") 
                    params.append(request.args.get('responsable_id', type=int))
                if request.args.get('institucion_id'):
                    filters.append("rec.id_institucion = %s")
                    params.append(request.args.get('institucion_id', type=int))
                if request.args.get('organo_id') and request.args.get('organo_id') != '0':
                    filters.append("rec.id_tipo_organo = %s")
                    params.append(request.args.get('organo_id', type=int))
                if request.args.get('estatus'):
                    filters.append("rec.estatus = %s")
                    params.append(request.args.get('estatus'))
            # --- FIN DE CORRECCIÓN ---
            
            if filters:
                sql += " WHERE " + " AND ".join(filters)
            
            sql += " ORDER BY rec.fecha_emision DESC;"
            
            cur.execute(sql, tuple(params))
            recomendaciones = [dict(row) for row in cur.fetchall()]
            return jsonify(recomendaciones)

    except Exception as e:
        import traceback
        print(f"Error en obtener_recomendaciones: {traceback.format_exc()}")
        return jsonify({"error": "Error interno del servidor"}), 500
    finally:
        if conn:
            conn.close()
            
            



@app.route('/api/informes/<int:informe_id>', methods=['GET', 'PUT', 'DELETE'])
def manejar_informe_detalle(informe_id):
    """
    Controlador para OBTENER (GET) detalles, ACTUALIZAR (PUT)
    o ELIMINAR (DELETE) un informe específico.
    Versión SSOT Puro:
    - GET: Lee de 'informes' y recalcula contadores desde 'recomendaciones'.
    - PUT: Actualiza 'informes' y sincroniza hijos 'N/A'.
    - DELETE: Borrado lógico de 'informes' e hijos.
    """
    conn = get_db_connection()
    try:
        # --- LÓGICA GET (PARA EL MODAL 'EDITAR INFORME') ---
        if request.method == 'GET':
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                # --- CORRECCIÓN (SSOT PURO): Nombres de columna actualizados ---
                # PK es 'informe_ssot_id', FKs son 'institucion_id' y 'tipo_informe_id'
                sql_get = """
                    SELECT 
                        i.informe_ssot_id AS id_informe, 
                        i.institucion_id, i.id_tipo_organo, i.tipo_informe_id,
                        i.periodicidad, i.periodo_reportado, i.fecha_informe, i.descripcion,
                        
                        -- Contadores VIVOS (SSOT Puro)
                        (SELECT COUNT(*) FROM recomendaciones r 
                         WHERE r.informe_id = i.informe_ssot_id AND r.activo = TRUE) AS recomendaciones_emitidas,
                        (SELECT COUNT(*) FROM recomendaciones r 
                         WHERE r.informe_id = i.informe_ssot_id AND r.activo = TRUE AND r.estatus IN ('Completada', 'Cerrada', 'Atendida')) AS recomendaciones_atendidas,
                        
                        inst.nombre_institucion, tog.nombre as nombre_organo,
                        ti.nombre_informe, r.id_ramo, d.id_dg, resp.id_responsable 
                    FROM informes i 
                    LEFT JOIN instituciones inst ON i.institucion_id = inst.id_institucion 
                    LEFT JOIN tipos_organo_gobierno tog ON i.id_tipo_organo = tog.id_tipo_organo 
                    LEFT JOIN tipos_informe ti ON i.tipo_informe_id = ti.id_tipo_informe 
                    LEFT JOIN ramos r ON inst.id_ramo = r.id_ramo
                    LEFT JOIN dgs d ON r.id_dg = d.id_dg
                    LEFT JOIN responsables resp ON inst.id_responsable = resp.id_responsable
                    WHERE i.informe_ssot_id = %s AND i.activo = TRUE; 
                """
                cur.execute(sql_get, (informe_id,))
                informe = cur.fetchone()
                if not informe:
                    return jsonify({"error": "Informe no encontrado o inactivo."}), 404
                return jsonify(dict(informe))
        
        # --- LÓGICA PUT (PARA EL MODAL 'EDITAR INFORME') ---
        if request.method == 'PUT':
                print(f"\n--- Iniciando PUT para Informe ID: {informe_id} ---", flush=True) 
                data = request.form.to_dict()
                print(f"Datos recibidos del form: {data}", flush=True) 
                try:
                    id_tipo_informe = int(data['id_tipo_informe'])
                    id_tipo_organo = int(data['id_tipo_organo']) 
                    periodo_reportado = data['periodo_reportado'] 
                    anio_informe = int(periodo_reportado)
                    periodicidad = data.get('periodicidad', 'Anual') 
                    
                    # --- CORRECCIÓN BUG 1.1: Capturamos la fecha del informe ---
                    fecha_informe = data['fecha_informe'] 
                    
                    descripcion = data.get('descripcion') or None 
                except (KeyError, ValueError, TypeError) as e:
                     print(f"!!! Error validando/convirtiendo datos del form: {e}", flush=True)
                     return jsonify({"error": f"Datos inválidos o faltantes en el formulario: {e}"}), 400
                
                with conn.cursor() as cur:
                    sql_update = """
                        UPDATE informes SET 
                            tipo_informe_id = %s, descripcion = %s, fecha_informe = %s, 
                            id_tipo_organo = %s, periodo_reportado = %s, periodicidad = %s, 
                            anio_informe = %s,
                            fecha_actualizacion = NOW(), usuario_actualizacion = %s 
                        WHERE informe_ssot_id = %s;
                    """
                    params = (
                        id_tipo_informe, descripcion, fecha_informe, 
                        id_tipo_organo, periodo_reportado, periodicidad,
                        anio_informe,
                        'usuario_sistema_edit', informe_id
                    )
                    try:
                        print(f"Ejecutando UPDATE informe {informe_id} con params: {params}", flush=True)
                        cur.execute(sql_update, params)
                        if cur.rowcount == 0:
                            print(f"!!! ADVERTENCIA: No se encontró informe ID {informe_id} para actualizar. Haciendo rollback.", flush=True)
                            conn.rollback()
                            return jsonify({"error": "Informe no encontrado para actualizar."}), 404
                        
                        emitidas = int(data.get('recomendaciones_emitidas', 0))
                        atendidas = int(data.get('recomendaciones_atendidas', 0))
                        pendientes = max(0, emitidas - atendidas)
                        
                        print(f"Sincronizando hijos N/A para informe {informe_id}...")
                        cur.execute("""
                            DELETE FROM recomendaciones
                            WHERE informe_id = %s
                            AND descripcion = 'N/A'
                            AND area_responsable_atencion = 'N/A'
                            AND activo = TRUE
                        """, (informe_id,))
                        
                        # --- CORRECCIÓN BUG 1.1: Añadimos fecha_emision al INSERT del hijo ---
                        sql_insert_rec = """
                            INSERT INTO recomendaciones (
                                informe_id, id_institucion, id_tipo_organo,
                                descripcion, area_responsable_atencion, estatus,
                                fecha_emision, usuario_creacion
                            ) VALUES (%s, (SELECT institucion_id FROM informes WHERE informe_ssot_id = %s), 
                                      (SELECT id_tipo_organo FROM informes WHERE informe_ssot_id = %s), 
                                      'N/A', 'N/A', %s, %s, 'usuario_sistema_edit');
                        """
                        # Insertar Atendidas
                        for _ in range(atendidas):
                            cur.execute(sql_insert_rec, (informe_id, informe_id, informe_id, 'Atendida', fecha_informe))
                        # Insertar Pendientes
                        for _ in range(pendientes):
                            cur.execute(sql_insert_rec, (informe_id, informe_id, informe_id, 'Pendiente', fecha_informe))
                        # --- FIN DE CORRECCIÓN ---
                        
                        print(f"Hijos N/A sincronizados: {atendidas} Atendidas, {pendientes} Pendientes.")

                        conn.commit()
                        print("Commit exitoso para UPDATE informe.", flush=True)
                        return jsonify({"message": "Informe actualizado."})
                    except psycopg2.Error as db_err:
                        conn.rollback()
                        print(f"!!! Error de BD al actualizar informe {informe_id}: {db_err}", flush=True)
                        return jsonify({"error": f"Error de base de datos al actualizar: {db_err.pgerror or db_err}"}), 500

        # --- LÓGICA DELETE (PARA EL BOTÓN 'ELIMINAR') ---
        if request.method == 'DELETE':
            print(f"\n--- Iniciando DELETE (lógico) para Informe ID: {informe_id} ---", flush=True)
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur: 
                try:
                    # 1. Marcar recomendaciones "hijo" como inactivas
                    print(f"Marcando hijos de informe {informe_id} como inactivos...")
                    sql_delete_recs = """
                        UPDATE recomendaciones SET activo = FALSE, fecha_actualizacion = NOW() 
                        WHERE informe_id = %s AND activo = TRUE;
                    """
                    cur.execute(sql_delete_recs, (informe_id,))
                    recs_rowcount = cur.rowcount
                    print(f"{recs_rowcount} recomendaciones marcadas como inactivas.")

                    # 2. Marcar informe "padre" como inactivo
                    # (Se elimina la lógica de contadores)
                    sql_delete_informe = """
                        UPDATE informes 
                        SET activo = FALSE, 
                            fecha_actualizacion = NOW(),
                            usuario_actualizacion = %s
                        WHERE informe_ssot_id = %s;
                    """
                    print(f"Ejecutando UPDATE informe activo=FALSE...")
                    cur.execute(sql_delete_informe, ('usuario_sistema_delete', informe_id))
                    
                    informe_rowcount = cur.rowcount
                    if informe_rowcount == 0:
                        conn.rollback() 
                        print(f"!!! Error: Informe {informe_id} no encontrado para eliminar. Rollback.", flush=True)
                        return jsonify({"error": "Informe no encontrado para eliminar."}), 404

                    # 3. Si todo fue bien, confirmar
                    conn.commit()
                    print(f"Informe {informe_id} y {recs_rowcount} recomendaciones asociadas marcados como inactivos. Commit exitoso.", flush=True)
                    return jsonify({"message": "Informe y recomendaciones asociadas eliminados."})

                except psycopg2.Error as db_err:
                    conn.rollback()
                    print(f"!!! Error de BD durante el proceso DELETE para informe {informe_id}: {db_err}", flush=True)
                    return jsonify({"error": f"Error de base de datos al eliminar: {db_err.pgerror or db_err}"}), 500

    except Exception as e:
        conn.rollback() 
        import traceback 
        print(f"!!! Error general en manejar_informe_detalle para ID {informe_id}: {traceback.format_exc()}", flush=True)
        return jsonify({"error": f"Error interno inesperado del servidor: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()
            print(f"--- Conexión BD cerrada para manejar_informe_detalle (ID: {informe_id}) ---", flush=True)

        

@app.route('/api/recomendaciones', methods=['POST'])
@app.route('/api/recomendaciones', methods=['POST'])
def crear_recomendacion():
    """
    Crea una nueva recomendación.
    VERSIÓN REFACTORIZADA (SSOT PURO):
    Ya no se actualiza el contador 'emitidas' del informe padre.
    Se corrigen los nombres de las columnas (informe_ssot_id, etc.).
    """
    data = request.form.to_dict()
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur: 
            
            id_informe_str = data.get('id_informe')
            id_institucion_str = None
            id_tipo_organo_str = None
            id_informe_db = None 

            if id_informe_str and id_informe_str.isdigit():
                # --- LÓGICA ASOCIADA ---
                id_informe_db = int(id_informe_str)
                print(f"[Crear Rec] Asociada al informe ID: {id_informe_db}", flush=True)
                # --- CORRECCIÓN (SSOT PURO): Nombres de columna actualizados ---
                cur.execute("SELECT institucion_id, id_tipo_organo FROM informes WHERE informe_ssot_id = %s", (id_informe_db,))
                informe_data = cur.fetchone()
                if not informe_data:
                    return jsonify({"error": "El informe asociado no existe."}), 404
                id_institucion_str = str(informe_data['institucion_id']) 
                id_tipo_organo_str = str(informe_data['id_tipo_organo']) 
            else:
                # --- LÓGICA INDEPENDIENTE ---
                print("[Crear Rec] Recomendación Independiente.", flush=True)
                id_institucion_str = data.get('id_institucion')
                id_tipo_organo_str = data.get('id_tipo_organo')
                id_informe_db = None 

            try:
                if not id_institucion_str or not id_tipo_organo_str:
                        raise ValueError("ID de Institución u Órgano Colegiado faltante.")
                id_institucion_db = int(id_institucion_str)
                id_tipo_organo_db = int(id_tipo_organo_str)
            except (ValueError, TypeError):
                 return jsonify({"error": "ID de Institución u Órgano Colegiado inválido."}), 400

            fecha_compromiso_db = data.get('fecha_compromiso') or None

            # 1. Insertar la recomendación
            # --- CORRECCIÓN (SSOT PURO): 'id_informe' ahora es 'informe_id' ---
            sql_insert_rec = """
                INSERT INTO recomendaciones (
                    informe_id, id_institucion, id_tipo_organo, descripcion, 
                    area_responsable_atencion, fecha_emision, fecha_compromiso, 
                    estatus, prioridad, tipo_recomendacion, usuario_creacion
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_recomendacion;
            """
            new_id = None
            try:
                 print("Ejecutando INSERT recomendacion...", flush=True)
                 cur.execute(sql_insert_rec, (
                    id_informe_db, id_institucion_db, id_tipo_organo_db, data.get('descripcion', ''), 
                    data.get('area_responsable_atencion', ''), data.get('fecha_emision'), fecha_compromiso_db,
                    data.get('estatus', 'Pendiente'), data.get('prioridad', 'Media'), 
                    data.get('tipo_recomendacion', 'Correctiva'), 'usuario_sistema'
                 ))
                 new_id = cur.fetchone()[0]
                 print(f"INSERT recomendacion exitoso. Nuevo ID: {new_id}", flush=True)
            except psycopg2.Error as db_err:
                 conn.rollback() 
                 print(f"!!! Error de BD al insertar recomendación: {db_err}", flush=True)
                 if "fk_recomendacion_institucion_organo" in str(db_err) or "fk_directorio_organo_valido" in str(db_err):
                      return jsonify({"error": f"La combinación Institución ({id_institucion_db}) y Órgano ({id_tipo_organo_db}) no es válida."}), 400
                 else:
                      return jsonify({"error": f"Error de base de datos: {db_err.pgerror or db_err}"}), 500
            
            # --- INICIO DE CORRECCIÓN (SSOT PURO) ---
            # 2. Lógica de actualizar contador ELIMINADA.
            # (El bloque 'if id_informe_db:' que hacía 'UPDATE informes SET...' se ha quitado)
            print("[SSOT Puro] Lógica de contador de informes omitida.")
            # --- FIN DE CORRECCIÓN ---
            
            conn.commit()
            print("Commit exitoso para crear_recomendacion.", flush=True)
            return jsonify({"message": "Recomendación creada.", "id_recomendacion": new_id}), 201

    except Exception as e:
        conn.rollback()
        import traceback 
        print(f"!!! Error general en crear_recomendacion: {traceback.format_exc()}", flush=True)
        return jsonify({"error": f"Error interno inesperado del servidor: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()
            print(f"--- Conexión BD cerrada para crear_recomendacion ---", flush=True)






@app.route('/api/recomendaciones/<int:rec_id>', methods=['GET', 'PUT', 'DELETE'])
def manejar_recomendacion_detalle_crud(rec_id):
    """
    Controlador CRUD para Recomendaciones.
    VERSIÓN REFACTORIZADA (FASE B - PASO 1 - CORRECCIÓN DEFINITIVA):
    - El bloque PUT ahora usa una construcción de SQL dinámica.
    - SOLO actualiza los campos de asociación (institucion, organo, informe)
      si se proporcionan explícitamente en el formulario.
    - Esto evita que una edición de una recomendación asociada
      borre sus IDs de asociación a NULL.
    """
    conn = get_db_connection()
    try:
        if request.method == 'GET':
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                sql = """
                    SELECT rec.*, inst.id_institucion, resp.id_responsable, r.id_ramo, d.id_dg
                    FROM recomendaciones rec
                    LEFT JOIN instituciones inst ON rec.id_institucion = inst.id_institucion
                    LEFT JOIN responsables resp ON inst.id_responsable = resp.id_responsable
                    LEFT JOIN ramos r ON inst.id_ramo = r.id_ramo
                    LEFT JOIN dgs d ON r.id_dg = d.id_dg
                    WHERE rec.id_recomendacion = %s AND rec.activo = TRUE; 
                """
                cur.execute(sql, (rec_id,))
                recomendacion = cur.fetchone()
                if not recomendacion:
                    return jsonify({"error": "Recomendación no encontrada o inactiva."}), 404
                return jsonify(dict(recomendacion))

        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur: 
            
            if request.method == 'PUT':
                print(f"\n--- Iniciando PUT para Recomendación ID: {rec_id} ---") 
                data = request.form.to_dict()
                
                # --- INICIO DE CORRECCIÓN (Regresión B-1.2) ---
                # Construcción dinámica de la consulta UPDATE
                
                update_fields = [
                    "descripcion = %s", "area_responsable_atencion = %s", "fecha_emision = %s",
                    "fecha_compromiso = %s", "estatus = %s", "prioridad = %s", 
                    "tipo_recomendacion = %s", "fecha_actualizacion = NOW()",
                    "usuario_actualizacion = %s"
                ]
                
                params = [
                    data.get('descripcion',''), data.get('area_responsable_atencion',''), data.get('fecha_emision'),
                    data.get('fecha_compromiso') or None, data.get('estatus', 'Pendiente'), data.get('prioridad', 'Media'), 
                    data.get('tipo_recomendacion', 'Correctiva'), 'usuario_sistema_edit'
                ]
                
                # --- Lógica Inteligente de Asociación ---
                # Solo actualizar los campos de asociación si se proporcionan en el formulario.
                # Esto es clave para las recomendaciones independientes.
                
                if 'id_institucion' in data and data['id_institucion']:
                    update_fields.append("id_institucion = %s")
                    params.append(data['id_institucion'])
                
                if 'id_tipo_organo' in data and data['id_tipo_organo']:
                    update_fields.append("id_tipo_organo = %s")
                    params.append(data['id_tipo_organo'])
                
                # 'id_informe' es especial: si viene vacío, SÍ queremos actualizar a NULL
                # (en caso de que se desasocie, aunque esa lógica no está implementada,
                # pero es más seguro manejarlo así).
                if 'id_informe' in data:
                    update_fields.append("informe_id = %s")
                    params.append(data['id_informe'] or None)

                # Añadir el ID de la recomendación al final para el WHERE
                params.append(rec_id)
                
                sql_update = f"UPDATE recomendaciones SET {', '.join(update_fields)} WHERE id_recomendacion = %s;"
                
                try:
                    print(f"Ejecutando UPDATE dinámico en recomendaciones para ID {rec_id}...")
                    cur.execute(sql_update, tuple(params))
                    print("UPDATE de recomendación ejecutado.")
                # --- FIN DE CORRECCIÓN ---
                
                except psycopg2.Error as db_err:
                    conn.rollback()
                    print(f"!!! Error de BD al actualizar recomendación {rec_id}: {db_err}")
                    return jsonify({"error": f"Error de base de datos al actualizar: {db_err.pgerror or db_err}"}), 500

                print("[SSOT Puro] Lógica de contador de informes omitida.")

                print("Intentando hacer commit de la transacción...")
                conn.commit()
                print("Commit exitoso.")
                return jsonify({"message": "Recomendación actualizada.", "id_recomendacion": rec_id}), 200

            if request.method == 'DELETE':
                print(f"\n--- Iniciando DELETE (lógico) para Recomendación ID: {rec_id} ---")
                with conn.cursor() as cur_delete:
                    sql_delete = "UPDATE recomendaciones SET activo = FALSE, fecha_actualizacion = NOW(), usuario_actualizacion = %s WHERE id_recomendacion = %s;"
                    try:
                        print(f"Ejecutando UPDATE activo=FALSE para ID {rec_id}...")
                        cur_delete.execute(sql_delete, ('usuario_sistema_delete', rec_id))
                        conn.commit()
                        print(f"Recomendación {rec_id} marcada como inactiva. Commit exitoso.")
                        return jsonify({"message": "Recomendación eliminada."}), 200
                    except psycopg2.Error as db_err:
                        conn.rollback()
                        print(f"!!! Error de BD al eliminar recomendación {rec_id}: {db_err}")
                        return jsonify({"error": f"Error de base de datos al eliminar: {db_err.pgerror or db_err}"}), 500

    except Exception as e:
        print(f"!!! Error general en manejar_recomendacion_detalle_crud para ID {rec_id}. Haciendo rollback. Error: {traceback.format_exc()}")
        conn.rollback() 
        return jsonify({"error": f"Error interno inesperado del servidor: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()
            print(f"--- Conexión BD cerrada para manejar_recomendacion_detalle_crud (ID: {rec_id}) ---")



@app.route('/api/reportes/informes', methods=['POST'])
def generar_reporte_informes_v2():
    filters = request.json
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            sql = """
                SELECT
                    i.id_informe,
                    resp.nombre as nombre_responsable,
                    UPPER(inst.nombre_institucion) as institucion,
                    tog.nombre as nombre_organo,
                    ti.nombre_informe,
                    i.periodo_reportado,
                    i.periodicidad,
                    i.fecha_informe,
                    i.descripcion,
                    i.recomendaciones_emitidas,
                    i.recomendaciones_atendidas
                FROM informes i
                JOIN instituciones inst ON i.id_institucion = inst.id_institucion
                JOIN tipos_organo_gobierno tog ON i.id_tipo_organo = tog.id_tipo_organo
                JOIN tipos_informe ti ON i.id_tipo_informe = ti.id_tipo_informe
                JOIN responsables resp ON inst.id_responsable = resp.id_responsable
            """
            where_clauses = ["i.activo = TRUE"]
            params = []

            if filters.get('periodo_reportado'):
                where_clauses.append("i.periodo_reportado = %s")
                params.append(filters['periodo_reportado'])
            if filters.get('responsable_id'):
                where_clauses.append("inst.id_responsable = %s")
                params.append(filters['responsable_id'])
            if filters.get('institucion_id'):
                where_clauses.append("inst.id_institucion = %s")
                params.append(filters['institucion_id'])
            if filters.get('organo_id'):
                where_clauses.append("tog.id_tipo_organo = %s")
                params.append(filters['organo_id'])
            if filters.get('tipo_informe_id'):
                where_clauses.append("i.id_tipo_informe = %s")
                params.append(filters['tipo_informe_id'])

            if where_clauses:
                sql += " WHERE " + " AND ".join(where_clauses)
            
            sql += " ORDER BY i.fecha_informe DESC;"
            cur.execute(sql, tuple(params))
            report_data = [dict(row) for row in cur.fetchall()]
            return jsonify(report_data)

    except Exception as e:
        print(f"Error en reporte de informes: {traceback.format_exc()}")
        return jsonify({"error": "Error al generar el reporte"}), 500
    finally:
        if conn:
            conn.close()


# =============================================================
# === INICIO SPRINT 6: MÓDULO DE REPORTERÍA BIMODAL (CORREGIDO 6.1) ===
# =============================================================

def build_report_filters(filters):
    """
    Función auxiliar reutilizable para construir las cláusulas WHERE y los parámetros
    para los reportes bimodales, basados en los filtros globales.
    CORRECCIÓN SPRINT 6.1: filters.get() no acepta 'type=int'. La conversión se hace al añadir a params.
    """
    base_joins = """
        FROM instituciones i
        JOIN ramos r ON i.id_ramo = r.id_ramo
        JOIN dgs d ON r.id_dg = d.id_dg
        LEFT JOIN responsables resp ON i.id_responsable = resp.id_responsable
    """
    where_conditions = ["i.activo = TRUE"]
    params = []

    # 1. Obtener valores como strings (o None)
    filter_dg_id = filters.get('id_dg')
    filter_ramo_id = filters.get('id_ramo')
    filter_responsable_id = filters.get('responsable_id')
    filter_institucion_id = filters.get('institucion_id')
    
    # 2. Añadir a la consulta y convertir a int solo si existen
    if filter_dg_id:
        where_conditions.append("d.id_dg = %s")
        params.append(int(filter_dg_id))
    if filter_ramo_id:
        where_conditions.append("r.id_ramo = %s")
        params.append(int(filter_ramo_id))
    if filter_responsable_id:
        where_conditions.append("i.id_responsable = %s")
        params.append(int(filter_responsable_id))
    if filter_institucion_id:
        where_conditions.append("i.id_institucion = %s")
        params.append(int(filter_institucion_id))

    where_string = " AND ".join(where_conditions)
    
    # CTE (Common Table Expression) que define las instituciones filtradas
    cte_instituciones_filtradas = f"""
        WITH InstitucionesFiltradas AS (
            SELECT i.id_institucion, i.nombre_institucion, i.siglas, r.nombre_ramo, d.siglas_dg, resp.nombre as nombre_responsable
            {base_joins}
            WHERE {where_string}
        )
    """
    return cte_instituciones_filtradas, tuple(params)





@app.route('/api/reportes/recomendaciones_full', methods=['GET'])
def get_reporte_recs_full():
    conn = get_db_connection()
    try:
        cte, params = build_report_filters(request.args)
        año = request.args.get('año')
        
        sql = f"""
            {cte}
            SELECT 
                r.id_recomendacion, 
                inst.nombre_institucion, 
                inst.siglas as siglas_institucion,
                inst.siglas_dg,
                inst.nombre_ramo,
                inst.nombre_responsable,
                tog.nombre as nombre_organo,
                r.descripcion, 
                r.area_responsable_atencion,
                r.estatus, 
                r.prioridad,
                r.tipo_recomendacion,
                r.fecha_compromiso,
                r.informe_id,
                
                CASE 
                    WHEN r.informe_id IS NOT NULL THEN inf.fecha_informe 
                    ELSE r.fecha_emision 
                END as fecha_emision,

                -- CORRECCIÓN FINAL TIPO INFORME
                -- Si tiene informe padre, trae su nombre. Si no, es Independiente.
                CASE 
                    WHEN r.informe_id IS NOT NULL THEN COALESCE(ti.nombre_informe, 'Informe Sin Tipo Definido')
                    ELSE 'Independiente'
                END as origen

            FROM recomendaciones r
            JOIN InstitucionesFiltradas inst ON r.id_institucion = inst.id_institucion
            JOIN tipos_organo_gobierno tog ON r.id_tipo_organo = tog.id_tipo_organo
            LEFT JOIN informes inf ON r.informe_id = inf.informe_ssot_id
            LEFT JOIN tipos_informe ti ON inf.tipo_informe_id = ti.id_tipo_informe 
            WHERE r.activo = TRUE
        """
        
        if año:
            sql += " AND ((inf.anio_informe = %s) OR (r.informe_id IS NULL AND EXTRACT(YEAR FROM r.fecha_emision) = %s))"
            params = params + (int(año), int(año))
        
        sql += " ORDER BY inst.nombre_institucion, fecha_emision DESC;"
        
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(sql, params)
            return jsonify([dict(row) for row in cur.fetchall()])
            
    except Exception as e:
        import traceback
        print(f"Error en get_reporte_recs_full: {traceback.format_exc()}")
        return jsonify({"error": f"Error interno: {str(e)}"}), 500
    finally: conn.close()


@app.route('/api/reportes/cumplimiento_full', methods=['GET'])
def get_reporte_cumplimiento():
    # SPRINT 7: REFACTORIZADO (Incluye Extraordinarias)
    conn = get_db_connection()
    try:
        filters = request.args
        año = int(filters.get('año')) if filters.get('año') else None
        if not año: return jsonify({"error": "Año requerido"}), 400
        
        cte, params = build_report_filters(filters)
        params = params + (año, str(año))
        
        sql = f"""
            {cte}
            , DesgloseSesiones AS (
                SELECT 
                    id_institucion, 
                    COUNT(CASE WHEN id_tipo_sesion = 1 THEN 1 END) as sesiones_ordinarias,
                    COUNT(CASE WHEN id_tipo_sesion = 2 THEN 1 END) as sesiones_extraordinarias
                FROM sesiones
                WHERE id_institucion IN (SELECT id_institucion FROM InstitucionesFiltradas)
                AND estatus = 'Realizada' AND año = %s
                GROUP BY id_institucion
            )
            , InformesEntregados AS (
                SELECT institucion_id, COUNT(DISTINCT tipo_informe_id) as informes_entregados
                FROM informes
                WHERE institucion_id IN (SELECT id_institucion FROM InstitucionesFiltradas)
                AND periodo_reportado = %s AND activo = TRUE
                GROUP BY institucion_id
            )
            SELECT 
                i.siglas_dg, i.nombre_ramo, i.nombre_responsable, i.siglas as siglas_institucion, i.nombre_institucion,
                
                COALESCE(ds.sesiones_ordinarias, 0) as sesiones_realizadas,      -- Mantenemos nombre clave para compatibilidad
                COALESCE(ds.sesiones_extraordinarias, 0) as sesiones_extraordinarias, -- NUEVA COLUMNA
                COALESCE(ie.informes_entregados, 0) as informes_entregados

            FROM InstitucionesFiltradas i
            LEFT JOIN DesgloseSesiones ds ON i.id_institucion = ds.id_institucion
            LEFT JOIN InformesEntregados ie ON i.id_institucion = ie.institucion_id
            ORDER BY i.siglas_dg, i.nombre_ramo, i.nombre_institucion;
        """
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(sql, params)
            return jsonify([dict(row) for row in cur.fetchall()])
    finally: conn.close()

@app.route('/api/reportes/actividad_full', methods=['GET'])
def get_reporte_actividad():
    """
    Devuelve el volcado de datos completo (data dump) de sesiones
    basado en los filtros globales.
    """
    conn = get_db_connection()
    try:
        filters = request.args.to_dict()
        # CORRECCIÓN SPRINT 6.1: filters.get() no acepta 'type=int'
        filter_año_str = filters.get('año')
        filter_año = int(filter_año_str) if filter_año_str and filter_año_str.isdigit() else None
        
        cte_inst, base_params = build_report_filters(filters)
        
        sql_params = list(base_params)
        sql_clauses = [
            "s.id_institucion IN (SELECT id_institucion FROM InstitucionesFiltradas)",
            "s.activo = TRUE"
        ]

        if filter_año:
            sql_clauses.append("s.año = %s")
            sql_params.append(filter_año)
            
        sql_where_string = " AND ".join(sql_clauses)

        sql_query = f"""
            {cte_inst}
            SELECT 
                s.id_sesion,
                inst.siglas_dg,
                inst.nombre_ramo,
                inst.nombre_responsable,
                inst.siglas as siglas_institucion,
                inst.nombre_institucion,
                tog.nombre as nombre_organo,
                ts.nombre_sesion as tipo_sesion,
                s.año,
                s.numero_ordinal,
                s.nombre_oficial_sesion,
                s.estatus,
                s.fecha_programada,
                s.fecha_realizada
            FROM sesiones s
            JOIN InstitucionesFiltradas inst ON s.id_institucion = inst.id_institucion
            JOIN tipos_organo_gobierno tog ON s.id_tipo_organo = tog.id_tipo_organo
            JOIN tipos_sesion ts ON s.id_tipo_sesion = ts.id_tipo_sesion
            WHERE {sql_where_string}
            ORDER BY inst.nombre_institucion, s.año DESC, s.fecha_realizada DESC;
        """
        
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(sql_query, tuple(sql_params))
            data = [dict(row) for row in cur.fetchall()]
            return jsonify(data)
            
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()

# =============================================================
# === FIN SPRINT 6: MÓDULO DE REPORTERÍA BIMODAL ===
# =============================================================


@app.route('/api/reportes/bitacora_full', methods=['GET'])
def get_reporte_bitacora_informes():
    """
    Endpoint exclusivo para la Bitácora de Auditoría de Entregables.
    Calcula 'emitidas' y 'atendidas' al vuelo usando subconsultas para garantizar integridad.
    """
    conn = get_db_connection()
    try:
        # Reutilizamos la lógica de filtros globales
        cte, params = build_report_filters(request.args)
        
        # Filtro específico de Año para el informe (usamos periodo_reportado o fecha_informe)
        filter_year = request.args.get('año')
        sql_year_filter = ""
        if filter_year:
            sql_year_filter = " AND i.periodo_reportado = %s "
            params = params + (filter_year,)

        sql = f"""
            {cte}
            SELECT 
                i.informe_ssot_id,
                inst.siglas_dg,
                inst.nombre_ramo,
                inst.nombre_responsable,
                inst.nombre_institucion,
                inst.siglas as siglas_institucion,
                ti.nombre_informe as tipo_informe,
                i.periodo_reportado,
                i.fecha_informe,
                
                -- Subconsulta Correlacionada: Recomendaciones Emitidas (Vivas)
                (SELECT COUNT(*) 
                 FROM recomendaciones r 
                 WHERE r.informe_id = i.informe_ssot_id AND r.activo = TRUE
                ) as recs_emitidas,

                -- Subconsulta Correlacionada: Recomendaciones Atendidas (Vivas)
                (SELECT COUNT(*) 
                 FROM recomendaciones r 
                 WHERE r.informe_id = i.informe_ssot_id AND r.activo = TRUE 
                 AND r.estatus IN ('Completada', 'Cerrada', 'Atendida')
                ) as recs_atendidas

            FROM informes i
            JOIN InstitucionesFiltradas inst ON i.institucion_id = inst.id_institucion
            JOIN tipos_informe ti ON i.tipo_informe_id = ti.id_tipo_informe
            WHERE i.activo = TRUE {sql_year_filter}
            ORDER BY inst.siglas_dg, inst.nombre_institucion, i.fecha_informe DESC;
        """
        
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(sql, params)
            data = [dict(row) for row in cur.fetchall()]
            return jsonify(data)

    except Exception as e:
        print(f"Error en Bitácora Informes: {traceback.format_exc()}")
        return jsonify({"error": f"Error interno: {str(e)}"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/reportes/balance_anual', methods=['GET'])
def get_reporte_balance_anual():
    conn = get_db_connection()
    try:
        cte_filtros, params_filtros = build_report_filters(request.args)
        año_str = request.args.get('año')
        if not año_str: return jsonify({"error": "El año es requerido"}), 400
        año = int(año_str)
        final_params = params_filtros + (año, año, año)

        sql = f"""
            {cte_filtros}
            , DataSesiones AS (
                SELECT 
                    s.id_tipo_sesion, -- 1=Ord, 2=Ext
                    s.id_tipo_organo, -- 1=COCODI, Otros=Gobierno
                    i.id_naturaleza   -- 1=Dep, 2=Desc, 3=Ent, 4=Otros
                FROM sesiones s
                JOIN InstitucionesFiltradas ifilt ON s.id_institucion = ifilt.id_institucion
                JOIN instituciones i ON s.id_institucion = i.id_institucion
                WHERE s.año = %s AND s.estatus = 'Realizada' AND s.activo = TRUE
            ),
            DataRecs AS (
                SELECT r.estatus, r.id_tipo_organo
                FROM recomendaciones r
                LEFT JOIN informes inf ON r.informe_id = inf.informe_ssot_id
                WHERE r.id_institucion IN (SELECT id_institucion FROM InstitucionesFiltradas)
                AND r.activo = TRUE
                AND ((inf.anio_informe = %s) OR (r.informe_id IS NULL AND EXTRACT(YEAR FROM r.fecha_emision) = %s))
            )
            SELECT 
                -- 1. Totales Generales
                (SELECT COUNT(*) FROM DataSesiones) as total_sesiones,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_sesion = 1) as total_sesiones_ord,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_sesion = 2) as total_sesiones_ext,

                -- 2. Totales por Órgano (Cabeceras)
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_tipo_sesion = 1) as ses_ord_cocodi,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_tipo_sesion = 2) as ses_ext_cocodi,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_tipo_sesion = 1) as ses_ord_gobierno,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_tipo_sesion = 2) as ses_ext_gobierno,

                -- 3. DESGLOSE MICRO: COCODI (Naturaleza + Tipo)
                -- Dependencias
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_naturaleza = 1) as cocodi_dep_total,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_naturaleza = 1 AND id_tipo_sesion = 1) as cocodi_dep_ord,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_naturaleza = 1 AND id_tipo_sesion = 2) as cocodi_dep_ext,
                -- Desconcentrados
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_naturaleza = 2) as cocodi_desc_total,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_naturaleza = 2 AND id_tipo_sesion = 1) as cocodi_desc_ord,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_naturaleza = 2 AND id_tipo_sesion = 2) as cocodi_desc_ext,
                -- Entidades
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_naturaleza = 3) as cocodi_ent_total,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_naturaleza = 3 AND id_tipo_sesion = 1) as cocodi_ent_ord,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_naturaleza = 3 AND id_tipo_sesion = 2) as cocodi_ent_ext,
                -- Otros
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_naturaleza NOT IN (1,2,3)) as cocodi_otros_total,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_naturaleza NOT IN (1,2,3) AND id_tipo_sesion = 1) as cocodi_otros_ord,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo = 1 AND id_naturaleza NOT IN (1,2,3) AND id_tipo_sesion = 2) as cocodi_otros_ext,

                -- 4. DESGLOSE MICRO: GOBIERNO (Naturaleza + Tipo)
                -- Dependencias
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_naturaleza = 1) as gob_dep_total,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_naturaleza = 1 AND id_tipo_sesion = 1) as gob_dep_ord,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_naturaleza = 1 AND id_tipo_sesion = 2) as gob_dep_ext,
                -- Desconcentrados
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_naturaleza = 2) as gob_desc_total,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_naturaleza = 2 AND id_tipo_sesion = 1) as gob_desc_ord,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_naturaleza = 2 AND id_tipo_sesion = 2) as gob_desc_ext,
                -- Entidades
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_naturaleza = 3) as gob_ent_total,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_naturaleza = 3 AND id_tipo_sesion = 1) as gob_ent_ord,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_naturaleza = 3 AND id_tipo_sesion = 2) as gob_ent_ext,
                -- Otros
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_naturaleza NOT IN (1,2,3)) as gob_otros_total,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_naturaleza NOT IN (1,2,3) AND id_tipo_sesion = 1) as gob_otros_ord,
                (SELECT COUNT(*) FROM DataSesiones WHERE id_tipo_organo != 1 AND id_naturaleza NOT IN (1,2,3) AND id_tipo_sesion = 2) as gob_otros_ext,

                -- 5. Recomendaciones (Igual)
                (SELECT COUNT(*) FROM DataRecs) as recs_total_emitidas,
                (SELECT COUNT(*) FROM DataRecs WHERE estatus IN ('Completada', 'Cerrada', 'Atendida')) as recs_total_atendidas,
                (SELECT COUNT(*) FROM DataRecs WHERE id_tipo_organo = 1) as recs_cocodi_emitidas,
                (SELECT COUNT(*) FROM DataRecs WHERE id_tipo_organo = 1 AND estatus IN ('Completada', 'Cerrada', 'Atendida')) as recs_cocodi_atendidas,
                (SELECT COUNT(*) FROM DataRecs WHERE id_tipo_organo != 1) as recs_gob_emitidas,
                (SELECT COUNT(*) FROM DataRecs WHERE id_tipo_organo != 1 AND estatus IN ('Completada', 'Cerrada', 'Atendida')) as recs_gob_atendidas
        """
        
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(sql, final_params)
            row = cur.fetchone()
            data = dict(row) if row else {}
            return jsonify(data)

    except Exception as e:
        print(f"Error en Balance Anual: {traceback.format_exc()}")
        return jsonify({"error": f"Error interno: {str(e)}"}), 500
    finally:
        if conn: conn.close()



# =============================================================
# MÓDULO DE DIRECTORIO (CRUD COMPLETO)
# =============================================================

@app.route('/api/directorio', methods=['GET', 'POST'])
def manejar_directorio():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            
            # --- GET: Listar Contactos ---
            if request.method == 'GET':
                institucion_id = request.args.get('institucion_id', type=int)
                organo_id = request.args.get('organo_id') # Recibimos como string

                # Validación básica
                if not institucion_id:
                    return jsonify([])

                sql = """
                    SELECT 
                        c.id_contacto, c.id_institucion, c.id_tipo_organo,
                        c.nombre_contacto, c.telefono, c.extension, c.email, c.movil, c.direccion,
                        COALESCE(tog.nombre, 'General / Institución') as nombre_organo
                    FROM directorio_contactos c
                    LEFT JOIN tipos_organo_gobierno tog ON c.id_tipo_organo = tog.id_tipo_organo
                    WHERE c.id_institucion = %s AND c.activo = TRUE
                """
                params = [institucion_id]

                # --- CORRECCIÓN DEL FILTRO '0' vs NULL ---
                if organo_id:
                    if organo_id == '0':
                        # Si es '0', buscamos explícitamente los NULL (General)
                        sql += " AND c.id_tipo_organo IS NULL"
                    else:
                        # Si es otro número, buscamos ese ID específico
                        sql += " AND c.id_tipo_organo = %s"
                        params.append(int(organo_id))
                
                sql += " ORDER BY c.nombre_contacto;"
                
                cur.execute(sql, tuple(params))
                contactos = [dict(row) for row in cur.fetchall()]
                return jsonify(contactos)

            # --- POST: Crear Contacto (Sin cambios, se mantiene igual) ---
            if request.method == 'POST':
                # ... (resto del código del POST igual que antes) ...
                data = request.form.to_dict()
                id_tipo_organo_val = data.get('id_tipo_organo')
                if not id_tipo_organo_val or id_tipo_organo_val == '0':
                    id_tipo_organo_db = None
                else:
                    id_tipo_organo_db = int(id_tipo_organo_val)

                sql_insert = """
                    INSERT INTO directorio_contactos (
                        id_institucion, id_tipo_organo, nombre_contacto, 
                        telefono, extension, email, movil, direccion, usuario_creacion
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'sistema')
                    RETURNING id_contacto;
                """
                cur.execute(sql_insert, (
                    data['id_institucion'],
                    id_tipo_organo_db, # Usa la variable procesada
                    data['nombre_contacto'],
                    data.get('telefono'),
                    data.get('extension'),
                    data.get('email'),
                    data.get('movil'),
                    data.get('direccion')
                ))
                new_id = cur.fetchone()[0]
                conn.commit()
                return jsonify({"message": "Contacto creado exitosamente.", "id_contacto": new_id}), 201

    except psycopg2.Error as e:
        # ... (manejo de errores igual) ...
        conn.rollback()
        return jsonify({"error": f"Error de base de datos: {e.pgerror}"}), 500
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/api/directorio/<int:id_contacto>', methods=['PUT', 'DELETE'])
def manejar_detalle_contacto(id_contacto):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            
            # --- PUT: Actualizar Contacto ---
            if request.method == 'PUT':
                data = request.form.to_dict()
                
                # Lógica de traducción '0' -> NULL
                id_tipo_organo_val = data.get('id_tipo_organo')
                if not id_tipo_organo_val or id_tipo_organo_val == '0':
                    id_tipo_organo_db = None
                else:
                    id_tipo_organo_db = int(id_tipo_organo_val)

                sql_update = """
                    UPDATE directorio_contactos SET
                        id_tipo_organo = %s,
                        nombre_contacto = %s,
                        telefono = %s,
                        extension = %s,
                        email = %s,
                        movil = %s,
                        direccion = %s,
                        fecha_actualizacion = NOW(),
                        usuario_actualizacion = 'sistema_edit'
                    WHERE id_contacto = %s
                """
                cur.execute(sql_update, (
                    id_tipo_organo_db,
                    data['nombre_contacto'],
                    data.get('telefono'),
                    data.get('extension'),
                    data.get('email'),
                    data.get('movil'),
                    data.get('direccion'),
                    id_contacto
                ))
                conn.commit()
                return jsonify({"message": "Contacto actualizado."})

            # --- DELETE: Borrado Lógico ---
            if request.method == 'DELETE':
                cur.execute("""
                    UPDATE directorio_contactos 
                    SET activo = FALSE, fecha_actualizacion = NOW(), usuario_actualizacion = 'sistema_delete'
                    WHERE id_contacto = %s
                """, (id_contacto,))
                conn.commit()
                return jsonify({"message": "Contacto eliminado."})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# =============================================================
# EJECUCIÓN DE LA APLICACIÓN
# =============================================================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)