#!/bin/bash
#
# --- PLAN DE EJECUCIÓN DE DESPLIEGUE: FASE 3 (DÍA DE LA MUDANZA) ---
# SRE/DevOps Orchestration Script
#

# --- PRINCIPIO DE EJECUCIÓN ---
# El script se detendrá inmediatamente si cualquier comando falla.
set -e

# --- CONFIGURACIÓN DE ENTORNO ---
# Define tus variables de conexión aquí.
# (Asegúrate de que [tu_password] esté manejado de forma segura,
#  ej. vía variable de entorno ya existente o un 'read -s' previo)

export DB_USER="[tu_usuario_db]"
export DB_NAME="[tu_db]"
export DB_HOST="[tu_host_db]"      # ej: 'localhost' o el nombre del servicio de la BBDD
export PGPASSWORD="[tu_password]"

# --- ARTEFACTOS ESPERADOS ---
# (El script asumirá que estos archivos están en el directorio actual)
# 1. migracion_ssot.sql
# 2. carga_historicos_ssot.py
# 3. bitacora_informes.csv

echo "=========================================================="
echo "INICIANDO DESPLIEGUE DE FASE 3 (MIGRACIÓN SSOT)"
echo "Base de Datos: '$DB_NAME' en '$DB_HOST'"
echo "=========================================================="
echo

# --- PASO 1: MODO MANTENIMIENTO ---
echo "------------------------------------------------"
echo "[PASO 1/6] PONIENDO APLICACIÓN EN MODO MANTENIMIENTO"
echo "------------------------------------------------"
# En un escenario real, aquí detendrías el gunicorn/uwsgi,
# o cambiarías la configuración del Ingress/Load Balancer.
echo "-> [SIMULADO] La aplicación 'app.py' está ahora fuera de línea."
echo
sleep 1

# --- PASO 2: BACKUP (REGLA NO NEGOCIABLE) ---
echo "------------------------------------------------"
echo "[PASO 2/6] CREANDO BACKUP DE LA BASE DE DATOS"
echo "------------------------------------------------"
BACKUP_FILE="backup_fase3_pre-migracion_$(date +%Y%m%d_%H%M%S).sql.gz"

echo "-> Creando backup de '$DB_NAME' en '$BACKUP_FILE'..."
# Usamos formato 'custom' (-Fc) y comprimimos con 'gzip'
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c | gzip > $BACKUP_FILE

echo "-> Backup completado y comprimido: $BACKUP_FILE (Tamaño: $(ls -lh $BACKUP_FILE | awk '{print $5}'))"
echo
sleep 1

# --- PASO 3: FASE 1 (MIGRACIÓN DE ESQUEMA) ---
echo "------------------------------------------------"
echo "[PASO 3/6] EJECUTANDO FASE 1 (MIGRACIÓN DE ESQUEMA)"
echo "------------------------------------------------"
echo "-> Aplicando 'migracion_ssot.sql' contra la BBDD..."
# -X: No leer el archivo de inicio .psqlrc
# -a: Imprimir todos los comandos a medida que se ejecutan
# -f: Archivo a ejecutar
# OnErrorStop=1: Abortar el script si hay un error en el SQL
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -X -a -f migracion_ssot.sql --set ON_ERROR_STOP=1

echo "-> Migración de esquema (Fase 1) completada."
echo
sleep 1

# --- PASO 4: INSTALACIÓN DE DEPENDENCIAS PYTHON ---
echo "------------------------------------------------"
echo "[PASO 4/6] INSTALANDO DEPENDENCIAS DE PYTHON (FASE 2)"
echo "------------------------------------------------"
echo "-> Asegurando dependencias (pandas para CSV, psycopg2 para DB)..."
# Asumimos que la Fase 2 requiere 'pandas' para leer el CSV
# y 'psycopg2' (o psycopg2-binary) para conectarse a PostgreSQL.
# En un despliegue real, esto vendría de un 'requirements.txt'.
pip3 install pandas psycopg2-binary

echo "-> Dependencias instaladas."
echo
sleep 1

# --- PASO 5: FASE 2 (CARGA DE HISTÓRICOS) ---
echo "------------------------------------------------"
echo "[PASO 5/6] EJECUTANDO FASE 2 (CARGA DE HISTÓRICOS)"
echo "------------------------------------------------"
echo "-> Ejecutando 'carga_historicos_ssot.py'..."
# El script python DEBE estar preparado para leer las variables
# de entorno (PG_USER, PG_DB, PG_HOST, PGPASSWORD)
# y debe saber que el archivo de entrada es 'bitacora_informes.csv'
python3 carga_historicos_ssot.py

echo "-> Carga de históricos (Fase 2) completada."
echo
sleep 1

# --- PASO 6: LEVANTAR MANTENIMIENTO ---
echo "------------------------------------------------"
echo "[PASO 6/6] QUITANDO MODO MANTENIMIENTO"
echo "------------------------------------------------"
# Aquí reiniciarías los servicios de la aplicación.
echo "-> [SIMULADO] La aplicación 'app.py' está operativa y migrada."
echo
sleep 1

# --- FINALIZACIÓN ---
echo "=========================================================="
echo "DESPLIEGUE (FASE 3) COMPLETADO EXITOSAMENTE."
echo "Todos los pasos ejecutados."
echo "=========================================================="