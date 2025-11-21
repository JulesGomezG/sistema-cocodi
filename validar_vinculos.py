# validar_vinculos.py
import pandas as pd
import json
import re
import sys

def obtener_vinculos_existentes(sql_file_path):
    """Lee el archivo init.sql y extrae todos los pares (id_institucion, id_tipo_organo) ya insertados."""
    try:
        with open(sql_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Expresión regular para encontrar: INSERT INTO institucion_organos ... VALUES ( XX, YY );
        pattern = re.compile(r"INSERT INTO institucion_organos.*?VALUES\s*\((\s*\d+\s*),(\s*\d+\s*)\);", re.IGNORECASE)
        
        vinculos = set()
        for match in pattern.finditer(content):
            id_institucion = int(match.group(1).strip())
            id_tipo_organo = int(match.group(2).strip())
            vinculos.add((id_institucion, id_tipo_organo))
        return vinculos
    except FileNotFoundError:
        print(f"❌ Error: No se encontró el archivo '{sql_file_path}'. Asegúrate de que el nombre sea correcto.")
        sys.exit(1)

def validar_y_generar_inserts():
    """Función principal que lee, compara y genera los INSERTs faltantes."""
    try:
        # Cargar los archivos necesarios
        mapeo = json.load(open('mapeo_final.json', 'r', encoding='utf-8'))
        df_sesiones = pd.read_csv('historico_sesiones.csv')
    except FileNotFoundError as e:
        print(f"❌ Error: No se pudo encontrar un archivo necesario: {e.filename}. Asegúrate de que 'mapeo_final.json' y 'historico_sesiones.csv' existan.")
        sys.exit(1)

    vinculos_existentes = obtener_vinculos_existentes('init.sql')
    
    # Crear mapas inversos para buscar nombres a partir de IDs (para los comentarios)
    id_a_institucion = {v['id']: k for k, v in mapeo['instituciones'].items()}
    id_a_organo = {v['id']: k for k, v in mapeo['organos'].items()}

    # Obtener todas las combinaciones únicas requeridas por el CSV
    combinaciones_requeridas = df_sesiones[['INSTITUCION', 'TIPO DE ÓRGANO COLEGIADO']].drop_duplicates()
    vinculos_requeridos = set()

    print("Analizando combinaciones requeridas por 'historico_sesiones.csv'...")
    for index, row in combinaciones_requeridas.iterrows():
        nombre_inst = row['INSTITUCION']
        nombre_org = row['TIPO DE ÓRGANO COLEGIADO']

        inst_mapeada = mapeo['instituciones'].get(nombre_inst)
        org_mapeado = mapeo['organos'].get(nombre_org)

        if inst_mapeada and org_mapeado:
            vinculos_requeridos.add((inst_mapeada['id'], org_mapeado['id']))
        else:
            print(f"⚠️ Aviso: No se encontró mapeo para '{nombre_inst}' o '{nombre_org}' en mapeo_final.json.")

    # Calcular los vínculos que faltan
    vinculos_faltantes = vinculos_requeridos - vinculos_existentes

    if not vinculos_faltantes:
        print("\n✅ ¡Validación completada! No faltan vínculos en 'init.sql' para el archivo de sesiones.")
        return

    # Si faltan, generar los INSERTs
    print("\n" + "="*50)
    print(" FALTAN LOS SIGUIENTES VÍNCULOS EN init.sql ")
    print(" Copia y pega todo el siguiente bloque en tu archivo:")
    print("="*50 + "\n")

    # Ordenar para una salida consistente
    for id_inst, id_org in sorted(list(vinculos_faltantes)):
        nombre_inst = id_a_institucion.get(id_inst, 'DESCONOCIDO')
        nombre_org = id_a_organo.get(id_org, 'DESCONOCIDO')
        print(f"-- Vincular {nombre_org} a {nombre_inst}")
        print(f"INSERT INTO institucion_organos (id_institucion, id_tipo_organo) VALUES ({id_inst}, {id_org});")

if __name__ == "__main__":
    validar_y_generar_inserts()