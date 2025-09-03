from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import psycopg2
import psycopg2.extras
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# --- CONFIGURACIÓN DE CARGA DE ARCHIVOS ---
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_db_connection():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    return conn

# =============================================================
# ENDPOINTS PARA MANEJO DE ARCHIVOS
# =============================================================
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No se encontró el archivo"}), 400
    
    file = request.files['file']
    parent_type = request.form.get('parent_type')
    parent_id = request.form.get('parent_id', type=int)

    if file.filename == '' or not parent_type or not parent_id:
        return jsonify({"error": "Faltan datos para la carga"}), 400

    if file:
        filename = secure_filename(file.filename)
        target_folder = os.path.join(app.config['UPLOAD_FOLDER'], parent_type)
        os.makedirs(target_folder, exist_ok=True)
        
        file_path = os.path.join(target_folder, filename)
        file.save(file_path)
        
        conn = get_db_connection()
        cur = conn.cursor()
        relative_path = os.path.join(parent_type, filename).replace("\\", "/")
        sql = "INSERT INTO Evidencias (parent_id, parent_type, nombre_archivo, url_almacenamiento) VALUES (%s, %s, %s, %s) RETURNING id_evidencia;"
        cur.execute(sql, (parent_id, parent_type, filename, relative_path))
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Archivo subido", "id_evidencia": new_id}), 201

@app.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    directory = os.path.abspath(app.config['UPLOAD_FOLDER'])
    return send_from_directory(directory, filename)

