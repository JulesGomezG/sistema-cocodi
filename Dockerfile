# Dockerfile
# Define la imagen para nuestra API de backend.

# Usamos una imagen oficial de Python como base
FROM python:3.10-slim

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos el archivo de requerimientos
COPY requirements.txt .

# Instalamos las dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el resto del código de la aplicación al contenedor
COPY . .

# Comando que se ejecutará cuando el contenedor se inicie
CMD ["flask", "run", "--host=0.0.0.0"]