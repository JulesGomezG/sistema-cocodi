from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import psycopg2
import psycopg2.extras
from werkzeug.utils import secure_filename
import datetime

# --- CONFIGURACIÓN DE LA APP ---
app = Flask(__name__, static_folder='frontend', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_db_connection():
    """Crea una conexión a la base de datos."""
    return psycopg2.connect(os.environ.get('DATABASE_URL'))

# =============================================================
# ENDPOINTS PARA SERVIR EL FRONTEND
# =============================================================
@app.route('/')
def serve_index():
    """Sirve el archivo principal index.html."""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_frontend_files(path):
    full_path = os.path.join(app.static_folder, path)
    if os.path.exists(full_path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# =============================================================
# ENDPOINTS PARA MANEJO DE ARCHIVOS
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
                    sql = "INSERT INTO Evidencias (parent_id, parent_type, nombre_archivo, url_almacenamiento) VALUES (%s, %s, %s, %s) RETURNING id_evidencia;"
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
            cur.execute("SELECT * FROM Evidencias WHERE parent_type = %s AND parent_id = %s AND activo = TRUE;", (parent_type, parent_id))
            evidencias = [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify(evidencias)

# =============================================================
# ENDPOINTS DE CATÁLOGOS
# =============================================================
@app.route('/api/responsables', methods=['GET'])
def obtener_responsables():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute('SELECT * FROM Responsables ORDER BY nombre_responsable;')
            responsables = [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify(responsables)

@app.route('/api/instituciones', methods=['GET'])
def obtener_instituciones():
    responsable_id = request.args.get('responsable_id', type=int)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            if responsable_id:
                cur.execute('SELECT * FROM Instituciones WHERE id_responsable = %s ORDER BY nombre_institucion;', (responsable_id,))
            else:
                cur.execute('SELECT * FROM Instituciones ORDER BY nombre_institucion;')
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
                sql = """
                    SELECT T2.* FROM Institucion_Organos AS T1 
                    JOIN Catalogo_Organos_Colegiados AS T2 ON T1.id_organo_colegiado = T2.id_organo_colegiado 
                    WHERE T1.id_institucion = %s ORDER BY T2.nombre_organo;
                """
                cur.execute(sql, (institucion_id,))
            else:
                sql = "SELECT * FROM Catalogo_Organos_Colegiados ORDER BY nombre_organo;"
                cur.execute(sql)
            organos = [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify(organos)
# =============================================================
# ENDPOINTS PARA DIRECTORIO
# =============================================================
@app.route('/api/directorio', methods=['GET'])
def obtener_contactos():
    institucion_id = request.args.get('institucion_id', type=int)
    organo_id_str = request.args.get('organo_id') 

    if not institucion_id:
        return jsonify({"error": "Se requiere institucion_id"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            if organo_id_str is not None:
                if organo_id_str == '0': 
                    sql = "SELECT * FROM Directorio_Contactos WHERE id_institucion = %s AND id_organo_colegiado IS NULL AND activo = TRUE ORDER BY nombre_contacto;"
                    params = (institucion_id,)
                else:
                    sql = "SELECT * FROM Directorio_Contactos WHERE id_institucion = %s AND id_organo_colegiado = %s AND activo = TRUE ORDER BY nombre_contacto;"
                    params = (institucion_id, int(organo_id_str))
            else:
                sql = "SELECT * FROM Directorio_Contactos WHERE id_institucion = %s AND activo = TRUE ORDER BY nombre_contacto;"
                params = (institucion_id,)
            cur.execute(sql, params)
            contactos = [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify(contactos)

@app.route('/api/directorio', methods=['POST'])
def crear_contacto():
    data = request.form.to_dict()
    required_fields = ['id_institucion', 'nombre_contacto']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Faltan campos requeridos"}), 400

    organo_id = data.get('id_organo_colegiado')
    if not organo_id or organo_id == '0':
        organo_id = None
    
    try:
        id_institucion_int = int(data['id_institucion'])
        organo_id_int = int(organo_id) if organo_id is not None else None
    except (ValueError, TypeError):
        return jsonify({"error": "El ID de institución u órgano no es un número válido"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                INSERT INTO Directorio_Contactos (id_institucion, id_organo_colegiado, nombre_contacto, telefono, extension, email, movil, direccion)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_contacto;
            """
            cur.execute(sql, (id_institucion_int, organo_id_int, data['nombre_contacto'], data.get('telefono'), data.get('extension'), data.get('email'), data.get('movil'), data.get('direccion')))
            new_id = cur.fetchone()[0]
            conn.commit()
    except psycopg2.Error as e:
        conn.rollback() 
        return jsonify({"error": f"Error en la base de datos: {e.pgerror}"}), 500
    finally:
        conn.close()
    return jsonify({"message": "Contacto creado.", "id_contacto": new_id}), 201

@app.route('/api/directorio/<int:contacto_id>', methods=['PUT'])
def actualizar_contacto(contacto_id):
    data = request.form.to_dict()
    organo_id = data.get('id_organo_colegiado')
    if organo_id == '0':
        organo_id = None

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                UPDATE Directorio_Contactos
                SET nombre_contacto = %s, telefono = %s, extension = %s, email = %s, movil = %s, direccion = %s, id_organo_colegiado = %s
                WHERE id_contacto = %s;
            """
            cur.execute(sql, (data.get('nombre_contacto'), data.get('telefono'), data.get('extension'), data.get('email'), data.get('movil'), data.get('direccion'), organo_id, contacto_id))
            conn.commit()
    finally:
        conn.close()
    return jsonify({"message": "Contacto actualizado."})

@app.route('/api/directorio/<int:contacto_id>', methods=['DELETE'])
def eliminar_contacto(contacto_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE Directorio_Contactos SET activo = FALSE WHERE id_contacto = %s;", (contacto_id,))
            conn.commit()
    finally:
        conn.close()
    return jsonify({"message": "Contacto eliminado."})

# =============================================================
# ENDPOINT PARA DASHBOARD (VERSIÓN FINAL CORREGIDA)
# =============================================================
@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    conn = get_db_connection()
    try:
        current_year = datetime.date.today().year
        dashboard_data = {}

        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # Lógica del dashboard... (se mantiene como estaba)
            cur.execute("SELECT estatus, COUNT(*) as count FROM Recomendaciones WHERE activo = TRUE GROUP BY estatus;")
            dashboard_data["recomendaciones_stats"] = [dict(row) for row in cur.fetchall()]

            cur.execute("SELECT COUNT(*) AS total, COUNT(CASE WHEN estatus = 'Realizada' THEN 1 END) AS realizadas FROM Calendario_Sesiones WHERE año = %s AND activo = TRUE;", (current_year,))
            sesiones_stats_raw = cur.fetchone()
            total_programadas = sesiones_stats_raw['total'] if sesiones_stats_raw else 0
            realizadas = sesiones_stats_raw['realizadas'] if sesiones_stats_raw else 0
            cumplimiento_pct = (realizadas / total_programadas * 100) if total_programadas > 0 else 0
            dashboard_data["sesiones_stats"] = {"total_programadas": total_programadas, "realizadas": realizadas, "cumplimiento_pct": round(cumplimiento_pct, 2)}

            cur.execute("SELECT i.siglas, COUNT(r.id_recomendacion) AS pendientes_count FROM Recomendaciones r JOIN Instituciones i ON r.id_institucion = i.id_institucion WHERE r.estatus = 'Pendiente' AND r.activo = TRUE GROUP BY i.siglas ORDER BY pendientes_count DESC LIMIT 5;")
            dashboard_data["top_instituciones_pendientes"] = [dict(row) for row in cur.fetchall()]

            cur.execute("SELECT COUNT(*) as vencidas_count FROM Recomendaciones WHERE fecha_compromiso < CURRENT_DATE AND estatus IN ('Pendiente', 'En Proceso') AND activo = TRUE;")
            dashboard_data["vencidas_count"] = cur.fetchone()['vencidas_count']

            cur.execute("SELECT AVG(CURRENT_DATE - fecha_emision) AS avg_age FROM Recomendaciones WHERE estatus IN ('Pendiente', 'En Proceso') AND activo = TRUE;")
            avg_age_result = cur.fetchone()['avg_age']
            dashboard_data["antiguedad_promedio"] = int(avg_age_result) if avg_age_result is not None else 0


            cur.execute("SELECT prioridad, COUNT(*) AS count FROM Recomendaciones WHERE estatus IN ('Pendiente', 'En Proceso') AND activo = TRUE GROUP BY prioridad;")
            dashboard_data["prioridad_stats"] = [dict(row) for row in cur.fetchall()]

            cur.execute("SELECT tipo_recomendacion, COUNT(*) AS count FROM Recomendaciones WHERE activo = TRUE GROUP BY tipo_recomendacion;")
            dashboard_data["tipo_stats"] = [dict(row) for row in cur.fetchall()]
        
            cur.execute("SELECT tipo_sesion, COUNT(*) as count FROM Calendario_Sesiones WHERE año = %s GROUP BY tipo_sesion;", (current_year,))
            dashboard_data["sesiones_por_tipo"] = [dict(row) for row in cur.fetchall()]

            cur.execute("SELECT tipo_informe, COUNT(*) as count FROM Informes_de_Seguimiento GROUP BY tipo_informe;")
            informes_por_tipo = [dict(row) for row in cur.fetchall()]
            dashboard_data["informes_por_tipo"] = informes_por_tipo
            dashboard_data["total_informes"] = sum(item['count'] for item in informes_por_tipo)

            cur.execute("SELECT COUNT(*) AS emitidas, COUNT(CASE WHEN estatus IN ('Cerrada', 'Completada') THEN 1 END) AS atendidas FROM Recomendaciones WHERE activo = TRUE;")
            dashboard_data["recomendaciones_totales"] = dict(cur.fetchone())

            cur.execute("SELECT inf.tipo_informe, COUNT(rec.id_recomendacion) AS count FROM Recomendaciones rec JOIN Informes_de_Seguimiento inf ON rec.id_informe = inf.id_informe WHERE rec.activo = TRUE GROUP BY inf.tipo_informe;")
            dashboard_data["rec_emitidas_por_tipo_informe"] = [dict(row) for row in cur.fetchall()]

            cur.execute("SELECT inf.tipo_informe, COUNT(rec.id_recomendacion) AS count FROM Recomendaciones rec JOIN Informes_de_Seguimiento inf ON rec.id_informe = inf.id_informe WHERE rec.activo = TRUE AND rec.estatus IN ('Cerrada', 'Completada') GROUP BY inf.tipo_informe;")
            dashboard_data["rec_atendidas_por_tipo_informe"] = [dict(row) for row in cur.fetchall()]

        return jsonify(dashboard_data)

    except Exception as e:
        print(f"Error en el endpoint del dashboard: {e}")
        return jsonify({"error": "Error interno del servidor al obtener estadísticas."}), 500
    finally:
        if conn:
            conn.close()

# =============================================================
# ENDPOINTS DE SESIONES
# =============================================================
@app.route('/api/calendario-sesiones', methods=['GET'])
def obtener_o_crear_calendario():
    año = request.args.get('año', type=int)
    institucion_id = request.args.get('institucion_id', type=int)
    organo_id = request.args.get('organo_id', type=int)
    if not all([año, institucion_id, organo_id]): return jsonify({"error": "Faltan parámetros."}), 400
    
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            query = "SELECT cs.*, es.id_ejecucion, es.numero_sesion_oficial, es.fecha_real, es.responsable as responsable_ejecucion FROM Calendario_Sesiones cs LEFT JOIN Ejecucion_Sesiones es ON cs.id_calendario = es.id_calendario WHERE cs.año = %s AND cs.id_institucion = %s AND cs.id_organo_colegiado = %s ORDER BY cs.tipo_sesion DESC, cs.numero_ordinal ASC;"
            cur.execute(query, (año, institucion_id, organo_id))
            sesiones_existentes = cur.fetchall()

            if not any(s['tipo_sesion'] == 'Ordinaria' for s in sesiones_existentes):
                query_insert = "INSERT INTO Calendario_Sesiones (año, id_institucion, id_organo_colegiado, tipo_sesion, numero_ordinal) VALUES (%s, %s, %s, 'Ordinaria', %s);"
                for i in range(1, 5):
                    cur.execute(query_insert, (año, institucion_id, organo_id, i))
                conn.commit()
                cur.execute(query, (año, institucion_id, organo_id))
                sesiones_existentes = cur.fetchall()
            
            calendario = [dict(row) for row in sesiones_existentes]
    finally:
        conn.close()
    return jsonify(calendario)

@app.route('/api/ejecucion-sesiones', methods=['POST'])
def registrar_ejecucion():
    data = request.form.to_dict()
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            sql_insert = "INSERT INTO Ejecucion_Sesiones (id_calendario, numero_sesion_oficial, fecha_real, responsable) VALUES (%s, %s, %s, %s) RETURNING id_ejecucion;"
            cur.execute(sql_insert, (data['id_calendario'], data['numero_sesion_oficial'], data['fecha_real'], data['responsable']))
            new_id = cur.fetchone()[0]
            sql_update = "UPDATE Calendario_Sesiones SET estatus = 'Realizada' WHERE id_calendario = %s;"
            cur.execute(sql_update, (data['id_calendario'],))
            conn.commit()
    finally:
        conn.close()
    return jsonify({"message": "Ejecución registrada.", "id_ejecucion": new_id}), 201
    
@app.route('/api/ejecucion-sesiones/<int:ejecucion_id>', methods=['PUT'])
def actualizar_ejecucion(ejecucion_id):
    data = request.form.to_dict()
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            sql = "UPDATE Ejecucion_Sesiones SET numero_sesion_oficial = %s, fecha_real = %s, responsable = %s WHERE id_ejecucion = %s;"
            cur.execute(sql, (data['numero_sesion_oficial'], data['fecha_real'], data['responsable'], ejecucion_id))
            conn.commit()
    finally:
        conn.close()
    return jsonify({"message": "Ejecución actualizada.", "id_ejecucion": ejecucion_id})


@app.route('/api/sesiones-extraordinarias', methods=['POST'])
def registrar_sesion_extraordinaria():
    data = request.form.to_dict()
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            sql_calendario = "INSERT INTO Calendario_Sesiones (año, id_institucion, id_organo_colegiado, tipo_sesion, estatus) VALUES (%s, %s, %s, 'Extraordinaria', 'Realizada') RETURNING id_calendario;"
            cur.execute(sql_calendario, (data['año'], data['institucion_id'], data['organo_id']))
            id_calendario_nuevo = cur.fetchone()[0]
            sql_ejecucion = "INSERT INTO Ejecucion_Sesiones (id_calendario, numero_sesion_oficial, fecha_real, responsable) VALUES (%s, %s, %s, %s) RETURNING id_ejecucion;"
            cur.execute(sql_ejecucion, (id_calendario_nuevo, data['numero_sesion_oficial'], data['fecha_real'], data['responsable']))
            new_id = cur.fetchone()[0]
            conn.commit()
    finally:
        conn.close()
    return jsonify({"message": "Extraordinaria registrada.", "id_ejecucion": new_id}), 201

# =============================================================
# INICIO DE SECCIÓN CORREGIDA
# =============================================================
@app.route('/api/informes', methods=['GET', 'POST'])
def manejar_informes():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            if request.method == 'GET':
                sql = """
                    SELECT 
                        i.*, 
                        inst.nombre_institucion, inst.siglas,
                        coc.nombre_organo,
                        resp.nombre_responsable,
                        (SELECT COUNT(*) FROM Recomendaciones r WHERE r.id_informe = i.id_informe AND r.activo = TRUE) as recomendaciones_emitidas,
                        (SELECT COUNT(*) FROM Recomendaciones r WHERE r.id_informe = i.id_informe AND r.estatus IN ('Completada', 'Cerrada') AND r.activo = TRUE) as recomendaciones_atendidas
                    FROM Informes_de_Seguimiento i
                    JOIN Instituciones inst ON i.id_institucion = inst.id_institucion
                    JOIN Catalogo_Organos_Colegiados coc ON i.id_organo_colegiado = coc.id_organo_colegiado
                    JOIN Responsables resp ON inst.id_responsable = resp.id_responsable
                """
                filters = ["i.activo = TRUE"]
                params = []
                
                if request.args.get('periodo'):
                    filters.append("i.periodo = %s")
                    params.append(request.args.get('periodo'))
                if request.args.get('responsable_id'):
                    filters.append("resp.id_responsable = %s")
                    params.append(request.args.get('responsable_id', type=int))
                if request.args.get('institucion_id'):
                    filters.append("inst.id_institucion = %s")
                    params.append(request.args.get('institucion_id', type=int))
                if request.args.get('organo_id'):
                    if request.args.get('organo_id') == '0':
                         filters.append("i.id_organo_colegiado IS NULL")
                    else:
                        filters.append("i.id_organo_colegiado = %s")
                        params.append(request.args.get('organo_id', type=int))

                if filters:
                    sql += " WHERE " + " AND ".join(filters)
                
                sql += " ORDER BY i.fecha_informe DESC;"
                
                cur.execute(sql, tuple(params))
                informes = [dict(row) for row in cur.fetchall()]
                return jsonify(informes)
            
            if request.method == 'POST':
                data = request.form.to_dict()
                sql = """
                    INSERT INTO Informes_de_Seguimiento (periodo, id_institucion, id_organo_colegiado, tipo_informe, descripcion, fecha_informe)
                    VALUES (%s, %s, %s, %s, %s, %s) RETURNING id_informe;
                """
                cur.execute(sql, (data['periodo'], data['id_institucion'], data['id_organo_colegiado'], data['tipo_informe'], data.get('descripcion'), data['fecha_informe']))
                new_id = cur.fetchone()[0]
                conn.commit()
                return jsonify({"message": "Informe creado.", "id_informe": new_id}), 201
    except Exception as e:
        conn.rollback()
        print(f"Error en manejar_informes: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500
    finally:
        conn.close()

@app.route('/api/informes/<int:informe_id>', methods=['GET', 'PUT', 'DELETE'])
def manejar_informe_detalle(informe_id):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            if request.method == 'GET':
                cur.execute("SELECT i.*, inst.nombre_institucion, coc.nombre_organo FROM Informes_de_Seguimiento i JOIN Instituciones inst ON i.id_institucion = inst.id_institucion JOIN Catalogo_Organos_Colegiados coc ON i.id_organo_colegiado = coc.id_organo_colegiado WHERE i.id_informe = %s;", (informe_id,))
                informe = dict(cur.fetchone())
                return jsonify(informe)
            if request.method == 'PUT':
                data = request.form.to_dict()
                sql = "UPDATE Informes_de_Seguimiento SET tipo_informe = %s, descripcion = %s, fecha_informe = %s, id_organo_colegiado = %s, periodo = %s WHERE id_informe = %s;"
                cur.execute(sql, (data['tipo_informe'], data.get('descripcion'), data['fecha_informe'], data['id_organo_colegiado'], data['periodo'], informe_id))
                conn.commit()
                return jsonify({"message": "Informe actualizado."})
            if request.method == 'DELETE':
                cur.execute("UPDATE Informes_de_Seguimiento SET activo = FALSE WHERE id_informe = %s;", (informe_id,))
                cur.execute("UPDATE Recomendaciones SET activo = FALSE WHERE id_informe = %s;", (informe_id,))
                conn.commit()
                return jsonify({"message": "Informe y recomendaciones asociadas eliminados."})
    except Exception as e:
        conn.rollback()
        print(f"Error en manejar_informe_detalle: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500
    finally:
        conn.close()

@app.route('/api/recomendaciones', methods=['GET', 'POST'])
def manejar_recomendaciones():
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            if request.method == 'GET':
                sql = """
                    SELECT r.*, inst.siglas, coc.nombre_organo, inst.id_responsable,
                           (SELECT COUNT(*) FROM Evidencias e WHERE e.parent_id = r.id_recomendacion AND e.parent_type = 'recomendacion' AND e.activo = TRUE) as evidencias_count
                    FROM Recomendaciones r
                    JOIN Instituciones inst ON r.id_institucion = inst.id_institucion
                    LEFT JOIN Catalogo_Organos_Colegiados coc ON r.id_organo_colegiado = coc.id_organo_colegiado
                """
                filters = ["r.activo = TRUE"]
                params = []

                if request.args.get('informe_id'):
                    filters.append("r.id_informe = %s")
                    params.append(request.args.get('informe_id', type=int))
                if request.args.get('año'):
                    filters.append("EXTRACT(YEAR FROM r.fecha_emision) = %s")
                    params.append(request.args.get('año', type=int))
                if request.args.get('responsable_id'):
                    filters.append("inst.id_responsable = %s")
                    params.append(request.args.get('responsable_id', type=int))
                if request.args.get('institucion_id'):
                    filters.append("r.id_institucion = %s")
                    params.append(request.args.get('institucion_id', type=int))
                if request.args.get('organo_id'):
                    if request.args.get('organo_id') == '0':
                         filters.append("r.id_organo_colegiado IS NULL")
                    else:
                        filters.append("r.id_organo_colegiado = %s")
                        params.append(request.args.get('organo_id', type=int))
                
                if filters:
                    sql += " WHERE " + " AND ".join(filters)
                sql += " ORDER BY r.fecha_emision DESC;"
                cur.execute(sql, tuple(params))
                recomendaciones = [dict(row) for row in cur.fetchall()]
                return jsonify(recomendaciones)

            if request.method == 'POST':
                data = request.form.to_dict()
                sql = """
                    INSERT INTO Recomendaciones (id_informe, id_institucion, id_organo_colegiado, descripcion, area_responsable_atencion, fecha_emision, fecha_compromiso, estatus, prioridad, tipo_recomendacion)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_recomendacion;
                """
                id_informe = data.get('id_informe') if data.get('id_informe') else None
                fecha_compromiso = data.get('fecha_compromiso') if data.get('fecha_compromiso') else None
                id_organo = data.get('id_organo_colegiado') if data.get('id_organo_colegiado') not in [None, '0', ''] else None

                cur.execute(sql, (id_informe, data['id_institucion'], id_organo, data['descripcion'], data['area_responsable_atencion'], data['fecha_emision'], fecha_compromiso, data.get('estatus', 'Pendiente'), data.get('prioridad', 'Media'), data.get('tipo_recomendacion', 'Correctiva')))
                new_id = cur.fetchone()[0]
                conn.commit()
                return jsonify({"message": "Recomendación creada.", "id_recomendacion": new_id}), 201
    except Exception as e:
        conn.rollback()
        print(f"Error en manejar_recomendaciones: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500
    finally:
        conn.close()

@app.route('/api/recomendaciones/<int:rec_id>', methods=['PUT', 'DELETE'])
def manejar_recomendacion_detalle(rec_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if request.method == 'PUT':
                data = request.form.to_dict()
                sql = """
                    UPDATE Recomendaciones SET
                        descripcion = %s, area_responsable_atencion = %s, fecha_emision = %s, fecha_compromiso = %s, estatus = %s, prioridad = %s, tipo_recomendacion = %s, id_organo_colegiado = %s
                    WHERE id_recomendacion = %s;
                """
                fecha_compromiso = data.get('fecha_compromiso') if data.get('fecha_compromiso') else None
                id_organo = data.get('id_organo_colegiado') if data.get('id_organo_colegiado') not in [None, '0', ''] else None
                cur.execute(sql, (data['descripcion'], data['area_responsable_atencion'], data['fecha_emision'], fecha_compromiso, data['estatus'], data['prioridad'], data['tipo_recomendacion'], id_organo, rec_id))
                conn.commit()
                return jsonify({"message": "Recomendación actualizada."})

            if request.method == 'DELETE':
                cur.execute("UPDATE Recomendaciones SET activo = FALSE WHERE id_recomendacion = %s;", (rec_id,))
                conn.commit()
                return jsonify({"message": "Recomendación eliminada."})
    except Exception as e:
        conn.rollback()
        print(f"Error en manejar_recomendacion_detalle: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500
    finally:
        conn.close()

# =============================================================
# FIN DE SECCIÓN CORREGIDA
# =============================================================

# =============================================================
# ENDPOINTS PARA REPORTERÍA
# =============================================================
@app.route('/api/reportes/recomendaciones', methods=['POST'])
def generar_reporte_recomendaciones():
    # ... (código de reporte)
    return jsonify([])

@app.route('/api/reportes/sesiones', methods=['POST'])
def generar_reporte_sesiones():
    # ... (código de reporte)
    return jsonify([])

@app.route('/api/reportes/informes', methods=['POST'])
def generar_reporte_informes():
    # ... (código de reporte)
    return jsonify([])

# =============================================================
# EJECUCIÓN DE LA APLICACIÓN
# =============================================================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)