@app.route('/api/evidencias', methods=['GET'])
def obtener_evidencias():
    parent_type = request.args.get('parent_type')
    parent_id = request.args.get('parent_id', type=int)
    if not parent_type or not parent_id:
        return jsonify({"error": "Faltan parámetros"}), 400
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT * FROM Evidencias WHERE parent_type = %s AND parent_id = %s AND activo = TRUE;", (parent_type, parent_id))
    evidencias = [dict(row) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(evidencias)

# =============================================================
# ENDPOINTS DE CATÁLOGOS Y SESIONES
# =============================================================
@app.route('/api/responsables', methods=['GET'])
def obtener_responsables():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute('SELECT * FROM Responsables ORDER BY nombre_responsable;')
    responsables = [dict(row) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(responsables)

@app.route('/api/instituciones', methods=['GET'])
def obtener_instituciones():
    responsable_id = request.args.get('responsable_id', type=int)
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    if responsable_id:
        cur.execute('SELECT * FROM Instituciones WHERE id_responsable = %s ORDER BY nombre_institucion;', (responsable_id,))
    else:
        cur.execute('SELECT * FROM Instituciones ORDER BY nombre_institucion;')
    instituciones = [dict(row) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(instituciones)

@app.route('/api/organos-colegiados', methods=['GET'])
def obtener_organos_filtrados():
    institucion_id = request.args.get('institucion_id', type=int)
    if not institucion_id: return jsonify([])
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    sql = "SELECT T2.* FROM Institucion_Organos AS T1 JOIN Catalogo_Organos_Colegiados AS T2 ON T1.id_organo_colegiado = T2.id_organo_colegiado WHERE T1.id_institucion = %s ORDER BY T2.nombre_organo;"
    cur.execute(sql, (institucion_id,))
    organos = [dict(row) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(organos)

@app.route('/api/calendario-sesiones', methods=['GET'])
def obtener_o_crear_calendario():
    año = request.args.get('año', type=int)
    institucion_id = request.args.get('institucion_id', type=int)
    organo_id = request.args.get('organo_id', type=int)
    if not all([año, institucion_id, organo_id]): return jsonify({"error": "Faltan parámetros."}), 400
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    query = """
        SELECT 
            cs.*,
            es.id_ejecucion,
            es.numero_sesion_oficial,
            es.fecha_real,
            es.responsable AS responsable_ejecucion
        FROM Calendario_Sesiones cs
        LEFT JOIN Ejecucion_Sesiones es ON cs.id_calendario = es.id_calendario AND es.activo = TRUE
        WHERE cs.año = %s AND cs.id_institucion = %s AND cs.id_organo_colegiado = %s AND cs.activo = TRUE
        ORDER BY cs.tipo_sesion DESC, cs.numero_ordinal ASC;
    """
    cur.execute(query, (año, institucion_id, organo_id))
    sesiones_existentes = cur.fetchall()

    if not any(s['tipo_sesion'] == 'Ordinaria' for s in sesiones_existentes):
        query_insert = "INSERT INTO Calendario_Sesiones (año, id_institucion, id_organo_colegiado, tipo_sesion, numero_ordinal) VALUES (%s, %s, %s, 'Ordinaria', %s);"
        for i in range(1, 5): cur.execute(query_insert, (año, institucion_id, organo_id, i))
        conn.commit()
        cur.execute(query, (año, institucion_id, organo_id))
        sesiones_existentes = cur.fetchall()

    calendario = [dict(row) for row in sesiones_existentes]
    cur.close()
    conn.close()
    return jsonify(calendario)

@app.route('/api/ejecucion-sesiones', methods=['POST'])
def registrar_ejecucion():
    data = request.form.to_dict()
    conn = get_db_connection()
    cur = conn.cursor()
    sql_insert = "INSERT INTO Ejecucion_Sesiones (id_calendario, numero_sesion_oficial, fecha_real, responsable) VALUES (%s, %s, %s, %s) RETURNING id_ejecucion;"
    cur.execute(sql_insert, (data['id_calendario'], data['numero_sesion_oficial'], data['fecha_real'], data['responsable']))
    new_id = cur.fetchone()[0]
    sql_update = "UPDATE Calendario_Sesiones SET estatus = 'Realizada' WHERE id_calendario = %s;"
    cur.execute(sql_update, (data['id_calendario'],))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Ejecución registrada.", "id_ejecucion": new_id}), 201

# ### CAMBIO: Nuevo endpoint para editar una ejecución ###
@app.route('/api/ejecucion-sesiones/<int:ejecucion_id>', methods=['PUT'])
def actualizar_ejecucion(ejecucion_id):
    data = request.form.to_dict()
    conn = get_db_connection()
    cur = conn.cursor()
    sql_update = "UPDATE Ejecucion_Sesiones SET numero_sesion_oficial = %s, fecha_real = %s, responsable = %s WHERE id_ejecucion = %s;"
    cur.execute(sql_update, (data['numero_sesion_oficial'], data['fecha_real'], data['responsable'], ejecucion_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Ejecución actualizada.", "id_ejecucion": ejecucion_id})


@app.route('/api/sesiones-extraordinarias', methods=['POST'])
def registrar_sesion_extraordinaria():
    data = request.form.to_dict()
    conn = get_db_connection()
    cur = conn.cursor()
    sql_calendario = "INSERT INTO Calendario_Sesiones (año, id_institucion, id_organo_colegiado, tipo_sesion, estatus) VALUES (%s, %s, %s, 'Extraordinaria', 'Realizada') RETURNING id_calendario;"
    cur.execute(sql_calendario, (data['año'], data['institucion_id'], data['organo_id']))
    id_calendario_nuevo = cur.fetchone()[0]
    sql_ejecucion = "INSERT INTO Ejecucion_Sesiones (id_calendario, numero_sesion_oficial, fecha_real, responsable) VALUES (%s, %s, %s, %s) RETURNING id_ejecucion;"
    cur.execute(sql_ejecucion, (id_calendario_nuevo, data['numero_sesion_oficial'], data['fecha_real'], data['responsable']))
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Extraordinaria registrada.", "id_ejecucion": new_id}), 201

# =============================================================
# ENDPOINTS DE INFORMES Y RECOMENDACIONES
# =============================================================
@app.route('/api/informes', methods=['GET', 'POST'])
def manejar_informes():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    if request.method == 'GET':
        periodo = request.args.get('periodo')
        responsable_id = request.args.get('responsable_id', type=int)
        
        sql = """
            SELECT 
                inf.*, 
                ins.nombre_institucion, 
                ins.siglas, 
                res.nombre_responsable,
                COUNT(rec.id_recomendacion) AS total_recomendaciones,
                COUNT(CASE WHEN rec.estatus = 'Cerrada' THEN 1 END) AS atendidas_recomendaciones
            FROM Informes_de_Seguimiento AS inf
            JOIN Instituciones AS ins ON inf.id_institucion = ins.id_institucion
            JOIN Responsables AS res ON inf.id_responsable = res.id_responsable
            LEFT JOIN Recomendaciones AS rec ON inf.id_informe = rec.id_informe AND rec.activo = TRUE
            WHERE inf.activo = TRUE
        """
        params = []
        if periodo:
            sql += " AND inf.periodo = %s"
            params.append(periodo)
        if responsable_id:
            sql += " AND inf.id_responsable = %s"
            params.append(responsable_id)
        sql += " GROUP BY inf.id_informe, ins.id_institucion, res.id_responsable ORDER BY inf.fecha_informe DESC;"

        cur.execute(sql, tuple(params))
        informes = [dict(row) for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify(informes)
    
    if request.method == 'POST':
        data = request.form.to_dict()
        sql = "INSERT INTO Informes_de_Seguimiento (id_institucion, id_responsable, tipo_informe, periodo, fecha_informe) VALUES (%s, %s, %s, %s, %s) RETURNING id_informe;"
        cur.execute(sql, (data['id_institucion'], data['id_responsable'], data['tipo_informe'], data['periodo'], data['fecha_informe']))
        new_id = cur.fetchone()['id_informe']
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Informe creado.", "id_informe": new_id}), 201

@app.route('/api/informes/<int:informe_id>', methods=['GET', 'PUT', 'DELETE'])
def manejar_informe_detalle(informe_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    if request.method == 'GET':
        sql = "SELECT inf.*, ins.nombre_institucion, res.nombre_responsable FROM Informes_de_Seguimiento AS inf JOIN Instituciones AS ins ON inf.id_institucion = ins.id_institucion JOIN Responsables AS res ON inf.id_responsable = res.id_responsable WHERE inf.id_informe = %s;"
        cur.execute(sql, (informe_id,))
        informe = cur.fetchone()
        cur.close()
        conn.close()
        return jsonify(dict(informe)) if informe else (jsonify({"error": "Informe no encontrado"}), 404)
        
    if request.method == 'PUT':
        data = request.form.to_dict()
        sql = "UPDATE Informes_de_Seguimiento SET tipo_informe = %s, periodo = %s, fecha_informe = %s WHERE id_informe = %s;"
        cur.execute(sql, (data['tipo_informe'], data['periodo'], data['fecha_informe'], informe_id))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Informe actualizado."})
        
    if request.method == 'DELETE':
        cur.execute("UPDATE Informes_de_Seguimiento SET activo = FALSE WHERE id_informe = %s;", (informe_id,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Informe eliminado."})

@app.route('/api/recomendaciones', methods=['GET', 'POST'])
def manejar_recomendaciones():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    if request.method == 'GET':
        informe_id = request.args.get('informe_id', type=int)
        institucion_id = request.args.get('institucion_id', type=int)
        
        if not informe_id and not institucion_id:
            return jsonify({"error": "Se requiere id_informe o id_institucion"}), 400
        
        sql = """
            SELECT r.*, COUNT(e.id_evidencia) AS evidencias_count
            FROM Recomendaciones r
            LEFT JOIN Evidencias e ON r.id_recomendacion = e.parent_id AND e.parent_type = 'recomendacion' AND e.activo = TRUE
            WHERE r.activo = TRUE
        """
        params = []
        if informe_id:
            sql += " AND r.id_informe = %s"
            params.append(informe_id)
        if institucion_id:
            sql += " AND r.id_institucion = %s"
            params.append(institucion_id)
        
        sql += " GROUP BY r.id_recomendacion ORDER BY r.fecha_creacion DESC;"
        cur.execute(sql, tuple(params))
        recomendaciones = [dict(row) for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify(recomendaciones)
        
    if request.method == 'POST':
        data = request.form.to_dict()
        id_informe = data.get('id_informe') or None
        id_institucion = data.get('id_institucion')
        
        if not id_institucion and id_informe:
            cur.execute("SELECT id_institucion FROM Informes_de_Seguimiento WHERE id_informe = %s", (id_informe,))
            result = cur.fetchone()
            if result: id_institucion = result['id_institucion']
        
        if not id_institucion:
            return jsonify({"error": "id_institucion es requerido"}), 400

        sql = """
            INSERT INTO Recomendaciones (id_informe, id_institucion, descripcion, area_responsable_atencion, fecha_compromiso, estatus, prioridad, tipo_recomendacion) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_recomendacion;
        """
        params = (id_informe, id_institucion, data['descripcion'], data['area_responsable_atencion'], data.get('fecha_compromiso') or None, data['estatus'], data['prioridad'], data['tipo_recomendacion'])
        cur.execute(sql, params)
        new_id = cur.fetchone()['id_recomendacion']
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Recomendación creada.", "id_recomendacion": new_id}), 201

@app.route('/api/recomendaciones/<int:rec_id>', methods=['PUT', 'DELETE'])
def manejar_recomendacion_detalle(rec_id):
    conn = get_db_connection()
    cur = conn.cursor()
    if request.method == 'PUT':
        data = request.form.to_dict()
        sql = "UPDATE Recomendaciones SET descripcion = %s, area_responsable_atencion = %s, fecha_compromiso = %s, estatus = %s, prioridad = %s, tipo_recomendacion = %s WHERE id_recomendacion = %s;"
        cur.execute(sql, (data['descripcion'], data['area_responsable_atencion'], data.get('fecha_compromiso') or None, data['estatus'], data['prioridad'], data['tipo_recomendacion'], rec_id))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Recomendación actualizada."})

    if request.method == 'DELETE':
        cur.execute("UPDATE Recomendaciones SET activo = FALSE WHERE id_recomendacion = %s;", (rec_id,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Recomendación eliminada."})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

