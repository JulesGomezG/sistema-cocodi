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
    # Asegúrate de que la variable de entorno DATABASE_URL esté configurada
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    return conn

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
    cur = conn.cursor()

    sql_soft_delete = "UPDATE Evidencias SET activo = FALSE WHERE parent_type = %s AND parent_id = %s;"
    cur.execute(sql_soft_delete, (parent_type, parent_id))

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
    cur.close()
    conn.close()
    return jsonify({"message": "Archivos subidos", "id_evidencias": new_ids}), 201


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
        SELECT cs.*, es.id_ejecucion, es.numero_sesion_oficial, es.fecha_real, es.responsable as responsable_ejecucion
        FROM Calendario_Sesiones cs
        LEFT JOIN Ejecucion_Sesiones es ON cs.id_calendario = es.id_calendario
        WHERE cs.año = %s AND cs.id_institucion = %s AND cs.id_organo_colegiado = %s
        ORDER BY cs.tipo_sesion DESC, cs.numero_ordinal ASC;
    """
    cur.execute(query, (año, institucion_id, organo_id))
    sesiones_existentes = cur.fetchall()

    if not any(s['tipo_sesion'] == 'Ordinaria' for s in sesiones_existentes):
        with conn.cursor() as cur_insert:
            query_insert = "INSERT INTO Calendario_Sesiones (año, id_institucion, id_organo_colegiado, tipo_sesion, numero_ordinal) VALUES (%s, %s, %s, 'Ordinaria', %s);"
            for i in range(1, 5):
                cur_insert.execute(query_insert, (año, institucion_id, organo_id, i))
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
    
@app.route('/api/ejecucion-sesiones/<int:ejecucion_id>', methods=['PUT'])
def actualizar_ejecucion(ejecucion_id):
    data = request.form.to_dict()
    conn = get_db_connection()
    cur = conn.cursor()
    sql = "UPDATE Ejecucion_Sesiones SET numero_sesion_oficial = %s, fecha_real = %s, responsable = %s WHERE id_ejecucion = %s;"
    cur.execute(sql, (data['numero_sesion_oficial'], data['fecha_real'], data['responsable'], ejecucion_id))
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
        institucion_id = request.args.get('institucion_id', type=int)
        organo_id = request.args.get('organo_id', type=int)
        
        sql = """
            WITH RecCounts AS (
                SELECT
                    id_informe,
                    COUNT(id_recomendacion) AS recomendaciones_emitidas,
                    COUNT(CASE WHEN estatus IN ('Cerrada', 'Completada') THEN 1 END) AS recomendaciones_atendidas
                FROM Recomendaciones
                WHERE activo = TRUE AND id_informe IS NOT NULL
                GROUP BY id_informe
            )
            SELECT 
                inf.*, 
                ins.nombre_institucion, 
                ins.siglas, 
                res.nombre_responsable,
                org.nombre_organo,
                COALESCE(rc.recomendaciones_emitidas, 0) AS recomendaciones_emitidas,
                COALESCE(rc.recomendaciones_atendidas, 0) AS recomendaciones_atendidas
            FROM Informes_de_Seguimiento AS inf
            JOIN Instituciones AS ins ON inf.id_institucion = ins.id_institucion
            JOIN Responsables AS res ON inf.id_responsable = res.id_responsable
            JOIN Catalogo_Organos_Colegiados AS org ON inf.id_organo_colegiado = org.id_organo_colegiado
            LEFT JOIN RecCounts rc ON inf.id_informe = rc.id_informe
            WHERE inf.activo = TRUE
        """
        params = []
        if periodo:
            sql += " AND inf.periodo = %s"
            params.append(periodo)
        if responsable_id:
            sql += " AND inf.id_responsable = %s"
            params.append(responsable_id)
        if institucion_id:
            sql += " AND inf.id_institucion = %s"
            params.append(institucion_id)
        if organo_id:
            sql += " AND inf.id_organo_colegiado = %s"
            params.append(organo_id)
            
        sql += " ORDER BY inf.fecha_informe DESC;"

        cur.execute(sql, tuple(params))
        informes = [dict(row) for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify(informes)
    
    if request.method == 'POST':
        data = request.form.to_dict()
        descripcion = data.get('descripcion') or None

        required_fields = ['id_institucion', 'id_responsable', 'id_organo_colegiado', 'tipo_informe', 'periodo', 'fecha_informe']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({"error": f"Faltan datos obligatorios: {', '.join(missing_fields)}"}), 400

        try:
            sql = """
                INSERT INTO Informes_de_Seguimiento 
                (id_institucion, id_responsable, id_organo_colegiado, tipo_informe, periodo, fecha_informe, descripcion) 
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id_informe;
            """
            cur.execute(sql, (
                data['id_institucion'], data['id_responsable'], data['id_organo_colegiado'],
                data['tipo_informe'], data['periodo'], data['fecha_informe'], descripcion
            ))
            new_id = cur.fetchone()['id_informe']
            conn.commit()
            return jsonify({"message": "Informe creado.", "id_informe": new_id}), 201
        
        except psycopg2.Error as e:
            conn.rollback() 
            return jsonify({"error": f"Error en la base de datos: {e}"}), 500
        finally:
            cur.close()
            conn.close()


@app.route('/api/informes/<int:informe_id>', methods=['GET', 'PUT', 'DELETE'])
def manejar_informe_detalle(informe_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    if request.method == 'GET':
        sql = """
            SELECT inf.*, ins.nombre_institucion, res.nombre_responsable, org.nombre_organo 
            FROM Informes_de_Seguimiento AS inf 
            JOIN Instituciones AS ins ON inf.id_institucion = ins.id_institucion 
            JOIN Responsables AS res ON inf.id_responsable = res.id_responsable
            JOIN Catalogo_Organos_Colegiados as org ON inf.id_organo_colegiado = org.id_organo_colegiado
            WHERE inf.id_informe = %s;
        """
        cur.execute(sql, (informe_id,))
        informe = cur.fetchone()
        cur.close()
        conn.close()
        return jsonify(dict(informe)) if informe else (jsonify({"error": "Informe no encontrado"}), 404)
        
    if request.method == 'PUT':
        data = request.form.to_dict()
        descripcion = data.get('descripcion') or None
        sql = """
            UPDATE Informes_de_Seguimiento 
            SET tipo_informe = %s, periodo = %s, fecha_informe = %s, id_organo_colegiado = %s, descripcion = %s
            WHERE id_informe = %s;
        """
        cur.execute(sql, (data['tipo_informe'], data['periodo'], data['fecha_informe'], data['id_organo_colegiado'], descripcion, informe_id))
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
        año = request.args.get('año')
        responsable_id = request.args.get('responsable_id', type=int)
        institucion_id = request.args.get('institucion_id', type=int)
        organo_id = request.args.get('organo_id', type=int)
        
        # CORRECCIÓN: Se añade i.id_responsable para asegurar que el frontend tenga los datos para editar.
        sql = """
            SELECT 
                r.*, 
                i.siglas,
                i.id_responsable, 
                org.nombre_organo,
                (SELECT COUNT(*) 
                 FROM Evidencias e 
                 WHERE e.parent_id = r.id_recomendacion 
                   AND e.parent_type = 'recomendacion' 
                   AND e.activo = TRUE) AS evidencias_count
            FROM Recomendaciones r
            JOIN Instituciones i ON r.id_institucion = i.id_institucion
            JOIN Catalogo_Organos_Colegiados org ON r.id_organo_colegiado = org.id_organo_colegiado
            WHERE r.activo = TRUE
        """
        params = []
        
        if informe_id:
            sql += " AND r.id_informe = %s"
            params.append(informe_id)
        else:
            if año:
                sql += " AND EXTRACT(YEAR FROM r.fecha_emision) = %s"
                params.append(año)
            if responsable_id:
                sql += " AND i.id_responsable = %s"
                params.append(responsable_id)
            if institucion_id:
                sql += " AND r.id_institucion = %s"
                params.append(institucion_id)
            if organo_id:
                sql += " AND r.id_organo_colegiado = %s"
                params.append(organo_id)
        
        sql += " ORDER BY r.fecha_creacion DESC;"
        
        cur.execute(sql, tuple(params))
        recomendaciones = [dict(row) for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify(recomendaciones)
        
    if request.method == 'POST':
        data = request.form.to_dict()
        id_informe = data.get('id_informe')
        id_institucion = data.get('id_institucion')
        id_organo_colegiado = data.get('id_organo_colegiado')
        
        if not id_institucion and id_informe:
            cur.execute("SELECT id_institucion, id_organo_colegiado FROM Informes_de_Seguimiento WHERE id_informe = %s;", (id_informe,))
            result = cur.fetchone()
            if result:
                id_institucion = result['id_institucion']
                id_organo_colegiado = result['id_organo_colegiado']
        
        if not id_institucion or not id_organo_colegiado:
            return jsonify({"error": "Falta id_institucion/id_organo_colegiado o un id_informe válido"}), 400

        id_informe_db = id_informe if id_informe else None
        
        sql = """INSERT INTO Recomendaciones (id_informe, id_institucion, id_organo_colegiado, descripcion, area_responsable_atencion, fecha_emision, fecha_compromiso, estatus, prioridad, tipo_recomendacion) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_recomendacion;"""
        cur.execute(sql, (
            id_informe_db, 
            id_institucion, 
            id_organo_colegiado,
            data['descripcion'], 
            data['area_responsable_atencion'], 
            data['fecha_emision'],
            data.get('fecha_compromiso') or None, 
            data['estatus'], 
            data['prioridad'], 
            data['tipo_recomendacion']
        ))
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
        sql = """UPDATE Recomendaciones 
                 SET descripcion = %s, area_responsable_atencion = %s, fecha_emision = %s, fecha_compromiso = %s, 
                     estatus = %s, prioridad = %s, tipo_recomendacion = %s, id_organo_colegiado = %s
                 WHERE id_recomendacion = %s;"""
        cur.execute(sql, (
            data['descripcion'], 
            data['area_responsable_atencion'], 
            data['fecha_emision'],
            data.get('fecha_compromiso') or None, 
            data['estatus'], 
            data['prioridad'], 
            data['tipo_recomendacion'], 
            data['id_organo_colegiado'],
            rec_id
        ))
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
    app.run(host='0.0.0.0', port=5001, debug=True)