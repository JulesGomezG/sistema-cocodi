#
# --- PLAN DE EJECUCION DE REMEDIACION (CARGA v2.1 - LOGICA CORREGIDA) ---
# SRE/DevOps Orchestration Script
#
# CORRECCION: Ya no se detiene el backend. Todos los comandos
# se ejecutan contra los contenedores en vivo.
#
$ErrorActionPreference = "Stop"

# --- CONFIGURACION DE ENTORNO ---
$env:BACKEND_CONTAINER = "cocodi_backend"
$env:DB_CONTAINER = "cocodi_db"
$env:DB_USER = "cocodi_user"
$env:DB_NAME = "cocodi_db"
$env:DB_HOST = "db"
$env:PGPASSWORD = "new_password_2025"

# --- ARTEFACTOS DE LA MISION ---
$SCRIPT_PYTHON_NUEVO = "carga_historicos_v2.py"
$ARCHIVO_EXCEL = "bitacora_informes_OK.xlsx"

# Archivo de backup
$BACKUP_FILE = "backup_pre_remediacion_v2_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql.gz"

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "INICIANDO REMEDIACION DE CARGA (v2.1 - Logica Corregida)"
Write-Host "=========================================================="
echo ""

# --- PASO 1: MODO MANTENIMIENTO (Omitido) ---
# (Dejamos el backend corriendo para poder usar 'exec' y 'cp')

# --- PASO 2: BACKUP (REGLA NO NEGOCIABLE) ---
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "[PASO 1/5] CREANDO BACKUP (PRE-REMEDIACION)"
Write-Host "------------------------------------------------"
Write-Host "-> Creando backup de los datos actuales (con 105 informes NULL)..."
# Usamos el comando cmd.exe que ya validamos
cmd.exe /c "docker exec -e PGPASSWORD=$env:PGPASSWORD $env:DB_CONTAINER sh -c \`"pg_dump -U $env:DB_USER -h $env:DB_HOST -d $env:DB_NAME -F c | gzip\`" > $BACKUP_FILE"
Write-Host "-> Backup completado: $BACKUP_FILE"
echo ""
Start-Sleep -Seconds 1


# --- PASO 3: INSTALAR DEPENDENCIAS PYTHON ---
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "[PASO 2/5] INSTALANDO DEPENDENCIAS DE PYTHON (EN VIVO)"
Write-Host "------------------------------------------------"
Write-Host "-> Asegurando que '$($env:BACKEND_CONTAINER)' (corriendo) pueda leer .xlsx..."
docker exec $env:BACKEND_CONTAINER pip install pandas openpyxl
Write-Host "-> Dependencias de Python instaladas/verificadas."
echo ""
Start-Sleep -Seconds 1


# --- PASO 4: COPIA DE ARTEFACTOS (v2) ---
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "[PASO 3/5] COPIANDO ARTEFACTOS DE REMEDIACION (EN VIVO)"
Write-Host "------------------------------------------------"
Write-Host "-> Copiando '$SCRIPT_PYTHON_NUEVO' a '$($env:BACKEND_CONTAINER):/app/'"
docker cp .\$SCRIPT_PYTHON_NUEVO "$($env:BACKEND_CONTAINER):/app/$SCRIPT_PYTHON_NUEVO"

Write-Host "-> Copiando '$ARCHIVO_EXCEL' a '$($env:BACKEND_CONTAINER):/app/'"
docker cp .\$ARCHIVO_EXCEL "$($env:BACKEND_CONTAINER):/app/$ARCHIVO_EXCEL"
Write-Host "-> Artefactos copiados."
echo ""
Start-Sleep -Seconds 1


# --- PASO 5: EJECUTAR REMEDIACION (v2) ---
Write-Host "------------------------------------------------" -ForegroundColor Yellow
Write-Host "[PASO 4/5] EJECUTANDO SCRIPT DE REMEDIACION (v2)"
Write-Host "------------------------------------------------"
Write-Host "-> Ejecutando 'python3 /app/$SCRIPT_PYTHON_NUEVO'..."
Write-Host "-> (Esto ejecutara TRUNCATE y recargara todo. Observe la salida)"
docker exec $env:BACKEND_CONTAINER python3 /app/$SCRIPT_PYTHON_NUEVO
Write-Host "-> Carga de remediacion (v2) completada."
echo ""
Start-Sleep -Seconds 1


# --- PASO 6: REINICIO FINAL ---
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "[PASO 5/5] REINICIANDO APLICACION (POST-CARGA)"
Write-Host "------------------------------------------------"
Write-Host "-> Reiniciando el contenedor de la aplicacion '$($env:BACKEND_CONTAINER)'..."
docker restart $env:BACKEND_CONTAINER
Write-Host "-> Aplicacion operativa y migrada."
echo ""
Start-Sleep -Seconds 1

# --- PASO 7: MENSAJE DE VERIFICACION ---
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "REMEDIACION COMPLETADA EXITOSAMENTE (v2.1)."
Write-Host "=========================================================="
Write-Host "Por favor, ejecute la 'Verificacion Final' ahora." -ForegroundColor Yellow