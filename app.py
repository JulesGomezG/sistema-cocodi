from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import psycopg2
import psycopg2.extras

app = Flask(__name__)
CORS(app)

def get_db_connection():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    return conn

# --- ENDPOINTS DE CATÁLOGOS ---
@app.route('/api/responsables', methods=['GET'])
def obtener_responsables():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute('SELECT * FROM Responsables ORDER BY nombre_responsable;')
        responsables = [dict(row) for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify(responsables)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

# --- ENDPOINTS DE SESIONES ---
@app.route('/api/calendario-sesiones', methods=['GET'])
def obtener_o_crear_calendario():
    año = request.args.get('año', type=int)
    institucion_id = request.args.get('institucion_id', type=int)
    organo_id = request.args.get('organo_id', type=int)
    if not all([año, institucion_id, organo_id]): return jsonify({"error": "Faltan parámetros."}), 400
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    query_check_ordinarias = "SELECT 1 FROM Calendario_Sesiones WHERE año = %s AND id_institucion = %s AND id_organo_colegiado = %s AND tipo_sesion = 'Ordinaria';"
    cur.execute(query_check_ordinarias, (año, institucion_id, organo_id))
    if cur.fetchone() is None:
        query_insert = "INSERT INTO Calendario_Sesiones (año, id_institucion, id_organo_colegiado, tipo_sesion, numero_ordinal) VALUES (%s, %s, %s, 'Ordinaria', %s);"
        for i in range(1, 5): cur.execute(query_insert, (año, institucion_id, organo_id, i))
        conn.commit()
    query_select_all = "SELECT * FROM Calendario_Sesiones WHERE año = %s AND id_institucion = %s AND id_organo_colegiado = %s ORDER BY tipo_sesion DESC, numero_ordinal ASC;"
    cur.execute(query_select_all, (año, institucion_id, organo_id))
    calendario = [dict(row) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(calendario)

@app.route('/api/ejecucion-sesiones', methods=['POST'])
def registrar_ejecucion():
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    sql_insert = "INSERT INTO Ejecucion_Sesiones (id_calendario, numero_sesion_oficial, fecha_real, resumen_ejecutivo, url_acta_firmada) VALUES (%s, %s, %s, %s, %s);"
    cur.execute(sql_insert, (data['id_calendario'], data['numero_sesion_oficial'], data['fecha_real'], data.get('resumen_ejecutivo'), data.get('url_acta_firmada')))
    sql_update = "UPDATE Calendario_Sesiones SET estatus = 'Realizada' WHERE id_calendario = %s;"
    cur.execute(sql_update, (data['id_calendario'],))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Ejecución registrada."}), 201

@app.route('/api/sesiones-extraordinarias', methods=['POST'])
def registrar_sesion_extraordinaria():
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    sql_calendario = "INSERT INTO Calendario_Sesiones (año, id_institucion, id_organo_colegiado, tipo_sesion, estatus) VALUES (%s, %s, %s, 'Extraordinaria', 'Realizada') RETURNING id_calendario;"
    cur.execute(sql_calendario, (data['año'], data['institucion_id'], data['organo_id']))
    id_calendario_nuevo = cur.fetchone()[0]
    sql_ejecucion = "INSERT INTO Ejecucion_Sesiones (id_calendario, numero_sesion_oficial, fecha_real, resumen_ejecutivo, url_acta_firmada) VALUES (%s, %s, %s, %s, %s);"
    cur.execute(sql_ejecucion, (id_calendario_nuevo, data['numero_sesion_oficial'], data['fecha_real'], data.get('resumen_ejecutivo'), data.get('url_acta_firmada')))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Extraordinaria registrada."}), 201

# --- ENDPOINTS DE INFORMES Y RECOMENDACIONES ---
@app.route('/api/informes', methods=['GET', 'POST'])
def manejar_informes():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    if request.method == 'GET':
        periodo = request.args.get('periodo')
        responsable_id = request.args.get('responsable_id', type=int)
        base_sql = "SELECT inf.*, ins.nombre_institucion, ins.siglas, res.nombre_responsable FROM Informes_de_Seguimiento AS inf JOIN Instituciones AS ins ON inf.id_institucion = ins.id_institucion JOIN Responsables AS res ON inf.id_responsable = res.id_responsable WHERE inf.activo = TRUE"
        params = []
        if periodo:
            base_sql += " AND inf.periodo = %s"
            params.append(periodo)
        if responsable_id:
            base_sql += " AND inf.id_responsable = %s"
            params.append(responsable_id)
        base_sql += " ORDER BY inf.fecha_informe DESC;"
        cur.execute(base_sql, tuple(params))
        informes = [dict(row) for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify(informes)
    if request.method == 'POST':
        data = request.get_json()
        sql = "INSERT INTO Informes_de_Seguimiento (id_institucion, id_responsable, tipo_informe, periodo, fecha_informe) VALUES (%s, %s, %s, %s, %s) RETURNING id_informe;"
        cur.execute(sql, (data['id_institucion'], data['id_responsable'], data['tipo_informe'], data['periodo'], data['fecha_informe']))
        new_id = cur.fetchone()['id_informe']
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Informe creado.", "id_informe": new_id}), 201

@app.route('/api/informes/<int:informe_id>', methods=['GET', 'PUT', 'DELETE'])
def manejar_informe_especifico(informe_id):
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
        data = request.get_json()
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
        if not informe_id: return jsonify({"error": "Falta informe_id"}), 400
        cur.execute("SELECT * FROM Recomendaciones WHERE id_informe = %s AND activo = TRUE ORDER BY fecha_creacion DESC;", (informe_id,))
        recomendaciones = [dict(row) for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify(recomendaciones)
    if request.method == 'POST':
        data = request.get_json()
        sql = "INSERT INTO Recomendaciones (id_informe, descripcion, area_responsable_atencion, fecha_compromiso, estatus, prioridad, tipo_recomendacion) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id_recomendacion;"
        cur.execute(sql, (data['id_informe'], data['descripcion'], data['area_responsable_atencion'], data.get('fecha_compromiso'), data['estatus'], data['prioridad'], data['tipo_recomendacion']))
        new_id = cur.fetchone()['id_recomendacion']
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Recomendación creada.", "id_recomendacion": new_id}), 201

@app.route('/api/recomendaciones/<int:rec_id>', methods=['PUT', 'DELETE'])
def manejar_recomendacion_especifica(rec_id):
    conn = get_db_connection()
    cur = conn.cursor()
    if request.method == 'PUT':
        data = request.get_json()
        sql = "UPDATE Recomendaciones SET descripcion = %s, area_responsable_atencion = %s, fecha_compromiso = %s, estatus = %s, prioridad = %s, tipo_recomendacion = %s WHERE id_recomendacion = %s;"
        cur.execute(sql, (data['descripcion'], data['area_responsable_atencion'], data.get('fecha_compromiso'), data['estatus'], data['prioridad'], data['tipo_recomendacion'], rec_id))
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
    app.run(host='0.0.0.0', port=5000)