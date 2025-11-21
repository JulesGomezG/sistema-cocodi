#
# --- PLAN DE EJECUCIÓN DE DESPLIEGUE: FASE 3 (Windows / Docker) ---
# SRE/DevOps Orchestration Script
#
# Script final, configurado para el docker-compose de COCODI.
#

# --- PRINCIPIO DE EJECUCIÓN ---
# El script se detendrá inmediatamente si cualquier comando falla.
$ErrorActionPreference = "Stop"

# --- CONFIGURACIÓN DE ENTORNO ---
# Valores extraídos de docker-compose.yml. ¡NO NECESITAS CAMBIAR NADA!

$env:BACKEND_CONTAINER = "cocodi_backend"    # De 'container_name: cocodi_backend'
$env:DB_CONTAINER = "cocodi_db"          # De 'container_name: cocodi_db'

# Variables de la BBDD (del entorno del servicio 'db' y 'backend')
$env:DB_USER = "cocodi_user"             # De 'POSTGRES_USER'
$env:DB_NAME = "cocodi_db"               # De 'POSTGRES_DB'
$env:DB_HOST = "db"                      # Es el nombre del servicio de Docker
$env:PGPASSWORD = "new_password_2025"    # De 'POSTGRES_PASSWORD'

# Archivo de backup (se guardará en tu carpeta de Windows)
$BACKUP_FILE = "backup_fase3_pre_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql.gz"


Write-Host "==========================================================" -ForegroundColor Green
Write-Host "INICIANDO DESPLIEGUE DE FASE 3 (Orquestado desde Windows)"
Write-Host "Base de Datos: '$($env:DB_NAME)' en Contenedor: '$($env:DB_CONTAINER)'"
Write-Host "=========================================================="
echo ""


# --- PASO 1: MODO MANTENIMIENTO ---
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "[PASO 1/6] PONIENDO APLICACIÓN EN MODO MANTENIMIENTO"
Write-Host "------------------------------------------------"
Write-Host "-> Deteniendo el contenedor de la aplicación '$($env:BACKEND_CONTAINER)'..."
docker stop $env:BACKEND_CONTAINER
Write-Host "-> Aplicación en mantenimiento."
echo ""
Start-Sleep -Seconds 1


# --- PASO 2: BACKUP (REGLA NO NEGOCIABLE) ---
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "[PASO 2/6] CREANDO BACKUP DE LA BASE DE DATOS"
Write-Host "------------------------------------------------"
Write-Host "-> Ejecutando pg_dump DENTRO de '$($env:DB_CONTAINER)' y guardando en Windows..."

# Ejecuta pg_dump DENTRO del contenedor de BBDD, lo comprime (gzip)
# y 'pipea' la salida binaria al archivo $BACKUP_FILE en tu host Windows.
docker exec -e PGPASSWORD=$env:PGPASSWORD $env:DB_CONTAINER sh -c "pg_dump -U $env:DB_USER -h $env:DB_HOST -d $env:DB_NAME -F c | gzip" | Set-Content -Path $BACKUP_FILE -AsByteStream

Write-Host "-> Backup completado y comprimido en host: $BACKUP_FILE"
echo ""
Start-Sleep -Seconds 1


# --- PASO 3: FASE 1 (MIGRACIÓN DE ESQUEMA) ---
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "[PASO 3/6] EJECUTANDO FASE 1 (MIGRACIÓN DE ESQUEMA)"
Write-Host "------------------------------------------------"
Write-Host "-> Enviando 'migracion_ssot.sql' al contenedor '$($env:DB_CONTAINER)' para ejecución..."

# Lee el archivo .sql de tu PC y lo 'pipea' al comando psql
# que se ejecuta DENTRO del contenedor de la BBDD.
Get-Content .\migracion_ssot.sql | docker exec -i -e PGPASSWORD=$env:PGPASSWORD $env:DB_CONTAINER psql -U $env:DB_USER -h $env:DB_HOST -d $env:DB_NAME --set ON_ERROR_STOP=1

Write-Host "-> Migración de esquema (Fase 1) completada."
echo ""
Start-Sleep -Seconds 1


# --- PASO 4: FASE 2 (COPIA DE ARTEFACTOS) ---
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "[PASO 4/6] COPIANDO ARTEFACTOS DE FASE 2 AL CONTENEDOR"
Write-Host "------------------------------------------------"
Write-Host "-> Copiando 'carga_historicos_ssot.py' a '$($env:BACKEND_CONTAINER):/app/'"
docker cp .\carga_historicos_ssot.py "$($env:BACKEND_CONTAINER):/app/carga_historicos_ssot.py"

Write-Host "-> Copiando 'bitacora_informes.csv' a '$($env:BACKEND_CONTAINER):/app/'"
docker cp .\bitacora_informes.csv "$($env:BACKEND_CONTAINER):/app/bitacora_informes.csv"

Write-Host "-> Artefactos copiados."
echo ""
Start-Sleep -Seconds 1


# --- PASO 5: FASE 2 (CARGA DE HISTÓRICOS) ---
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "[PASO 5/6] EJECUTANDO FASE 2 (CARGA DE HISTÓRICOS)"
Write-Host "------------------------------------------------"
Write-Host "-> Ejecutando script python DENTRO de '$($env:BACKEND_CONTAINER)'..."

# Ejecuta el script python DENTRO del contenedor de backend.
# El script debe usar las variables de entorno de la BBDD que pasamos aquí.
docker exec -e PGPASSWORD=$env:PGPASSWORD -e DB_USER=$env:DB_USER -e DB_NAME=$env:DB_NAME -e DB_HOST=$env:DB_HOST $env:BACKEND_CONTAINER python3 /app/carga_historicos_ssot.py

Write-Host "-> Carga de históricos (Fase 2) completada."
echo ""
Start-Sleep -Seconds 1


# --- PASO 6: LEVANTAR MANTENIMIENTO ---
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "[PASO 6/6] QUITANDO MODO MANTENIMIENTO"
Write-Host "------------------------------------------------"
Write-Host "-> Reiniciando el contenedor de la aplicación '$($env:BACKEND_CONTAINER)'..."
docker start $env:BACKEND_CONTAINER
Write-Host "-> Aplicación operativa y migrada."
echo ""
Start-Sleep -Seconds 1


# --- FINALIZACIÓN ---
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "DESPLIEGUE (FASE 3) COMPLETADO EXITOSAMENTE."
Write-Host "=========================================================="