# Dockerfile
# Define la imagen para nuestra API de backend.

# Usamos una imagen oficial de Python como base
FROM python:3.10-slim

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos el archivo de requerimientos PRIMERO para aprovechar la caché de Docker
# en las instalaciones de pip
COPY requirements.txt .

# Instalamos las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# AHORA SÍ: Copiamos el resto del código de la aplicación al contenedor.
# Esta será nuestra fuente de verdad.
COPY . .

# Comando que se ejecutará cuando el contenedor se inicie
CMD ["python", "app.py"]
