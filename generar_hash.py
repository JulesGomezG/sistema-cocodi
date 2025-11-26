# =============================================================
# UTILIDAD PARA GENERAR HASH DE CONTRASEÑA DE ADMINISTRADOR
# USO: python generar_hash.py
# Requerimiento: pip install werkzeug
# =============================================================
from werkzeug.security import generate_password_hash
import sys

def generar_hash_seguro(password):
    """
    Genera un hash de contraseña seguro usando el método por defecto de Werkzeug
    (actualmente scrypt o PBKDF2), compatible con Flask.
    """
    if not password:
        print("ERROR: La contraseña no puede estar vacía.")
        return None
        
    try:
        # Usamos el método recomendado (por defecto) para máxima seguridad.
        hash_result = generate_password_hash(password)
        return hash_result
    except Exception as e:
        print(f"Error al generar hash: {e}")
        return None

if __name__ == "__main__":
    

    # El patron de la contraseña es: {usuario}prod2025!
    USERS_TO_HASH = [
        # ROL: Admin
        {'usuario': 'aplatasl', 'password_base': 'aplataslprod2025!', 'rol': 'Admin', 'nombre': 'ALEJANDRO PLATAS L. (ADMIN)'},
        # ROL: Analista
        {'usuario': 'edavalosl', 'password_base': 'edavaloslprod2025!', 'rol': 'Analista', 'nombre': 'ERIKA DAVALOS L.'},
    ]  

    # 2. VERIFICACIÓN DE INSTALACIÓN
    try:
        from werkzeug.security import generate_password_hash
    except ImportError:
        print("\nERROR CRÍTICO: La librería 'werkzeug' no está instalada.")
        print("Ejecute: pip install werkzeug")
        sys.exit(1)

    print("\n" + "=" * 80)
    print("✅ GENERANDO HASHES SEGUROS PARA LOS 10 USUARIOS")
    print("=" * 80)

    sql_output = []
    
    for user_data in USERS_TO_HASH:
        password_input = user_data['password_base']
        hash_generado = generar_hash_seguro(password_input)
        
        if hash_generado:
            # Imprimir en consola para verificación inmediata
            print(f"Usuario: {user_data['usuario']} | Rol: {user_data['rol']}")
            print(f"HASH: {hash_generado}")
            print("-" * 20)
            
            # Generar la línea SQL para facilitar el pegado
            sql_line = f"    ('{user_data['nombre']}', '{user_data['usuario']}', '{hash_generado}', '{user_data['rol']}', 'script_seguridad'),"
            sql_output.append(sql_line)
        else:
            print(f"❌ Falló la generación para el usuario: {user_data['usuario']}")
            
    if sql_output:
        print("\n" + "=" * 80)
        print("📋 BLOQUE SQL FINAL PARA PEGAR EN init.sql (Reemplace las líneas existentes)")
        print("=" * 80)
        print("INSERT INTO usuarios (nombre_completo, usuario, password_hash, rol, usuario_creacion) VALUES")
        
        # Imprimir todas las líneas, excepto la última (para quitar la coma)
        for line in sql_output[:-1]:
            print(line)
        
        # Imprimir la última línea sin la coma y agregar ON CONFLICT
        print(sql_output[-1].rstrip(','))
        print("ON CONFLICT (usuario) DO NOTHING;")
        
        print("-" * 80)
        print("\nInstrucción: Ejecute el comando UPDATE en la base de datos.")