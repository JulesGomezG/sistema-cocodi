Chart.register(ChartDataLabels);

// --- Variables Globales de Autenticación ---
let authData = {
    userId: null,
    userRole: null, // 'Admin', 'Capturista', 'Lector'
    userName: null,
    isAuthenticated: false
};

// --- Funciones de Comprobación de Roles ---
const checkRole = (roles) => {
    if (!authData.isAuthenticated) return false;
    // Convierte el rol simple o array a un array para la comprobación
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    return requiredRoles.includes(authData.userRole);
};

// =============================================================
// =================== LÓGICA DE AUTENTICACIÓN =================
// =============================================================





async function checkAuthStatus() {
    try {
        const user = await fetchAPI('/api/user', { method: 'GET' });
        
        // CRÍTICO: La sesión es válida si el user_id está presente Y es un número/string válido.
        if (user && user.user_id && user.user_id !== null) { 
            authData.userId = user.user_id;
            // Corregir la asignación de nombre y rol, si el backend los envía como null.
            authData.userRole = user.rol || 'Lector';
            authData.userName = user.nombre || 'Usuario';
            authData.isAuthenticated = true;
            console.log(`[AUTH] Sesión activa: ${authData.userName} (${authData.userRole})`);
        } else {
            // Si user_id es null o la respuesta es vacía, no está autenticado.
            authData.isAuthenticated = false;
            console.log('[AUTH] Usuario no autenticado. Mostrando Login.');
        }
    } catch (error) {
        console.warn("[AUTH] Error al verificar sesión, forzando logout:", error);
        authData.isAuthenticated = false;
    }
    updateUIForAuth();
}


// Reemplazar la función updateUIForAuth completa:
function updateUIForAuth() {
    const loginSection = document.getElementById('section-login');
    const nav = document.querySelector('.main-nav');
    const authStatusDiv = document.getElementById('auth-status');
    const allSections = document.querySelectorAll('.app-section');

    // 1. Mostrar/Ocultar secciones de alto nivel
    if (authData.isAuthenticated) {
        // --- ESTADO AUTENTICADO ---
        loginSection?.style.setProperty('display', 'none');
        nav.style.display = 'flex';
        authStatusDiv?.classList.remove('hidden');
        document.getElementById('user-name-display').textContent = authData.userName;
        document.getElementById('user-role-display').textContent = authData.userRole;

        // Mostrar sección inicial (Sesiones) y ocultar todas las demás
        // IMPORTANTE: Primero oculta todas
        allSections.forEach(section => section.style.setProperty('display', 'none'));
        
        // Luego muestra la de sesiones (si existe)
        const sesionSection = document.getElementById('section-sesiones');
        if (sesionSection) {
            sesionSection.style.setProperty('display', 'block');
            document.querySelector('.main-nav a[data-section="section-sesiones"]')?.classList.add('active');
        }

        // Inicializar módulos y permisos una vez autenticado
		
		const navBulkUpload = document.querySelector('.main-nav a[data-section="section-carga-masiva"]');
        const sectionBulkUpload = document.getElementById('section-carga-masiva');
        
        if (navBulkUpload && sectionBulkUpload) {
            // Solo Admin puede ver y acceder a la Carga Masiva
            if (authData.userRole === 'Admin') {
                navBulkUpload.style.setProperty('display', 'block');
                sectionBulkUpload.classList.remove('hidden');
            } else {
                navBulkUpload.style.setProperty('display', 'none');
                sectionBulkUpload.classList.add('hidden');
            }
        }
        initAllModules();
    } else {
        // --- ESTADO NO AUTENTICADO ---
        // Ocultar todas las secciones de contenido
        allSections.forEach(section => section.style.setProperty('display', 'none'));

        loginSection?.style.setProperty('display', 'block'); // Mostrar Login
        nav.style.display = 'none'; // Ocultar Navegación
        authStatusDiv?.classList.add('hidden'); // Ocultar Header de Usuario
        
        // El bug visual del Header se resuelve quitando la clase 'hidden' en el HTML
    }
    
    // Aplicar permisos a botones sensibles (CRÍTICO)
    applyRolePermissions();
}

function applyRolePermissions() {
    // 1. Permiso de ESCRITURA/EDICIÓN (POST/PUT/CRUD)
    // Roles: Admin, Responsable, Analista
    const canWrite = checkRole(['Admin', 'Responsable', 'Analista']);
    
    // 2. Permiso de ELIMINACIÓN (DELETE)
    // Roles: Admin, Responsable
    const canDelete = checkRole(['Admin', 'Responsable']);
    
    // 3. Permiso de CARGA MASIVA (BULK-UPLOAD)
    // Roles: Solo Admin
    const canBulkUpload = checkRole(['Admin']); 

    // 1. Botones estáticos de Creación/Edición
    const sensitiveButtons = [
        'btn-agendar-extraordinaria',
        'btn-nuevo-informe',
        'btn-nueva-recomendacion-informe',
        'btn-nueva-recomendacion-independiente',
        'btn-nuevo-contacto',
    ];

    sensitiveButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            // Requiere canWrite
            btn.disabled = !canWrite;
            btn.style.opacity = canWrite ? 1 : 0.4;
        }
    });

    // 2. Botón de Carga Masiva (Exclusivo de Admin)
    const bulkBtn = document.getElementById('bulk-upload-submit-btn');
    if (bulkBtn) {
        bulkBtn.disabled = !canBulkUpload;
        bulkBtn.style.opacity = canBulkUpload ? 1 : 0.4;
    }
    
    // 3. Botones dinámicos (Edit/Delete)
    document.body.querySelectorAll('.actions-cell button').forEach(btn => {
        // Deshabilitar la acción si el usuario no tiene canWrite (cubre DG/Invitado)
        if (!canWrite) {
            btn.disabled = true;
            btn.style.opacity = 0.4;
            btn.style.cursor = 'not-allowed';
            return;
        }

        // Si es un botón de ELIMINACIÓN, requiere canDelete (bloquea a Analista)
        if (btn.classList.contains('btn-delete-informe') || btn.classList.contains('btn-delete-rec') || btn.classList.contains('btn-delete-contacto')) {
            if (!canDelete) {
                btn.disabled = true;
                btn.style.opacity = 0.4;
                btn.style.cursor = 'not-allowed';
                return;
            }
        }
        
        // Habilitar todos los demás botones (Editar y Ver) para quienes tienen canWrite
        btn.disabled = false;
        btn.style.opacity = 1;
        btn.style.cursor = 'pointer';
    });
}

function initLoginForm() {
    const form = document.getElementById('login-form');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (form) {
        // 1. Limpiamos cualquier listener de submit previo para evitar duplicados
        form.removeEventListener('submit', handleLoginSubmit); 
        
        // 2. Añadimos el listener de submit
        form.addEventListener('submit', handleLoginSubmit);
        
        // 3. Añadimos el listener de validación para el botón
        const validateLoginButton = () => {
             // Solo habilitamos si el formulario completo es válido
             submitBtn.disabled = !form.checkValidity();
        };
        
        form.addEventListener('input', validateLoginButton);
        form.addEventListener('change', validateLoginButton);
        
        // Forzar validación al cargar el formulario
        validateLoginButton();
    }
    
    // El listener de Logout se mantiene en document.addEventListener('DOMContentLoaded')
}



async function handleLoginSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const errorMsg = document.getElementById('login-error-message');
    // CAMBIO: Renombrar 'email' a 'usuario' y leer el valor del campo 'login-email' (el ID en el HTML)
    const usuario = document.getElementById('login-email').value; 
    const password = document.getElementById('login-password').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    errorMsg.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando...';

    // *** SINCRONIZACIÓN CRÍTICA: Enviar FormData con la clave 'usuario' ***
    const formData = new FormData();
    // CAMBIO CRÍTICO: El backend espera 'usuario', no 'email'
    formData.append('usuario', usuario); 
    formData.append('password', password);
    // ------------------------------------------------------------------------------------

    try {
        const data = await fetchAPI('/api/login', {
            method: 'POST',
            body: formData, 
            isAuthAttempt: true 
        });

        authData.userId = data.user_id;
        authData.userRole = data.rol;
        authData.userName = data.nombre;
        authData.isAuthenticated = true;
        showNotification(`Bienvenido, ${data.nombre} (${data.rol})`, 'success');
        updateUIForAuth(); 
        submitBtn.textContent = 'Acceder';

    } catch (error) {
        console.error('Login fallido:', error);
        errorMsg.textContent = error.message || 'Error de credenciales o conexión.';
        submitBtn.textContent = 'Acceder';
        submitBtn.disabled = false;
    }
}

async function handleLogout() {
    try {
        await fetchAPI('/api/logout', { method: 'POST' });
        authData.userId = null;
        authData.userRole = null;
        authData.userName = null;
        authData.isAuthenticated = false;
        showNotification('Sesión cerrada correctamente.', 'info');
        updateUIForAuth();
    } catch (error) {
        showNotification(`Error al cerrar sesión: ${error.message}`, 'error');
    }
}

// --- Lógica para inicializar todos los módulos ---
function initAllModules() {
    // Estas funciones ya existían y deben llamarse SÓLO después de autenticar
    initAllModals();
    initConfirmModal();
    initAllFormValidations();
    initFileInputManagers();
    initSesionesModule();
    initReportesModule();
    initRecomendacionesModule();
    initDirectorioModule();
    initDashboardModule(); 
    initReporteriaModule();
    initCargaMasivaModule();
    
    // Forzamos la carga inicial de la primera vista.
    if (document.getElementById('section-sesiones')?.style.display !== 'none') {
        buscarCalendario();
    }
}

// Reemplazar la sección document.addEventListener('DOMContentLoaded', ...) completa:

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // [AUTENTICACIÓN] 1. Inicializar el formulario y listeners de Logout
    // ----------------------------------------------------
    initLoginForm();
    document.getElementById('btn-logout')?.addEventListener('click', handleLogout);

    // --- NAVEGACIÓN PRINCIPAL ---
    const navLinks = document.querySelectorAll('.main-nav .nav-link');
    const sections = document.querySelectorAll('.app-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (!authData.isAuthenticated) {
                e.preventDefault();
                showNotification('Debe iniciar sesión para navegar.', 'error');
                return;
            }
            
            e.preventDefault();
            const sectionId = link.dataset.section;
            
            // Lógica de visualización de secciones (modificada a style.display)
            sections.forEach(section => section.style.setProperty('display', 'none'));
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.style.setProperty('display', 'block');
                link.classList.add('active');
            }

            // Inicializaciones específicas por sección
            if (sectionId === 'section-reportes') {
                showReportesMainView();
            }

            if (sectionId === 'section-dashboard') {
                if (typeof switchView === 'function') { 
                    switchView('global');
                }
            }
            if (sectionId === 'section-recomendaciones-main') {
                cargarRecomendacionesIndependientes();
            }
            if (sectionId === 'section-directorio') {
                // Forzar reset de filtros y carga
                const instSelect = document.getElementById('filtro-dir-institucion');
                if (instSelect.value) {
                    cargarContactos();
                } else {
                    document.getElementById('directorio-tbody').innerHTML = '<tr><td colspan="7">Por favor, complete los filtros para ver los contactos.</td></tr>';
                }
            }
        });
    });

    // ----------------------------------------------------
    // [AUTENTICACIÓN] 2. Comprobar estado de sesión
    // ----------------------------------------------------
    checkAuthStatus();
});

// =============================================================
// =================== HELPERS GLOBALES ========================
// =============================================================
function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => notification.remove(), 500);
    }, 4500);
}

function initAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    });
}

let confirmCallback = null;
function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-body').textContent = message;
    document.getElementById('confirm-modal').style.display = 'flex';
    confirmCallback = onConfirm;
}

function initConfirmModal() {
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmModal = document.getElementById('confirm-modal');

    const closeModal = () => {
        if (confirmModal) {
            confirmModal.style.display = 'none';
        }
        confirmCallback = null;
    };

    if (confirmOkBtn) {
        confirmOkBtn.addEventListener('click', () => {
            if (typeof confirmCallback === 'function') {
                confirmCallback();
            }
            closeModal();
        });
    }

    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', closeModal);
    }
}

const formValidators = {};
function initAllFormValidations() {
    const forms = document.querySelectorAll('.modal-form');
    forms.forEach(form => {
        const submitButton = form.querySelector('button[type="submit"]');
        
        const validate = () => {
            const requiredInputs = Array.from(form.querySelectorAll('[required]'));
            const isFormValid = requiredInputs.every(input => {
                if (input.closest('.hidden')) {
                    return true;
                }
                if (input.type === 'file' && input.required) {
                    return true; 
                }
                return input.value.trim() !== '';
            });
            if (submitButton) {
                submitButton.disabled = !isFormValid;
            }
        };

        form.addEventListener('input', validate);
        form.addEventListener('change', validate);

        formValidators[form.id] = { validate };
    });
}

async function fetchAPI(url, options = {}) {
    const finalUrl = url.startsWith('/') ? url : `/api/${url.replace(/^api\//, '')}`;
    const isAuthAttempt = options.isAuthAttempt || false;

    if (!(options.body instanceof FormData)) {
        options.headers = { 'Content-Type': 'application/json', ...options.headers };
        if (options.body) {
            options.body = JSON.stringify(options.body);
        }
    }
    
    const response = await fetch(finalUrl, options);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Error HTTP: ${response.status}` }));
        
        // --- MANEJO DE ERROR 401 (NO AUTORIZADO) ---
        if (response.status === 401 && !isAuthAttempt) {
            showNotification('Sesión expirada o no autorizada. Reingrese.', 'error');
            authData.isAuthenticated = false; // Forzar logout local
            updateUIForAuth(); // Forzar la vista de login
            throw new Error('No autorizado (401)');
        }

        throw new Error(errorData.message || errorData.error || `Error HTTP: ${response.status}`);
    }
    
    return response.status !== 204 ? response.json() : null;
}

async function poblarSelectConAPI(url, selectId, valueField, textField, placeholder, addGeneralOption = false) {
    try {
        const data = await fetchAPI(url);
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = `<option value="">${placeholder}</option>`;
        
        if (addGeneralOption) {
            const optionText = addGeneralOption === true ? '-- General --' : addGeneralOption;
            const option = new Option(optionText, '0');
            select.add(option);
        }

        data.forEach(item => {
            select.add(new Option(item[textField], item[valueField]));
        });
        return data;
    } catch (error) {
        console.error(`Fallo en poblarSelect ${selectId}:`, error);
        showNotification(`Error al cargar datos para ${selectId}`, 'error');
    }
}


function poblarSelectConOpciones(selectId, opciones, placeholder) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`Error: Select con ID "${selectId}" no encontrado.`);
        return;
    }
    select.innerHTML = `<option value="">${placeholder}</option>`; // Añadir opción por defecto
    opciones.forEach(opcion => {
        select.add(new Option(opcion, opcion)); // El texto y el valor son los mismos
    });
    select.disabled = false; // Habilitar el select
}


// Función auxiliar para limpiar y deshabilitar selects
function resetSelect(select, message) {
    if (!select) return;
    select.innerHTML = `<option value="">${message}</option>`;
    select.disabled = true;
}



// === NUEVA FUNCIÓN AUXILIAR ===
/**
 * Puebla un elemento select con un rango de años.
 * @param {string} selectId - El ID del elemento select.
 * @param {string} placeholder - El texto para la opción por defecto (value="").
 * @param {number} startYearOffset - Cuántos años hacia el futuro desde el actual (ej. 0).
 * @param {number} yearsToGoBack - Cuántos años hacia el pasado desde el actual (ej. 6 para ir hasta 2024 desde 2030).
 * @param {number|string|null} [defaultValue=null] - El valor a seleccionar por defecto. Si es null, se selecciona el placeholder.
 */
function populateYearSelect(selectId, placeholder, startYearOffset = 0, yearsToGoBack = 6, defaultValue = null) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`populateYearSelect: No se encontró el select con ID "${selectId}"`);
        return;
    }
    select.innerHTML = `<option value="">${placeholder}</option>`; // Opción por defecto
    const currentYear = new Date().getFullYear();
    const startYear = currentYear + startYearOffset;
    const endYear = currentYear - yearsToGoBack;

    for (let i = startYear; i >= endYear; i--) {
        select.add(new Option(i, i));
    }

    // Establecer valor por defecto si se proporciona
    if (defaultValue !== null && defaultValue !== undefined) {
        select.value = defaultValue;
    } else {
        select.value = ""; // Asegurar que el placeholder esté seleccionado si no hay default
    }
     select.disabled = false; // Asegurar que esté habilitado
}
// === FIN NUEVA FUNCIÓN AUXILIAR ===

// =============================================================
// =========== GESTOR DE FILTROS Y VISTAS GLOBALES ==============
// =============================================================
function setupCascadingFilters(config) {
    const { baseName, callback, year, organoGeneralOption } = config;

    const selectors = {
        año: year ? document.getElementById(`${baseName}-año`) : null,
        dg: document.getElementById(`${baseName}-dg`),
        ramo: document.getElementById(`${baseName}-ramo`),
        responsable: document.getElementById(`${baseName}-responsable`),
        institucion: document.getElementById(`${baseName}-institucion`),
        organo: document.getElementById(`${baseName}-organo`)
    };

    const resetSelect = (select, message) => {
        if (!select) return; // Ya tiene una guarda, pero el error ocurre al *llamar* a esta función
        select.innerHTML = `<option value="">${message}</option>`;
        select.disabled = true;
    };

    const populateDGs = async () => {
        if (selectors.dg) {
            let placeholder = 'Todos';
            if (baseName.startsWith('filtro') || baseName.startsWith('dd-filtro') || baseName.startsWith('form-') || baseName.startsWith('rec-') || baseName.startsWith('dir-modal-')) {
                 placeholder = 'Seleccione...';
            }
            await poblarSelectConAPI('/api/dgs', `${baseName}-dg`, 'id_dg', 'nombre_dg', placeholder);
            selectors.dg.disabled = false;
        }
    };
    
    selectors.dg?.addEventListener('change', async () => {
        console.log(`Filtro DG '${baseName}' cambiado.`);
        const dgId = selectors.dg.value;
        resetSelect(selectors.ramo, 'Seleccione DG...');
        resetSelect(selectors.responsable, 'Seleccione Ramo...');
        resetSelect(selectors.institucion, 'Seleccione Responsable...');
        if (selectors.organo) resetSelect(selectors.organo, 'Seleccione Institución...'); // <--- Añadir check aquí también
        
        if (dgId) {
            await poblarSelectConAPI(`/api/ramos?id_dg=${dgId}`, `${baseName}-ramo`, 'id_ramo', 'nombre_ramo', 'Todos');
            selectors.ramo.disabled = false;
        }
        if (callback) callback();
    });

    selectors.ramo?.addEventListener('change', async () => {
        console.log(`Filtro Ramo '${baseName}' cambiado.`);
        const ramoId = selectors.ramo.value;
        resetSelect(selectors.responsable, 'Seleccione Ramo...');
        resetSelect(selectors.institucion, 'Seleccione Responsable...');
        if (selectors.organo) resetSelect(selectors.organo, 'Seleccione Institución...'); // <--- Añadir check aquí también
        
        if (ramoId) {
            await poblarSelectConAPI(`/api/responsables?id_ramo=${ramoId}`, `${baseName}-responsable`, 'id_responsable', 'nombre', 'Todos');
            selectors.responsable.disabled = false;
        }
        if (callback) callback();
    });

    selectors.responsable?.addEventListener('change', async () => {
        console.log(`Filtro Responsable '${baseName}' cambiado.`);
        const responsableId = selectors.responsable.value;
        const ramoId = selectors.ramo.value;
        resetSelect(selectors.institucion, 'Seleccione Responsable...');
        if (selectors.organo) resetSelect(selectors.organo, 'Seleccione Institución...'); // <--- Añadir check aquí también
        
        if (responsableId && ramoId) {
            await poblarSelectConAPI(`/api/instituciones?responsable_id=${responsableId}&id_ramo=${ramoId}`, `${baseName}-institucion`, 'id_institucion', 'nombre_institucion', 'Todas');
            selectors.institucion.disabled = false;
        } else if (ramoId) {
             await poblarSelectConAPI(`/api/instituciones?id_ramo=${ramoId}`, `${baseName}-institucion`, 'id_institucion', 'nombre_institucion', 'Todas');
             selectors.institucion.disabled = false;
        }
        if (callback) callback();
    });

    // --- INICIO DE LA CORRECCIÓN CLAVE ---
    selectors.institucion?.addEventListener('change', async () => {
        console.log(`Filtro Institución '${baseName}' cambiado.`);
        const institucionId = selectors.institucion.value;
        
        // Solo intentar resetear/poblar el filtro 'organo' SI existe
        if (selectors.organo) { 
            resetSelect(selectors.organo, 'Seleccione Institución...');
            
            if (institucionId) {
                await poblarSelectConAPI(
                    `/api/organos-colegiados?institucion_id=${institucionId}`, 
                    `${baseName}-organo`, 
                    'id_organo_colegiado', 
                    'nombre_organo', 
                    'Todos', 
                    organoGeneralOption
                );
                selectors.organo.disabled = false;
            }
        }
        // --- FIN DE LA CORRECCIÓN CLAVE ---
        
        if (callback) callback(); // Llamar al callback de todos modos
    });
    // --- FIN DE LA CORRECCIÓN CLAVE ---

    selectors.organo?.addEventListener('change', () => {
        console.log(`Filtro Órgano '${baseName}' cambiado.`);
        if (callback) callback();
    });
    
    if (year && selectors.año) {
        selectors.año.addEventListener('change', () => {
            console.log(`Filtro Año '${baseName}' cambiado.`);
            if (callback) callback();
        });
    }
    
    const resetAll = () => {
        if (year && selectors.año) {
			const currentYear = new Date().getFullYear();
            let placeholder = 'Seleccione...';
            if (baseName.startsWith('report-')) {
                placeholder = 'Todos';
            }
            let defaultValue = null;
            if (baseName.startsWith('filtro-') || baseName.startsWith('dd-filtro-') || baseName.startsWith('filtro-rec')) {
                defaultValue = currentYear;
            }
            populateYearSelect(`${baseName}-año`, placeholder, 0, 6, defaultValue);
		}
        populateDGs();
        resetSelect(selectors.ramo, 'Seleccione DG...');
        resetSelect(selectors.responsable, 'Seleccione Ramo...');
        resetSelect(selectors.institucion, 'Seleccione Responsable...');
        if (selectors.organo) resetSelect(selectors.organo, 'Seleccione Institución...'); // <--- Añadir check aquí también
        
        if (callback) callback(); 
    };
    
    resetAll();
}

function showReportesMainView() {
    document.getElementById('reportes-main-view').classList.remove('hidden');
    document.getElementById('reportes-detail-view').classList.add('hidden');
}

function showReportesDetailView() {
    document.getElementById('reportes-main-view').classList.add('hidden');
    document.getElementById('reportes-detail-view').classList.remove('hidden');
}


const fileManagers = {};
function initFileInputManagers() {
    const fileInputs = [
        { inputId: 'sesion-files-input', listId: 'sesion-files-list' },
        { inputId: 'informe-files-input', listId: 'informe-files-list' },
        { inputId: 'recomendacion-files-input', listId: 'recomendacion-files-list' }
    ];

    fileInputs.forEach(({ inputId, listId }) => {
        const inputElement = document.getElementById(inputId);
        const listElement = document.getElementById(listId);

        if (inputElement && listElement) {
            let files = [];
            const form = inputElement.closest('form');

            const renderFiles = () => {
                listElement.innerHTML = '';
                if (files.length === 0) {
                    listElement.innerHTML = '<p style="text-align:center; color:#888;">No hay archivos seleccionados.</p>';
                } else {
                    files.forEach((file, index) => {
                        const item = document.createElement('div');
                        item.className = 'file-list-item';
                        item.innerHTML = `
                            <span>${file.name}</span>
                            <button type="button" class="remove-file-btn" data-index="${index}">&times;</button>
                        `;
                        listElement.appendChild(item);
                    });
                }
                if (form && formValidators[form.id]) {
                    formValidators[form.id].validate();
                }
            };

            inputElement.addEventListener('change', () => {
                Array.from(inputElement.files).forEach(newFile => {
                    if (!files.some(existingFile => existingFile.name === newFile.name)) {
                        files.push(newFile);
                    }
                });
                inputElement.value = '';
                renderFiles();
            });

            listElement.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-file-btn')) {
                    const index = parseInt(e.target.dataset.index, 10);
                    files.splice(index, 1);
                    renderFiles();
                }
            });

            fileManagers[inputId] = {
                getFiles: () => files,
                clearFiles: () => {
                    files = [];
                    renderFiles();
                }
            };
            
            renderFiles();
        }
    });
}


// =============================================================
// =================== MÓDULO DE SESIONES ======================
// =============================================================


// --- FUNCIÓN DE TÍTULO CORREGIDA Y ROBUSTA ---
function generarTituloSesion(sesion) {
    if (!sesion) return 'Sesión Desconocida';

    // REGLA #1: Formato especial para sesiones "Programadas"
    if (sesion.estatus === 'Programada') {
        return `${sesion.numero_ordinal}a Sesión Trimestral ${sesion.año}`;
    }

    // REGLA #2: Formato para sesiones Extraordinarias
    if (sesion.id_tipo_sesion === 2) {
        return `Sesión Extraordinaria (Sesión ${sesion.id_sesion} - ${sesion.año})`;
    }

    // REGLA #3: Formato para sesiones Ordinarias "Realizadas"
    if (sesion.id_tipo_sesion === 1) {
        const tituloPrincipal = `${sesion.numero_ordinal}a Sesión Trimestral ${sesion.año}`;
        const identificador = `(Sesión ${sesion.id_sesion} - ${sesion.año})`;
        return `${tituloPrincipal} ${identificador}`;
    }

    // REGLA #4 (FALLBACK): Para cualquier otro caso
    return `Sesión ID: ${sesion.id_sesion} - ${sesion.año}`;
}
// --- FIN DE LA FUNCIÓN AUXILIAR ---
let sesionesData = {}; 


function initSesionesModule() {
    setupCascadingFilters({
        baseName: 'filtro',
        year: true,
        callback: buscarCalendario
    });

    document.getElementById('calendario-container')?.addEventListener('click', handleCalendarioClick);
    document.getElementById('ejecucion-form')?.addEventListener('submit', handleEjecucionSubmit);
    
    const btnAgendar = document.getElementById('btn-agendar-extraordinaria');
    if (btnAgendar) {
        btnAgendar.addEventListener('click', () => abrirModalEjecucion({ modo: 'extraordinaria' }));
    }

    document.getElementById('sesion-detalle-modal')?.addEventListener('click', handleDetalleModalClick);
}
// Las funciones resetSesionesView, poblarResponsablesPorAno, poblarInstituciones
// y poblarOrganosColegiados ya no son necesarias y han sido eliminadas.

async function buscarCalendario() {
    const año = document.getElementById('filtro-año').value;
    const institucionId = document.getElementById('filtro-institucion').value;
    const organoId = document.getElementById('filtro-organo').value;
    const container = document.getElementById('calendario-container');

    document.getElementById('btn-agendar-extraordinaria').disabled = !año || !institucionId || !organoId;

    if (!año || !institucionId || !organoId) {
        container.innerHTML = '<p>Por favor, complete los filtros para ver el calendario (Año, Institución y Órgano son requeridos).</p>';
        return;
    }

    try {
        container.innerHTML = '<p>Cargando calendario...</p>';
        const calendario = await fetchAPI(`/api/sesiones?año=${año}&institucion_id=${institucionId}&organo_id=${organoId}`);
        renderCalendario(calendario);
    } catch (error) { 
        console.error('Error al buscar calendario:', error);
        container.innerHTML = '<p style="color:red;">Error al cargar el calendario. Revise la consola.</p>';
    }
}

function renderCalendario(sesiones) {
	
	console.log('Datos EXACTOS recibidos del backend:', sesiones);
	
    const container = document.getElementById('calendario-container');
    container.innerHTML = '';
    sesionesData = {};

    if (!sesiones || sesiones.length === 0) {
        container.innerHTML = '<p>No hay sesiones programadas o realizadas para esta selección.</p>';
        return;
    }

    // Lógica de filtrado estricta para separar las sesiones
    const sesionesOrdinarias = sesiones.filter(s => s.tipo_sesion && s.tipo_sesion.toLowerCase() === 'ordinaria');
    const sesionesExtraordinarias = sesiones.filter(s => s.tipo_sesion && s.tipo_sesion.toLowerCase() === 'extraordinaria');

    // Renderizar sección de Sesiones Ordinarias
    if (sesionesOrdinarias.length > 0) {
        const headerOrd = document.createElement('h2');
        headerOrd.textContent = 'Sesiones Ordinarias';
        container.appendChild(headerOrd);

        sesionesOrdinarias.forEach(sesion => {
            sesionesData[sesion.id_sesion] = sesion;
            const card = crearCardSesion(sesion);
            container.appendChild(card);
        });
    }

    // Renderizar sección de Sesiones Extraordinarias
    if (sesionesExtraordinarias.length > 0) {
        const headerExt = document.createElement('h2');
        headerExt.style.marginTop = '2em';
        headerExt.textContent = 'Sesiones Extraordinarias';
        container.appendChild(headerExt);

        sesionesExtraordinarias.forEach(sesion => {
            sesionesData[sesion.id_sesion] = sesion;
            const card = crearCardSesion(sesion);
            container.appendChild(card);
        });
    }
}

function crearCardSesion(sesion) {
    const card = document.createElement('div');
    card.className = 'sesion-card';
    card.dataset.idSesion = sesion.id_sesion;
    const titulo = generarTituloSesion(sesion);
    const infoDiv = document.createElement('div');
    infoDiv.className = 'sesion-card-info';
    infoDiv.innerHTML = `<h3>${titulo}</h3><p>Estatus: <span class="estatus estatus-${sesion.estatus}">${sesion.estatus}</span></p>`;
    card.appendChild(infoDiv);
    if (sesion.estatus === 'Programada') {
        const button = document.createElement('button');
        button.className = 'btn-primary btn-registrar';
        button.textContent = 'Registrar Ejecución';
        card.appendChild(button);
    } else if (sesion.estatus === 'Realizada') {
        card.classList.add('realizada');
        card.style.cursor = 'pointer';
    }
    return card;
}

function handleCalendarioClick(event) {
    console.log("Se detectó un CLIC dentro del contenedor del calendario.");
    const card = event.target.closest('.sesion-card');
    if (!card) {
        console.log("El clic no fue en una tarjeta de sesión. Se ignora.");
        return;
    }

    const idSesion = card.dataset.idSesion;
    console.log(`Clic en tarjeta con ID de sesión: ${idSesion}`);

    if (!idSesion) {
        console.error("ERROR: La tarjeta no tiene un 'data-id-sesion'. No se puede continuar.");
        return;
    }

    // Punto #4: Clic en "Registrar Ejecución"
    if (event.target.classList.contains('btn-registrar')) {
        console.log("El clic fue en el botón 'Registrar Ejecución'. Abriendo modal de ejecución...");
        abrirModalEjecucion({ modo: 'ordinaria', idSesion });
    } 
    // Punto #3: Clic en una tarjeta "Realizada"
    else if (card.classList.contains('realizada')) {
        console.log("El clic fue en una tarjeta 'Realizada'. Abriendo modal de detalles...");
        abrirModalDetalleSesion(idSesion);
    } else {
        console.log("El clic fue en una tarjeta, pero no en un botón o en una sesión 'Realizada'.");
    }
}

async function abrirModalDetalleSesion(idSesion) {
    const sesion = sesionesData[idSesion];
    if (!sesion) {
        console.error("No se encontraron los datos para la sesión con ID:", idSesion);
        return;
    }
    
    const modal = document.getElementById('sesion-detalle-modal');
    if (!modal) {
        console.error("CRÍTICO: El modal 'sesion-detalle-modal' no existe en el HTML.");
        return;
    }

    const titleEl = document.getElementById('sesion-detalle-title');
    const bodyEl = document.getElementById('sesion-detalle-body');
    const footerEl = document.getElementById('sesion-detalle-footer');

    const titulo = generarTituloSesion(sesion);
    titleEl.textContent = `${titulo}`;
    bodyEl.innerHTML = `
        <p><strong>Número de Oficio / Nombre Oficial:</strong> ${sesion.nombre_oficial_sesion || 'No registrado'}</p>
        <p><strong>Fecha Real de Ejecución:</strong> ${sesion.fecha_realizada ? new Date(sesion.fecha_realizada).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : 'N/A'}</p>
        <hr>
        <h3>Documentos Adjuntos</h3>
        <ul id="sesion-evidencias-list"><li>Cargando...</li></ul>
    `;
    footerEl.innerHTML = `<button id="btn-edit-sesion" class="btn-warning" data-id-sesion="${idSesion}">Editar Ejecución</button>`;
    modal.style.display = 'flex';
    
    const evidenciasList = document.getElementById('sesion-evidencias-list');
    try {
        const evidencias = await fetchAPI(`/api/evidencias?parent_type=sesion&parent_id=${idSesion}`);
        if (evidencias && evidencias.length > 0) {
            evidenciasList.innerHTML = '';
            evidencias.forEach(ev => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="/uploads/${ev.url_almacenamiento}" target="_blank">${ev.nombre_archivo}</a>`;
                evidenciasList.appendChild(li);
            });
        } else {
            evidenciasList.innerHTML = '<li>No hay documentos adjuntos.</li>';
        }
    } catch (error) {
        console.error("Error al cargar evidencias de sesión:", error);
        evidenciasList.innerHTML = '<li>Error al cargar documentos.</li>';
    }
}

function handleDetalleModalClick(event) {
    if (event.target.id === 'btn-edit-sesion') {
        const idSesion = event.target.dataset.idSesion;
        const sesion = sesionesData[idSesion];
        if (sesion) {
            document.getElementById('sesion-detalle-modal').style.display = 'none';
            abrirModalEjecucion({ modo: 'edit', sesionData: sesion });
        }
    }
}

function abrirModalEjecucion({ modo, idSesion = null, sesionData = null }) {
    console.log(`Función abrirModalEjecucion llamada con modo: '${modo}' y ID de sesión: ${idSesion}`);
    const modal = document.getElementById('ejecucion-modal');
    if (!modal) {
        console.error("CRÍTICO: El modal 'ejecucion-modal' no existe en el HTML.");
        return;
    }

    const form = document.getElementById('ejecucion-form');
    const modalTitle = document.getElementById('modal-title');
    form.reset();
    fileManagers['sesion-files-input'].clearFiles();
    form.querySelector('#id_calendario_hidden').value = idSesion || (sesionData ? sesionData.id_sesion : '');
    form.querySelector('#id_ejecucion_hidden').value = sesionData ? sesionData.id_sesion : '';
    if (modo === 'ordinaria') {
        modalTitle.textContent = 'Registrar Ejecución de Sesión Ordinaria';
    } else if (modo === 'extraordinaria') {
        modalTitle.textContent = 'Registrar Sesión Extraordinaria';
    } else if (modo === 'edit' && sesionData) {
        modalTitle.textContent = 'Editar Ejecución de Sesión';
        form.querySelector('[name="numero_sesion_oficial"]').value = sesionData.nombre_oficial_sesion || '';
        if (sesionData.fecha_realizada) {
            form.querySelector('[name="fecha_real"]').value = new Date(sesionData.fecha_realizada).toISOString().split('T')[0];
        }
    }
    modal.style.display = 'flex';
    console.log("Modal de ejecución debería estar VISIBLE ahora.");
    if(formValidators[form.id]) formValidators[form.id].validate();
}



async function handleEjecucionSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const files = fileManagers['sesion-files-input'].getFiles();
    formData.delete('files');

    // Esta línea ahora funcionará gracias al cambio en el HTML
    const idSesion = formData.get('id_calendario_hidden'); 
    
    // --- LOGS DE DEPURACIÓN ---
    console.log(`[DEBUG] SUBMIT INICIADO. idSesion del formulario: '${idSesion}'`);

    const esSesionExistente = idSesion && !isNaN(parseInt(idSesion));
    const esSesionProgramada = idSesion && typeof idSesion === 'string' && idSesion.startsWith('programada_');

    console.log(`[DEBUG] EVALUANDO: esSesionProgramada=${esSesionProgramada}, esSesionExistente=${esSesionExistente}`);

    let url, method, successMessage;

    if (esSesionProgramada) {
        console.log("[DEBUG] RUTA LÓGICA: REGISTRAR ORDINARIA");
        url = '/api/sesiones/ordinaria';
        method = 'POST';
        successMessage = 'Sesión ordinaria registrada exitosamente.';
        formData.append('año', document.getElementById('filtro-año').value);
        formData.append('institucion_id', document.getElementById('filtro-institucion').value);
        formData.append('organo_id', document.getElementById('filtro-organo').value);
        formData.append('fecha_realizada', formData.get('fecha_real'));

    } else if (esSesionExistente) {
        console.log("[DEBUG] RUTA LÓGICA: EDITAR EXISTENTE");
        url = `/api/sesiones/${idSesion}`;
        method = 'PUT';
        successMessage = 'Sesión actualizada exitosamente.';
        formData.append('nombre_oficial_sesion', formData.get('numero_sesion_oficial'));
        formData.append('fecha_realizada', formData.get('fecha_real'));

    } else {
        console.log("[DEBUG] RUTA LÓGICA: CREAR EXTRAORDINARIA (FALLBACK)");
        url = '/api/sesiones/extraordinaria';
        method = 'POST';
        successMessage = 'Sesión extraordinaria registrada exitosamente.';
        formData.append('año', document.getElementById('filtro-año').value);
        formData.append('institucion_id', document.getElementById('filtro-institucion').value);
        formData.append('organo_id', document.getElementById('filtro-organo').value);
        formData.append('fecha_realizada', formData.get('fecha_real'));
    }
    
    try {
        const response = await fetchAPI(url, { method, body: formData });
        const sesionAfectadaId = response.id_sesion;

        if (files.length > 0 && sesionAfectadaId) {
            const fileFormData = new FormData();
            files.forEach(file => fileFormData.append('files', file));
            fileFormData.append('parent_type', 'sesion');
            fileFormData.append('parent_id', sesionAfectadaId);
            await fetchAPI('/api/upload', { method: 'POST', body: fileFormData });
        }
        
        form.reset();
        document.getElementById('ejecucion-modal').style.display = 'none';
        showNotification(successMessage);
        buscarCalendario();
    } catch (error) {   
        console.error('Error al guardar sesión:', error);    
        showNotification(`Error: ${error.message}`, 'error');
    }
}
// =============================================================
// --- MÓDULO DE INFORMES Y RECOMENDACIONES ---
// =============================================================
let currentInformeId = null;
let currentRecomendacionData = {};
let currentInformeData = {};
let currentView = 'informes';

// +++ REEMPLAZAR FUNCIÓN COMPLETA +++
function initReportesModule() {
    // 1. Configuración filtros PRINCIPALES (sin cambios)
    setupCascadingFilters({
        baseName: 'filtro-informe', 
        year: true,           
        organoGeneralOption: "Todos",
        callback: cargarInformes // <- Esta función refresca el grid
    });

    // 2. Configuración cascada DENTRO DEL MODAL (sin cambios)
    setupCascadingFilters({
        baseName: 'form-informe', 
        year: false, 
        organoGeneralOption: false, 
        callback: () => { 
            if (formValidators['informe-form']) {
                formValidators['informe-form'].validate();
            }
        }
    });

    // 3. Listener INSTITUCIÓN -> TIPO INFORME en modal (sin cambios)
    const institucionSelectModal = document.getElementById('form-informe-institucion');
    const tipoInformeSelectModal = document.getElementById('form-informe-tipo');
    if (institucionSelectModal && tipoInformeSelectModal) {
        institucionSelectModal.addEventListener('change', async () => {
            // ... (código existente para poblar tipos de informe) ...
            const institucionId = institucionSelectModal.value;
            tipoInformeSelectModal.innerHTML = '<option value="">Seleccione Institución...</option>';
            tipoInformeSelectModal.disabled = true;
            if (institucionId) {
                try {
                    await poblarSelectConAPI(
                        `/api/tipos-informe?id_institucion=${institucionId}`,
                        'form-informe-tipo', 'id_tipo_informe', 'nombre_informe', 'Seleccione...'
                    );
                    tipoInformeSelectModal.disabled = false;
                } catch (error) {
                    console.error("Error al poblar Tipos de Informe filtrados:", error);
                    tipoInformeSelectModal.innerHTML = '<option value="">Error al cargar</option>';
                    tipoInformeSelectModal.disabled = true;
                }
            }
            if (formValidators['informe-form']) {
                formValidators['informe-form'].validate();
            }
        });
    } else {
        console.error("Error crítico: No se encontraron los selects de Institución o Tipo Informe en el modal.");
    }

    // 4. Listeners botones y tabla (MODIFICACIÓN EN BOTÓN VOLVER)
    document.getElementById('btn-nuevo-informe')?.addEventListener('click', handleNuevoInformeClick);
    document.getElementById('informe-form')?.addEventListener('submit', handleInformeFormSubmit);
    document.getElementById('informes-tbody')?.addEventListener('click', handleInformeRowClick);
    
    // --- INICIO DE CORRECCIÓN ---
    // Modificar listener del botón "Volver a la lista"
    const btnVolver = document.getElementById('btn-volver-a-informes');
    if (btnVolver) {
        btnVolver.addEventListener('click', () => {
            console.log("Botón 'Volver a la lista' presionado. Mostrando grid y recargando datos...");
            showReportesMainView(); // Oculta detalle, muestra grid
            cargarInformes();       // <<-- AÑADIDO: Llama a la función que refresca el grid
        });
    }
    // --- FIN DE CORRECCIÓN ---
    
    document.getElementById('btn-nueva-recomendacion-informe')?.addEventListener('click', () => {
        // Asegurarse de que currentInformeId tenga un valor antes de pasar el objeto
        const informeActual = currentInformeId ? currentInformeData[currentInformeId] : null;
        if (informeActual) {
            handleNuevaRecomendacionClick({ informe: informeActual });
        } else {
            console.error("No se puede añadir recomendación: informe actual no definido.");
            showNotification("Error: No se pudo determinar el informe actual.", "error");
        }
    });

    document.getElementById('recomendacion-form')?.addEventListener('submit', handleRecomendacionFormSubmit);
    document.getElementById('recomendaciones-informe-tbody')?.addEventListener('click', handleRecomendacionesTableClick);
    document.getElementById('recomendacion-detalle-modal')?.addEventListener('click', handleDetalleRecomendacionModalClick);
} // <<< Fin de la función initReportesModule

// poblarInstituciones y poblarOrganosColegiados se mantienen para uso de los modales
async function poblarInstituciones(responsableId, institucionSelectId, organoSelectId) {
    const selectInstitucion = document.getElementById(institucionSelectId);
    selectInstitucion.innerHTML = '<option value="">Cargando...</option>';
    selectInstitucion.disabled = true;
    if (organoSelectId) {
        const selectOrgano = document.getElementById(organoSelectId);
        if (selectOrgano) {
            selectOrgano.innerHTML = '<option value="">Seleccione Institución...</option>';
            selectOrgano.disabled = true;
        }
    }
    if (!responsableId) {
        resetSelect(selectInstitucion, 'Seleccione Responsable...');
        return;
    }
    try {
        await poblarSelectConAPI(`/api/instituciones?responsable_id=${responsableId}`, institucionSelectId, 'id_institucion', 'nombre_institucion', 'Seleccione...');
        selectInstitucion.disabled = false;
    } catch (error) { console.error("Fallo en poblarInstituciones:", error); }
}

async function poblarOrganosColegiados(institucionId, organoSelectId, callbackFn, addGeneral) {
    const selectOrgano = document.getElementById(organoSelectId);
    selectOrgano.innerHTML = '<option value="">Cargando...</option>';
    selectOrgano.disabled = true;
    if (!institucionId) {
        resetSelect(selectOrgano, 'Seleccione Institución...');
        return;
    };
    try {
        await poblarSelectConAPI(`/api/organos-colegiados?institucion_id=${institucionId}`, organoSelectId, 'id_organo_colegiado', 'nombre_organo', 'Seleccione...', addGeneral);
        selectOrgano.disabled = false;
        if (callbackFn) callbackFn();
    } catch (error) { console.error("Fallo en poblarOrganosColegiados:", error); }
}

async function cargarInformes() {
    const año = document.getElementById('filtro-informe-año').value;
    const dgId = document.getElementById('filtro-informe-dg').value;
    const ramoId = document.getElementById('filtro-informe-ramo').value;
    const responsableId = document.getElementById('filtro-informe-responsable').value;
    const institucionId = document.getElementById('filtro-informe-institucion').value;
    const organoId = document.getElementById('filtro-informe-organo').value;

    const params = new URLSearchParams();
    if (año) params.append('periodo_reportado', año);
    if (dgId) params.append('id_dg', dgId);
    if (ramoId) params.append('id_ramo', ramoId);
    if (responsableId) params.append('responsable_id', responsableId);
    if (institucionId) params.append('institucion_id', institucionId);
    if (organoId && organoId !== '0') params.append('organo_id', organoId);

    const queryString = params.toString();
    const url = `/api/informes${queryString ? `?${queryString}` : ''}`;

    try {
        const informes = await fetchAPI(url);
        const tbody = document.getElementById('informes-tbody');
        tbody.innerHTML = '';
        currentInformeData = {};
        if (informes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10">No se encontraron informes con los filtros seleccionados.</td></tr>`;
        } else {
            informes.forEach(informe => {
                currentInformeData[informe.id_informe] = informe;
                const tr = document.createElement('tr');
                tr.dataset.informeId = informe.id_informe;
                const descripcionHtml = `<div class="truncate-text" title="${informe.descripcion || ''}">${informe.descripcion ? informe.descripcion : 'Sin descripción'}</div>`;
				
				
				const canWrite = checkRole(['Admin', 'Analista']);
                const actionsHtml = `
                     <button class="btn-icon btn-view-detail" title="Ver Detalles"><svg class="icon-view" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></button>
                     <button class="btn-icon btn-edit-informe" title="Editar Informe" ${canWrite ? '' : 'disabled'}><svg class="icon-edit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
                     <button class="btn-icon btn-delete-informe" title="Eliminar Informe" ${canWrite ? '' : 'disabled'}><svg class="icon-delete" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
                 `;
                
               // --- INICIO DE BLOQUE CORREGIDO (MISIÓN 4.4) ---
                tr.innerHTML = `
                    <td>${informe.periodo_reportado}</td>
                    <td>${informe.siglas_dg}</td>
                    <td>${informe.numero_ramo}</td>
                    <td>${informe.nombre_responsable}</td>
                    <td>${informe.siglas}</td>
                    <td>${informe.nombre_organo}</td>
                    <td>${informe.nombre_informe}</td>
                    <td>${new Date(informe.fecha_informe).toLocaleDateString('es-MX', { timeZone: 'UTC' })}</td>
                    <td>${descripcionHtml}</td>
                    <td>${informe.recomendaciones_emitidas}</td>
                    <td>${informe.recomendaciones_atendidas}</td>
                    <td class="actions-cell">${actionsHtml}</td>`;
                // --- FIN DE BLOQUE CORREGIDO ---
                tbody.appendChild(tr);
            });
        }
    } catch (error) { console.error("Error al cargar informes:", error); }
}

async function handleNuevoInformeClick() { 
    const form = document.getElementById('informe-form');
    form.reset();
    fileManagers['informe-files-input'].clearFiles();
    document.getElementById('id_informe_hidden_form').value = '';
    document.getElementById('informe-modal-title').textContent = "Nuevo Informe";

    // --- INICIO DE NUEVA LÓGICA (MISIÓN 3) ---
    
    // Habilitar y deshabilitar selects de la cascada
    document.getElementById('form-informe-dg').disabled = false;
    document.getElementById('form-informe-ramo').disabled = true;
    document.getElementById('form-informe-responsable').disabled = true;
    document.getElementById('form-informe-institucion').disabled = true;
    document.getElementById('form-informe-organo').disabled = true;
    
    // Resetear selects
    document.getElementById('form-informe-ramo').innerHTML = '<option value="">Seleccione DG...</option>';
    document.getElementById('form-informe-responsable').innerHTML = '<option value="">Seleccione Ramo...</option>';
    document.getElementById('form-informe-institucion').innerHTML = '<option value="">Seleccione Responsable...</option>';
    document.getElementById('form-informe-organo').innerHTML = '<option value="">Seleccione Institución...</option>';
    
    try {
        // Poblar DGs (arranca la cascada)
        await poblarSelectConAPI('/api/dgs', 'form-informe-dg', 'id_dg', 'nombre_dg', 'Seleccione...');
        
        // Poblar Tipos de Informe (de la Misión 1)
        //await poblarSelectConAPI('/api/tipos-informe', 'form-informe-tipo', 'id_tipo_informe', 'nombre_informe', 'Seleccione...');
        
        // Poblar Años
        const periodoSelect = document.getElementById('periodo-select');
        const añoActual = new Date().getFullYear();
        periodoSelect.innerHTML = '';
        for (let i = 2030; i >= 2024; i--) {
            periodoSelect.add(new Option(i, i));
        }
        periodoSelect.value = añoActual;
        
        document.getElementById('informe-modal').style.display = 'flex';
        formValidators[form.id].validate();
    } catch (error) {
        console.error("Error al preparar formulario:", error);
        showNotification("Error al cargar catálogos para el formulario.", "error");
    }
    // --- FIN DE NUEVA LÓGICA ---
}

async function handleInformeFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const files = fileManagers['informe-files-input'].getFiles();
    formData.delete('files');

    const informeId = formData.get('id_informe');
    const method = informeId ? 'PUT' : 'POST';
    const url = informeId ? `/api/informes/${informeId}` : '/api/informes';
    
    try {
        const response = await fetchAPI(url, { method, body: formData });
        const newInformeId = informeId || response.id_informe;

        if (files.length > 0) {
            const fileFormData = new FormData();
            for (const file of files) {
                fileFormData.append('files', file);
            }
            fileFormData.append('parent_type', 'informe');
            fileFormData.append('parent_id', newInformeId);
            await fetchAPI('/api/upload', { method: 'POST', body: fileFormData });
        }

        form.reset();
        document.getElementById('informe-modal').style.display = 'none';
        showNotification('Informe guardado exitosamente.');
        cargarInformes();
    } catch (error) { console.error("Error al guardar informe:", error); showNotification(`Error: ${error.message}`, 'error'); }
}


async function handleInformeRowClick(event) {
    const target = event.target;
    const button = target.closest('.btn-icon');
    const row = target.closest('tr');
    if (!row || !row.dataset.informeId || !button) return;

    const informeId = row.dataset.informeId;

    if (button.classList.contains('btn-edit-informe')) {
        handleEditInforme(informeId);
    } else if (button.classList.contains('btn-delete-informe')) {
        handleDeleteInforme(informeId);
    } else if (button.classList.contains('btn-view-detail')){
        await cargarVistaDeDetalle(informeId);
    }
}


async function handleEditInforme(informeId) {
    const informe = currentInformeData[informeId]; // Usar datos locales (ya tienen los IDs necesarios)
    if (!informe || !informe.id_dg || !informe.id_ramo || !informe.id_responsable || !informe.id_institucion || !informe.id_tipo_organo) {
        // Si faltan datos clave en la caché local, intentar obtenerlos frescos
        console.warn(`[Edit Informe] Datos locales incompletos para ID ${informeId}. Intentando fetch fresco...`);
        try {
            // Usamos la ruta GET /<id> que ya trae los IDs relacionados
            const informeFresco = await fetchAPI(`/api/informes/${informeId}`); 
            if(!informeFresco) throw new Error("Informe no encontrado en fetch fresco.");
            // Actualizar caché local
            currentInformeData[informeId] = {...currentInformeData[informeId], ...informeFresco}; 
            // Reasignar variable 'informe' para usar los datos frescos
            informe = currentInformeData[informeId];
             // Doble check por si el fetch fresco tampoco trajo todo
            if (!informe.id_dg || !informe.id_ramo || !informe.id_responsable || !informe.id_institucion || !informe.id_tipo_organo) {
                 throw new Error("Datos relacionados faltantes incluso después del fetch fresco.");
            }
        } catch (fetchError){
            console.error("[Edit Informe] Error crítico al obtener datos frescos:", fetchError);
            showNotification("Error: No se pudieron cargar todos los datos necesarios para editar el informe.", "error");
            return;
        }
    }

    // 1. Abrir y resetear el modal
    const form = document.getElementById('informe-form');
    form.reset();
    fileManagers['informe-files-input'].clearFiles(); // Asumiendo que tienes manager para esto
    document.getElementById('informe-modal-title').textContent = "Editar Informe";
    document.getElementById('id_informe_hidden_form').value = informe.id_informe;
    
    // 2. Poblar campos estáticos (Año)
    const periodoSelect = document.getElementById('periodo-select');
    periodoSelect.innerHTML = ''; 
    const añoActualInforme = new Date(informe.fecha_informe).getFullYear(); // Usar año del informe como referencia
    for (let i = añoActualInforme + 5; i >= 2024; i--) { // Rango dinámico
        periodoSelect.add(new Option(i, i));
    }
    periodoSelect.value = informe.periodo_reportado; // Seleccionar el año guardado

    // 3. Poblar campos de texto y numéricos directos
    form.querySelector('[name="fecha_informe"]').value = new Date(informe.fecha_informe).toISOString().split('T')[0];
    form.querySelector('[name="descripcion"]').value = informe.descripcion || '';
    form.querySelector('[name="recomendaciones_emitidas"]').value = informe.recomendaciones_emitidas;
    form.querySelector('[name="recomendaciones_atendidas"]').value = informe.recomendaciones_atendidas;
    // Añadir Periodicidad si existe en el form y en los datos
    if (form.querySelector('[name="periodicidad"]') && informe.periodicidad) {
        form.querySelector('[name="periodicidad"]').value = informe.periodicidad;
    }


    // 4. Poblar la cascada SECUENCIALMENTE y SELECCIONAR valores
    try {
        console.log("[Edit Informe] Poblando cascada...");
        // Poblar DGs y seleccionar
        await poblarSelectConAPI('/api/dgs', 'form-informe-dg', 'id_dg', 'nombre_dg', 'Seleccione...');
        form.querySelector('#form-informe-dg').value = informe.id_dg;
        form.querySelector('#form-informe-dg').disabled = false;
        console.log(` > DG poblado y seleccionado: ${informe.id_dg}`);

        // Poblar Ramos y seleccionar
        await poblarSelectConAPI(`/api/ramos?id_dg=${informe.id_dg}`, 'form-informe-ramo', 'id_ramo', 'nombre_ramo', 'Seleccione...');
        form.querySelector('#form-informe-ramo').value = informe.id_ramo;
        form.querySelector('#form-informe-ramo').disabled = false;
        console.log(` > Ramo poblado y seleccionado: ${informe.id_ramo}`);
        
        // Poblar Responsables y seleccionar
        await poblarSelectConAPI(`/api/responsables?id_ramo=${informe.id_ramo}`, 'form-informe-responsable', 'id_responsable', 'nombre', 'Seleccione...');
        form.querySelector('#form-informe-responsable').value = informe.id_responsable;
        form.querySelector('#form-informe-responsable').disabled = false;
        console.log(` > Responsable poblado y seleccionado: ${informe.id_responsable}`);

        // Poblar Instituciones y seleccionar
        await poblarSelectConAPI(`/api/instituciones?responsable_id=${informe.id_responsable}&id_ramo=${informe.id_ramo}`, 'form-informe-institucion', 'id_institucion', 'nombre_institucion', 'Seleccione...');
        form.querySelector('#form-informe-institucion').value = informe.id_institucion;
        form.querySelector('#form-informe-institucion').disabled = false;
        console.log(` > Institución poblada y seleccionada: ${informe.id_institucion}`);

        // --- INICIO DE CORRECCIÓN: Mover Tipo Informe AQUÍ ---
        // 5. Poblar Tipos de Informe (AHORA que ya tenemos la institución)
        console.log(`[Edit Informe] Poblando Tipos de Informe para Institución ID: ${informe.id_institucion}...`);
        await poblarSelectConAPI(
            `/api/tipos-informe?id_institucion=${informe.id_institucion}`, // Usar el ID correcto
            'form-informe-tipo', 
            'id_tipo_informe', 
            'nombre_informe', 
            'Seleccione...'
        );
        form.querySelector('#form-informe-tipo').value = informe.id_tipo_informe; // Seleccionar el tipo guardado
        form.querySelector('#form-informe-tipo').disabled = false; // Asegurar que esté habilitado
        console.log(` > Tipo Informe poblado y seleccionado: ${informe.id_tipo_informe}`);
        // --- FIN DE CORRECCIÓN ---

        // 6. Poblar Órganos y seleccionar
        await poblarSelectConAPI(`/api/organos-colegiados?institucion_id=${informe.id_institucion}`, 'form-informe-organo', 'id_organo_colegiado', 'nombre_organo', 'Seleccione...');
        form.querySelector('#form-informe-organo').value = informe.id_tipo_organo; // Ojo: el ID en informe es id_tipo_organo
        form.querySelector('#form-informe-organo').disabled = false;
        console.log(` > Órgano poblado y seleccionado: ${informe.id_tipo_organo}`);

        // 7. Mostrar modal y validar
        document.getElementById('informe-modal').style.display = 'flex';
        if (formValidators[form.id]) {
             formValidators[form.id].validate();
        }
        console.log("[Edit Informe] Modal mostrado y validado.");

    } catch (error) {
        console.error("[Edit Informe] Error al poblar cascada o tipos para editar:", error);
        showNotification("Error al cargar los datos completos para editar.", "error");
    }
}

async function handleDeleteInforme(informeId) {
    showConfirmModal(
        'Confirmar Eliminación de Informe',
        '¿Estás seguro de que deseas eliminar este informe y todas sus recomendaciones asociadas? Esta acción no se puede deshacer.',
        async () => {
            try {
                await fetchAPI(`/api/informes/${informeId}`, { method: 'DELETE' });
                showNotification('Informe eliminado.');
                cargarInformes();
            } catch (error) { 
                console.error("Error al eliminar informe:", error); 
                showNotification(`Error: ${error.message}`, 'error'); 
            }
        }
    );
}


// +++ REEMPLAZAR FUNCIÓN COMPLETA (CON LOG DE CONTADORES) +++
async function cargarVistaDeDetalle(informeId) {
    currentInformeId = informeId;
    currentView = 'informes'; 
    console.log(`[Detalle Informe] Cargando vista para informe ID: ${informeId}`); 

    try {
        // 1. Obtener datos del informe Y evidencias
        console.log(`[Detalle Informe] Fetching informe ${informeId} y evidencias...`);
        const [informe, evidencias] = await Promise.all([
            fetchAPI(`/api/informes/${informeId}`), // <- Llamada clave que obtiene el informe
            fetchAPI(`/api/evidencias?parent_type=informe&parent_id=${informeId}`)
        ]);
        
        // +++ INICIO LOG DEPURACIÓN CONTADORES +++
        // Ver exactamente qué contadores se recibieron del backend en ESTA llamada
        if (informe) {
             console.log(`[Detalle Informe] Datos recibidos del informe ${informeId}: Emitidas=${informe.recomendaciones_emitidas}, Atendidas=${informe.recomendaciones_atendidas}`);
        } else {
             console.error(`[Detalle Informe] ¡Error! No se recibieron datos para el informe ${informeId} en el fetch.`);
             throw new Error(`No se encontraron datos para el informe ${informeId}`); // Lanzar error para ir al catch
        }
        // +++ FIN LOG DEPURACIÓN CONTADORES +++

        // Guardar/Actualizar datos en memoria
        currentInformeData[informeId] = { ...currentInformeData[informeId], ...informe };

        // 2. Renderizar el encabezado CON contadores (sin cambios aquí)
        const detalleHeader = document.getElementById('informe-detalle-header');
        if (detalleHeader) {
            detalleHeader.innerHTML = `
                <h2>${informe.nombre_institucion || 'Nombre no encontrado'}</h2>
                <p><strong>Órgano Colegiado:</strong> ${informe.nombre_organo || 'Órgano no encontrado'}</p>
                <p><strong>Tipo de Informe:</strong> ${informe.nombre_informe || 'Tipo no encontrado'} - ${informe.periodo_reportado || 'Año no encontrado'}</p>
                <p><strong>Emitidas:</strong> ${informe.recomendaciones_emitidas !== undefined ? informe.recomendaciones_emitidas : 'N/A'} | 
                   <strong>Atendidas:</strong> ${informe.recomendaciones_atendidas !== undefined ? informe.recomendaciones_atendidas : 'N/A'}</p> 
                <hr>
                <p><strong>Descripción:</strong></p>
                <p>${informe.descripcion || 'No se proporcionó una descripción.'}</p>
            `;
        } else {
            console.error("[Detalle Informe] Elemento #informe-detalle-header no encontrado!");
        }

        // 3. Renderizar lista de evidencias (sin cambios aquí)
        const evidenciasList = document.getElementById('informe-evidencias-list');
        // ... (código existente para renderizar evidencias) ...
        evidenciasList.innerHTML = '';
        if (evidencias && evidencias.length > 0) { 
            evidencias.forEach(ev => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="/uploads/${ev.url_almacenamiento}" target="_blank">${ev.nombre_archivo}</a>`;
                evidenciasList.appendChild(li);
            });
        } else {
            evidenciasList.innerHTML = '<li>No hay documentos de soporte.</li>';
        }


        // 4. Obtener y renderizar recomendaciones asociadas
        console.log(`[Detalle Informe] Fetching recomendaciones para informe ID: ${informeId}`);
        const recomendaciones = await fetchAPI(`/api/recomendaciones?informe_id=${informeId}`);
        renderRecomendaciones(recomendaciones, 'recomendaciones-informe-tbody'); 

        // 5. Mostrar la vista de detalle
        showReportesDetailView();
        console.log(`[Detalle Informe] Vista de detalle mostrada para informe ID: ${informeId}`);

    } catch (error) { 
        console.error(`[Detalle Informe] Error al cargar vista de detalle para informe ${informeId}:`, error); 
        showNotification(`Error al cargar detalles: ${error.message}`, 'error');
        showReportesMainView(); 
    }
}



// REEMPLAZAR ESTA FUNCIÓN COMPLETA EN app.js
/*function renderRecomendaciones(recomendaciones, tbodyId) {
	
	console.log("Datos RECIBIDOS para renderizar tabla:", JSON.stringify(recomendaciones, null, 2));
	
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    currentRecomendacionData = {}; // Almacenamos los datos para 'Editar'
    const isIndependentView = tbodyId === 'recomendaciones-independientes-tbody';
    const colspan = isIndependentView ? 11 : 9;

    if (recomendaciones.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colspan}">No hay recomendaciones.</td></tr>`;
        return;
    }

    // Preparamos los botones de acción (son los mismos en ambas vistas)
    const actionsHtml = `
        <button class="btn-icon btn-view-rec" title="Ver Detalles"><svg class="icon-view" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></button>
        <button class="btn-icon btn-edit-rec" title="Editar"><svg class="icon-edit" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
        <button class="btn-icon btn-delete-rec" title="Eliminar"><svg class="icon-delete" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
    `;

    recomendaciones.forEach(rec => {
        currentRecomendacionData[rec.id_recomendacion] = rec;
        const tr = document.createElement('tr');
        tr.dataset.recomendacionId = rec.id_recomendacion;

        const descripcionHtml = `<div class="truncate-text" title="${rec.descripcion}">${rec.descripcion}</div>`;
        const fechaEmision = new Date(rec.fecha_emision).toLocaleDateString('es-MX', { timeZone: 'UTC' });
        const fechaCompromiso = rec.fecha_compromiso ? new Date(rec.fecha_compromiso).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : 'N/A';

        if (isIndependentView) {
            // 1. Vista Principal (Grid - 11 columnas)
            tr.innerHTML = `
                <td>${rec.siglas}</td>
                <td>${rec.nombre_organo}</td>
                <td>${descripcionHtml}</td>
                <td>${rec.area_responsable_atencion}</td>
                <td>${fechaEmision}</td>
                <td>${fechaCompromiso}</td>
                <td>${rec.estatus}</td>
                <td>${rec.prioridad}</td>
                <td>${rec.informe_id || 'Independiente'}</td>
                <td>${rec.evidencias_count || 0}</td>
                <td class="actions-cell">${actionsHtml}</td>
            `;
        } else {
            // 2. Vista de Detalle (9 columnas)
            tr.innerHTML = `
                <td>${descripcionHtml}</td>
                <td>${rec.area_responsable_atencion}</td>
                <td>${rec.nombre_organo || 'N/A'}</td>
                <td>${fechaEmision}</td>
                <td>${fechaCompromiso}</td>
                <td>${rec.estatus}</td>
                <td>${rec.prioridad}</td>
                <td>${rec.evidencias_count || 0}</td>
                <td class="actions-cell">${actionsHtml}</td>
            `;
        }
        
        tbody.appendChild(tr);
    });
    }*/


// REEMPLAZAR ESTA FUNCIÓN COMPLETA EN app.js
function renderRecomendaciones(recomendaciones, tbodyId) {
	
	console.log("Datos RECIBIDOS para renderizar tabla:", JSON.stringify(recomendaciones, null, 2));
	
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    currentRecomendacionData = {}; // Almacenamos los datos para 'Editar'
    const isIndependentView = tbodyId === 'recomendaciones-independientes-tbody';
    const colspan = isIndependentView ? 11 : 9;

    if (recomendaciones.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colspan}">No hay recomendaciones.</td></tr>`;
        return;
    }

    // Preparamos los botones de acción (son los mismos en ambas vistas)
    const actionsHtml = `
        <button class="btn-icon btn-view-rec" title="Ver Detalles"><svg class="icon-view" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></button>
        <button class="btn-icon btn-edit-rec" title="Editar"><svg class="icon-edit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
        <button class="btn-icon btn-delete-rec" title="Eliminar"><svg class="icon-delete" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
    `;

    recomendaciones.forEach(rec => {
        currentRecomendacionData[rec.id_recomendacion] = rec;
        const tr = document.createElement('tr');
        tr.dataset.recomendacionId = rec.id_recomendacion;

        const descripcionHtml = `<div class="truncate-text" title="${rec.descripcion}">${rec.descripcion}</div>`;
        const fechaEmision = new Date(rec.fecha_emision).toLocaleDateString('es-MX', { timeZone: 'UTC' });
        const fechaCompromiso = rec.fecha_compromiso ? new Date(rec.fecha_compromiso).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : 'N/A';

        if (isIndependentView) {
            // 1. Vista Principal (Grid - 11 columnas)
            tr.innerHTML = `
                <td>${rec.siglas}</td>
                <td>${rec.nombre_organo}</td>
                <td>${descripcionHtml}</td>
                <td>${rec.area_responsable_atencion}</td>
                <td>${fechaEmision}</td>
                <td>${fechaCompromiso}</td>
                <td>${rec.estatus}</td>
                <td>${rec.prioridad}</td>
                <td>${rec.informe_id || 'Independiente'}</td>
                <td>${rec.evidencias_count || 0}</td>
                <td class="actions-cell">${actionsHtml}</td>
            `;
        } else {
            // 2. Vista de Detalle (9 columnas)
            tr.innerHTML = `
                <td>${descripcionHtml}</td>
                <td>${rec.area_responsable_atencion}</td>
                <td>${rec.nombre_organo || 'N/A'}</td>
                <td>${fechaEmision}</td>
                <td>${fechaCompromiso}</td>
                <td>${rec.estatus}</td>
                <td>${rec.prioridad}</td>
                <td>${rec.evidencias_count || 0}</td>
                <td class="actions-cell">${actionsHtml}</td>
            `;
        }
        
        tbody.appendChild(tr);
    });
}





// REEMPLAZAR ESTA FUNCIÓN COMPLETA EN app.js
async function handleNuevaRecomendacionClick({ informe = null }) {
    const form = document.getElementById('recomendacion-form');
    form.reset();
    fileManagers['recomendacion-files-input'].clearFiles();

    const independentFieldsDiv = document.getElementById('rec-independent-fields');
    const independentSelects = independentFieldsDiv.querySelectorAll('select');
    const hiddenInformeId = document.getElementById('id_informe_hidden_rec');

    const dgSelectModal = document.getElementById('rec-dg-select');
    const ramoSelectModal = document.getElementById('rec-ramo-select');
    const respSelectModal = document.getElementById('rec-responsable-select');
    const instSelectModal = document.getElementById('rec-institucion-select');
    const orgSelectModal = document.getElementById('rec-organo-select');

    // Limpia los listeners anteriores para evitar duplicados
    dgSelectModal.onchange = null;
    ramoSelectModal.onchange = null;
    respSelectModal.onchange = null;
    instSelectModal.onchange = null;
    orgSelectModal.onchange = null;

    if (informe) { // Caso: Recomendación Asociada a Informe
        document.getElementById('recomendacion-modal-title').textContent = "Nueva Recomendación para Informe";
        independentFieldsDiv.classList.add('hidden');
        independentSelects.forEach(sel => sel.required = false);
        
        // --- INICIO DE LA CORRECCIÓN DEFINITIVA ---
        // El objeto 'informe' que viene de la vista de detalle tiene la propiedad 'id_informe'
        // El objeto 'informe' (que es 'rec') que viene del botón de editar tiene 'informe_id'
        // Esta lógica unifica ambos casos.
        const idParaAsociar = informe.id_informe || informe.informe_id;
        
        hiddenInformeId.value = idParaAsociar;
        console.log(`[handleNuevaRecomendacionClick] ID de informe asociado: ${idParaAsociar}`);
        // --- FIN DE LA CORRECCIÓN DEFINITIVA ---

    } else { // Caso: Recomendación Independiente
        document.getElementById('recomendacion-modal-title').textContent = "Nueva Recomendación Independiente";
        independentFieldsDiv.classList.remove('hidden');
        independentSelects.forEach(sel => sel.required = true);
        hiddenInformeId.value = '';

        // --- Configurar cascada completa en modal ---
        resetSelect(ramoSelectModal, 'Seleccione DG...');
        resetSelect(respSelectModal, 'Seleccione Ramo...');
        resetSelect(instSelectModal, 'Seleccione Responsable...');
        resetSelect(orgSelectModal, 'Seleccione Institución...');

        try {
            await poblarSelectConAPI('/api/dgs', 'rec-dg-select', 'id_dg', 'nombre_dg', 'Seleccione...');
            dgSelectModal.disabled = false;
        } catch (error) {
             console.error("Error crítico poblando DGs en modal:", error);
        }

        // Añadir listeners para la cascada DENTRO del modal
        dgSelectModal.onchange = async () => {
             resetSelect(ramoSelectModal, 'Seleccione DG...');
             resetSelect(respSelectModal, 'Seleccione Ramo...');
             resetSelect(instSelectModal, 'Seleccione Responsable...');
             resetSelect(orgSelectModal, 'Seleccione Institución...');
             if (dgSelectModal.value) {
                 await poblarSelectConAPI(`/api/ramos?id_dg=${dgSelectModal.value}`, 'rec-ramo-select', 'id_ramo', 'nombre_ramo', 'Seleccione...');
                 ramoSelectModal.disabled = false;
             }
             if (formValidators[form.id]) formValidators[form.id].validate();
        };
        ramoSelectModal.onchange = async () => {
             resetSelect(respSelectModal, 'Seleccione Ramo...');
             resetSelect(instSelectModal, 'Seleccione Responsable...');
             resetSelect(orgSelectModal, 'Seleccione Institución...');
             if (ramoSelectModal.value) {
                 await poblarSelectConAPI(`/api/responsables?id_ramo=${ramoSelectModal.value}`, 'rec-responsable-select', 'id_responsable', 'nombre', 'Seleccione...');
                 respSelectModal.disabled = false;
             }
             if (formValidators[form.id]) formValidators[form.id].validate();
        };
        respSelectModal.onchange = async () => {
             resetSelect(instSelectModal, 'Seleccione Responsable...');
             resetSelect(orgSelectModal, 'Seleccione Institución...');
             if (respSelectModal.value && ramoSelectModal.value) {
                 await poblarSelectConAPI(`/api/instituciones?responsable_id=${respSelectModal.value}&id_ramo=${ramoSelectModal.value}`, 'rec-institucion-select', 'id_institucion', 'nombre_institucion', 'Seleccione...');
                 instSelectModal.disabled = false;
             } else if (ramoSelectModal.value) {
                 await poblarSelectConAPI(`/api/instituciones?id_ramo=${ramoSelectModal.value}`, 'rec-institucion-select', 'id_institucion', 'nombre_institucion', 'Seleccione...');
                 instSelectModal.disabled = false;
             }
             if (formValidators[form.id]) formValidators[form.id].validate();
        };
        instSelectModal.onchange = async () => {
            resetSelect(orgSelectModal, 'Seleccione Institución...');
            if (instSelectModal.value) {
                await poblarSelectConAPI(
                `/api/organos-colegiados?institucion_id=${instSelectModal.value}`,
                'rec-organo-select',
                'id_organo_colegiado',
                'nombre_organo',
                'Seleccione...'
                );
                orgSelectModal.disabled = false;
            }
            if (formValidators[form.id]) formValidators[form.id].validate();
        };
    }

    // Lógica común final
    document.getElementById('id_recomendacion_hidden').value = '';
    form.querySelector('[name="fecha_emision"]').value = new Date().toISOString().split('T')[0];
    document.getElementById('recomendacion-evidencia-list').innerHTML = '<li>No hay evidencias.</li>';

    if (formValidators[form.id]) {
        formValidators[form.id].validate();
    }
    
    document.getElementById('recomendacion-modal').style.display = 'flex';
}



async function handleRecomendacionFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const informeIdAsociado = formData.get('id_informe'); 
    console.log(`[Submit Rec] ID Informe leído del form oculto: ${informeIdAsociado}`);

    // Lógica IDs (sin cambios)
    if (informeIdAsociado && currentInformeData[informeIdAsociado]) {
         const informe = currentInformeData[informeIdAsociado];
         formData.set('id_institucion', informe.id_institucion);
         formData.set('id_tipo_organo', informe.id_tipo_organo); 
         console.log(`[Submit Rec] Asociada: IDs Inst(${informe.id_institucion})/Org(${informe.id_tipo_organo}) añadidos a formData.`);
    } else {
         console.log(`[Submit Rec] Independiente: Usando IDs Inst/Org del modal.`);
    }
    
    const files = fileManagers['recomendacion-files-input'].getFiles();
    formData.delete('files'); 

    const recId = formData.get('id_recomendacion');
    const method = recId ? 'PUT' : 'POST';
    const url = recId ? `/api/recomendaciones/${recId}` : '/api/recomendaciones';

    try {
        // 1. Guardar la recomendación (Crear o Editar)
        console.log(`[Submit Rec] Intentando ${method} a ${url}`);
        const response = await fetchAPI(url, { method, body: formData });
        const newOrUpdatedRecId = recId || response.id_recomendacion;
        console.log(`[Submit Rec] Éxito. ID afectado: ${newOrUpdatedRecId}`);

        // 2. Subir archivos si los hay
        if (files.length > 0) {
            console.log(`[Submit Rec] Intentando subir ${files.length} archivos para ID ${newOrUpdatedRecId}`);
            // ... (código para subir archivos sin cambios) ...
            const fileFormData = new FormData();
            files.forEach(file => fileFormData.append('files', file)); 
            fileFormData.append('parent_type', 'recomendacion');
            fileFormData.append('parent_id', newOrUpdatedRecId);
            await fetchAPI('/api/upload', { method: 'POST', body: fileFormData });
            console.log(`[Submit Rec] Archivos subidos.`);
        }

        // --- EL BLOQUE IF PARA INCREMENTAR CONTADOR FUE ELIMINADO ---
        console.log("[Submit Rec] Lógica de contador ahora manejada por el backend.");
        
        // 4. Limpiar y cerrar modal
        form.reset();
        document.getElementById('recomendacion-modal').style.display = 'none';
        showNotification('Recomendación guardada.');

        // 5. Refrescar la vista correcta
        console.log(`[Submit Rec] Refrescando vista: currentView=${currentView}, informeIdAsociado=${informeIdAsociado}`);
        if (currentView === 'informes' && informeIdAsociado) { 
             console.log(`[Submit Rec] Llamando a cargarVistaDeDetalle(${informeIdAsociado})`);
            await cargarVistaDeDetalle(informeIdAsociado); 
        } else { 
             console.log("[Submit Rec] Llamando a cargarRecomendacionesIndependientes()");
            await cargarRecomendacionesIndependientes();
        }

    } catch (error) { 
        console.error("[Submit Rec] *** ERROR PRINCIPAL al guardar recomendación:", error); 
        showNotification(`Error al guardar: ${error.message}`, 'error'); 
    }
}

function handleRecomendacionesTableClick(event) {
    const target = event.target;
    const button = target.closest('.btn-icon');
    const row = target.closest('tr');
    if (!row || !row.dataset.recomendacionId || !button) return;

    const recId = row.dataset.recomendacionId;
	console.log(`handleRecomendacionesTableClick LEYÓ el ID: ${recId} desde la fila:`, row);

    if (button.classList.contains('btn-view-rec')) {
        abrirModalDetalleRecomendacion(recId);
    }
    if (button.classList.contains('btn-edit-rec')) {
        handleEditRecomendacion(recId);
    }
    if (button.classList.contains('btn-delete-rec')) {
        handleDeleteRecomendacion(recId);
    }
}

async function abrirModalDetalleRecomendacion(recId) {
    const rec = currentRecomendacionData[recId];
    if (!rec) return;

    const modal = document.getElementById('recomendacion-detalle-modal');
    const titleEl = document.getElementById('recomendacion-detalle-title');
    const bodyEl = document.getElementById('recomendacion-detalle-body');
    const footerEl = document.getElementById('recomendacion-detalle-footer');

    titleEl.textContent = `Detalle de la Recomendación`;
    bodyEl.innerHTML = `
        <p><strong>Descripción:</strong></p>
        <p>${rec.descripcion}</p>
        <hr>
        <p><strong>Área Responsable:</strong> ${rec.area_responsable_atencion}</p>
        <p><strong>Fecha Emisión:</strong> ${new Date(rec.fecha_emision).toLocaleDateString('es-MX', { timeZone: 'UTC' })}</p>
        <p><strong>Fecha Compromiso:</strong> ${rec.fecha_compromiso ? new Date(rec.fecha_compromiso).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : 'N/A'}</p>
        <p><strong>Estatus:</strong> ${rec.estatus}</p>
        <p><strong>Prioridad:</strong> ${rec.prioridad}</p>
        <p><strong>Tipo:</strong> ${rec.tipo_recomendacion}</p>
        <hr>
        <h3>Evidencias</h3>
        <ul id="rec-detalle-evidencia-list"><li>Cargando...</li></ul>
    `;
    footerEl.innerHTML = `<button id="btn-edit-rec-from-detail" class="btn-warning" data-rec-id="${recId}">Editar</button>`;
    
    modal.style.display = 'flex';

    const evidenciaList = document.getElementById('rec-detalle-evidencia-list');
    try {
        const evidencias = await fetchAPI(`/api/evidencias?parent_type=recomendacion&parent_id=${recId}`);
        if (evidencias.length > 0) {
            evidenciaList.innerHTML = '';
            evidencias.forEach(ev => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="/uploads/${ev.url_almacenamiento}" target="_blank">${ev.nombre_archivo}</a>`;
                evidenciaList.appendChild(li);
            });
        } else {
            evidenciaList.innerHTML = '<li>No hay evidencias.</li>';
        }
    } catch (error) {
        evidenciaList.innerHTML = '<li>Error al cargar evidencias.</li>';
    }
}

function handleDetalleRecomendacionModalClick(event) {
    if (event.target.id === 'btn-edit-rec-from-detail') {
        const recId = event.target.dataset.recId;
        document.getElementById('recomendacion-detalle-modal').style.display = 'none';
        handleEditRecomendacion(recId);
    }
}


// REEMPLAZAR ESTA FUNCIÓN COMPLETA EN app.js

async function handleEditRecomendacion(recId) {
	
	console.log("Intentando editar recomendación con ID:", recId);
	
    let rec;
    try {
        // Obtenemos datos frescos y completos (incluye id_dg, id_ramo, id_responsable)
        rec = await fetchAPI(`/api/recomendaciones/${recId}`);
        if (!rec) {
            showNotification("Error: No se pudieron cargar los datos de la recomendación.", "error");
            return;
        }
    } catch (error) {
        console.error("Error al cargar recomendación para editar:", error);
        showNotification(`Error: ${error.message}`, 'error');
        return;
    }

    // --- INICIO DE LA CORRECCIÓN DEFINITIVA ---
    // Aquí 'rec' es el objeto recomendación.
    // 'rec.informe_id' es la propiedad correcta de la BD (puede ser un ID o null).
    // Si 'rec.informe_id' existe (no es nulo), pasamos el objeto 'rec' completo.
    // Si es nulo, pasamos 'null' para activar la lógica independiente.
    await handleNuevaRecomendacionClick({ informe: rec.informe_id ? rec : null });
    // --- FIN DE LA CORRECCIÓN DEFINITIVA ---

    // Ahora llenamos el formulario con los datos específicos de 'rec'
    const form = document.getElementById('recomendacion-form');
    document.getElementById('recomendacion-modal-title').textContent = "Editar Recomendación";

    // Llenar campos básicos
    form.querySelector('[name="id_recomendacion"]').value = rec.id_recomendacion;
    form.querySelector('[name="descripcion"]').value = rec.descripcion;
    form.querySelector('[name="area_responsable_atencion"]').value = rec.area_responsable_atencion;
    form.querySelector('[name="fecha_emision"]').value = new Date(rec.fecha_emision).toISOString().split('T')[0];
    form.querySelector('[name="fecha_compromiso"]').value = rec.fecha_compromiso ? new Date(rec.fecha_compromiso).toISOString().split('T')[0] : '';
    form.querySelector('[name="estatus"]').value = rec.estatus;
    form.querySelector('[name="prioridad"]').value = rec.prioridad;
    form.querySelector('[name="tipo_recomendacion"]').value = rec.tipo_recomendacion;

    
    if (!rec.informe_id) { // Si es independiente, poblamos la cascada
        const dgSelectModal = document.getElementById('rec-dg-select');
        const ramoSelectModal = document.getElementById('rec-ramo-select');
        const respSelectModal = document.getElementById('rec-responsable-select');
        const instSelectModal = document.getElementById('rec-institucion-select');
        const orgSelectModal = document.getElementById('rec-organo-select');

        try {
            // Poblar DGs y seleccionar
            await poblarSelectConAPI('/api/dgs', 'rec-dg-select', 'id_dg', 'nombre_dg', 'Seleccione...');
            dgSelectModal.value = rec.id_dg;
            dgSelectModal.disabled = false;

            // Poblar Ramos y seleccionar
            await poblarSelectConAPI(`/api/ramos?id_dg=${rec.id_dg}`, 'rec-ramo-select', 'id_ramo', 'nombre_ramo', 'Seleccione...');
            ramoSelectModal.value = rec.id_ramo;
            ramoSelectModal.disabled = false;

            // Poblar Responsables y seleccionar
            await poblarSelectConAPI(`/api/responsables?id_ramo=${rec.id_ramo}`, 'rec-responsable-select', 'id_responsable', 'nombre', 'Seleccione...');
            respSelectModal.value = rec.id_responsable;
            respSelectModal.disabled = false;

            // Poblar Instituciones y seleccionar
            await poblarSelectConAPI(`/api/instituciones?responsable_id=${rec.id_responsable}&id_ramo=${rec.id_ramo}`, 'rec-institucion-select', 'id_institucion', 'nombre_institucion', 'Seleccione...');
            instSelectModal.value = rec.id_institucion;
            instSelectModal.disabled = false;

            // Poblar Órganos y seleccionar
            await poblarSelectConAPI(`/api/organos-colegiados?institucion_id=${rec.id_institucion}`, 'rec-organo-select', 'id_organo_colegiado', 'nombre_organo', 'Seleccione...');
            orgSelectModal.value = rec.id_tipo_organo;
            orgSelectModal.disabled = false;

        } catch (error) {
            console.error("Error poblando cascada de edición:", error);
            showNotification("Error al cargar catálogos para edición.", "error");
        }
    }
    
    // Validar el formulario al final
    if (formValidators[form.id]) {
        formValidators[form.id].validate();
    }
}


async function handleDeleteRecomendacion(recId) {
    showConfirmModal(
        'Confirmar Eliminación de Recomendación',
        '¿Estás seguro de que deseas eliminar esta recomendación?',
        async () => {
            try {
                await fetchAPI(`/api/recomendaciones/${recId}`, { method: 'DELETE' });
                showNotification('Recomendación eliminada.');

                // Recargar la vista actual ---
                if (currentView === 'informes' && currentInformeId) {
                    // Si estamos en la vista de detalle de un informe, recargarla
                    console.log(`Recargando detalle del informe ID: ${currentInformeId}`);
                    await cargarVistaDeDetalle(currentInformeId);
                } else {
                    // Si estamos en la vista principal de recomendaciones, recargarla
                    console.log("Recargando grid principal de recomendaciones.");
                    await cargarRecomendacionesIndependientes();
                }
               

            } catch (error) {
                console.error("Error al eliminar recomendación:", error);
                showNotification(`Error: ${error.message}`, 'error');
            }
        }
    );
}

// =============================================================
// MÓDULO PARA RECOMENDACIONES INDEPENDIENTES
// =============================================================
function initRecomendacionesModule() {
    setupCascadingFilters({
        baseName: 'filtro-rec',
        year: true,
        organoGeneralOption: "Todos",
        callback: cargarRecomendacionesIndependientes
    });
	
	// Poblamos el nuevo select de Estatus
    poblarSelectConOpciones('filtro-rec-estatus', 
        ['Pendiente', 'En Proceso', 'Atendida', 'Cerrada', 'Cancelada'], 
        'Todos los Estatus'
    );
    // Nos aseguramos de que el callback de carga se ejecute también cuando este filtro cambie
    document.getElementById('filtro-rec-estatus')?.addEventListener('change', cargarRecomendacionesIndependientes);
    

    document.getElementById('btn-nueva-recomendacion-independiente')?.addEventListener('click', () => handleNuevaRecomendacionClick({}));
    document.getElementById('recomendaciones-independientes-tbody')?.addEventListener('click', handleRecomendacionesTableClick);
    document.getElementById('rec-responsable-select')?.addEventListener('change', (e) => poblarInstituciones(e.target.value, 'rec-institucion-select', 'rec-organo-select'));
    document.getElementById('rec-institucion-select')?.addEventListener('change', (e) => poblarOrganosColegiados(e.target.value, 'rec-organo-select', null, true));
}

async function cargarRecomendacionesIndependientes() {
    const año = document.getElementById('filtro-rec-año').value;
    const dgId = document.getElementById('filtro-rec-dg').value;
    const ramoId = document.getElementById('filtro-rec-ramo').value;
    const responsableId = document.getElementById('filtro-rec-responsable').value;
    const institucionId = document.getElementById('filtro-rec-institucion').value;
    const organoId = document.getElementById('filtro-rec-organo').value;
	const estatus = document.getElementById('filtro-rec-estatus').value;
    const tbody = document.getElementById('recomendaciones-independientes-tbody');

    currentView = 'recomendaciones';
    tbody.innerHTML = `<tr><td colspan="11">Cargando...</td></tr>`;

    const params = new URLSearchParams();
    if (año) params.append('año', año);
    if (dgId) params.append('id_dg', dgId);
    if (ramoId) params.append('id_ramo', ramoId);
    if (responsableId) params.append('responsable_id', responsableId);
    if (institucionId) params.append('institucion_id', institucionId);
    if (organoId && organoId !== '0') params.append('organo_id', organoId);
	if (estatus) params.append('estatus', estatus);

    const queryString = params.toString();
    const url = `/api/recomendaciones${queryString ? `?${queryString}` : ''}`;

    try {
        const recomendaciones = await fetchAPI(url);
        renderRecomendaciones(recomendaciones, 'recomendaciones-independientes-tbody');
    } catch (error) {
        console.error("Error al cargar recomendaciones independientes:", error);
        tbody.innerHTML = '<tr><td colspan="11">Error al cargar datos.</td></tr>';
    }
}


// =============================================================
// MÓDULO PARA DIRECTORIO
// =============================================================
let directorioData = {};


function initDirectorioModule() {
    // Configuración filtros PRINCIPALES (sin cambios)
    setupCascadingFilters({
        baseName: 'filtro-dir',
        year: false,
        organoGeneralOption: "General / Institución", // Texto para la opción '0'
        callback: cargarContactos
    });

    // Listeners generales (sin cambios)
    document.getElementById('btn-nuevo-contacto')?.addEventListener('click', handleNuevoContactoClick);
    document.getElementById('directorio-form')?.addEventListener('submit', handleDirectorioFormSubmit);
    document.getElementById('directorio-tbody')?.addEventListener('click', handleDirectorioRowClick);

    // --- INICIO CORRECCIÓN LISTENERS: Cascada DENTRO del modal ---
    const modalDG = document.getElementById('dir-modal-dg-select');
    const modalRamo = document.getElementById('dir-modal-ramo-select');
    const modalResp = document.getElementById('dir-modal-responsable-select');
    const modalInst = document.getElementById('dir-modal-institucion-select');
    const modalOrg = document.getElementById('dir-organo-select'); // El select de órgano/ámbito
    const form = document.getElementById('directorio-form'); // Referencia al formulario

    const triggerModalValidation = () => {
         if (form && formValidators[form.id]) {
             formValidators[form.id].validate();
         }
    };

    modalDG?.addEventListener('change', async () => { // <-- ASYNC AÑADIDO
        resetSelect(modalRamo, 'Seleccione DG...');
        resetSelect(modalResp, 'Seleccione Ramo...');
        resetSelect(modalInst, 'Seleccione Responsable...');
        resetSelect(modalOrg, 'Seleccione Institución...'); // Resetear ámbito también
        if (modalDG.value) {
            // await es válido aquí ahora
            await poblarSelectConAPI(`/api/ramos?id_dg=${modalDG.value}`, 'dir-modal-ramo-select', 'id_ramo', 'nombre_ramo', 'Seleccione...');
            modalRamo.disabled = false;
        }
        triggerModalValidation(); // Validar al cambiar
    });

    modalRamo?.addEventListener('change', async () => { // <-- ASYNC AÑADIDO
        resetSelect(modalResp, 'Seleccione Ramo...');
        resetSelect(modalInst, 'Seleccione Responsable...');
        resetSelect(modalOrg, 'Seleccione Institución...');
        if (modalRamo.value) {
            // await es válido aquí ahora
            await poblarSelectConAPI(`/api/responsables?id_ramo=${modalRamo.value}`, 'dir-modal-responsable-select', 'id_responsable', 'nombre', 'Seleccione...');
            modalResp.disabled = false;
        }
         triggerModalValidation();
    });

     modalResp?.addEventListener('change', async () => { // <-- ASYNC AÑADIDO
        resetSelect(modalInst, 'Seleccione Responsable...');
        resetSelect(modalOrg, 'Seleccione Institución...');
        const ramoId = modalRamo.value; // Necesitamos el ramoId también
         if (modalResp.value && ramoId) {
             // await es válido aquí ahora
             await poblarSelectConAPI(`/api/instituciones?responsable_id=${modalResp.value}&id_ramo=${ramoId}`, 'dir-modal-institucion-select', 'id_institucion', 'nombre_institucion', 'Seleccione...');
             modalInst.disabled = false;
         } else if (ramoId) { // Permitir seleccionar solo por Ramo si no hay Responsable
             // await es válido aquí ahora
             await poblarSelectConAPI(`/api/instituciones?id_ramo=${ramoId}`, 'dir-modal-institucion-select', 'id_institucion', 'nombre_institucion', 'Seleccione...');
             modalInst.disabled = false;
         }
         triggerModalValidation();
    });


    modalInst?.addEventListener('change', async () => { // <-- ASYNC AÑADIDO
        resetSelect(modalOrg, 'Seleccione Institución...'); // Resetear ámbito
        if (modalInst.value) {
            // Poblar ámbito (órgano) CON la opción general
            // await es válido aquí ahora
            await poblarSelectConAPI(
                `/api/organos-colegiados?institucion_id=${modalInst.value}`,
                'dir-organo-select',
                'id_organo_colegiado',
                'nombre_organo',
                '', // Sin placeholder
                'General / Institución' // Añadir opción '0'
             );
            modalOrg.disabled = false;
            modalOrg.value = '0'; // Seleccionar 'General' por defecto
        }
         triggerModalValidation();
    });

     modalOrg?.addEventListener('change', triggerModalValidation); // Validar al cambiar ámbito (esta no necesita async)
    // --- FIN CORRECCIÓN LISTENERS ---
}

async function cargarContactos() {
    const institucionId = document.getElementById('filtro-dir-institucion').value;
    const organoId = document.getElementById('filtro-dir-organo').value;
    const tbody = document.getElementById('directorio-tbody');

    if (!institucionId) {
        tbody.innerHTML = '<tr><td colspan="6">Por favor, seleccione una institución para ver los contactos.</td></tr>';
        return;
    }

    tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    try {
        let url = `/api/directorio?institucion_id=${institucionId}`;
        
        if (organoId) {
            url += `&organo_id=${organoId}`;
        }
        
        const contactos = await fetchAPI(url);
        renderContactos(contactos);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6">Error al cargar los contactos.</td></tr>';
        console.error("Error al cargar contactos:", error);
    }
}

function renderContactos(contactos) {
    const tbody = document.getElementById('directorio-tbody');
    tbody.innerHTML = '';
    directorioData = {};
    // --- INICIO MODIFICACIÓN: Actualizar colspan a 7 ---
    if (contactos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No hay contactos para esta selección.</td></tr>'; // Colspan actualizado
        return;
    }
    // --- FIN MODIFICACIÓN ---
    contactos.forEach(contacto => {
        directorioData[contacto.id_contacto] = contacto;
        const tr = document.createElement('tr');
        tr.dataset.contactoId = contacto.id_contacto;
        // --- INICIO MODIFICACIÓN: Añadir celda nombre_organo ---
        tr.innerHTML = `
            <td>${contacto.nombre_contacto}</td>
            <td>${contacto.nombre_organo}</td>
            <td>${contacto.telefono || 'N/A'}</td>
            <td>${contacto.extension || 'N/A'}</td>
            <td>${contacto.email || 'N/A'}</td>
            <td>${contacto.movil || 'N/A'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-edit-contacto" title="Editar"><svg class="icon-edit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
                <button class="btn-icon btn-delete-contacto" title="Eliminar"><svg class="icon-delete" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
            </td>
        `;
        // --- FIN MODIFICACIÓN ---
        tbody.appendChild(tr);
    });
}


async function handleNuevoContactoClick() {
    const form = document.getElementById('directorio-form');
    form.reset();
    document.getElementById('id_contacto_hidden').value = '';
    document.getElementById('directorio-modal-title').textContent = 'Nuevo Contacto';

    // Mostrar la sección de la cascada
    document.getElementById('dir-modal-cascading-fields').classList.remove('hidden');
    form.querySelectorAll('#dir-modal-cascading-fields select').forEach(sel => sel.required = true);

    // Referencias a los selects del modal
    const modalDG = document.getElementById('dir-modal-dg-select');
    const modalRamo = document.getElementById('dir-modal-ramo-select');
    const modalResp = document.getElementById('dir-modal-responsable-select');
    const modalInst = document.getElementById('dir-modal-institucion-select');
    const modalOrg = document.getElementById('dir-organo-select');

    // Resetear todos los selects de la cascada y el de ámbito
    resetSelect(modalRamo, 'Seleccione DG...');
    resetSelect(modalResp, 'Seleccione Ramo...');
    resetSelect(modalInst, 'Seleccione Responsable...');
    resetSelect(modalOrg, 'Seleccione Institución...');

    try {
        // Poblar solo el primer select (DG)
        await poblarSelectConAPI('/api/dgs', 'dir-modal-dg-select', 'id_dg', 'nombre_dg', 'Seleccione...');
        modalDG.disabled = false; // Habilitar el primer select
    } catch (error) {
        console.error("Error al poblar DGs en modal nuevo contacto:", error);
        showNotification("Error al cargar Direcciones Generales.", "error");
        resetSelect(modalDG, 'Error al cargar');
    }

    document.getElementById('directorio-modal').style.display = 'flex';
    // Validar el formulario al final
    if (formValidators[form.id]) {
       formValidators[form.id].validate();
    }
}

async function handleDirectorioFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const contactoId = formData.get('id_contacto');
    const method = contactoId ? 'PUT' : 'POST';
    const url = contactoId ? `/api/directorio/${contactoId}` : '/api/directorio';

    // --- INICIO SIMPLIFICACIÓN ---
    // El campo oculto 'id_institucion_hidden_dir' (name="id_institucion")
    // y el select 'dir-organo-select' (name="id_tipo_organo")
    // ya están incluidos en formData con los nombres correctos que espera el backend.
    // El backend ya sabe convertir '0' a NULL para id_tipo_organo.
    console.log("Datos que se enviarán al backend:");
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }
    // --- FIN SIMPLIFICACIÓN ---

    try {
        await fetchAPI(url, { method, body: formData });
        form.reset();
        document.getElementById('directorio-modal').style.display = 'none';
        showNotification('Contacto guardado exitosamente.');
        cargarContactos(); // Refrescar el grid
    } catch (error) {
        console.error("Error al guardar contacto:", error); // Añadir log de error
        showNotification(`Error al guardar: ${error.message}`, 'error');
    }
}

function handleDirectorioRowClick(event) {
    const target = event.target;
    const button = event.target.closest('.btn-icon');
    if (!button) return;

    const contactoId = button.closest('tr')?.dataset.contactoId;
    if (!contactoId) return;

    if (button.classList.contains('btn-edit-contacto')) {
        handleEditContacto(contactoId);
    }
    if (button.classList.contains('btn-delete-contacto')) {
        handleDeleteContacto(contactoId);
    }
}


async function handleEditContacto(contactoId) {
    const contacto = directorioData[contactoId];
    if (!contacto) {
        console.error(`No se encontraron datos locales para el contacto ID: ${contactoId}`);
        showNotification("Error: No se pudieron cargar los datos del contacto.", "error");
        return;
    }

    const form = document.getElementById('directorio-form');
    form.reset();
    document.getElementById('id_contacto_hidden').value = contacto.id_contacto;
    document.getElementById('directorio-modal-title').textContent = 'Editar Contacto';

    // --- Ocultar la cascada DG/Ramo/Resp/Inst en modo edición ---
    // IMPORTANTE: No ocultamos el Ámbito (id_tipo_organo), solo la selección institucional
    document.getElementById('dir-modal-cascading-fields').classList.add('hidden');
    
    // Quitamos el atributo required de los selects ocultos para que HTML5 permita el submit
    form.querySelectorAll('#dir-modal-cascading-fields select').forEach(sel => sel.required = false);

    const organoSelectModal = document.getElementById('dir-organo-select');
    
    // Reseteamos y poblamos el select de órgano basado en la institución original del contacto
    resetSelect(organoSelectModal, 'Cargando ámbitos...');

    try {
        console.log(`[handleEditContacto] Poblando órganos para Inst ID: ${contacto.id_institucion}`);
        
        await poblarSelectConAPI(
            `/api/organos-colegiados?institucion_id=${contacto.id_institucion}`,
            'dir-organo-select',
            'id_organo_colegiado',
            'nombre_organo',
            '', 
            'General / Institución' // Opción 0 importante
        );
        
        organoSelectModal.disabled = false;

        // Lógica crítica: Si id_tipo_organo es null en BD, seleccionamos '0'. Si no, el ID.
        organoSelectModal.value = (contacto.id_tipo_organo === null || contacto.id_tipo_organo === undefined) ? '0' : contacto.id_tipo_organo;

    } catch (error) {
        console.error("Error al poblar órganos en modal para editar:", error);
        showNotification("Error al cargar los órganos colegiados.", "error");
        resetSelect(organoSelectModal, 'Error al cargar');
    }

    // Poblar campos de texto
    form.querySelector('[name="nombre_contacto"]').value = contacto.nombre_contacto || '';
    form.querySelector('[name="telefono"]').value = contacto.telefono || '';
    form.querySelector('[name="extension"]').value = contacto.extension || '';
    form.querySelector('[name="email"]').value = contacto.email || '';
    form.querySelector('[name="movil"]').value = contacto.movil || '';
    form.querySelector('[name="direccion"]').value = contacto.direccion || '';

    document.getElementById('directorio-modal').style.display = 'flex';
    
    // Validar formulario manualmente tras el llenado
    if (formValidators[form.id]) {
       formValidators[form.id].validate();
    }
}

   
function handleDeleteContacto(contactoId) {
    showConfirmModal('Confirmar Eliminación', '¿Está seguro de que desea eliminar este contacto?', async () => {
        try {
            await fetchAPI(`/api/directorio/${contactoId}`, { method: 'DELETE' });
            showNotification('Contacto eliminado.');
            cargarContactos();
        } catch (error) {
            showNotification(`Error: ${error.message}`, 'error');
        }
    });
}

// =============================================================
// =================== MÓDULO PARA DASHBOARD =====================
// =============================================================

/*// --- Variables Globales para Gráficos ---
let globalSesionesOrdinariasChart = null;
let globalSesionesExtraordinariasChart = null;
let globalInformesEntregadosChart = null;
let globalRecsVolumenChart = null;
let globalRecsEficienciaChart = null;
let globalInstDistribucionChart = null;
let globalFocosRojosChart = null;
let globalSesionesPorTipoOrganoChart = null;
let globalEficienciaRecsPorTipoChart = null;
let ddGraficoSesionesOrdPorOrganoEsp = null; // Renombrada para Ordinarias
let ddGraficoSesionesExtPorOrganoEsp = null; // Para el gráfico de Extraordinarias
let ddChartRecsAvance = null; // Para el gráfico de Dona de Avance
let ddChartInformesTipo = null;
let ddChartAvanceRecsPorTipo = null;
let ddChartInstSesiones = null;
let ddChartInstRecsAvance = null;
let ddChartInstInformes = null;
let ddChartInstSesionesOrd = null;

//let ddChartInstInformes = null;

// --- Variables para datos de modales (definidas globalmente para acceso) ---
let ddFocosRojosData = [];
let ddInformesFaltantesData = [];*/


// --- Variables Globales para Gráficos ---
let globalSesionesOrdinariasChart = null;
let globalSesionesExtraordinariasChart = null;
let globalInformesEntregadosChart = null;
let globalRecsVolumenChart = null;
let globalRecsEficienciaChart = null;
let globalInstDistribucionChart = null;
let globalFocosRojosChart = null;
let globalSesionesPorTipoOrganoChart = null;
let globalSesionesOrdPorTipoOrganoChart = null;
let globalSesionesExtPorTipoOrganoChart = null;
let globalEficienciaRecsPorTipoChart = null;
let globalRecsVolumenPorTipoChart = null;


// Gráficos de la Vista Detallada (Normal)
let ddGraficoSesionesOrdPorOrganoEsp = null;
let ddGraficoSesionesExtPorOrganoEsp = null;
let ddChartRecsAvance = null;
let ddChartInformesTipo = null;
let ddChartAvanceRecsPorTipo = null;
let ddChartTendenciaSesiones = null; // Instancia del gráfico de tendencia (único canvas)

// --- Variables para Datos de Tendencia (VISTA DETALLADA) ---
let ddTendenciaSesionesData = [];   // Datos de Tendencia de Sesiones
let ddTendenciaInformesData = [];   // Datos de Tendencia de Informes
let ddTendenciaRecomendacionesData = []; // Datos de Tendencia de Recomendaciones
let ddTendenciaRecomendacionesAtendidasData = [];
let ddTendenciaSesionesExtData = []; // Datos de Tendencia de Sesiones Ext.

// Gráficos de la Vista Detallada (Comparativa Ramo)
let ddChartInstSesionesOrd = null;
let ddChartInstSesionesExt = null;
let ddChartInstRecsAvance = null;
let ddChartInstInformes = null;

// --- Variables para datos de modales (definidas globalmente para acceso) ---
let ddFocosRojosData = [];
let ddInformesFaltantesData = [];

let reporteBalanceDataGlobal = {};



// --- Función de control de vistas del Dashboard (GLOBAL) ---
// --- Función de control de vistas del Dashboard (GLOBAL) ---
const switchView = (viewToShow) => {
    // Definir variables DENTRO de la función
    const btnGlobal = document.getElementById('btn-view-global');
    const btnDetailed = document.getElementById('btn-view-detailed');
    const globalView = document.getElementById('dashboard-global-view');
    const detailedView = document.getElementById('dashboard-detailed-view');
    
    // --- INICIO CAMBIO SPRINT 2 ---
    const btnRendimiento = document.getElementById('btn-view-rendimiento');
    const rendimientoView = document.getElementById('dashboard-rendimiento-view');

    if (!globalView || !detailedView || !rendimientoView || !btnGlobal || !btnDetailed || !btnRendimiento) {
        console.error("Error: No se encontraron los elementos necesarios para cambiar de vista en el dashboard.");
        return;
    }

    // Ocultar todas las vistas
    globalView.classList.add('hidden');
    detailedView.classList.add('hidden');
    rendimientoView.classList.add('hidden');
    
    // Resetear todos los botones a secundario
    btnGlobal.classList.replace('btn-primary', 'btn-secondary');
    btnDetailed.classList.replace('btn-primary', 'btn-secondary');
    btnRendimiento.classList.replace('btn-primary', 'btn-secondary');
    // --- FIN CAMBIO SPRINT 2 ---

    if (viewToShow === 'global') {
        globalView.classList.remove('hidden');
        btnGlobal.classList.replace('btn-secondary', 'btn-primary');
        
        // --- CORRECCIÓN CLAVE ---
        const dgFiltroAno = document.getElementById('dg-filtro-año');
        if (dgFiltroAno && !dgFiltroAno.value) {
            const currentYear = new Date().getFullYear();
            dgFiltroAno.value = currentYear;
        }
        
        cargarDatosDashboardGlobal();
        // --- FIN CORRECCIÓN CLAVE ---
        
    // --- INICIO CAMBIO SPRINT 2 ---
    } else if (viewToShow === 'rendimiento') {
        rendimientoView.classList.remove('hidden');
        btnRendimiento.classList.replace('btn-secondary', 'btn-primary');
        
        // Cargar datos si el filtro de año ya tiene un valor
        const drFiltroAno = document.getElementById('dr-filtro-año');
        if (drFiltroAno && drFiltroAno.value) {
            cargarDatosRendimiento();
        } else if (drFiltroAno) {
            // Si no tiene valor, seleccionamos el actual y disparamos la carga
            const currentYear = new Date().getFullYear();
            drFiltroAno.value = currentYear;
            cargarDatosRendimiento();
        }
    // --- FIN CAMBIO SPRINT 2 ---

    } else { // 'detailed'
        detailedView.classList.remove('hidden');
        btnDetailed.classList.replace('btn-secondary', 'btn-primary');
        
        limpiarWidgetsDetallados();
        console.log("Vista Detallada seleccionada. Esperando filtros...");
    }
};


// --- NUEVA FUNCIÓN PARA INTERCAMBIAR VISTAS (Añadir ANTES de initDashboardModule) ---
let currentComparativeData = null; // Almacenará los datos comparativos temporalmente

function toggleDetailedSubView(viewToShow) {
    const normalView = document.getElementById('dd-normal-view');
    const comparativeView = document.getElementById('dd-comparative-view');
    const institutionComparisonView = document.getElementById('dd-institution-comparison-view'); // [NUEVO]
    const btnShowComparative = document.getElementById('btn-show-comparative');
    const btnShowNormal = document.getElementById('btn-show-normal-widgets');

    if (viewToShow === 'comparative') {
        // Ocultar widgets normales
        normalView.classList.add('hidden');
        // Mostrar AMBAS vistas comparativas
        comparativeView.classList.remove('hidden');
        institutionComparisonView.classList.remove('hidden'); // [NUEVO]
        
        // Actualizar botones
        btnShowComparative.classList.add('hidden');
        btnShowNormal.classList.remove('hidden');
        
        // Renderizar la vista comparativa D vs C (ya que estaba oculta)
        if (currentComparativeData) {
            renderComparativaMiniWidgets(currentComparativeData); 
        }
    } else { // 'normal'
        // Mostrar widgets normales
        normalView.classList.remove('hidden');
        // Ocultar AMBAS vistas comparativas
        comparativeView.classList.add('hidden');
        institutionComparisonView.classList.add('hidden'); // [NUEVO]
        
        // Actualizar botones
        btnShowComparative.classList.remove('hidden');
        btnShowNormal.classList.add('hidden');
    }
}
// --- FIN NUEVA FUNCIÓN ---



// --- FUNCIÓN cargarDatosDashboardGlobal (MODIFICADA CON FILTRO DE AÑO) ---
// --- FUNCIÓN cargarDatosDashboardGlobal (CORREGIDA: Desglose de Total Recomendaciones por DG) ---
async function cargarDatosDashboardGlobal() {
    
    const dgFiltroAno = document.getElementById('dg-filtro-año');
    let añoSeleccionado = dgFiltroAno?.value;

    if (!añoSeleccionado) {
        añoSeleccionado = new Date().getFullYear(); 
        if (dgFiltroAno) dgFiltroAno.value = añoSeleccionado;
    }
    
    const tituloAnual = document.getElementById('dg-titulo-anual');
    if (tituloAnual) tituloAnual.textContent = añoSeleccionado;
    const url = `/api/dashboard/global_stats?año=${añoSeleccionado}`;
    
    console.log("Iniciando carga de datos para Dashboard Global..."); 
    const kpiTotalRecsEmitidasContainer = document.getElementById('global-kpi-total-recs-emitidas');
    if (kpiTotalRecsEmitidasContainer) kpiTotalRecsEmitidasContainer.innerHTML = '<p>Cargando...</p>';

    // --- LIMPIAR GRÁFICOS ---
    if (globalInstDistribucionChart) globalInstDistribucionChart.destroy();
    if (globalFocosRojosChart) globalFocosRojosChart.destroy();
    if (globalSesionesOrdinariasChart) globalSesionesOrdinariasChart.destroy();
    if (globalSesionesExtraordinariasChart) globalSesionesExtraordinariasChart.destroy();
    if (globalSesionesPorTipoOrganoChart) globalSesionesPorTipoOrganoChart.destroy();
	if (globalSesionesOrdPorTipoOrganoChart) globalSesionesOrdPorTipoOrganoChart.destroy();
    if (globalSesionesExtPorTipoOrganoChart) globalSesionesExtPorTipoOrganoChart.destroy();
    if (globalInformesEntregadosChart) globalInformesEntregadosChart.destroy();
    if (globalRecsVolumenChart) globalRecsVolumenChart.destroy();
    if (globalRecsEficienciaChart) globalRecsEficienciaChart.destroy();
    if (globalEficienciaRecsPorTipoChart) globalEficienciaRecsPorTipoChart.destroy();
    if (globalRecsVolumenPorTipoChart) globalRecsVolumenPorTipoChart.destroy(); 
    
    try {
        const [
            data, 
            sesionesOrdData, 
            sesionesExtData, 
            informesData, 
            recomendacionesData,
            recsAtendidasData
        ] = await Promise.all([
            fetchAPI(url),
            fetchAPI('/api/dashboard/tendencia/sesiones_ord'),
            fetchAPI('/api/dashboard/tendencia/sesiones_ext'),
            fetchAPI('/api/dashboard/tendencia/informes'),
            fetchAPI('/api/dashboard/tendencia/recomendaciones'),
            fetchAPI('/api/dashboard/tendencia/recomendaciones_atendidas')
        ]);
        
        if (!data) throw new Error("La respuesta del API no contiene datos.");

        // 1. Almacenar los datos de tendencia en las variables globales
        ddTendenciaSesionesData = sesionesOrdData || [];
        ddTendenciaSesionesExtData = sesionesExtData || [];
        ddTendenciaInformesData = informesData || [];
        ddTendenciaRecomendacionesData = recomendacionesData || []; 
        ddTendenciaRecomendacionesAtendidasData = recsAtendidasData || [];
        
        // === CORRECCIÓN VISUAL: KPI TOTAL RECOMENDACIONES POR DG ===
        if (kpiTotalRecsEmitidasContainer) {
            const stats = data.recomendaciones_stats_dg || [];
            if (stats.length === 0) {
                kpiTotalRecsEmitidasContainer.innerHTML = '<p>Sin datos</p>';
            } else {
                // Generar HTML para mostrar cada DG una al lado de la otra
                let html = '<div style="display: flex; flex-wrap: wrap; justify-content: space-around; gap: 15px; width: 100%; align-items: center;">';
                
                // Asegurar orden alfabético
                stats.sort((a, b) => a.siglas_dg.localeCompare(b.siglas_dg));

                stats.forEach(dg => {
                    html += `
                        <div style="text-align: center; min-width: 60px;">
                            <div style="font-size: 0.85em; color: #666; font-weight: bold; margin-bottom: 2px;">${dg.siglas_dg}</div>
                            <div style="font-size: 1.8em; font-weight: bold; color: #611232; line-height: 1;">${dg.emitidas_count}</div>
                        </div>
                    `;
                });
                html += '</div>';
                kpiTotalRecsEmitidasContainer.innerHTML = html;
            }
        }
        // === FIN CORRECCIÓN ===

        // Procesar datos para gráfico de volumen
        const processedVolumenData = data.grafico_eficiencia_recs_por_tipo_dg || [];

        // Renderizar Gráficos (restantes)
        renderGlobalInstDistribucion(data.distribucion_instituciones_dg || []);
        renderGlobalFocosRojos(data.focos_rojos_dg || []);
        renderGlobalSesionesOrdinarias(data.sesiones_ordinarias_dg || []);
        renderGlobalSesionesExtraordinarias(data.sesiones_extraordinarias_dg || []);
        renderGlobalSesionesPorTipoOrgano(data.sesiones_por_tipo_organo_dg || []);
		renderGlobalSesionesOrdPorTipoOrgano(data.sesiones_por_tipo_organo_dg || []);
		renderGlobalSesionesExtPorTipoOrgano(data.sesiones_por_tipo_organo_dg || []);
        renderGlobalInformesEntregados(data.informes_entregados_dg || []);
        renderGlobalRecsVolumen(data.recomendaciones_stats_dg || []);
        renderGlobalRecsEficiencia(data.recomendaciones_stats_dg || []);
        renderGlobalEficienciaRecsPorTipo(data.grafico_eficiencia_recs_por_tipo_dg || []);
        renderGlobalRecsVolumenPorTipo(processedVolumenData);
        
        console.log("Renderizado de KPIs y gráficos globales completado.");

    } catch (error) {
        console.error("Error fatal al cargar datos del dashboard global:", error);
        showNotification('No se pudieron cargar los datos globales del dashboard.', 'error');
    } finally {
        console.log("Carga de datos globales finalizada.");
    }
}
// --- FIN FUNCIÓN cargarDatosDashboardGlobal ---




// --- Inicializador del Módulo Dashboard ---
function initDashboardModule() {
    const btnGlobal = document.getElementById('btn-view-global');
    const btnDetailed = document.getElementById('btn-view-detailed');
    // --- INICIO CAMBIO SPRINT 2 ---
    const btnRendimiento = document.getElementById('btn-view-rendimiento');
    // --- FIN CAMBIO SPRINT 2 ---
    
    // --- Lógica de Filtro Global (Año) ---
    const dgFiltroAno = document.getElementById('dg-filtro-año');
    const currentYear = new Date().getFullYear();
    populateYearSelect('dg-filtro-año', 'Cargando Años...', 0, 6, currentYear);

    if (dgFiltroAno) {
        dgFiltroAno.addEventListener('change', () => {
            console.log(`Filtro Año Global cambiado a: ${dgFiltroAno.value}. Recargando datos...`);
            cargarDatosDashboardGlobal();
        });
    }

    // --- INICIO CAMBIO SPRINT 2 ---
    // --- Lógica de Filtro Rendimiento (Año) ---
    const drFiltroAno = document.getElementById('dr-filtro-año');
    populateYearSelect('dr-filtro-año', 'Seleccione Año...', 0, 6, currentYear);

    if (drFiltroAno) {
        drFiltroAno.addEventListener('change', () => {
            console.log(`Filtro Año Rendimiento cambiado a: ${drFiltroAno.value}. Recargando datos...`);
            cargarDatosRendimiento(); // Llama a la nueva función de carga
        });
    }
    // --- FIN CAMBIO SPRINT 2 ---
	
	// --- Listeners de cambio de vista ---
    btnGlobal?.addEventListener('click', () => switchView('global'));
    btnDetailed?.addEventListener('click', () => switchView('detailed'));
    // --- INICIO CAMBIO SPRINT 2 ---
    btnRendimiento?.addEventListener('click', () => switchView('rendimiento'));
    // --- FIN CAMBIO SPRINT 2 ---

    // --- Configuración de Filtros de Vista Detallada ---
    setupCascadingFilters({
        baseName: 'dd-filtro',
        year: true,
        organoGeneralOption: "Todos",
        callback: () => {
            const añoSeleccionado = document.getElementById('dd-filtro-año')?.value;
            const dgSeleccionada = document.getElementById('dd-filtro-dg')?.value;
            
            console.log(`Callback Filtro Detallado: Año='${añoSeleccionado}', DG='${dgSeleccionada}'`);
            
            if (añoSeleccionado && dgSeleccionada) {
                console.log("-> Llamando a cargarDatosDashboardDetallado()");
                cargarDatosDashboardDetallado();
            } else {
                console.log("-> Llamando a limpiarWidgetsDetallados()");
                limpiarWidgetsDetallados();
            }
        }
    });
    
    // --- Configurar los listeners de los botones de tendencia UNA SOLA VEZ ---
    setupTendenciaToggle();
    
    // --- listeners for sub-view toggling ---
    document.getElementById('btn-show-comparative')?.addEventListener('click', () => toggleDetailedSubView('comparative'));
    document.getElementById('btn-show-normal-widgets')?.addEventListener('click', () => toggleDetailedSubView('normal'));
	
	const btnExport = document.getElementById('btn-export-pdf');
    // Clonamos el botón para eliminar listeners viejos y evitar duplicados si se recarga el módulo
    if (btnExport) {
        const newBtn = btnExport.cloneNode(true);
        btnExport.parentNode.replaceChild(newBtn, btnExport);
        newBtn.addEventListener('click', exportarReportePDF);
        console.log("Listener de Exportar PDF vinculado correctamente.");
    }
}
// --- FIN FUNCIÓN



// --- Función para limpiar la VISTA DETALLADA ---
function limpiarWidgetsDetallados() {
    // Lista actualizada (sin informes-faltantes)
    const widgets = [
        'dd-kpi-sesiones-ord', 'dd-kpi-sesiones-ext', 'dd-kpi-informes', 
        'dd-kpi-focos-rojos' // [ELIMINADO 'dd-kpi-informes-faltantes']
    ];
    widgets.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<p>Seleccione Año y DG...</p>';
    });

    // Deshabilitar botones
    const btnFocos = document.getElementById('dd-btn-detalle-focos-rojos');
    if (btnFocos) btnFocos.disabled = true;
    // [ELIMINADO referencia a btnInformes]

    // Limpiar gráficos detallados (Resto igual)
    if (ddGraficoSesionesOrdPorOrganoEsp) { ddGraficoSesionesOrdPorOrganoEsp.destroy(); ddGraficoSesionesOrdPorOrganoEsp = null; }
    const canvasOrgOrd = document.getElementById('dd-grafico-sesiones-ord-por-organo-esp');
    if (canvasOrgOrd) { const ctx = canvasOrgOrd.getContext('2d'); ctx.clearRect(0, 0, canvasOrgOrd.width, canvasOrgOrd.height); }

    if (ddGraficoSesionesExtPorOrganoEsp) { ddGraficoSesionesExtPorOrganoEsp.destroy(); ddGraficoSesionesExtPorOrganoEsp = null; }
    const canvasOrgExt = document.getElementById('dd-grafico-sesiones-ext-por-organo-esp');
    if (canvasOrgExt) { const ctx = canvasOrgExt.getContext('2d'); ctx.clearRect(0, 0, canvasOrgExt.width, canvasOrgExt.height); }
    
    if (ddChartRecsAvance) { ddChartRecsAvance.destroy(); ddChartRecsAvance = null; }
    const canvasRecsAvance = document.getElementById('dd-chart-recs-avance');
    if (canvasRecsAvance) { const ctx = canvasRecsAvance.getContext('2d'); ctx.clearRect(0, 0, canvasRecsAvance.width, canvasRecsAvance.height); }
    
    if (ddChartInformesTipo) { ddChartInformesTipo.destroy(); ddChartInformesTipo = null; }
    const canvasInformesTipo = document.getElementById('dd-chart-informes-tipo');
    if (canvasInformesTipo) { const ctx = canvasInformesTipo.getContext('2d'); ctx.clearRect(0, 0, canvasInformesTipo.width, canvasInformesTipo.height); }
    
    if (ddChartAvanceRecsPorTipo) { ddChartAvanceRecsPorTipo.destroy(); ddChartAvanceRecsPorTipo = null; }
    const canvasAvanceRecs = document.getElementById('dd-chart-avance-recs-por-tipo');
    if (canvasAvanceRecs) { const ctx = canvasAvanceRecs.getContext('2d'); ctx.clearRect(0, 0, canvasAvanceRecs.width, canvasAvanceRecs.height); }

    if (ddChartInstSesionesOrd) { ddChartInstSesionesOrd.destroy(); ddChartInstSesionesOrd = null; }
    const canvasInstSesOrd = document.getElementById('dd-chart-inst-sesiones-ord');
    if (canvasInstSesOrd) { const ctx = canvasInstSesOrd.getContext('2d'); ctx.clearRect(0, 0, canvasInstSesOrd.width, canvasInstSesOrd.height); }

    if (ddChartInstSesionesExt) { ddChartInstSesionesExt.destroy(); ddChartInstSesionesExt = null; }
    const canvasInstSesExt = document.getElementById('dd-chart-inst-sesiones-ext');
    if (canvasInstSesExt) { const ctx = canvasInstSesExt.getContext('2d'); ctx.clearRect(0, 0, canvasInstSesExt.width, canvasInstSesExt.height); }

    if (ddChartInstRecsAvance) { ddChartInstRecsAvance.destroy(); ddChartInstRecsAvance = null; }
    const canvasInstRecs = document.getElementById('dd-chart-inst-recs-avance');
    if (canvasInstRecs) { const ctx = canvasInstRecs.getContext('2d'); ctx.clearRect(0, 0, canvasInstRecs.width, canvasInstRecs.height); }

    if (ddChartInstInformes) { ddChartInstInformes.destroy(); ddChartInstInformes = null; }
    const canvasInstInf = document.getElementById('dd-chart-inst-informes');
    if (canvasInstInf) { const ctx = canvasInstInf.getContext('2d'); ctx.clearRect(0, 0, canvasInstInf.width, canvasInstInf.height); }
    
    const comparativeView = document.getElementById('dd-comparative-view');
    if (comparativeView) comparativeView.classList.add('hidden');
    
    const institutionComparisonView = document.getElementById('dd-institution-comparison-view');
    if (institutionComparisonView) institutionComparisonView.classList.add('hidden');
    
    const toggleContainer = document.getElementById('dd-view-toggle-container');
    if(toggleContainer) toggleContainer.classList.add('hidden');
}


// =============================================================
// == FUNCIONES PARA VISTA DETALLADA Y MODALES ==
// =============================================================
// -- Carga de datos para VISTA DETALLADA --
// -- Carga de datos para VISTA DETALLADA --
async function cargarDatosDashboardDetallado() {
    console.log("Iniciando carga de datos para Dashboard Detallado...");
    const año = document.getElementById('dd-filtro-año')?.value;
    const dgId = document.getElementById('dd-filtro-dg')?.value;
    const ramoId = document.getElementById('dd-filtro-ramo')?.value;
    const responsableId = document.getElementById('dd-filtro-responsable')?.value;
    const institucionId = document.getElementById('dd-filtro-institucion')?.value;

    if (!año || !dgId) {
        console.warn("Carga detallada abortada: Faltan Año o DG.");
        limpiarWidgetsDetallados();
        return;
    }

    limpiarWidgetsDetallados(); 

    const placeholders = document.querySelectorAll('#dashboard-detailed-view .kpi-container:not(.chart-container)'); 
    placeholders.forEach(el => {
        el.innerHTML = '<p>Cargando...</p>';
    });

    const params = new URLSearchParams();
    params.append('año', año);
    params.append('id_dg', dgId);
    if (ramoId) params.append('id_ramo', ramoId);
    if (responsableId) params.append('responsable_id', responsableId);
    if (institucionId) params.append('institucion_id', institucionId);
    const queryString = params.toString();
    const url = `/api/dashboard/stats?${queryString}`;

    const normalView = document.getElementById('dd-normal-view');
    const comparativeView = document.getElementById('dd-comparative-view');
    const institutionComparisonView = document.getElementById('dd-institution-comparison-view');
    const toggleContainer = document.getElementById('dd-view-toggle-container'); 

    ddFocosRojosData = [];
    // ELIMINADO: ddInformesFaltantesData = [];
    currentComparativeData = null; 

    // Visualización
    normalView.classList.remove('hidden'); 
    comparativeView.classList.add('hidden'); 
    institutionComparisonView.classList.add('hidden');
    if(toggleContainer) toggleContainer.classList.add('hidden'); 

    try {
        const [data] = await Promise.all([
            fetchAPI(url),
        ]);

        console.log("Datos detallados recibidos:", data);

        if (!data) throw new Error("La respuesta del API detallado no contiene datos.");
        
        await new Promise(resolve => setTimeout(resolve, 100));

        ddTendenciaSesionesData = []; 
        ddTendenciaInformesData = [];
        ddTendenciaRecomendacionesData = [];
        
        // === Renderizar KPIs ===
        renderDetalleKPI('dd-kpi-sesiones-ord', data.kpi_total_sesiones_ordinarias);
        renderDetalleKPI('dd-kpi-sesiones-ext', data.kpi_total_sesiones_extraordinarias);
        renderDetalleGraficoInformesPorTipo(data.grafico_informes_por_tipo || []);
        renderDetalleAvanceDonut(data.kpi_recs_atendidas, data.kpi_recs_emitidas);
        
        // === Alertas ===
        ddFocosRojosData = data.tabla_focos_rojos || [];
        renderDetalleKPI('dd-kpi-focos-rojos', ddFocosRojosData.length);
        const btnFocos = document.getElementById('dd-btn-detalle-focos-rojos');
        if (btnFocos) btnFocos.disabled = ddFocosRojosData.length === 0;

        // [ELIMINADO] Bloque de Informes Faltantes

        // === Gráficos (Vista Normal) ===
        renderDetalleGraficoSesionesOrdPorOrganoEsp(data.grafico_sesiones_ord_por_organo_esp || []);
        renderDetalleGraficoSesionesExtPorOrganoEsp(data.grafico_sesiones_ext_por_organo_esp || []);
        renderDetalleAvanceRecsPorTipo(data.grafico_avance_recomendaciones_por_tipo || []);

        setupTendenciaToggle();
        renderDetalleTendenciaSesiones(ddTendenciaSesionesData); 
        
        const titleElement = document.getElementById('dd-tendencia-title');
        if (titleElement) titleElement.textContent = 'Tendencia Anual: Sesiones Ordinarias';

        // === LÓGICA DE COMPARATIVA ===
        if (data.comparative_stats && data.institution_comparison_stats) {
            console.log("Nivel RAMO detectado. Habilitando botón de comparativas.");
            currentComparativeData = data.comparative_stats; 
            
            renderDetalleInstSesionesOrd(data.institution_comparison_stats);
            renderDetalleInstSesionesExt(data.institution_comparison_stats);
            renderDetalleInstRecsAvance(data.institution_comparison_stats);
            renderDetalleInstInformes(data.institution_comparison_stats);
            
            if(toggleContainer) toggleContainer.classList.remove('hidden');
            const btnShowComparative = document.getElementById('btn-show-comparative');
            if(btnShowComparative) btnShowComparative.classList.remove('hidden');
            const btnShowNormal = document.getElementById('btn-show-normal-widgets');
            if(btnShowNormal) btnShowNormal.classList.add('hidden');
        } 

        console.log("Renderizado detallado completado.");

    } catch (error) {
        console.error("Error al cargar datos del dashboard detallado:", error);
        showNotification(`Error: ${error.message}`, 'error');
        limpiarWidgetsDetallados();
        normalView.classList.remove('hidden'); 
        comparativeView.classList.add('hidden'); 
        document.querySelectorAll('#dashboard-detailed-view .kpi-container').forEach(el => el.innerHTML = '<p style="color:red;">Error</p>');
    } 
    finally {
        console.log("Carga de datos detallados finalizada.");
        const btnFocosDetalle = document.getElementById('dd-btn-detalle-focos-rojos');
        setupDetailButton(btnFocosDetalle, ddFocosRojosData, 'Instituciones con Focos Rojos', generarListaHtml);
    }
}
// --- FIN DE LA FUNCIÓN


// =============================================================
// == FUNCIONES DE RENDERIZADO PARA DASHBOARD GLOBAL (POR DG) ==
// =============================================================

function renderGlobalSesionesOrdinarias(data) {
    const ctx = document.getElementById('global-sesiones-ordinarias-chart')?.getContext('2d');
    if (!ctx) { console.warn("Canvas 'global-sesiones-ordinarias-chart' no encontrado."); return; }
    if (globalSesionesOrdinariasChart) globalSesionesOrdinariasChart.destroy();
    const validData = data.filter(d => d && typeof d.siglas_dg !== 'undefined' && typeof d.realizadas_ordinarias_count !== 'undefined');
    globalSesionesOrdinariasChart = new Chart(ctx, {
        type: 'bar', data: {
            labels: validData.map(d => d.siglas_dg),
            datasets: [{
                label: 'Nº Sesiones Ordinarias Realizadas',
                data: validData.map(d => d.realizadas_ordinarias_count),
                backgroundColor: 'rgba(30, 91, 79, 0.7)',
                borderColor: 'rgb(30, 91, 79)', borderWidth: 1
            }]
        }, options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
            plugins: {
                legend: { display: false }, title: { display: false },
                datalabels: {
                    anchor: 'end', align: 'right', color: '#333',
                    font: { weight: 'bold' },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}

function renderGlobalSesionesExtraordinarias(data) {
    const ctx = document.getElementById('global-sesiones-extraordinarias-chart')?.getContext('2d');
    if (!ctx) { console.warn("Canvas 'global-sesiones-extraordinarias-chart' no encontrado."); return; }
    if (globalSesionesExtraordinariasChart) globalSesionesExtraordinariasChart.destroy();
    const validData = data.filter(d => d && typeof d.siglas_dg !== 'undefined' && typeof d.realizadas_extraordinarias_count !== 'undefined');
    globalSesionesExtraordinariasChart = new Chart(ctx, {
        type: 'bar', data: {
            labels: validData.map(d => d.siglas_dg),
            datasets: [{
                label: 'Nº Sesiones Extraordinarias Realizadas',
                data: validData.map(d => d.realizadas_extraordinarias_count),
                backgroundColor: 'rgba(165, 127, 44, 0.7)',
                borderColor: 'rgb(165, 127, 44)', borderWidth: 1
            }]
        }, options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
            plugins: {
                legend: { display: false }, title: { display: false },
                datalabels: {
                    anchor: 'end', align: 'right', color: '#333',
                    font: { weight: 'bold' },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}

function renderGlobalInformesEntregados(data) {
    const ctx = document.getElementById('global-informes-entregados-chart')?.getContext('2d');
     if (!ctx) { console.warn("Canvas 'global-informes-entregados-chart' no encontrado."); return; }
    if (globalInformesEntregadosChart) globalInformesEntregadosChart.destroy();
    const dgs = [...new Set(data.map(item => item.siglas_dg))].sort();
    const tiposInforme = [...new Set(data.map(item => item.nombre_informe))].sort();
    const tipoInformeColors = { 'RAAD': 'rgba(97, 18, 50, 0.7)', 'Informe de Autoevaluación': 'rgba(30, 91, 79, 0.7)', 'Informe de Estados Financieros': 'rgba(165, 127, 44, 0.7)' };
    const tipoInformeBorderColors = { 'RAAD': 'rgb(97, 18, 50)', 'Informe de Autoevaluación': 'rgb(30, 91, 79)', 'Informe de Estados Financieros': 'rgb(165, 127, 44)' };
    const datasets = tiposInforme.map(tipo => ({
        label: tipo,
        data: dgs.map(dg => {
            const item = data.find(d => d.siglas_dg === dg && d.nombre_informe === tipo);
            return item ? item.delivered_count : 0;
        }),
        backgroundColor: tipoInformeColors[tipo] || 'rgba(108, 117, 125, 0.7)',
        borderColor: tipoInformeBorderColors[tipo] || 'rgb(108, 117, 125)',
        borderWidth: 1
    }));
    globalInformesEntregadosChart = new Chart(ctx, {
        type: 'bar', data: { labels: dgs, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: false }, y: { beginAtZero: true, ticks: { precision: 0 } } },
            plugins: {
                legend: { position: 'top' }, title: { display: false },
                tooltip: { mode: 'index', intersect: false, callbacks: { label: (context) => `${context.dataset.label}: ${context.raw}` } },
                datalabels: {
                    anchor: 'end', align: 'top', color: '#444',
                    font: { weight: 'bold', size: 10 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}

function renderGlobalInstDistribucion(data) {
    const ctx = document.getElementById('global-inst-distribucion-chart')?.getContext('2d');
     if (!ctx) { console.warn("Canvas 'global-inst-distribucion-chart' no encontrado."); return; }
    if (globalInstDistribucionChart) globalInstDistribucionChart.destroy();
    const validData = data.filter(d => d && typeof d.siglas_dg !== 'undefined' && typeof d.institution_count !== 'undefined');
    const baseColors = [ 'rgba(97, 18, 50, 0.7)', 'rgba(155, 34, 71, 0.7)', 'rgba(30, 91, 79, 0.7)', 'rgba(165, 127, 44, 0.7)', 'rgba(51, 51, 51, 0.7)', 'rgba(108, 117, 125, 0.7)' ];
    globalInstDistribucionChart = new Chart(ctx, {
        type: 'pie', data: {
            labels: validData.map(d => d.siglas_dg),
            datasets: [{
                label: 'Nº Instituciones',
                data: validData.map(d => d.institution_count),
                backgroundColor: validData.map((_, index) => baseColors[index % baseColors.length]),
                borderColor: '#fff', borderWidth: 1
            }]
        }, options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }, title: { display: false },
                tooltip: { callbacks: { label: (context) => `${context.label || ''}: ${context.raw || 0}` } },
                datalabels: {
                    color: '#fff', textAlign: 'center', font: { weight: 'bold' },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}

function renderGlobalRecsVolumen(data) {
    const ctx = document.getElementById('global-recs-volumen-chart')?.getContext('2d');
     if (!ctx) { console.warn("Canvas 'global-recs-volumen-chart' no encontrado."); return; }
    if (globalRecsVolumenChart) globalRecsVolumenChart.destroy();
    const validData = data.filter(d => d && typeof d.siglas_dg !== 'undefined' && typeof d.emitidas_count !== 'undefined' && typeof d.atendidas_count !== 'undefined');
    globalRecsVolumenChart = new Chart(ctx, {
        type: 'bar', data: {
            labels: validData.map(d => d.siglas_dg),
            datasets: [
                {
                    label: 'Atendidas',
                    data: validData.map(d => Number(d.atendidas_count) || 0),
                    backgroundColor: 'rgba(30, 91, 79, 0.7)',
                    borderColor: 'rgb(30, 91, 79)', borderWidth: 1
                },
                {
                    label: 'Pendientes',
                    data: validData.map(d => Math.max(0, (Number(d.emitidas_count) || 0) - (Number(d.atendidas_count) || 0))),
                    backgroundColor: 'rgba(155, 34, 71, 0.7)',
                    borderColor: 'rgb(155, 34, 71)', borderWidth: 1
                }
            ]
        }, options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
            plugins: {
                legend: { position: 'top' }, title: { display: false },
                tooltip: {
                    callbacks: {
                        footer: (tooltipItems) => {
                            let sum = 0;
                            tooltipItems.forEach(item => { sum += Number(item.parsed.y) || 0; });
                            const index = tooltipItems[0]?.dataIndex;
                            const originalEmitidas = (index !== undefined && validData[index]) ? validData[index].emitidas_count : sum;
                            return 'Total Emitidas: ' + originalEmitidas;
                        },
                         label: (context) => `${context.dataset.label}: ${context.raw}`
                    },
                    mode: 'index', intersect: false
                },
                datalabels: {
                    color: '#fff', textAlign: 'center', font: { weight: 'bold' },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}

function renderGlobalRecsEficiencia(data) {
    const ctx = document.getElementById('global-recs-eficiencia-chart')?.getContext('2d');
     if (!ctx) { console.warn("Canvas 'global-recs-eficiencia-chart' no encontrado."); return; }
    if (globalRecsEficienciaChart) globalRecsEficienciaChart.destroy();
    const validData = data.filter(d => d && typeof d.siglas_dg !== 'undefined' && typeof d.efficiency_pct !== 'undefined');
    globalRecsEficienciaChart = new Chart(ctx, {
        type: 'bar', data: {
            labels: validData.map(d => d.siglas_dg),
            datasets: [{
                label: '% Eficiencia Atención',
                data: validData.map(d => Number(d.efficiency_pct) || 0),
                backgroundColor: 'rgba(97, 18, 50, 0.7)',
                borderColor: 'rgb(97, 18, 50)', borderWidth: 1
            }]
        }, options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: value => value + "%" } } },
            plugins: {
                legend: { display: false }, title: { display: false },
                 tooltip: {
                    callbacks: {
                        label: (context) => {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) label += context.parsed.y.toFixed(2) + '%';
                            return label;
                        }
                    }
                },
                datalabels: {
                    anchor: 'end', align: 'top', color: '#333',
                    font: { weight: 'bold' },
                    formatter: (value) => value > 0 ? value.toFixed(1) + '%' : ''
                }
            }
        }
    });
}

function renderGlobalFocosRojos(data) {
    const ctx = document.getElementById('global-focos-rojos-chart')?.getContext('2d');
    if (!ctx) { console.warn("Canvas 'global-focos-rojos-chart' no encontrado."); return; }
    if (globalFocosRojosChart) globalFocosRojosChart.destroy();
    
    // El 'data' ahora contiene { siglas_dg, focos_rojos_count, total_instituciones, porcentaje_focos_rojos }
    const validData = data.filter(d => d && typeof d.siglas_dg !== 'undefined' && typeof d.porcentaje_focos_rojos !== 'undefined');

    globalFocosRojosChart = new Chart(ctx, {
        type: 'bar', // Cambiado a 'bar' (vertical)
        data: {
            labels: validData.map(d => d.siglas_dg),
            datasets: [{
                label: '% Instituciones con Focos Rojos',
                data: validData.map(d => d.porcentaje_focos_rojos), // Usamos el porcentaje para la barra
                backgroundColor: 'rgba(220, 53, 69, 0.7)',
                borderColor: 'rgb(220, 53, 69)', 
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'x', // Eje X para vertical
            responsive: true, 
            maintainAspectRatio: false,
            scales: { 
                y: { // Eje Y (valor)
                    beginAtZero: true, 
                    max: 100, // Escala de 0 a 100%
                    ticks: { 
                        precision: 0,
                        callback: value => value + "%" // Añadir % al eje
                    } 
                } 
            },
            plugins: {
                legend: { display: false }, 
                title: { display: false },
                tooltip: { 
                    callbacks: { 
                        label: (context) => {
                            // Mostrar % y el conteo absoluto en el tooltip
                            const item = validData[context.dataIndex];
                            const pct = context.raw.toFixed(1) + '%';
                            const count = item.focos_rojos_count;
                            const total = item.total_instituciones;
                            return `% Focos Rojos: ${pct} (${count} de ${total} inst.)`;
                        }
                    } 
                },
                datalabels: {
                    anchor: 'end', 
                    align: 'top', 
                    color: '#DC3545',
                    font: { weight: 'bold' },
                    formatter: (value) => value > 0 ? value.toFixed(1) + '%' : '' // Formatear como %
                }
            }
        }
    });
}

function renderGlobalSesionesPorTipoOrgano(data) {
    const ctx = document.getElementById('global-sesiones-por-tipo-organo-chart')?.getContext('2d');
    if (!ctx) { console.warn("Canvas 'global-sesiones-por-tipo-organo-chart' no encontrado."); return; }
    if (globalSesionesPorTipoOrganoChart) globalSesionesPorTipoOrganoChart.destroy();
    const dgs = [...new Set(data.map(item => item.siglas_dg))].sort();
    const tiposOrgano = ['COCODI', 'Órgano de Gobierno', 'Otros Órganos Colegiados'];
    const colors = [ 'rgba(97, 18, 50, 0.7)', 'rgba(155, 34, 71, 0.7)', 'rgba(108, 117, 125, 0.7)' ];
    const borderColors = [ 'rgb(97, 18, 50)', 'rgb(155, 34, 71)', 'rgb(108, 117, 125)' ];
    const datasets = tiposOrgano.map((tipo, index) => ({
        label: tipo,
        data: dgs.map(dg => {
            const item = data.find(d => d.siglas_dg === dg && d.tipo_organo_agrupado === tipo);
            return item ? item.sesiones_count : 0;
        }),
        backgroundColor: colors[index % colors.length],
        borderColor: borderColors[index % borderColors.length],
        borderWidth: 1
    }));
    globalSesionesPorTipoOrganoChart = new Chart(ctx, {
        type: 'bar', data: { labels: dgs, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
            plugins: {
                legend: { position: 'top' }, title: { display: false },
                tooltip: { mode: 'index', intersect: false, callbacks: { label: (context) => `${context.dataset.label}: ${context.raw}` } },
                datalabels: {
                    color: '#fff', textAlign: 'center', font: { weight: 'bold', size: 10 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}


// === NUEVO: Renderizar Sesiones ORDINARIAS por Tipo de Órgano ===
function renderGlobalSesionesOrdPorTipoOrgano(data) {
    const ctx = document.getElementById('global-sesiones-ord-por-tipo-organo-chart')?.getContext('2d');
    if (!ctx) return;
    if (globalSesionesOrdPorTipoOrganoChart) globalSesionesOrdPorTipoOrganoChart.destroy();

    const dgs = [...new Set(data.map(item => item.siglas_dg))].sort();
    const tiposOrgano = ['COCODI', 'Órgano de Gobierno', 'Otros Órganos Colegiados'];
    
    // Gama VERDES para Ordinarias
    const colors = ['rgba(30, 91, 79, 0.9)', 'rgba(30, 91, 79, 0.6)', 'rgba(30, 91, 79, 0.3)']; 
    const borderColors = ['rgb(30, 91, 79)', 'rgb(30, 91, 79)', 'rgb(30, 91, 79)'];

    const datasets = tiposOrgano.map((tipo, index) => ({
        label: tipo,
        data: dgs.map(dg => {
            const item = data.find(d => d.siglas_dg === dg && d.tipo_organo_agrupado === tipo);
            return item ? item.sesiones_ord_count : 0; // Usamos el campo específico ORD
        }),
        backgroundColor: colors[index % colors.length],
        borderColor: borderColors[index % borderColors.length],
        borderWidth: 1
    }));

    globalSesionesOrdPorTipoOrganoChart = new Chart(ctx, {
        type: 'bar', data: { labels: dgs, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
            plugins: {
                legend: { position: 'top' }, title: { display: false },
                tooltip: { mode: 'index', intersect: false },
                datalabels: {
                    color: '#fff', font: { weight: 'bold', size: 10 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}

// === NUEVO: Renderizar Sesiones EXTRAORDINARIAS por Tipo de Órgano ===
function renderGlobalSesionesExtPorTipoOrgano(data) {
    const ctx = document.getElementById('global-sesiones-ext-por-tipo-organo-chart')?.getContext('2d');
    if (!ctx) return;
    if (globalSesionesExtPorTipoOrganoChart) globalSesionesExtPorTipoOrganoChart.destroy();

    const dgs = [...new Set(data.map(item => item.siglas_dg))].sort();
    const tiposOrgano = ['COCODI', 'Órgano de Gobierno', 'Otros Órganos Colegiados'];

    // Gama DORADOS/OCRE para Extraordinarias
    const colors = ['rgba(165, 127, 44, 0.9)', 'rgba(165, 127, 44, 0.6)', 'rgba(165, 127, 44, 0.3)'];
    const borderColors = ['rgb(165, 127, 44)', 'rgb(165, 127, 44)', 'rgb(165, 127, 44)'];

    const datasets = tiposOrgano.map((tipo, index) => ({
        label: tipo,
        data: dgs.map(dg => {
            const item = data.find(d => d.siglas_dg === dg && d.tipo_organo_agrupado === tipo);
            return item ? item.sesiones_ext_count : 0; // Usamos el campo específico EXT
        }),
        backgroundColor: colors[index % colors.length],
        borderColor: borderColors[index % borderColors.length],
        borderWidth: 1
    }));

    globalSesionesExtPorTipoOrganoChart = new Chart(ctx, {
        type: 'bar', data: { labels: dgs, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
            plugins: {
                legend: { position: 'top' }, title: { display: false },
                tooltip: { mode: 'index', intersect: false },
                datalabels: {
                    color: '#fff', font: { weight: 'bold', size: 10 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}

// === INICIO: NUEVA FUNCIÓN DE RENDERIZADO ===
function renderGlobalEficienciaRecsPorTipo(data) {
    const ctx = document.getElementById('global-eficiencia-recs-por-tipo-chart')?.getContext('2d');
    if (!ctx) {
        console.warn("Canvas 'global-eficiencia-recs-por-tipo-chart' no encontrado.");
        return;
    }
    if (globalEficienciaRecsPorTipoChart) globalEficienciaRecsPorTipoChart.destroy();

    // Preparar datos para un gráfico de barras agrupadas
    const dgs = [...new Set(data.map(item => item.siglas_dg))].sort();
    const tiposInforme = [...new Set(data.map(item => item.nombre_informe))].sort();
    
    // Mapeo de colores para los tipos de informe
    const tipoInformeColors = {
        'RAAD': 'rgba(97, 18, 50, 0.7)', // Guinda
        'Informe de Autoevaluación': 'rgba(30, 91, 79, 0.7)', // Verde
        'Informe de Estados Financieros': 'rgba(165, 127, 44, 0.7)' // Ocre
    };
    const tipoInformeBorderColors = {
        'RAAD': 'rgb(97, 18, 50)',
        'Informe de Autoevaluación': 'rgb(30, 91, 79)',
        'Informe de Estados Financieros': 'rgb(165, 127, 44)'
    };

    const datasets = tiposInforme.map(tipo => {
        return {
            label: tipo,
            data: dgs.map(dg => {
                const item = data.find(d => d.siglas_dg === dg && d.nombre_informe === tipo);
                return item ? item.efficiency_pct : 0; // Usamos el % de eficiencia
            }),
            backgroundColor: tipoInformeColors[tipo] || 'rgba(108, 117, 125, 0.7)',
            borderColor: tipoInformeBorderColors[tipo] || 'rgb(108, 117, 125)',
            borderWidth: 1
        };
    });

    globalEficienciaRecsPorTipoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dgs,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: false }, // Agrupado
                y: { 
                    beginAtZero: true, 
                    max: 100,
                    ticks: { 
                        precision: 0,
                        callback: value => value + "%" // Añadir símbolo %
                    }
                }
            },
            plugins: {
                legend: { position: 'top' },
                title: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (context) => {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1) + '%';
                            }
                            return label;
                        }
                    }
                },
                datalabels: {
                    display: false // Demasiado ruido para un gráfico agrupado
                }
            }
        }
    });
}
// === FIN: NUEVA FUNCIÓN DE RENDERIZADO ===


// === INICIO: NUEVA FUNCIÓN DE RENDERIZADO (VOLUMEN POR TIPO) ===
function renderGlobalRecsVolumenPorTipo(data) {
    const ctx = document.getElementById('global-recs-volumen-por-tipo-chart')?.getContext('2d');
    if (!ctx) {
        console.warn("Canvas 'global-recs-volumen-por-tipo-chart' no encontrado.");
        return;
    }
    if (globalRecsVolumenPorTipoChart) globalRecsVolumenPorTipoChart.destroy();

    // 1. Obtener las DGs (eje X)
    const dgs = [...new Set(data.map(item => item.siglas_dg))].sort();
    
    // 2. Obtener los Tipos de Informe (Origenes)
    const tiposInforme = [...new Set(data.map(item => item.nombre_informe))].sort();

    if (dgs.length === 0 || tiposInforme.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        console.log("No hay datos para gráfico Volumen de Recomendaciones por Origen.");
        return;
    }

    // 3. Definir colores (consistentes)
    // Definimos paletas para 'Atendidas' y 'Pendientes' por tipo
    const tipoInformeColors = {
        'RAAD-Atendidas': 'rgba(30, 91, 79, 0.8)', // Verde Fuerte
        'RAAD-Pendientes': 'rgba(155, 34, 71, 0.8)', // Guinda Fuerte
        'Informe de Autoevaluación-Atendidas': 'rgba(40, 167, 69, 0.7)', // Verde Claro
        'Informe de Autoevaluación-Pendientes': 'rgba(220, 53, 69, 0.7)', // Rojo Claro
        'Informe de Estados Financieros-Atendidas': 'rgba(23, 162, 184, 0.7)', // Teal
        'Informe de Estados Financieros-Pendientes': 'rgba(253, 126, 20, 0.7)', // Naranja
        'Independiente-Atendidas': 'rgba(165, 127, 44, 0.7)', // Ocre
        'Independiente-Pendientes': 'rgba(108, 117, 125, 0.7)' // Gris
    };
    
    const defaultColorAtendidas = 'rgba(30, 91, 79, 0.4)';
    const defaultColorPendientes = 'rgba(155, 34, 71, 0.4)';

    // 4. Construir los Datasets (uno por cada TIPO, y uno por cada ESTATUS)
    const datasets = [];
    
    tiposInforme.forEach(tipo => {
        
        // Solo agregar datasets si hay datos para este tipo
        const hasDataForTipo = data.some(d => d.nombre_informe === tipo && (d.total_atendidas > 0 || d.total_emitidas > 0));
        
        if (hasDataForTipo) {
            // Dataset para ATENDIDAS de este TIPO
            datasets.push({
                label: `${tipo} (Atendidas)`,
                data: dgs.map(dg => {
                    const item = data.find(d => d.siglas_dg === dg && d.nombre_informe === tipo);
                    return item ? item.total_atendidas : 0;
                }),
                backgroundColor: tipoInformeColors[`${tipo}-Atendidas`] || defaultColorAtendidas,
                stack: tipo // <-- Agrupación por stack (RAAD, Autoevaluación, etc.)
            });
            
            // Dataset para PENDIENTES de este TIPO
            datasets.push({
                label: `${tipo} (Pendientes)`,
                data: dgs.map(dg => {
                    const item = data.find(d => d.siglas_dg === dg && d.nombre_informe === tipo);
                    const pendientes = item ? Math.max(0, item.total_emitidas - item.total_atendidas) : 0;
                    return pendientes;
                }),
                backgroundColor: tipoInformeColors[`${tipo}-Pendientes`] || defaultColorPendientes,
                stack: tipo // <-- Agrupación por stack (RAAD, Autoevaluación, etc.)
            });
        }
    });

    // 5. Crear el gráfico (Agrupado por DG, Apilado por Origen/Estatus)
    globalRecsVolumenPorTipoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dgs, // Eje X: DG1, DG2, DG3, DG4
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            // [IMPORTANTE] Gráfico APILADO
            scales: {
                x: { stacked: true }, 
                y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
            },
            plugins: {
                legend: { position: 'top' },
                title: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.raw}`
                    }
                },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 9 }, // Letra más pequeña
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}
// === FIN: NUEVA FUNCIÓN DE RENDERIZADO ===



// =============================================================
// == [NUEVA] FUNCIÓN DE RENDERIZADO PARA TENDENCIA SESIONES EXT ==
// =============================================================
function renderDetalleTendenciaSesionesExt(data) {
    const ctx = document.getElementById('dd-chart-tendencia-sesiones')?.getContext('2d');
    if (!ctx) return;
    if (ddChartTendenciaSesiones) ddChartTendenciaSesiones.destroy();

    const validData = data.filter(d => d && typeof d.año !== 'undefined');

    if (validData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "bold 16px Montserrat";
        ctx.fillStyle = "#adb5bd";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Sin datos históricos de Sesiones Extraordinarias", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 4;
    const labels = [];
    const counts = [];
    const dataMap = new Map(validData.map(d => [d.año, d.sesiones_count]));

    for (let year = minYear; year <= currentYear; year++) {
        labels.push(String(year));
        counts.push(dataMap.get(year) || 0);
    }

    ddChartTendenciaSesiones = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sesiones Extraordinarias Realizadas',
                data: counts,
                backgroundColor: 'rgba(155, 34, 71, 0.4)', // Color guinda claro
                borderColor: 'rgb(155, 34, 71)', // Color guinda oscuro
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Año' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Nº Sesiones' },
                    ticks: { precision: 0 }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Sesiones: ${context.raw}`
                    }
                },
                datalabels: {
                    align: 'top',
                    color: 'rgb(155, 34, 71)',
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}

// =============================================================
// == FUNCIONES PARA VISTA DETALLADA Y MODALES ==
// =============================================================


// --- FUNCIÓN PARA RENDERIZAR "ROW WIDGETS" COMPARATIVOS ---
function renderComparativaMiniWidgets(comparativeData) { // <-- Parámetro único
    const container = document.getElementById('dd-comparative-view');
    if (!container) return;

    // Extraer stats desde el objeto recibido
    const delegada = comparativeData.resp_1 || {};
    const comisaria = comparativeData.resp_2 || {};

    // Definición de las métricas a mostrar
    const metrics = [
        { label: 'Sesiones Ordinarias Realizadas', key_d: 'kpi_sesiones_ordinarias', key_c: 'kpi_sesiones_ordinarias', suffix: '' },
        { label: 'Sesiones Extraordinarias Realizadas', key_d: 'kpi_sesiones_extraordinarias', key_c: 'kpi_sesiones_extraordinarias', suffix: '' },
        { label: 'Informes Entregados', key_d: 'kpi_informes_entregados', key_c: 'kpi_informes_entregados', suffix: '' },
        { label: 'Avance Recomendaciones (%)', key_d: 'kpi_avance_pct', key_c: 'kpi_avance_pct', suffix: '%' }
    ];

    // Construcción del HTML
    let html = `
        <h3 style="text-align: center; margin-bottom: 20px;">Comparativa por Responsable</h3>
        <div class="comparative-widget-container">
            <div class="comparative-widget-header">
                <div class="metric-label-header">Métrica</div>
                <div class="value-cell-header">Delegada</div>
                <div class="value-cell-header">Comisaria</div>
            </div>
            `;

    // Iterar sobre las métricas para generar cada "row widget"
    metrics.forEach(metric => {
        // Obtener valores, manejando casos N/A
        const val_d = (delegada[metric.key_d] !== undefined && delegada[metric.key_d] !== null) ? delegada[metric.key_d] + metric.suffix : 'N/A';
        const val_c = (comisaria[metric.key_c] !== undefined && comisaria[metric.key_c] !== null) ? comisaria[metric.key_c] + metric.suffix : 'N/A';

        // Añadir el HTML para la fila
        html += `
            <div class="comparative-row-widget">
                <div class="metric-label">${metric.label}</div>
                <div class="value-cell">${val_d}</div>
                <div class="value-cell">${val_c}</div>
            </div>
        `;
    });

    // Cerrar el contenedor principal
    html += `</div>`; // Close comparative-widget-container
    
    // Insertar el HTML generado en el DOM
    container.innerHTML = html;
}
// -- Fin Funciones de Renderizado Detallado (KPI, Tablas, Gráficos) --


// =============================================================
// == [NUEVO BLOQUE] FUNCIONES PARA COMPARATIVA INSTITUCIONAL ==
// =============================================================

/**
 * Helper genérico para crear los gráficos de barras horizontales de la comparativa.
 * @param {string} canvasId - ID del elemento canvas.
 * @param {Chart} chartInstance - Variable (global) que almacena la instancia del gráfico.
 * @param {Array} data - El array de datos (p.ej. data.institution_comparison_stats).
 * @param {string} labelField - La clave del objeto para las etiquetas (p.ej. 'siglas').
 * @param {string} dataField - La clave del objeto para los datos (p.ej. 'sesiones_count').
 * @param {string} chartLabel - Etiqueta para el tooltip (p.ej. 'Sesiones Realizadas').
 * @param {string} color - Color de fondo de la barra.
 * @param {string} borderColor - Color de borde de la barra.
 * @param {string} [suffix=''] - Sufijo para los números (p.ej. '%').
 * @returns {Chart} La nueva instancia del gráfico.
 */
function createHorizontalBarChart(canvasId, chartInstance, data, labelField, dataField, chartLabel, color, borderColor, suffix = '') {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) { 
        console.warn(`[createHorizontalBarChart] Canvas '${canvasId}' no encontrado.`); 
        return null; 
    }
    if (chartInstance) chartInstance.destroy();

    const validData = data.filter(d => d && typeof d[labelField] !== 'undefined' && typeof d[dataField] !== 'undefined');
    
    // Ordenar descendente para que la barra más grande quede arriba
    validData.sort((a, b) => b[dataField] - a[dataField]); 

    if (validData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        console.log(`No hay datos para gráfico ${canvasId}.`);
        return null;
    }

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: validData.map(d => d[labelField]),
            datasets: [{
                label: chartLabel,
                data: validData.map(d => d[dataField]),
                backgroundColor: color,
                borderColor: borderColor,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // <-- Gráfico de barras horizontal
            responsive: true, 
            maintainAspectRatio: false,
            scales: { 
                x: { 
                    beginAtZero: true, 
                    ticks: { 
                        precision: 0, 
                        callback: (value) => value + suffix 
                    } 
                } 
            },
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: { 
                    callbacks: { 
                        // ESTA ES LA LÓGICA DEL TOOLTIP
                        label: (context) => `${context.label}: ${Number(context.raw).toFixed(1)}${suffix}`.replace('.0%','%').replace('.0','')
                    } 
                },
                datalabels: {
                    anchor: 'end', 
                    align: 'right', 
                    color: '#333',
                    font: { weight: 'bold' },
                    formatter: (value) => value > 0 ? `${Number(value).toFixed(1)}${suffix}`.replace('.0%','%').replace('.0','') : ''
                }
            }
        }
    });
}


/** Renderiza el gráfico de Sesiones Ordinarias por Institución */
function renderDetalleInstSesionesOrd(data) {
    ddChartInstSesionesOrd = createHorizontalBarChart(
        'dd-chart-inst-sesiones-ord',    // canvasId
        ddChartInstSesionesOrd,          // chartInstance
        data,                            // data
        'siglas',                        // labelField
        'sesiones_ordinarias',           // dataField
        'Sesiones Ordinarias',           // chartLabel
        'rgba(30, 91, 79, 0.7)',       // color
        'rgb(30, 91, 79)'              // borderColor
    );
}

/** Renderiza el gráfico de Sesiones Extraordinarias por Institución */
function renderDetalleInstSesionesExt(data) {
    ddChartInstSesionesExt = createHorizontalBarChart(
        'dd-chart-inst-sesiones-ext',    // canvasId
        ddChartInstSesionesExt,          // chartInstance
        data,                            // data
        'siglas',                        // labelField
        'sesiones_extraordinarias',      // dataField
        'Sesiones Extraordinarias',      // chartLabel
        'rgba(155, 34, 71, 0.7)',      // color (guinda)
        'rgb(155, 34, 71)'             // borderColor
    );
}

/** Renderiza el gráfico de Avance de Recs por Institución */
function renderDetalleInstRecsAvance(data) {
    ddChartInstRecsAvance = createHorizontalBarChart(
        'dd-chart-inst-recs-avance',   // canvasId
        ddChartInstRecsAvance,         // chartInstance
        data,                            // data
        'siglas',                        // labelField
        'recs_avance_pct',             // dataField
        '% Avance Recs',               // chartLabel
        'rgba(97, 18, 50, 0.7)',     // color
        'rgb(97, 18, 50)',           // borderColor
        '%'                              // suffix
    );
}

/** Renderiza el gráfico de Informes por Institución */
function renderDetalleInstInformes(data) {
    ddChartInstInformes = createHorizontalBarChart(
        'dd-chart-inst-informes',      // canvasId
        ddChartInstInformes,           // chartInstance
        data,                            // data
        'siglas',                        // labelField
        'informes_count',              // dataField
        'Informes Entregados',         // chartLabel
        'rgba(165, 127, 44, 0.7)',   // color
        'rgb(165, 127, 44)'            // borderColor
    );
}
// =============================================================
// == [FIN NUEVO BLOQUE] ==
// =============================================================

function renderDetalleKPI(elementId, value, suffix = '') {
	
	// ---- LOG AÑADIDO ----
    console.log(`[renderDetalleKPI] Intentando renderizar KPI para ID: ${elementId} con valor: ${value}`);
    // ---------------------
    const container = document.getElementById(elementId);
    if (container) {
        const displayValue = (value !== undefined && value !== null) ? value + suffix : 'N/A';
        container.innerHTML = `<p class="kpi-number">${displayValue}</p>`;
		
		// ---- LOG AÑADIDO ----
        console.log(`[renderDetalleKPI] ¡Éxito al renderizar ${elementId}!`);
        // ---------------------
		
    } else {
        console.warn(`Contenedor KPI con ID '${elementId}' no encontrado.`);
    }
}

function renderDetalleTablaLista(containerId, dataList, title) {
    // Esta función ya no se usa para renderizar la tabla directamente
    // sino que es llamada por el generador de HTML del modal.
    // La dejamos aquí por si se necesita en otro lado.
}

function renderDetalleTablaInformesFaltantes(containerId, data) {
    // Esta función ya no se usa para renderizar la tabla directamente
    // sino que es llamada por el generador de HTML del modal.
}

// Función RENOMBRADA para renderizar gráfico de Sesiones ORDINARIAS por Órgano Específico
function renderDetalleGraficoSesionesOrdPorOrganoEsp(data) {
    const ctx = document.getElementById('dd-grafico-sesiones-ord-por-organo-esp')?.getContext('2d'); // ID Corregido
    if (!ctx) {
        console.warn("Canvas 'dd-grafico-sesiones-ord-por-organo-esp' no encontrado.");
        return;
    }
    if (ddGraficoSesionesOrdPorOrganoEsp) ddGraficoSesionesOrdPorOrganoEsp.destroy(); // Variable global Corregida

    const validData = data.filter(d => d && typeof d.tipo_organo !== 'undefined' && typeof d.sesiones_count !== 'undefined' && d.sesiones_count > 0);

    if (validData.length === 0) {
       ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
       console.log("No hay datos para gráfico Sesiones Ordinarias por Órgano Específico.");
       return;
    }
    validData.sort((a, b) => b.sesiones_count - a.sesiones_count);
    const colors = [ /* ... (tu paleta de colores) ... */ 'rgba(97, 18, 50, 0.8)', 'rgba(155, 34, 71, 0.8)', 'rgba(30, 91, 79, 0.8)', 'rgba(165, 127, 44, 0.8)', 'rgba(51, 51, 51, 0.8)', 'rgba(108, 117, 125, 0.8)', 'rgba(0, 123, 255, 0.8)', 'rgba(255, 193, 7, 0.8)', 'rgba(40, 167, 69, 0.8)', 'rgba(220, 53, 69, 0.8)' ];

    ddGraficoSesionesOrdPorOrganoEsp = new Chart(ctx, { // Variable global Corregida
        type: 'bar',
        data: {
            labels: validData.map(d => d.tipo_organo),
            datasets: [{
                label: 'Nº Sesiones Ordinarias', // Título dataset
                data: validData.map(d => d.sesiones_count),
                backgroundColor: validData.map((_, index) => colors[index % colors.length]),
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
            plugins: {
                legend: { display: false }, title: { display: false },
                tooltip: { callbacks: { label: context => `${context.label}: ${context.raw}` } },
                datalabels: {
                    anchor: 'end', align: 'right', offset: 4,
                    color: '#333', font: { weight: 'bold', size: 10 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}

// NUEVA Función para renderizar gráfico de Sesiones EXTRAORDINARIAS por Órgano Específico
function renderDetalleGraficoSesionesExtPorOrganoEsp(data) {
    const ctx = document.getElementById('dd-grafico-sesiones-ext-por-organo-esp')?.getContext('2d'); // ID Nuevo
    if (!ctx) {
        console.warn("Canvas 'dd-grafico-sesiones-ext-por-organo-esp' no encontrado.");
        return;
    }
    if (ddGraficoSesionesExtPorOrganoEsp) ddGraficoSesionesExtPorOrganoEsp.destroy(); // Variable global Nueva

    const validData = data.filter(d => d && typeof d.tipo_organo !== 'undefined' && typeof d.sesiones_count !== 'undefined' && d.sesiones_count > 0);

    if (validData.length === 0) {
       ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
       console.log("No hay datos para gráfico Sesiones Extraordinarias por Órgano Específico.");
       return;
    }
    validData.sort((a, b) => b.sesiones_count - a.sesiones_count);
    const colors = [ /* ... (tu paleta de colores) ... */ 'rgba(97, 18, 50, 0.8)', 'rgba(155, 34, 71, 0.8)', 'rgba(30, 91, 79, 0.8)', 'rgba(165, 127, 44, 0.8)', 'rgba(51, 51, 51, 0.8)', 'rgba(108, 117, 125, 0.8)', 'rgba(0, 123, 255, 0.8)', 'rgba(255, 193, 7, 0.8)', 'rgba(40, 167, 69, 0.8)', 'rgba(220, 53, 69, 0.8)' ];

    ddGraficoSesionesExtPorOrganoEsp = new Chart(ctx, { // Variable global Nueva
        type: 'bar',
        data: {
            labels: validData.map(d => d.tipo_organo),
            datasets: [{
                label: 'Nº Sesiones Extraordinarias', // Título dataset
                data: validData.map(d => d.sesiones_count),
                backgroundColor: validData.map((_, index) => colors[index % colors.length]),
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
            plugins: {
                legend: { display: false }, title: { display: false },
                tooltip: { callbacks: { label: context => `${context.label}: ${context.raw}` } },
                datalabels: {
                    anchor: 'end', align: 'right', offset: 4,
                    color: '#333', font: { weight: 'bold', size: 10 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}

// --- NUEVA FUNCIÓN PARA GRÁFICO DE INFORMES POR TIPO ---
function renderDetalleGraficoInformesPorTipo(data) {
    const ctx = document.getElementById('dd-chart-informes-tipo')?.getContext('2d');
    if (!ctx) {
        console.warn("Canvas 'dd-chart-informes-tipo' no encontrado.");
        return;
    }
    if (ddChartInformesTipo) ddChartInformesTipo.destroy();

    const validData = data.filter(d => d && typeof d.tipo !== 'undefined' && typeof d.conteo !== 'undefined' && d.conteo > 0);

    if (validData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "bold 16px Montserrat";
        ctx.fillStyle = "#adb5bd";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Sin datos", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    // Paleta de colores para los tipos de informe
    const colors = {
        'RAAD': 'rgba(97, 18, 50, 0.8)', // Guinda
        'Informe de Autoevaluación': 'rgba(30, 91, 79, 0.8)', // Verde
        'Informe de Estados Financieros': 'rgba(165, 127, 44, 0.8)', // Ocre
        'Otro': 'rgba(108, 117, 125, 0.8)' // Gris
    };

    const backgroundColors = validData.map(d => colors[d.tipo] || colors['Otro']);

    ddChartInformesTipo = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: validData.map(d => d.tipo),
            datasets: [{
                data: validData.map(d => d.conteo),
                backgroundColor: backgroundColors,
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 10 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw}`;
                        }
                    }
                },
                datalabels: {
                    display: true,
                    color: '#fff',
                    font: { weight: 'bold' },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}



// --- FUNCIÓN CORREGIDA PARA GRÁFICO DE AVANCE DE RECOMENDACIONES POR TIPO ---
function renderDetalleAvanceRecsPorTipo(data) {
    const ctx = document.getElementById('dd-chart-avance-recs-por-tipo')?.getContext('2d');
    if (!ctx) {
        console.warn("Canvas 'dd-chart-avance-recs-por-tipo' no encontrado.");
        return;
    }
    if (ddChartAvanceRecsPorTipo) ddChartAvanceRecsPorTipo.destroy();

    const validData = data.filter(d => d && typeof d.nombre_informe !== 'undefined');

    if (validData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        console.log("No hay datos para gráfico Avance Recomendaciones por Origen.");
        return;
    }

    // Colores
    const colorEmitidas = 'rgba(155, 34, 71, 0.7)'; // Guinda/Rojo
    const colorAtendidas = 'rgba(30, 91, 79, 0.8)'; // Verde

    ddChartAvanceRecsPorTipo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: validData.map(d => d.nombre_informe),
            datasets: [
                {
                    label: 'Emitidas',
                    data: validData.map(d => d.total_emitidas),
                    backgroundColor: colorEmitidas,
                    borderWidth: 0
                },
                {
                    label: 'Atendidas',
                    data: validData.map(d => d.total_atendidas),
                    backgroundColor: colorAtendidas,
                    borderWidth: 0
                }
            ]
        },
        options: {
            indexAxis: 'y', // <-- [CORRECCIÓN CLAVE] Cambiado a horizontal
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    stacked: false, // Gráfico agrupado
                    beginAtZero: true, 
                    ticks: { precision: 0 } 
                }, 
                y: { stacked: false }
            },
            plugins: {
                legend: { display: true, position: 'top' }, // Mostrar leyenda
                title: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: { label: context => `${context.dataset.label}: ${context.raw}` }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'right', // <-- [CORRECCIÓN CLAVE] Alineado a la derecha
                    offset: 4,
                    color: '#333',
                    font: { weight: 'bold', size: 10 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}


// =============================================================
// == [NUEVO] FUNCIONES PARA COMPARATIVA INSTITUCIONAL (NIVEL RAMO) ==
// =============================================================

/**
 * Helper genérico para crear los gráficos de barras horizontales de la comparativa.
 * @param {string} canvasId - ID del elemento canvas.
 * @param {Chart} chartInstance - Variable (global) que almacena la instancia del gráfico.
 * @param {Array} data - El array de datos (p.ej. data.institution_comparison_stats).
 * @param {string} labelField - La clave del objeto para las etiquetas (p.ej. 'siglas').
 * @param {string} dataField - La clave del objeto para los datos (p.ej. 'sesiones_count').
 * @param {string} chartLabel - Etiqueta para el tooltip (p.ej. 'Sesiones Realizadas').
 * @param {string} color - Color de fondo de la barra.
 * @param {string} borderColor - Color de borde de la barra.
 * @param {string} [suffix=''] - Sufijo para los números (p.ej. '%').
 * @returns {Chart} La nueva instancia del gráfico.
 */

function createHorizontalBarChart(canvasId, chartInstance, data, labelField, dataField, chartLabel, color, borderColor, suffix = '') {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) { 
        console.warn(`[createHorizontalBarChart] Canvas '${canvasId}' no encontrado.`); 
        return null; 
    }
    if (chartInstance) chartInstance.destroy();

    const validData = data.filter(d => d && typeof d[labelField] !== 'undefined' && typeof d[dataField] !== 'undefined');
    
    // Ordenar descendente para que la barra más grande quede arriba
    validData.sort((a, b) => b[dataField] - a[dataField]); 

    if (validData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        console.log(`No hay datos para gráfico ${canvasId}.`);
        return null;
    }

    // --- LÓGICA DE FORMATEO (AHORA EN UNA VARIABLE) ---
    // Esta es la lógica que elimina los ".0" innecesarios
    const formatLabel = (rawValue) => {
        // Convierte a número, formatea a 1 decimal, añade sufijo, y limpia
        return `${Number(rawValue).toFixed(1)}${suffix}`
               .replace('.0%','%')
               .replace('.0','');
    };

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: validData.map(d => d[labelField]),
            datasets: [{
                label: chartLabel,
                data: validData.map(d => d[dataField]),
                backgroundColor: color,
                borderColor: borderColor,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // <-- Gráfico de barras horizontal
            responsive: true, 
            maintainAspectRatio: false,
            scales: { 
                x: { 
                    beginAtZero: true, 
                    ticks: { 
                        precision: 0, 
                        callback: (value) => value + suffix 
                    } 
                } 
            },
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: { 
                    callbacks: { 
                        // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
                        // Ahora el tooltip USA la función de formateo
                        label: (context) => `${context.label}: ${formatLabel(context.raw)}`
                    } 
                },
                datalabels: {
                    anchor: 'end', 
                    align: 'right', 
                    color: '#333',
                    font: { weight: 'bold' },
                    // El datalabel TAMBIÉN usa la función de formateo
                    formatter: (value) => value > 0 ? formatLabel(value) : ''
                }
            }
        }
    });
}


/** Renderiza el gráfico de Sesiones Ordinarias por Institución */
function renderDetalleInstSesionesOrd(data) {
    ddChartInstSesionesOrd = createHorizontalBarChart(
        'dd-chart-inst-sesiones-ord',   // canvasId
        ddChartInstSesionesOrd,         // chartInstance
        data,                           // data
        'siglas',                       // labelField
        'sesiones_ordinarias',          // dataField
        'Sesiones Ordinarias',          // chartLabel
        'rgba(30, 91, 79, 0.7)',        // color
        'rgb(30, 91, 79)'               // borderColor
    );
}

/** Renderiza el gráfico de Sesiones Extraordinarias por Institución */
function renderDetalleInstSesionesExt(data) {
    ddChartInstSesionesExt = createHorizontalBarChart(
        'dd-chart-inst-sesiones-ext',   // canvasId
        ddChartInstSesionesExt,         // chartInstance
        data,                           // data
        'siglas',                       // labelField
        'sesiones_extraordinarias',     // dataField
        'Sesiones Extraordinarias',     // chartLabel
        'rgba(155, 34, 71, 0.7)',       // color (guinda)
        'rgb(155, 34, 71)'              // borderColor
    );
}

/** Renderiza el gráfico de Avance de Recs por Institución */
function renderDetalleInstRecsAvance(data) {
    ddChartInstRecsAvance = createHorizontalBarChart(
        'dd-chart-inst-recs-avance',    // canvasId
        ddChartInstRecsAvance,          // chartInstance
        data,                           // data
        'siglas',                       // labelField
        'recs_avance_pct',              // dataField
        '% Avance Recs',                // chartLabel
        'rgba(97, 18, 50, 0.7)',        // color
        'rgb(97, 18, 50)',              // borderColor
        '%'                             // suffix
    );
}

/** Renderiza el gráfico de Informes por Institución */
function renderDetalleInstInformes(data) {
    ddChartInstInformes = createHorizontalBarChart(
        'dd-chart-inst-informes',       // canvasId
        ddChartInstInformes,            // chartInstance
        data,                           // data
        'siglas',                       // labelField
        'informes_count',               // dataField
        'Informes Entregados',          // chartLabel
        'rgba(165, 127, 44, 0.7)',      // color
        'rgb(165, 127, 44)'             // borderColor
    );
}

// =============================================================
// == [FIN NUEVO BLOQUE] ==
// =============================================================


// -- Funciones Auxiliares para Modales (GLOBALES) --

// Función para renderizar lista de Focos Rojos (Agrupada por Ramo)
function generarListaHtml(dataList) {
    if (!dataList || dataList.length === 0) {
        return '<p>No hay elementos para mostrar.</p>';
    }
    
    let html = `<div style="max-height: 300px; overflow-y: auto; text-align: left; padding: 5px;">`;
    let currentRamo = "";

    // dataList es un array de objetos {nombre_ramo, nombre_institucion}
    // Asumimos que la data ya viene ordenada por Ramo
    dataList.forEach(item => {
        const ramoName = item.nombre_ramo || 'Sin Ramo Asignado';
        const instName = item.nombre_institucion || 'Institución Desconocida';

        // Si el ramo cambia, agregamos el encabezado del ramo
        if (ramoName !== currentRamo) {
            if (currentRamo !== "") {
                html += `</ul>`; // Cierra el <ul> del ramo anterior
            }
            currentRamo = ramoName;
            // Encabezado del Ramo (Guinda)
            html += `<strong style="color:var(--color-gob-vino-oscuro); display: block; margin-top: 10px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">${currentRamo}</strong>
                     <ul style="padding-left: 25px; margin-top: 5px;">`; // Inicia <ul> para las instituciones
        }
        
        // Agrega cada institución como un <li>
        html += `<li style="margin-bottom: 5px;">${instName}</li>`;
    });
    
    html += `</ul></div>`; // Cierra el último <ul> y el div principal
    return html;
}

// Función específica para la tabla de Informes Faltantes (Agrupada por Ramo)
function generarTablaInformesFaltantesHtml(data) {
    if (!data || data.length === 0) {
        return '<p>No hay informes faltantes para mostrar.</p>';
    }

    let html = `<div style="max-height: 300px; overflow-y: auto; text-align: left; padding: 5px;">`;
    let currentRamo = "";
    let currentInst = "";

    // data es array de {nombre_ramo, nombre_institucion, nombre_informe}
    // Asumimos que la data ya viene ordenada por Ramo e Institución desde el SQL
    
    data.forEach((item, index) => {
        const ramoName = item.nombre_ramo || 'Sin Ramo Asignado';
        const instName = item.nombre_institucion || 'Institución Desconocida';
        const informeName = item.nombre_informe || 'Informe Desconocido';

        // 1. Encabezado de Ramo (Guinda)
        if (ramoName !== currentRamo) {
            if (currentRamo !== "") {
                html += `</ul></div>`; // Cierra el <ul> e </div> del grupo de inst. anterior
            }
            currentRamo = ramoName;
            currentInst = ""; // Resetea la institución al cambiar de ramo
            
            html += `<div style="margin-top: 15px; margin-bottom: 5px;">
                        <strong style="color:var(--color-gob-vino-oscuro); display: block; border-bottom: 1px solid #ccc; padding-bottom: 3px;">${currentRamo}</strong>
                     </div>
                     <div style="padding-left: 10px;">`; // Div para el contenido de este ramo
        }

        // 2. Encabezado de Institución (Viñeta)
        if (instName !== currentInst) {
            if (currentInst !== "") {
                html += `</ul>`; // Cierra el <ul> de informes de la inst. anterior
            }
            currentInst = instName;
            
            html += `<p style="margin-top: 10px; margin-bottom: 5px; margin-left: 10px; position: relative; font-weight: bold;">
                        <span style="position: absolute; left: -10px; top: 0; font-size: 1.2em;">&bull;</span>
                        ${instName}
                     </p>
                     <ul style="padding-left: 30px; margin-top: 0; margin-bottom: 5px;">`; // Inicia <ul> para los informes
        }

        // 3. Lista de Informes Faltantes
        html += `<li style="font-size: 0.9em; margin-bottom: 3px;">${informeName}</li>`;
    });

    // 4. Cierre de etiquetas
    html += `</ul></div></div>`; // Cierra el último <ul>, el último div de inst, y el div principal
    return html;
}

// =============================================================
// == NUEVA FUNCION RENDERIZADO DONA AVANCE RECOMENDACIONES ==
// =============================================================

function renderDetalleAvanceDonut(atendidas, emitidas) {
	
	// ---- LOG AÑADIDO ----
    console.log(`[renderDetalleAvanceDonut] Intentando renderizar Donut con Atendidas: ${atendidas}, Emitidas: ${emitidas}`);
    // ---------------------
	
    const ctx = document.getElementById('dd-chart-recs-avance')?.getContext('2d');
    if (!ctx) {
        console.warn("Canvas 'dd-chart-recs-avance' no encontrado.");
        return;
    }
    if (ddChartRecsAvance) ddChartRecsAvance.destroy();

    atendidas = Number(atendidas) || 0;
    emitidas = Number(emitidas) || 0;
    const pendientes = Math.max(0, emitidas - atendidas);
    const avancePct = (emitidas > 0 ? (atendidas / emitidas) * 100 : 0).toFixed(1);

    if (emitidas === 0) {
       ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
       ctx.font = "bold 20px Montserrat";
       ctx.fillStyle = "#adb5bd";
       ctx.textAlign = "center";
       ctx.textBaseline = "middle";
       ctx.fillText("N/A", ctx.canvas.width / 2, ctx.canvas.height / 2);
       return;
    }

    ddChartRecsAvance = new Chart(ctx, {
        type: 'doughnut', // Tipo Dona
        data: {
            labels: ['Atendidas', 'Pendientes'],
            datasets: [{
                data: [atendidas, pendientes],
                backgroundColor: [
                    'rgba(30, 91, 79, 0.8)', // Verde
                    'rgba(220, 53, 69, 0.7)'  // Rojo
                ],
                borderColor: '#fff', // Borde blanco
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%', // Tamaño del agujero de la dona
            plugins: {
                legend: { 
                    display: true,
                    position: 'bottom', // Leyenda abajo
                    labels: { boxWidth: 12, font: { size: 10 } }
                },
                // --- INICIO CORRECCIÓN 1 ---
                // Deshabilitar el TÍTULO estándar (para quitar el % de arriba)
                title: {
                    display: false 
                },
                // --- FIN CORRECCIÓN 1 ---
                tooltip: {
                    callbacks: {
                         label: function(context) {
                             return `${context.label}: ${context.raw}`;
                         }
                    }
                },
                // --- INICIO CORRECCIÓN 2 ---
                // Deshabilitar explícitamente DATALABELS (para quitar el % de las rebanadas)
                datalabels: {
                    display: false
                }
                // --- FIN CORRECCIÓN 2 ---
            }
        },
        // Plugin personalizado para centrar el texto (sin cambios, ya funciona)
        plugins: [{
            id: 'doughnutTextCenter',
            beforeDraw: function(chart) {
                const ctx = chart.ctx;
                const { width, height } = chart.chartArea;
                
                ctx.restore();
                const font = "bold 24px Montserrat"; // Tamaño de fuente
                ctx.font = font;
                ctx.fillStyle = "var(--color-gob-vino-oscuro)"; // Color
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const text = avancePct + '%'; // Usar la variable calculada
                const textX = width / 2;
                const textY = height / 2;

                ctx.fillText(text, textX, textY);
                ctx.save();
            }
        }]
    });
	
	// ---- LOG AÑADIDO (Justo antes del final de la función) ----
    console.log(`[renderDetalleAvanceDonut] ¡Gráfico Dona renderizado (o limpiado si emitidas=0)!`);
    // ---------------------------------------------------------
}

// =============================================================
// == FUNCIÓN DE RENDERIZADO PARA TENDENCIA SESIONES (BASE) ==
// =============================================================
function renderDetalleTendenciaSesiones(data) {
    const ctx = document.getElementById('dd-chart-tendencia-sesiones')?.getContext('2d');
    if (!ctx) return;
    if (ddChartTendenciaSesiones) ddChartTendenciaSesiones.destroy();

    const validData = data.filter(d => d && typeof d.año !== 'undefined');

    if (validData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "bold 16px Montserrat";
        ctx.fillStyle = "#adb5bd";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Sin datos históricos de Sesiones Ordinarias", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    // Rellenar años faltantes con 0 para una línea continua
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 4;
    const labels = [];
    const counts = [];
    const dataMap = new Map(validData.map(d => [d.año, d.sesiones_count]));

    for (let year = minYear; year <= currentYear; year++) {
        labels.push(String(year));
        counts.push(dataMap.get(year) || 0);
    }

    ddChartTendenciaSesiones = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sesiones Ordinarias Realizadas',
                data: counts,
                backgroundColor: 'rgba(97, 18, 50, 0.4)', // Color guinda claro
                borderColor: 'rgb(97, 18, 50)', // Color guinda oscuro
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Año' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Nº Sesiones' },
                    ticks: { precision: 0 }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Sesiones: ${context.raw}`
                    }
                },
                datalabels: {
                    align: 'top',
                    color: 'rgb(97, 18, 50)',
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}

// =============================================================
// == FUNCIÓN DE RENDERIZADO PARA TENDENCIA INFORMES ==
// =============================================================
function renderDetalleTendenciaInformes(data) {
    const ctx = document.getElementById('dd-chart-tendencia-sesiones')?.getContext('2d');
    if (!ctx) return;
    if (ddChartTendenciaSesiones) ddChartTendenciaSesiones.destroy();

    const validData = data.filter(d => d && typeof d.year !== 'undefined');

    if (validData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "bold 16px Montserrat";
        ctx.fillStyle = "#adb5bd";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Sin datos históricos de Informes Entregados", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 4;
    const labels = [];
    const counts = [];
    const dataMap = new Map(validData.map(d => [parseInt(d.year), d.informes_count]));

    for (let year = minYear; year <= currentYear; year++) {
        labels.push(String(year));
        counts.push(dataMap.get(year) || 0);
    }

    ddChartTendenciaSesiones = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Informes Entregados',
                data: counts,
                backgroundColor: 'rgba(30, 91, 79, 0.4)', // Color verde claro
                borderColor: 'rgb(30, 91, 79)', // Color verde oscuro
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Año' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Nº Informes' },
                    ticks: { precision: 0 }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Informes: ${context.raw}`
                    }
                },
                datalabels: {
                    align: 'top',
                    color: 'rgb(30, 91, 79)', // Color del datalabel
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}


// =============================================================
// == FUNCIÓN DE RENDERIZADO PARA TENDENCIA RECOMENDACIONES ==
// =============================================================
function renderDetalleTendenciaRecomendaciones(data) {
    const ctx = document.getElementById('dd-chart-tendencia-sesiones')?.getContext('2d');
    if (!ctx) return;
    if (ddChartTendenciaSesiones) ddChartTendenciaSesiones.destroy();

    const validData = data.filter(d => d && typeof d.year !== 'undefined');

    if (validData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "bold 16px Montserrat";
        ctx.fillStyle = "#adb5bd";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Sin datos históricos de Recomendaciones Emitidas", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 4;
    const labels = [];
    const counts = [];
    const dataMap = new Map(validData.map(d => [parseInt(d.year), d.recomendaciones_count]));

    for (let year = minYear; year <= currentYear; year++) {
        labels.push(String(year));
        counts.push(dataMap.get(year) || 0);
    }

    ddChartTendenciaSesiones = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Recomendaciones Emitidas',
                data: counts,
                backgroundColor: 'rgba(165, 127, 44, 0.4)', // Color ocre claro
                borderColor: 'rgb(165, 127, 44)', // Color ocre oscuro
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Año' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Nº Recomendaciones' },
                    ticks: { precision: 0 }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Recomendaciones: ${context.raw}`
                    }
                },
                datalabels: {
                    align: 'top',
                    color: 'rgb(165, 127, 44)', // Color del datalabel
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}



// == FUNCIÓN DE LÓGICA PARA ALTERNANCIA (TOGGLE) ==
// =============================================================
function setupTendenciaToggle() {
    const btnSesiones = document.getElementById('btn-tendencia-sesiones');
    const btnSesionesExt = document.getElementById('btn-tendencia-sesiones-ext');
    const btnInformes = document.getElementById('btn-tendencia-informes');
    const btnRecomendaciones = document.getElementById('btn-tendencia-recomendaciones'); 
    const btnRecomendacionesAtendidas = document.getElementById('btn-tendencia-recomendaciones-atendidas'); // [NUEVO]
    const titleElement = document.getElementById('dd-tendencia-title');
    
    // Función de alternancia de clases
    const toggleActiveButton = (activeBtn, ...inactiveBtns) => {
        if (activeBtn) activeBtn.classList.replace('btn-secondary', 'btn-primary');
        inactiveBtns.forEach(btn => {
            if (btn) btn.classList.replace('btn-primary', 'btn-secondary');
        });
    };

    // Asignar listeners
    if (btnSesiones) btnSesiones.addEventListener('click', () => {
        toggleActiveButton(btnSesiones, btnSesionesExt, btnInformes, btnRecomendaciones, btnRecomendacionesAtendidas);
        if (titleElement) titleElement.textContent = 'Tendencia Anual: Sesiones Ordinarias';
        renderDetalleTendenciaSesiones(ddTendenciaSesionesData);
    });
    
    if (btnSesionesExt) btnSesionesExt.addEventListener('click', () => {
        toggleActiveButton(btnSesionesExt, btnSesiones, btnInformes, btnRecomendaciones, btnRecomendacionesAtendidas);
        if (titleElement) titleElement.textContent = 'Tendencia Anual: Sesiones Extraordinarias';
        renderDetalleTendenciaSesionesExt(ddTendenciaSesionesExtData);
    });
    
    if (btnInformes) btnInformes.addEventListener('click', () => {
        toggleActiveButton(btnInformes, btnSesiones, btnSesionesExt, btnRecomendaciones, btnRecomendacionesAtendidas);
        if (titleElement) titleElement.textContent = 'Tendencia Anual: Informes Entregados';
        renderDetalleTendenciaInformes(ddTendenciaInformesData);
    });
    
    if (btnRecomendaciones) btnRecomendaciones.addEventListener('click', () => {
        toggleActiveButton(btnRecomendaciones, btnSesiones, btnSesionesExt, btnInformes, btnRecomendacionesAtendidas);
        if (titleElement) titleElement.textContent = 'Tendencia Anual: Recomendaciones Emitidas';
        renderDetalleTendenciaRecomendaciones(ddTendenciaRecomendacionesData);
    });

    // [NUEVO] Listener para Recomendaciones Atendidas
    if (btnRecomendacionesAtendidas) btnRecomendacionesAtendidas.addEventListener('click', () => {
        toggleActiveButton(btnRecomendacionesAtendidas, btnSesiones, btnSesionesExt, btnInformes, btnRecomendaciones);
        if (titleElement) titleElement.textContent = 'Tendencia Anual: Recomendaciones Atendidas';
        renderDetalleTendenciaRecomendacionesAtendidas(ddTendenciaRecomendacionesAtendidasData);
    });
}


function mostrarDetalleModal(title, contentHtml) {
    const modal = document.getElementById('confirm-modal');
    const modalTitle = document.getElementById('confirm-title');
    const modalBody = document.getElementById('confirm-body');
    const okButton = document.getElementById('confirm-ok-btn');
    const cancelButton = document.getElementById('confirm-cancel-btn');

    if (modal && modalTitle && modalBody && okButton && cancelButton) {
        modalTitle.textContent = title;
        modalBody.innerHTML = contentHtml;
        okButton.style.display = 'none';
        cancelButton.textContent = 'Cerrar';
        cancelButton.classList.remove('btn-secondary');
        cancelButton.classList.add('btn-primary');
        modal.style.display = 'flex';

        const closeHandler = () => {
            modal.style.display = 'none';
            okButton.style.display = 'inline-block';
            cancelButton.textContent = 'Cancelar';
            cancelButton.classList.remove('btn-primary');
            cancelButton.classList.add('btn-secondary');
            // No es necesario removeEventListener si se usa { once: true }
        };
        
        // Quitar listener anterior por si acaso, luego añadir el nuevo
        cancelButton.removeEventListener('click', closeHandler); // Limpia por si acaso
        cancelButton.addEventListener('click', closeHandler, { once: true });

    } else {
        console.error("Elementos del modal para mostrar detalles no encontrados!");
        alert(`${title}\n\n(Error al mostrar detalles en modal)`);
    }
}


// =============================================================
// == FUNCIONES DE RENDERIZADO PARA TENDENCIA SESIONES (BASE) ==
// =============================================================
function renderDetalleTendenciaSesiones(data) {
    const ctx = document.getElementById('dd-chart-tendencia-sesiones')?.getContext('2d');
    if (!ctx) return;
    if (ddChartTendenciaSesiones) ddChartTendenciaSesiones.destroy();

    const validData = data.filter(d => d && typeof d.año !== 'undefined');

    if (validData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "bold 16px Montserrat";
        ctx.fillStyle = "#adb5bd";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Sin datos históricos de Sesiones Ordinarias", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    // Rellenar años faltantes con 0 para una línea continua
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 4;
    const labels = [];
    const counts = [];
    const dataMap = new Map(validData.map(d => [d.año, d.sesiones_count]));

    for (let year = minYear; year <= currentYear; year++) {
        labels.push(String(year));
        counts.push(dataMap.get(year) || 0);
    }

    ddChartTendenciaSesiones = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sesiones Ordinarias Realizadas',
                data: counts,
                backgroundColor: 'rgba(97, 18, 50, 0.4)', // Color guinda claro
                borderColor: 'rgb(97, 18, 50)', // Color guinda oscuro
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Año' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Nº Sesiones' },
                    ticks: { precision: 0 }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Sesiones: ${context.raw}`
                    }
                },
                datalabels: {
                    align: 'top',
                    color: 'rgb(97, 18, 50)',
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}

// =============================================================
// == FUNCIÓN DE RENDERIZADO PARA TENDENCIA INFORMES ==
// =============================================================
function renderDetalleTendenciaInformes(data) {
    const ctx = document.getElementById('dd-chart-tendencia-sesiones')?.getContext('2d');
    if (!ctx) return;
    if (ddChartTendenciaSesiones) ddChartTendenciaSesiones.destroy();

    const validData = data.filter(d => d && typeof d.year !== 'undefined');

    if (validData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "bold 16px Montserrat";
        ctx.fillStyle = "#adb5bd";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Sin datos históricos de Informes Entregados", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 4;
    const labels = [];
    const counts = [];
    const dataMap = new Map(validData.map(d => [parseInt(d.year), d.informes_count]));

    for (let year = minYear; year <= currentYear; year++) {
        labels.push(String(year));
        counts.push(dataMap.get(year) || 0);
    }

    ddChartTendenciaSesiones = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Informes Entregados',
                data: counts,
                backgroundColor: 'rgba(30, 91, 79, 0.4)', // Color verde claro
                borderColor: 'rgb(30, 91, 79)', // Color verde oscuro
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Año' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Nº Informes' },
                    ticks: { precision: 0 }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Informes: ${context.raw}`
                    }
                },
                datalabels: {
                    align: 'top',
                    color: 'rgb(30, 91, 79)', // Color del datalabel
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}


// =============================================================
// == FUNCIÓN DE RENDERIZADO PARA TENDENCIA RECOMENDACIONES ==
// =============================================================
function renderDetalleTendenciaRecomendaciones(data) {
    const ctx = document.getElementById('dd-chart-tendencia-sesiones')?.getContext('2d');
    if (!ctx) return;
    if (ddChartTendenciaSesiones) ddChartTendenciaSesiones.destroy();

    const validData = data.filter(d => d && typeof d.year !== 'undefined');

    if (validData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "bold 16px Montserrat";
        ctx.fillStyle = "#adb5bd";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Sin datos históricos de Recomendaciones Emitidas", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 4;
    const labels = [];
    const counts = [];
    const dataMap = new Map(validData.map(d => [parseInt(d.year), d.recomendaciones_count]));

    for (let year = minYear; year <= currentYear; year++) {
        labels.push(String(year));
        counts.push(dataMap.get(year) || 0);
    }

    ddChartTendenciaSesiones = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Recomendaciones Emitidas',
                data: counts,
                backgroundColor: 'rgba(165, 127, 44, 0.4)', // Color ocre claro
                borderColor: 'rgb(165, 127, 44)', // Color ocre oscuro
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Año' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Nº Recomendaciones' },
                    ticks: { precision: 0 }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Recomendaciones: ${context.raw}`
                    }
                },
                datalabels: {
                    align: 'top',
                    color: 'rgb(165, 127, 44)', // Color del datalabel
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}



// =============================================================
// == [NUEVA] FUNCIÓN DE RENDERIZADO PARA TENDENCIA RECS ATENDIDAS ==
// =============================================================
function renderDetalleTendenciaRecomendacionesAtendidas(data) {
    const ctx = document.getElementById('dd-chart-tendencia-sesiones')?.getContext('2d');
    if (!ctx) return;
    if (ddChartTendenciaSesiones) ddChartTendenciaSesiones.destroy();

    const validData = data.filter(d => d && typeof d.year !== 'undefined');

    if (validData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "bold 16px Montserrat";
        ctx.fillStyle = "#adb5bd";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Sin datos históricos de Recomendaciones Atendidas", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 4;
    const labels = [];
    const counts = [];
    const dataMap = new Map(validData.map(d => [parseInt(d.year), d.recomendaciones_count]));

    for (let year = minYear; year <= currentYear; year++) {
        labels.push(String(year));
        counts.push(dataMap.get(year) || 0);
    }

    ddChartTendenciaSesiones = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Recomendaciones Atendidas',
                data: counts,
                backgroundColor: 'rgba(30, 91, 79, 0.4)', // Color verde (consistente con "Atendidas")
                borderColor: 'rgb(30, 91, 79)', // Color verde
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Año' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Nº Recomendaciones' },
                    ticks: { precision: 0 }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Atendidas: ${context.raw}`
                    }
                },
                datalabels: {
                    align: 'top',
                    color: 'rgb(30, 91, 79)', // Color del datalabel
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}



// --- Función auxiliar GLOBAL para configurar botones de detalle ---
const setupDetailButton = (button, dataArray, title, contentGenerator) => {
    if (!button) {
        console.warn(`setupDetailButton: Botón no encontrado para ${title}`);
        return;
    }
    const newButton = button.cloneNode(true); // Clonar para limpiar listeners
    const isDisabled = !dataArray || dataArray.length === 0;
    newButton.disabled = isDisabled;

     if (!isDisabled) {
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log(`Botón Detalle '${title}' clickeado.`); // DEBUG
            mostrarDetalleModal(title, contentGenerator(dataArray));
        });
     }
    button.parentNode.replaceChild(newButton, button); // Reemplazar en el DOM
};

// =============================================================
// =================== MÓDULO DE REPORTERÍA (AUDITORÍA) ====================
// =============================================================

// --- Almacenamiento de datos crudos para el módulo ---
let reporteBitacoraInformesData = [];
let reporteRecomendacionesData = [];
let reporteCumplimientoData = [];
let reporteActividadData = [];

// --- Estado actual de la UI ---
// 'modoReporteriaActual' eliminado ya que solo existe modo datos.
let tabReporteriaActual = 'bitacora-informes'; // 

/**
 * Inicializa el módulo de Reportería (Solo Datos/Auditoría)
 */
function initReporteriaModule() {
    console.log("Inicializando Módulo Reportería (Modo Auditoría)...");

    // 1. Configurar los filtros globales
    setupCascadingFilters({
        baseName: 'rep-filtro',
        year: true,
        callback: cargarDatosReporteria
    });

    // 2. Configurar botones exportación
    // (Nota: Se eliminó el botón PDF y los toggles de vista)
    const btnExcel = document.getElementById('btn-export-excel-bimodal');
    if (btnExcel) btnExcel.addEventListener('click', exportarReporteExcel_Bimodal);

    // 3. LÓGICA DE PESTAÑAS (TABS)
    const tabLinks = document.querySelectorAll('#reporteria-tabs .nav-link');
    const tabPanes = document.querySelectorAll('#reporteria-tab-content .tab-pane');

    const hideAllTabs = () => {
        tabLinks.forEach(link => link.classList.remove('active'));
        tabPanes.forEach(pane => {
            pane.classList.remove('show', 'active');
            pane.style.display = 'none';
        });
    };

    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const targetId = link.getAttribute('href'); // ej: #rep-content-cumplimiento
            
            hideAllTabs();
            link.classList.add('active');

            const targetPane = document.querySelector(targetId);
            if (targetPane) {
                targetPane.classList.add('show', 'active');
                targetPane.style.display = 'block';
            }

            // Actualizar estado global para exportación
            const nombreTab = targetId.replace('#rep-content-', '');
            setTabActiva(nombreTab);
			
			// [UX] Si es la pestaña de balance, mostrar notificación de "Listo para exportar"
            if (nombreTab === 'balance' && (!reporteBalanceDataGlobal || Object.keys(reporteBalanceDataGlobal).length === 0)) {
                 // Opcional: Si está vacío, no hacer nada, pero si ya hay datos, el botón ya sirve.
			}
        });
    });
    
    // 4. Inicialización: Forzar clic en la primera pestaña
    if (tabLinks.length > 0) {
        setTimeout(() => {
            hideAllTabs();
            const firstTab = document.getElementById('rep-tab-bitacora-informes');
            if (firstTab) firstTab.click();
        }, 100);
    }
}

/**
 * Almacena qué pestaña está activa para saber qué exportar
 */
function setTabActiva(tabNombre) {
    tabReporteriaActual = tabNombre;
    console.log(`Pestaña activa de reportería: ${tabNombre}`);
}

/**
 * Función principal: Obtiene los datos de los 3 endpoints basados en filtros
 */
/**
 * Función principal: Obtiene los datos de los 4 endpoints basados en filtros
 */
async function cargarDatosReporteria() {
    const reporteriaSection = document.getElementById('section-reporteria');
    if (reporteriaSection && reporteriaSection.classList.contains('hidden')) {
        return; 
    }
    
    const año = document.getElementById('rep-filtro-año').value;
    const dgId = document.getElementById('rep-filtro-dg').value;
    const ramoId = document.getElementById('rep-filtro-ramo').value;
    const responsableId = document.getElementById('rep-filtro-responsable').value;
    const institucionId = document.getElementById('rep-filtro-institucion').value;

    if (!año || !dgId) {
        showNotification("Por favor, seleccione al menos Año y DG para generar el reporte.", "error");
        return;
    }
    
    showNotification("Cargando datos de auditoría y balance...", "success");
    
    // Indicador visual de carga en las tablas (Añadido el contenedor de la nueva bitácora)
    ['rep-rec-tabla-container', 'rep-bitacora-informes-tabla-container', 'rep-comp-tabla-container', 'rep-act-tabla-container', 'rep-balance-container'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = '<p style="text-align:center; padding:20px;">Cargando datos...</p>';
    });

    const params = new URLSearchParams();
    params.append('año', año);
    params.append('id_dg', dgId);
    if (ramoId) params.append('id_ramo', ramoId);
    if (responsableId) params.append('responsable_id', responsableId);
    if (institucionId) params.append('institucion_id', institucionId);
    
    const queryString = params.toString();

    try {
        // --- CORRECCIÓN AQUÍ: Declaramos explícitamente las 5 variables en el array const [...] ---
        const [recData, bitacoraInfData, compData, actData, balanceData] = await Promise.all([
            fetchAPI(`/api/reportes/recomendaciones_full?${queryString}`),
            fetchAPI(`/api/reportes/bitacora_full?${queryString}`), // <--- Nuevo Endpoint
            fetchAPI(`/api/reportes/cumplimiento_full?${queryString}`),
            fetchAPI(`/api/reportes/actividad_full?${queryString}`),
            fetchAPI(`/api/reportes/balance_anual?${queryString}`)
        ]);

        // Asignación a variables globales
        reporteRecomendacionesData = recData || [];
        reporteBitacoraInformesData = bitacoraInfData || []; // <--- Ahora bitacoraInfData YA EXISTE y no dará error
        reporteCumplimientoData = compData || [];
        reporteActividadData = actData || [];
        
        const reporteBalanceData = balanceData || {};
        reporteBalanceDataGlobal = reporteBalanceData;

        // Renderizar Tablas
        renderReporteRecomendaciones();
        renderReporteBitacoraInformes(); // <--- Renderizado de la nueva pestaña
        renderReporteCumplimiento();
        renderReporteActividad();
        
        // Renderizar Ficha Técnica (Balance)
        renderReporteBalanceAnual(reporteBalanceData);
        
        showNotification("Datos actualizados correctamente.", "success");

    } catch (error) {
        console.error("Error al cargar datos de reportería:", error);
        showNotification(`Error: ${error.message}`, "error");
        
        // Limpiar visualmente en caso de error
        const balanceContainer = document.getElementById('rep-balance-container');
        if (balanceContainer) balanceContainer.innerHTML = `<p style="color:red; text-align:center;">Error al cargar: ${error.message}</p>`;
    }
}

// 1. RENDERIZADO: PESTAÑA RECOMENDACIONES (Solo Tabla)
function renderReporteRecomendaciones() {
    if (!reporteRecomendacionesData) reporteRecomendacionesData = [];
    renderTablaDatos('rep-rec-tabla-container', reporteRecomendacionesData);
}

// 2. RENDERIZADO: PESTAÑA CUMPLIMIENTO (Solo Tabla)
function renderReporteCumplimiento() {
    if (!reporteCumplimientoData) reporteCumplimientoData = [];
    renderTablaDatos('rep-comp-tabla-container', reporteCumplimientoData);
}

// 3. RENDERIZADO: PESTAÑA ACTIVIDAD (Solo Tabla)
function renderReporteActividad() {
    if (!reporteActividadData) reporteActividadData = [];
    renderTablaDatos('rep-act-tabla-container', reporteActividadData);
}

// RENDERIZADO: PESTAÑA BITÁCORA DE INFORMES (Auditoría) - CORREGIDO
function renderReporteBitacoraInformes() {
    if (!reporteBitacoraInformesData) reporteBitacoraInformesData = [];
    const container = document.getElementById('rep-bitacora-informes-tabla-container');
    if (!container) return;

    container.innerHTML = '';

    // 1. Contador de Registros
    const total = reporteBitacoraInformesData.length;
    const counterDiv = document.createElement('div');
    counterDiv.style.cssText = 'padding: 10px 0; font-weight: bold; color: var(--color-gob-vino-oscuro); font-size: 1.1em;';
    counterDiv.textContent = `Total de Informes Entregados: ${total}`;
    container.appendChild(counterDiv);

    if (total === 0) {
        container.innerHTML += '<p style="padding:10px; color:#666; font-style:italic; border:1px solid #eee;">No se encontraron informes.</p>';
        return;
    }

    // 2. Construcción de Tabla
    let html = '<div style="overflow-x: auto; border: 1px solid #ddd; border-radius: 4px;"><table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">';
    html += `
        <thead>
            <tr style="background-color: #f2f2f2;">
                <th style="padding:10px;">DG</th>
                <th style="padding:10px;">Ramo</th> <th style="padding:10px;">Institución</th>
                <th style="padding:10px;">Tipo Informe</th>
                <th style="padding:10px;">Periodo</th>
                <th style="padding:10px;">Fecha Entrega</th>
                <th style="padding:10px; text-align:center;">Recs. Emitidas</th>
                <th style="padding:10px; text-align:center;">Recs. Atendidas</th>
            </tr>
        </thead>
        <tbody>
    `;

    reporteBitacoraInformesData.forEach((row, index) => {
        const bg = index % 2 === 0 ? '#fff' : '#f9f9f9';
        
        // CORRECCIÓN FECHA: Uso nativo de Date() con zona horaria UTC para evitar desfases
        let fechaFormatted = '<span style="color:#999; font-style:italic;">N/A</span>';
        if (row.fecha_informe) {
            fechaFormatted = new Date(row.fecha_informe).toLocaleDateString('es-MX', { timeZone: 'UTC' });
        }

        html += `
            <tr style="background-color: ${bg}; border-bottom: 1px solid #eee;">
                <td style="padding:8px;">${row.siglas_dg || ''}</td>
                <td style="padding:8px;">${row.nombre_ramo || ''}</td> <td style="padding:8px;">${row.siglas_institucion || row.nombre_institucion}</td>
                <td style="padding:8px;">${row.tipo_informe || ''}</td>
                <td style="padding:8px;">${row.periodo_reportado || ''}</td>
                <td style="padding:8px;">${fechaFormatted}</td>
                <td style="padding:8px; text-align:center; font-weight:bold;">${row.recs_emitidas}</td>
                <td style="padding:8px; text-align:center; color:var(--color-gob-verde); font-weight:bold;">${row.recs_atendidas}</td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    container.innerHTML += html;
}


/**
 * Helper genérico para renderizar tablas de datos (REQUERIDO - VERSIÓN AUDITORÍA)
 * - Incluye contador de registros.
 * - Manejo estricto de nulos (N/A).
 */
function renderTablaDatos(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Limpiar el contenedor antes de renderizar
    container.innerHTML = '';

    // 1. Agregar Contador de Registros (Requerimiento de Auditoría)
    const totalRegistros = data ? data.length : 0;
    const counterDiv = document.createElement('div');
    counterDiv.style.cssText = 'padding: 10px 0; font-weight: bold; color: var(--color-gob-vino-oscuro); font-size: 1.1em;';
    counterDiv.textContent = `Total de registros encontrados: ${totalRegistros}`;
    container.appendChild(counterDiv);

    if (!data || data.length === 0) {
        const msg = document.createElement('p');
        msg.style.cssText = 'padding: 10px; color: #666; font-style: italic; border: 1px solid #eee; background: #fff;';
        msg.textContent = 'No se encontraron datos para los filtros seleccionados.';
        container.appendChild(msg);
        return;
    }

    const firstRow = data[0];
    let columnsToShow = [];

    // --- AUTO-DETECCIÓN DE COLUMNAS SEGÚN TIPO DE DATO ---

    // 1. RECOMENDACIONES (Auditoría Detallada)
    if ('id_recomendacion' in firstRow) {
        columnsToShow = [
            { key: 'siglas_dg', label: 'DG' },
            { key: 'nombre_ramo', label: 'Ramo' },
            { key: 'nombre_institucion', label: 'Institución' },
            { key: 'siglas_institucion', label: 'Siglas' },
            { key: 'nombre_responsable', label: 'Responsable' },
            { key: 'id_recomendacion', label: 'ID' },
            { key: 'fecha_emision', label: 'Fecha Emisión' },
            { key: 'nombre_organo', label: 'Órgano Colegiado' },
            { key: 'origen', label: 'Tipo Informe' }, 
            { key: 'descripcion', label: 'Descripción' },
            { key: 'estatus', label: 'Estatus' },
            { key: 'prioridad', label: 'Prioridad' },
            { key: 'tipo_recomendacion', label: 'Tipo' },
            { key: 'area_responsable_atencion', label: 'Área Responsable' },
            { key: 'fecha_compromiso', label: 'Fecha Compromiso' }
        ];
    } 
    // 2. ACTIVIDAD (SESIONES)
    else if ('id_sesion' in firstRow) {
        columnsToShow = [
            { key: 'siglas_dg', label: 'DG' },
            { key: 'nombre_ramo', label: 'Ramo' },
            { key: 'nombre_institucion', label: 'Institución' },
            { key: 'siglas_institucion', label: 'Siglas' },
            { key: 'nombre_responsable', label: 'Responsable' },
            { key: 'nombre_organo', label: 'Órgano Colegiado' },
            { key: 'tipo_sesion', label: 'Tipo Sesión' },
            { key: 'año', label: 'Año' },
            { key: 'numero_ordinal', label: 'No.' },
            { key: 'nombre_oficial_sesion', label: 'Nombre Oficial' },
            { key: 'estatus', label: 'Estatus' },
            { key: 'fecha_realizada', label: 'Fecha Realizada' },
            { key: 'fecha_programada', label: 'Fecha Programada' }
        ];
    }
    // 3. CUMPLIMIENTO (ACTIVIDAD TOTAL)
    else if ('sesiones_realizadas' in firstRow) {
        columnsToShow = [
            { key: 'siglas_dg', label: 'DG' },
            { key: 'nombre_ramo', label: 'Ramo' },
            { key: 'nombre_institucion', label: 'Institución' },
            { key: 'siglas_institucion', label: 'Siglas' },
            { key: 'nombre_responsable', label: 'Responsable' },
            { key: 'sesiones_realizadas', label: 'Sesiones Ord. Realizadas' },
            { key: 'sesiones_extraordinarias', label: 'Sesiones Ext. Realizadas' },
            { key: 'informes_entregados', label: 'Informes Entregados' }
        ];
    }
    // Fallback genérico
    else {
         Object.keys(firstRow).forEach(key => {
            if (!key.includes('hidden')) columnsToShow.push({ key: key, label: key });
        });
    }
    
    let html = '<div style="overflow-x: auto; border: 1px solid #ddd; border-radius: 4px;"><table style="width: 100%; border-collapse: collapse; font-size: 0.85em; min-width: 1000px;">';
    
    // HEADER
    html += '<thead><tr style="background-color: #f2f2f2; text-align: left;">';
    columnsToShow.forEach(col => {
        html += `<th style="padding: 10px; border-bottom: 2px solid #ddd; border-right: 1px solid #eee; color: #333; white-space: nowrap;">${col.label}</th>`;
    });
    html += '</tr></thead>';

    // BODY
    html += '<tbody>';
    data.forEach((row, index) => {
        const bg = index % 2 === 0 ? '#fff' : '#f9f9f9';
        html += `<tr style="background-color: ${bg}; border-bottom: 1px solid #eee;">`;
        
        columnsToShow.forEach(col => {
            let val = row[col.key];
            
            // 1. Manejo estricto de Nulos/Vacíos (REQUERIMIENTO DE AUDITORÍA)
            // Se añade chequeo explícito de null, undefined, string vacío o guión simple.
            if (val === null || val === undefined || val === '' || (typeof val === 'string' && val.trim() === '-')) {
                val = '<span style="color: #999; font-style: italic; font-weight: 500;">N/A</span>';
            } 
            // 2. Manejo de Fechas
            else if (col.key.includes('fecha') && typeof val === 'string') {
                // Intentar detectar formato ISO o timestamp
                if(val.includes('GMT') || val.includes('T')) {
                   try { val = new Date(val).toISOString().split('T')[0]; } catch(e){}
                }
                // Formato YYYY-MM-DD a DD/MM/YYYY
                if (val.match(/^\d{4}-\d{2}-\d{2}/)) {
                    const parts = val.split('T')[0].split('-');
                    val = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }
            
            // Limitar descripciones largas visualmente (tooltip mantiene texto completo)
            if (col.key === 'descripcion' && typeof val === 'string' && val.length > 60 && !val.includes('<span')) {
                val = `<span title="${val.replace(/"/g, '&quot;')}">${val.substring(0, 60)}...</span>`;
            }

            html += `<td style="padding: 8px 10px; border-right: 1px solid #eee; color: #555;">${val}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';

    // Inyectar la tabla debajo del contador
    const tableContainer = document.createElement('div');
    tableContainer.innerHTML = html;
    container.appendChild(tableContainer);
}


/**
 * Exporta los datos crudos de la pestaña activa a Excel.
 */
function exportarReporteExcel_Bimodal() {
    if (typeof XLSX === 'undefined') {
        showNotification("Librería Excel no cargada.", "error");
        return;
    }

    let rawData = [];
    let fileName = "Reporte_Datos";
    let columnConfig = [];
    let isBalanceMode = false; // Bandera clave para evitar el procesado estándar

    // 1. PREPARACIÓN DE DATOS SEGÚN PESTAÑA
    switch (tabReporteriaActual) {
        
		case 'balance':
            isBalanceMode = true;
            fileName = "Balance_Anual_Resultados";
            const d = (typeof reporteBalanceDataGlobal !== 'undefined') ? reporteBalanceDataGlobal : {};

            // Cálculos de totales parciales
            const totalCocodi = Number(d.ses_ord_cocodi || 0) + Number(d.ses_ext_cocodi || 0);
            const totalGobierno = Number(d.ses_ord_gobierno || 0) + Number(d.ses_ext_gobierno || 0);

            // CONSTRUCCIÓN MANUAL DE FILAS (Replicando Imagen 2)
            rawData = [
                // FILA 1: Encabezados Principales (B1 y C1 vacíos como pediste)
                { colA: "Concepto", colB: "", colC: "", colD: "Total" },

                // --- SECCIÓN I ---
                { colA: "I. RESUMEN DE SESIONES" },
                { colA: "Total de Sesiones Realizadas", colD: d.total_sesiones },
                { colA: "Sesiones Ordinarias", colD: d.total_sesiones_ord },
                { colA: "Sesiones Extraordinarias", colD: d.total_sesiones_ext },
                { colA: "" }, // Espacio vacío

                // --- SECCIÓN II: COCODI ---
                { colA: "II. DESGLOSE SESIONES POR NATURALEZA" }, // Título corregido
                { colA: "COCODI", colD: totalCocodi },             // Título Izq, Total Der (D8)
                { colA: "Ordinarias", colD: d.ses_ord_cocodi },    // A9, D9
                { colA: "Extraordinarias", colD: d.ses_ext_cocodi }, // A10, D10
                
                // Sub-encabezados para la tabla de naturaleza (A11 - B11 - C11 - D11)
                { colA: "", colB: "Ordinarias", colC: "Extraordinarias", colD: "Total" },
                
                // Filas de Naturaleza (A12...)
                { colA: "Dependencias", colB: d.cocodi_dep_ord, colC: d.cocodi_dep_ext, colD: d.cocodi_dep_total },
                { colA: "Desconcentrados", colB: d.cocodi_desc_ord, colC: d.cocodi_desc_ext, colD: d.cocodi_desc_total },
                { colA: "Entidades (Paraestatales)", colB: d.cocodi_ent_ord, colC: d.cocodi_ent_ext, colD: d.cocodi_ent_total },
                { colA: "Intersecretarial", colB: d.cocodi_otros_ord, colC: d.cocodi_otros_ext, colD: d.cocodi_otros_total },
                
                { colA: "" }, // Espacio

                // --- SECCIÓN III: GOBIERNO ---
                { colA: "III. DESGLOSE SESIONES POR NATURALEZA" }, // Título corregido
                { colA: "ÓRGANOS DE GOBIERNO", colD: totalGobierno }, // A16, D16
                { colA: "Ordinarias", colD: d.ses_ord_gobierno },
                { colA: "Extraordinarias", colD: d.ses_ext_gobierno },
                
                // Sub-encabezados
                { colA: "", colB: "Ordinarias", colC: "Extraordinarias", colD: "Total" },
                
                // Filas de Naturaleza
                { colA: "Dependencias", colB: d.gob_dep_ord, colC: d.gob_dep_ext, colD: d.gob_dep_total },
                { colA: "Desconcentrados", colB: d.gob_desc_ord, colC: d.gob_desc_ext, colD: d.gob_desc_total },
                { colA: "Entidades (Paraestatales)", colB: d.gob_ent_ord, colC: d.gob_ent_ext, colD: d.gob_ent_total },
                { colA: "Intersecretarial", colB: d.gob_otros_ord, colC: d.gob_otros_ext, colD: d.gob_otros_total },

                { colA: "" }, // Espacio

                // --- SECCIÓN IV: RECOMENDACIONES ---
                { colA: "IV. SEGUIMIENTO DE ACUERDOS Y RECOMENDACIONES" },
                { colA: "Total Recomendaciones Emitidas", colD: d.recs_total_emitidas },
                { colA: "   En COCODI", colD: d.recs_cocodi_emitidas },
                { colA: "   En Órgano de Gobierno", colD: d.recs_gob_emitidas },
                { colA: "" },
                { colA: "Total Recomendaciones Atendidas", colD: d.recs_total_atendidas },
                { colA: "   En COCODI", colD: d.recs_cocodi_atendidas },
                { colA: "   En Órgano de Gobierno", colD: d.recs_gob_atendidas }
            ];
            break;
			
		case 'bitacora-informes':
             rawData = reporteBitacoraInformesData;
             fileName = "Bitacora_Informes_Entregados";
             columnConfig = [ 
                { key: 'siglas_dg', label: 'DG' }, 
                { key: 'nombre_ramo', label: 'Ramo' }, // <-- AGREGADO A EXCEL
                { key: 'nombre_institucion', label: 'Institución' }, 
                { key: 'tipo_informe', label: 'Tipo Informe' }, 
                { key: 'periodo_reportado', label: 'Periodo' }, 
                { key: 'fecha_informe', label: 'Fecha Entrega' },
                { key: 'recs_emitidas', label: 'Recs Emitidas' },
                { key: 'recs_atendidas', label: 'Recs Atendidas' }
             ];
             break;

        case 'recomendaciones':
             rawData = reporteRecomendacionesData;
             fileName = "Recomendaciones_SSOT";
             columnConfig = [ 
                { key: 'siglas_dg', label: 'DG' }, { key: 'nombre_ramo', label: 'Ramo' }, { key: 'nombre_institucion', label: 'Institución' }, { key: 'id_recomendacion', label: 'ID' }, { key: 'fecha_emision', label: 'Fecha Emisión' }, { key: 'descripcion', label: 'Descripción' }, { key: 'estatus', label: 'Estatus' }
             ];
             break;

        case 'cumplimiento':
             rawData = reporteCumplimientoData;
             fileName = "Cumplimiento_Normativo";
             columnConfig = [ 
                 { key: 'siglas_dg', label: 'DG' }, { key: 'nombre_institucion', label: 'Institución' }, { key: 'sesiones_realizadas', label: 'Sesiones Ord.' }, { key: 'sesiones_extraordinarias', label: 'Sesiones Ext.' }, { key: 'informes_entregados', label: 'Informes' }
             ];
             break;

        case 'actividad':
             rawData = reporteActividadData;
             fileName = "Bitacora_Sesiones";
             columnConfig = [ 
                { key: 'siglas_dg', label: 'DG' }, { key: 'nombre_institucion', label: 'Institución' }, { key: 'nombre_organo', label: 'Órgano' }, { key: 'tipo_sesion', label: 'Tipo' }, { key: 'fecha_realizada', label: 'Fecha' }
             ];
             break;

        default:
            showNotification("Pestaña desconocida o sin datos.", "error");
            return;
    }

    // Verificación de seguridad
    if (!rawData || rawData.length === 0) {
        showNotification("No hay datos para exportar en esta vista.", "error");
        return;
    }

    // 2. GENERACIÓN DEL ARCHIVO EXCEL
    try {
        let processedData;

        if (isBalanceMode) {
            processedData = rawData;
        } else {
            processedData = rawData.map(row => {
                const newRow = {};
                columnConfig.forEach(col => {
                    let val = row[col.key];
                    
                    // Manejo de Nulos
                    if (val === null || val === undefined || val === '') {
                        val = 'N/A';
                    } 
                    // --- CORRECCIÓN DE FECHAS PARA EXCEL ---
                    // Detectamos si la columna es de fecha y formateamos explícitamente a DD/MM/YYYY
                    else if (col.key.includes('fecha') && val) {
                        try {
                            const dateObj = new Date(val);
                            if (!isNaN(dateObj.getTime())) {
                                // Usamos UTC para asegurar consistencia
                                const day = String(dateObj.getUTCDate()).padStart(2, '0');
                                const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
                                const year = dateObj.getUTCFullYear();
                                val = `${day}/${month}/${year}`;
                            } else {
                                // Si falla el parsing, dejamos el string original o intentamos limpiar
                                if (typeof val === 'string') val = val.split('T')[0]; 
                            }
                        } catch(e) {
                            console.warn("Error formateando fecha para Excel", e);
                        }
                    }
                    
                    newRow[col.label] = val;
                });
                return newRow;
            });
        }

        const worksheet = XLSX.utils.json_to_sheet(processedData);
        
        if (isBalanceMode) {
            worksheet['!cols'] = [{ wch: 50 }, { wch: 25 }]; 
        } else {
            worksheet['!cols'] = columnConfig.map(() => ({ wch: 20 }));
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
        
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
        
        showNotification("Exportación a Excel completada.", "success");

    } catch (error) {
        console.error("Error al exportar excel:", error);
        showNotification("Error al generar el archivo Excel.", "error");
    }
}
// =============================================================
// =================== FIN MÓDULO DE REPORTERÍA =================
// =============================================================


// =============================================================
// ================= MÓDULO DE CARGA MASIVA ====================
// =============================================================

function initCargaMasivaModule() {
    const form = document.getElementById('bulk-upload-form');
    const fileInput = document.getElementById('bulk-upload-file-input');
    const submitBtn = document.getElementById('bulk-upload-submit-btn');
    const resultArea = document.getElementById('bulk-upload-result-area');
    const statusDiv = document.getElementById('bulk-upload-status');

    if (!form) return;

    // Habilitar el botón solo si hay un archivo seleccionado
    fileInput.addEventListener('change', () => {
        submitBtn.disabled = !fileInput.files || fileInput.files.length === 0;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!fileInput.files || fileInput.files.length === 0) {
            showNotification('Por favor, seleccione un archivo.', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando...';
        resultArea.classList.remove('hidden');
        statusDiv.innerHTML = `<p>Enviando y procesando el archivo. Esto puede tardar unos momentos...</p>`;
        resultArea.style.backgroundColor = '#f8f9fa'; // Estilo neutral

        const formData = new FormData(form);

        try {
            const response = await fetchAPI('/api/bulk-upload', {
                method: 'POST',
                body: formData
            });

            statusDiv.innerHTML = `<p style="color: var(--color-gob-verde); font-weight: bold;">${response.message}</p>`;
            resultArea.style.backgroundColor = '#d4edda'; // Color de éxito
            showNotification('Carga masiva completada con éxito.', 'success');
            form.reset();

        } catch (error) {
            statusDiv.innerHTML = `<p style="color: var(--color-danger); font-weight: bold;">Fallo en la carga:</p><p>${error.message}</p>`;
            resultArea.style.backgroundColor = '#f8d7da'; // Color de error
            showNotification('La carga masiva falló. Revise los detalles.', 'error');
        
		} finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Procesar y Cargar Archivo';
            fileInput.value = '';
        } // Cierre del finally
    }); // <--- Cierre del addEventListener (paréntesis y punto y coma)
} // <


// =============================================================
// =================== MÓDULO DE RENDIMIENTO (SPRINT 2) ========
// =============================================================

/**
 * Obtiene los datos de KPI del backend para el año seleccionado.
 */
async function cargarDatosRendimiento() {
    const filtroAñoRendimiento = document.getElementById('dr-filtro-año');
    const rendimientoWidgetsContainer = document.getElementById('rendimiento-widgets-container');
    const año = filtroAñoRendimiento.value;

    if (!año) {
        rendimientoWidgetsContainer.innerHTML = '<p>Por favor, seleccione un año para ver los KPIs.</p>';
        return;
    }

    // Mostrar un 'cargando'
    rendimientoWidgetsContainer.innerHTML = `
        <div class="dashboard-widget" style="grid-column: 1 / -1; text-align: center;">
            <p>Calculando KPIs para ${año}...</p>
        </div>`;

    try {
        const url = `/api/dashboard/rendimiento?año_actual=${año}`;
        const data = await fetchAPI(url);
        console.log("Datos de Rendimiento (YoY) recibidos:", data);
        renderRendimientoWidgets(data);

    } catch (error) {
        console.error('Error en cargarDatosRendimiento:', error);
        rendimientoWidgetsContainer.innerHTML = `
            <div class="dashboard-widget" style="grid-column: 1 / -1; text-align: center; background-color: #f8d7da;">
                <p style="color: var(--color-danger);">Error al cargar datos de rendimiento: ${error.message}</p>
            </div>`;
    }
}

/**
 * Renderiza los widgets de KPI en el contenedor.
 * @param {object} data - El objeto JSON de respuesta de /api/dashboard/rendimiento
 */
// =============================================================
// =================== MÓDULO DE RENDIMIENTO (SPRINT 3) ========
// =============================================================

/**
 * Obtiene los datos de KPI del backend para el año seleccionado.
 * (Función MODIFICADA para Sprint 3)
 */
async function cargarDatosRendimiento() {
    const filtroAñoRendimiento = document.getElementById('dr-filtro-año');
    const rendimientoWidgetsContainer = document.getElementById('rendimiento-widgets-container');
    const año = filtroAñoRendimiento.value;

    if (!año) {
        rendimientoWidgetsContainer.innerHTML = '<p>Por favor, seleccione un año para ver los KPIs.</p>';
        return;
    }

    // Mostrar un 'cargando'
    rendimientoWidgetsContainer.innerHTML = `
        <div class="dashboard-widget" style="grid-column: 1 / -1; text-align: center;">
            <p>Calculando KPIs para ${año}...</p>
        </div>`;
        
    // Limpiar gráfico de tendencia anterior
    if (ddChartTendenciaSesiones) ddChartTendenciaSesiones.destroy();

    try {
        // Creamos dos grupos de promesas. Los KPIs y las tendencias
        const kpi_url = `/api/dashboard/rendimiento?año_actual=${año}`;
        
        // Verificamos si los datos de tendencia ya están cargados (por la Vista Global)
        const CargarTendencias = ddTendenciaSesionesData.length === 0;
        
        let promiseGroupTendencias = [
            Promise.resolve(ddTendenciaSesionesData),
            Promise.resolve(ddTendenciaSesionesExtData),
            Promise.resolve(ddTendenciaInformesData),
            Promise.resolve(ddTendenciaRecomendacionesData),
            Promise.resolve(ddTendenciaRecomendacionesAtendidasData)
        ];

        if (CargarTendencias) {
             console.log("Cargando datos de tendencia por primera vez desde 'Rendimiento'");
             promiseGroupTendencias = [
                fetchAPI('/api/dashboard/tendencia/sesiones_ord'),
                fetchAPI('/api/dashboard/tendencia/sesiones_ext'),
                fetchAPI('/api/dashboard/tendencia/informes'),
                fetchAPI('/api/dashboard/tendencia/recomendaciones'),
                fetchAPI('/api/dashboard/tendencia/recomendaciones_atendidas')
            ];
        }

        // Ejecutamos ambas peticiones en paralelo
        const [kpiData, [
            sesionesOrdData, 
            sesionesExtData, 
            informesData, 
            recomendacionesData, 
            recsAtendidasData
        ]] = await Promise.all([
            fetchAPI(kpi_url),
            Promise.all(promiseGroupTendencias)
        ]);
        
        console.log("Datos de Rendimiento (YoY) (Sprint 3) recibidos:", kpiData);
        
        // Guardar/Actualizar datos de tendencia globales
        if(CargarTendencias) {
            ddTendenciaSesionesData = sesionesOrdData || [];
            ddTendenciaSesionesExtData = sesionesExtData || [];
            ddTendenciaInformesData = informesData || [];
            ddTendenciaRecomendacionesData = recomendacionesData || []; 
            ddTendenciaRecomendacionesAtendidasData = recsAtendidasData || [];
        }

        // Renderizar los 4 widgets de KPI
        renderRendimientoWidgets(kpiData);

        // Renderizar el gráfico de tendencia (ahora parte de esta pestaña)
        renderDetalleTendenciaSesiones(ddTendenciaSesionesData); // Renderiza el default (Sesiones Ord.)
        setupTendenciaToggle(); // Asegura que los botones del gráfico funcionen

    } catch (error) {
        console.error('Error en cargarDatosRendimiento:', error);
        rendimientoWidgetsContainer.innerHTML = `
            <div class="dashboard-widget" style="grid-column: 1 / -1; text-align: center; background-color: #f8d7da;">
                <p style="color: var(--color-danger);">Error al cargar datos de rendimiento: ${error.message}</p>
            </div>`;
    }
}

/**
 * Renderiza los widgets de KPI en el contenedor.
 * (Función MODIFICADA para Sprint 3)
 */
function renderRendimientoWidgets(data) {
    const container = document.getElementById('rendimiento-widgets-container');
    if (!container) return;
    
    container.innerHTML = ''; // Limpiar contenedor

    const {
        año_actual, año_anterior,
        tasa_atencion_cohorte_actual_pct, delta_tasa_atencion_cohorte_pct,
        focos_rojos_actual_pct, focos_rojos_actual_count, delta_focos_rojos_pct,
        inventario_total_pendiente,
        antiguedad_promedio_inventario
    } = data;

    // 1. Widget: Inventario Total Pendiente (Snapshot)
    container.innerHTML += createRendimientoWidget(
        '🔴 Inventario Total Pendiente',
        `${inventario_total_pendiente}`,
        'Recomendaciones totales con estatus "Pendiente" (Snapshot de HOY, de todos los años).',
        'danger'
    );

    // 2. Widget: Antigüedad Promedio (Snapshot)
    container.innerHTML += createRendimientoWidget(
        '🕒 Antigüedad Prom. Inventario',
        `${antiguedad_promedio_inventario} días`,
        'Antigüedad promedio (en días) de todas las recomendaciones "Pendientes" (Snapshot de HOY).',
        'warning'
    );
    
    // 3. Widget: Tasa de Atención de Cohorte (YoY)
    container.innerHTML += createRendimientoWidget(
        `% Tasa Atención (Cohorte ${año_actual})`,
        `${tasa_atencion_cohorte_actual_pct}%`,
        `Recomendaciones Resueltas vs. Emitidas en el mismo año. ${formatDelta(delta_tasa_atencion_cohorte_pct, año_anterior, true)}`, // true = higher is better
        'primary'
    );

    // 4. Widget: Focos Rojos (YoY)
    container.innerHTML += createRendimientoWidget(
        `% Instituciones en Incumplimiento (${año_actual})`,
        `${focos_rojos_actual_pct}%`,
        `(${focos_rojos_actual_count} inst.) Instituciones que no reportaron sesiones Y/O informes requeridos. ${formatDelta(delta_focos_rojos_pct, año_anterior, false)}`, // false = 'lower is better'
        'info'
    );
}

/**
 * Función helper para crear el HTML de un widget de KPI de rendimiento.
 * (Función del Sprint 2, sin cambios)
 */
function createRendimientoWidget(titulo, valor, subtexto, color) {
    // Definimos los colores base
    const colors = {
        primary: 'var(--color-gob-vino-oscuro)',
        warning: 'var(--color-gob-dorado)',
        danger: 'var(--color-danger)',
        info: 'var(--color-gob-verde)'
    };
    const selectedColor = colors[color] || 'var(--color-gob-gris)';

    return `
        <div class="dashboard-widget" style="border-left: 5px solid ${selectedColor};">
            <div class="kpi-container" style="text-align: left;">
                <h3 style="color: ${selectedColor}; margin-top: 0; margin-bottom: 5px; font-size: 1.1em; text-transform: uppercase;">${titulo}</h3>
                <p class="kpi-number" style="font-size: 2.5em; color: var(--color-gob-gris); margin-bottom: 10px;">${valor}</p>
                <p style="font-size: 0.9em; color: #555; margin: 0;">${subtexto}</p>
            </div>
        </div>
    `;
}

/**
 * Función helper para formatear el texto de delta (YoY).
 * (Función del Sprint 2, sin cambios)
 */
function formatDelta(delta, año_anterior, higherIsBetter) {
    if (delta === 0) {
        return `<span style="color: #6c757d;">Sin cambios vs. ${año_anterior}</span>`;
    }

    const deltaColor = (delta > 0) 
        ? (higherIsBetter ? 'var(--color-gob-verde)' : 'var(--color-danger)') 
        : (higherIsBetter ? 'var(--color-danger)' : 'var(--color-gob-verde)');
    
    const arrow = (delta > 0) ? '▲' : '▼';
    const sign = (delta > 0) ? '+' : '';
    // Corregido: 'pp' (puntos porcentuales) solo si el número tiene decimal.
    const unit = (String(delta).includes('.')) ? 'pp' : ''; 

    return `<strong style="color: ${deltaColor};">${arrow} ${sign}${delta}${unit}</strong> vs. ${año_anterior}`;
}

// =============================================================
// ============ MÓDULO DE EXPORTACIÓN A PDF (V5.2 - HEADER LIMPIO) ==
// =============================================================

async function exportarReportePDF() {
    console.log(">>> EJECUTANDO VERSIÓN 5.2 (Header Limpio Sin Subtítulos)...");

    if (!window.jspdf) {
        alert("ERROR: Librería jsPDF no cargada.");
        return;
    }

    const { jsPDF } = window.jspdf;

    // 1. DETECTAR VISTA ACTIVA
    const globalView = document.getElementById('dashboard-global-view');
    const rendimientoView = document.getElementById('dashboard-rendimiento-view');
    const detailedView = document.getElementById('dashboard-detailed-view');

    let activeView = '';
    if (!globalView.classList.contains('hidden')) activeView = 'global';
    else if (!rendimientoView.classList.contains('hidden')) activeView = 'rendimiento';
    else if (!detailedView.classList.contains('hidden')) activeView = 'detailed';

    if (!activeView) {
        showNotification("No se detectó una vista activa.", "error");
        return;
    }

    showNotification("Generando PDF...", "info");

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    
    let currentYear = new Date().getFullYear();
    if (activeView === 'global') currentYear = document.getElementById('dg-filtro-año')?.value || currentYear;
    if (activeView === 'rendimiento') currentYear = document.getElementById('dr-filtro-año')?.value || currentYear;
    if (activeView === 'detailed') currentYear = document.getElementById('dd-filtro-año')?.value || currentYear;

    const fechaImpresion = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // --- CARGA DE LOGO ---
    let logoBase64 = null;
    try {
        logoBase64 = await getBase64ImageFromUrl('assets/logo.jpg'); 
    } catch (e) { console.warn("Logo no cargado", e); }

    // --- HELPERS ---
    // drawHeader ahora ignora o no recibe subtítulos para cumplir el requerimiento
    const drawHeader = (tituloReportePrincipal) => {
        let currentHeaderY = 8;
        if (logoBase64) {
            try { doc.addImage(logoBase64, margin, currentHeaderY, 35, 12); } catch (e) {}
        }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(97, 18, 50);
        doc.text("Secretaría Anticorrupción y Buen Gobierno", pageWidth / 2, currentHeaderY + 7, { align: "center" });
        currentHeaderY += 10;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51);
        
        const titleLines = doc.splitTextToSize(tituloReportePrincipal, pageWidth - (margin * 2) - 10);
        doc.text(titleLines, pageWidth / 2, currentHeaderY + 3, { align: "center" });
        currentHeaderY += (titleLines.length * 4);

        // SECCIÓN DE SUBTÍTULO ELIMINADA DEL HEADER
        // Para garantizar limpieza total en el encabezado.

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(fechaImpresion, pageWidth - margin, currentHeaderY, { align: "right" });
        
        doc.setDrawColor(200);
        doc.line(margin, currentHeaderY + 2, pageWidth - margin, currentHeaderY + 2);

        return currentHeaderY + 5; 
    };

    const drawFooter = (pageNum) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: "right" });
        doc.text(`Generado por Sistema COCODI`, margin, pageHeight - 10, { align: "left" });
    };

    const cleanPdfText = (text) => text.replace(/🔴|🕒|▲|▼/g, '').trim();

    const addChartTitle = (text, x, y, maxWidth) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(0);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return lines.length * 5; 
    };

    // 3. EJECUCIÓN
    try {
        if (activeView === 'global') {
            await generarPDFVistaGlobal(doc, margin, pageWidth, pageHeight, currentYear, drawHeader, drawFooter, addChartTitle);
        } else if (activeView === 'rendimiento') {
            await generarPDFRendimiento(doc, margin, pageWidth, pageHeight, currentYear, drawHeader, drawFooter, cleanPdfText);
        } else if (activeView === 'detailed') {
            await generarPDFDetallado(doc, margin, pageWidth, pageHeight, currentYear, drawHeader, drawFooter, addChartTitle);
        }

        doc.save(`Reporte_${activeView}_${currentYear}.pdf`);
        showNotification("PDF generado.", "success");
    } catch (err) {
        console.error("Error generando PDF:", err);
        showNotification("Error al generar PDF.", "error");
    }
}

// ---------------------------------------------------------
// VISTA GLOBAL (ENCABEZADOS LIMPIOS)
// ---------------------------------------------------------
async function generarPDFVistaGlobal(doc, margin, width, height, year, headerFn, footerFn, titleFn) {
    // PÁGINA 1
    let yPos = headerFn("Reporte Ejecutivo Global"); 

    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(97, 18, 50);
    doc.text(`Resumen Ejecutivo ${year}`, margin, yPos + 10);
    yPos += 20;

    const sumDataset = (chart) => chart?.data?.datasets[0]?.data.reduce((a, b) => Number(a) + Number(b), 0) || 0;
    const totalInst = sumDataset(globalInstDistribucionChart);
    const totalOrd = sumDataset(globalSesionesOrdinariasChart);
    const totalExt = sumDataset(globalSesionesExtraordinariasChart);
    let totalInf = 0;
    if (globalInformesEntregadosChart?.data?.datasets) globalInformesEntregadosChart.data.datasets.forEach(ds => totalInf += ds.data.reduce((a,b)=>a+b,0));

    const cardW = (width - (margin * 2) - 15) / 4;
    const cardH = 25;
    const drawCard = (x, lbl, val, col) => {
        doc.setDrawColor(220); doc.setFillColor(250, 250, 250);
        doc.roundedRect(x, yPos, cardW, cardH, 2, 2, 'FD');
        doc.setFillColor(col); doc.rect(x, yPos, cardW, 2, 'F');
        doc.setFontSize(16); doc.setTextColor(col);
        doc.text(String(val), x + cardW/2, yPos + 12, {align:"center"});
        doc.setFontSize(8); doc.setTextColor(80);
        doc.text(lbl, x + cardW/2, yPos + 18, {align:"center"});
    };

    drawCard(margin, "Instituciones", totalInst, "#333");
    drawCard(margin + cardW + 5, "Sesiones Ord.", totalOrd, "#1e5b4f");
    drawCard(margin + (cardW*2) + 10, "Sesiones Ext.", totalExt, "#a57f2c");
    drawCard(margin + (cardW*3) + 15, "Informes Ent.", totalInf, "#611232");
    yPos += cardH + 15;

    const chartW = (width - (margin*2) - 10) / 2;
    const chartH = 55;
    const h1 = titleFn("Distribución de Instituciones", margin, yPos, chartW);
    const h2 = titleFn("Alertas de Riesgo (Focos Rojos)", margin + chartW + 10, yPos, chartW);
    const r1 = Math.max(h1, h2) + 2;
    if (globalInstDistribucionChart) doc.addImage(globalInstDistribucionChart.toBase64Image(), 'PNG', margin, yPos + r1, chartW, chartH);
    if (globalFocosRojosChart) doc.addImage(globalFocosRojosChart.toBase64Image(), 'PNG', margin + chartW + 10, yPos + r1, chartW, chartH);
    yPos += r1 + chartH + 10;

    const h3 = titleFn("Desempeño Ses. Ordinarias (DG)", margin, yPos, chartW);
    const h4 = titleFn("Desempeño Ses. Extraordinarias (DG)", margin + chartW + 10, yPos, chartW);
    const r2 = Math.max(h3, h4) + 2;
    if (globalSesionesOrdinariasChart) doc.addImage(globalSesionesOrdinariasChart.toBase64Image(), 'PNG', margin, yPos + r2, chartW, chartH);
    if (globalSesionesExtraordinariasChart) doc.addImage(globalSesionesExtraordinariasChart.toBase64Image(), 'PNG', margin + chartW + 10, yPos + r2, chartW, chartH);
    
    footerFn(1);

    // PÁGINA 2
    doc.addPage(); 
    // CORRECCIÓN: Solo el título principal, SIN subtítulo
    yPos = headerFn("Reporte Ejecutivo Global"); 
    yPos += 5;

    const hTot = titleFn("Total Sesiones Realizadas por Tipo de Órgano", margin, yPos, width - (margin*2));
    if (globalSesionesPorTipoOrganoChart) doc.addImage(globalSesionesPorTipoOrganoChart.toBase64Image(), 'PNG', margin, yPos + hTot + 2, width - (margin*2), 60);
    yPos += hTot + 60 + 15;

    const hOrd = titleFn("Ses. Ord. por Tipo Órgano", margin, yPos, chartW);
    const hExt = titleFn("Ses. Ext. por Tipo Órgano", margin + chartW + 10, yPos, chartW);
    const r3 = Math.max(hOrd, hExt) + 2;
    if (globalSesionesOrdPorTipoOrganoChart) doc.addImage(globalSesionesOrdPorTipoOrganoChart.toBase64Image(), 'PNG', margin, yPos + r3, chartW, 60);
    if (globalSesionesExtPorTipoOrganoChart) doc.addImage(globalSesionesExtPorTipoOrganoChart.toBase64Image(), 'PNG', margin + chartW + 10, yPos + r3, chartW, 60);
    footerFn(2);

    // PÁGINA 3
    doc.addPage(); 
    // CORRECCIÓN: Solo el título principal, SIN subtítulo
    yPos = headerFn("Reporte Ejecutivo Global"); 
    yPos += 5;

    const hInf = titleFn("Desglose de Informes Entregados", margin, yPos, width - (margin*2));
    if (globalInformesEntregadosChart) doc.addImage(globalInformesEntregadosChart.toBase64Image(), 'PNG', margin, yPos + hInf + 2, width - (margin*2), 60);
    yPos += hInf + 60 + 15;

    const hVol = titleFn("Volumen Recs. (Atendidas vs Pendientes)", margin, yPos, chartW);
    const hEfi = titleFn("Eficiencia de Atención (%)", margin + chartW + 10, yPos, chartW);
    const r4 = Math.max(hVol, hEfi) + 2;
    if (globalRecsVolumenChart) doc.addImage(globalRecsVolumenChart.toBase64Image(), 'PNG', margin, yPos + r4, chartW, 60);
    if (globalRecsEficienciaChart) doc.addImage(globalRecsEficienciaChart.toBase64Image(), 'PNG', margin + chartW + 10, yPos + r4, chartW, 60);
    footerFn(3);
}

// ---------------------------------------------------------
// VISTA DETALLADA (CON BLINDAJE DE GRÁFICOS)
// ---------------------------------------------------------
async function generarPDFDetallado(doc, margin, width, height, year, headerFn, footerFn, titleFn) {
    let yPos = headerFn("Reporte Detallado");

    // Contexto de filtros
    const getSelText = (id) => {
        const el = document.getElementById(id);
        return (el && el.value && el.value !== '') ? el.options[el.selectedIndex].text : null;
    };
    const dgId = document.getElementById('dd-filtro-dg')?.value;
    let dgDisplay = "DG Desconocida";
    try {
        const dgs = await fetchAPI('/api/dgs'); 
        const selectedDG = dgs.find(d => String(d.id_dg) === String(dgId));
        dgDisplay = selectedDG ? selectedDG.siglas_dg : getSelText('dd-filtro-dg');
    } catch (e) { dgDisplay = getSelText('dd-filtro-dg'); }

    const ramo = getSelText('dd-filtro-ramo');
    const resp = getSelText('dd-filtro-responsable');
    const inst = getSelText('dd-filtro-institucion');

    let contextString = dgDisplay;
    if (ramo && ramo !== 'Todos') contextString += `. Ramo: ${ramo}`;
    if (resp && resp !== 'Todos') contextString += `. ${resp}`;
    if (inst && inst !== 'Todas') contextString += `. ${inst}`;
    contextString += ` | ${year}`;

    doc.setFontSize(9); doc.setTextColor(80);
    const contextLines = doc.splitTextToSize(contextString, width - (margin * 2));
    doc.text(contextLines, margin, yPos + 5);
    yPos += (contextLines.length * 4) + 10; 

    const kpiOrd = document.getElementById('dd-kpi-sesiones-ord')?.innerText || '0';
    const kpiExt = document.getElementById('dd-kpi-sesiones-ext')?.innerText || '0';
    const kpiFocos = document.getElementById('dd-kpi-focos-rojos')?.innerText || '0';

    const cw = (width - margin*2 - 10) / 3;
    const ch = 20;
    const drawSimpleCard = (x, title, val) => {
        doc.setDrawColor(200); doc.setFillColor(250, 250, 250);
        doc.roundedRect(x, yPos, cw, ch, 2, 2, 'FD');
        doc.setFontSize(8); doc.text(title, x + cw/2, yPos + 7, {align:'center'});
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); 
        doc.text(val, x + cw/2, yPos + 16, {align:'center'});
    };

    drawSimpleCard(margin, "Focos Rojos", kpiFocos);
    drawSimpleCard(margin + cw + 5, "Sesiones Ord.", kpiOrd);
    drawSimpleCard(margin + (cw*2) + 10, "Sesiones Ext.", kpiExt);
    yPos += ch + 15;

    const chartW = (width - margin*2 - 10) / 2;
    const chartH = 60;

    const h1 = titleFn("Avance Global de Recomendaciones", margin, yPos, chartW);
    const h2 = titleFn("Informes Entregados por Tipo", margin + chartW + 10, yPos, chartW);
    const row1H = Math.max(h1, h2) + 2;

    // BLINDAJE: Validar si el gráfico existe y tiene canvas
    if (ddChartRecsAvance && ddChartRecsAvance.canvas) {
        doc.addImage(ddChartRecsAvance.toBase64Image(), 'PNG', margin, yPos + row1H, chartW, chartH);
    }
    if (ddChartInformesTipo && ddChartInformesTipo.canvas) {
        doc.addImage(ddChartInformesTipo.toBase64Image(), 'PNG', margin + chartW + 10, yPos + row1H, chartW, chartH);
    }

    yPos += row1H + chartH + 15;

    if (ddChartAvanceRecsPorTipo && ddChartAvanceRecsPorTipo.canvas) {
        const hMissing = titleFn("Avance de Recomendaciones por Origen de Informe", margin, yPos, width - margin*2);
        const imgYMissing = yPos + hMissing + 2;
        doc.addImage(ddChartAvanceRecsPorTipo.toBase64Image(), 'PNG', margin, imgYMissing, width - margin*2, 55);
        yPos = imgYMissing + 55 + 15;
    }

    if (yPos + 80 > height) { 
        doc.addPage(); 
        // CORRECCIÓN: Header limpio, sin subtítulo
        yPos = headerFn("Reporte Detallado"); 
        yPos += 10;
    }

    const hOrd = titleFn("Ses. Ord. por Tipo Órgano", margin, yPos, chartW);
    const hExt = titleFn("Ses. Ext. por Tipo Órgano", margin + chartW + 10, yPos, chartW);
    const row2H = Math.max(hOrd, hExt) + 2;

    if (ddGraficoSesionesOrdPorOrganoEsp && ddGraficoSesionesOrdPorOrganoEsp.canvas) {
        doc.addImage(ddGraficoSesionesOrdPorOrganoEsp.toBase64Image(), 'PNG', margin, yPos + row2H, chartW, chartH);
    }
    if (ddGraficoSesionesExtPorOrganoEsp && ddGraficoSesionesExtPorOrganoEsp.canvas) {
        doc.addImage(ddGraficoSesionesExtPorOrganoEsp.toBase64Image(), 'PNG', margin + chartW + 10, yPos + row2H, chartW, chartH);
    }

    yPos += row2H + chartH + 15;
    
    if (yPos + 80 > height) { 
        doc.addPage(); 
        // CORRECCIÓN: Header limpio, sin subtítulo
        yPos = headerFn("Reporte Detallado"); 
        yPos += 10;
    }
    
    if (ddChartTendenciaSesiones && ddChartTendenciaSesiones.canvas) {
        doc.addImage(ddChartTendenciaSesiones.toBase64Image(), 'PNG', margin, yPos, width - margin*2, 70);
    }

    footerFn(1);
}

// ---------------------------------------------------------
// VISTA RENDIMIENTO (Sin cambios)
// ---------------------------------------------------------
async function generarPDFRendimiento(doc, margin, width, height, year, headerFn, footerFn, cleanTextFn) {
    let yPos = headerFn(`Informe de Rendimiento Anual Comparativo ${year}`);
    yPos += 10; 

    const container = document.getElementById('rendimiento-widgets-container');
    const widgets = container ? container.querySelectorAll('.dashboard-widget') : [];

    if (widgets.length === 0) {
        doc.text("Sin datos en pantalla.", margin, yPos);
        return;
    }

    widgets.forEach((widget, index) => {
        let titulo = widget.querySelector('h3')?.innerText || 'KPI';
        let valor = widget.querySelector('.kpi-number')?.innerText || 'N/A';
        let subtexto = widget.querySelector('p:last-child')?.innerText || '';

        titulo = cleanTextFn(titulo);
        subtexto = cleanTextFn(subtexto);

        const xPos = (index % 2 === 0) ? margin : margin + (width - margin*2)/2 + 5;
        if (index > 0 && index % 2 === 0) yPos += 45;

        const boxW = (width - margin*2)/2 - 5;
        const boxH = 40;

        doc.setDrawColor(200); doc.setFillColor(252, 252, 252);
        doc.roundedRect(xPos, yPos, boxW, boxH, 2, 2, 'FD');
        doc.setFillColor(97, 18, 50); doc.rect(xPos, yPos, 2, boxH, 'F');

        doc.setFontSize(10); doc.setTextColor(100);
        const splitTitle = doc.splitTextToSize(titulo, boxW - 10);
        doc.text(splitTitle, xPos + 5, yPos + 8);

        doc.setFontSize(16); doc.setTextColor(0);
        doc.text(valor, xPos + 5, yPos + 22);
        doc.setFontSize(8); doc.setTextColor(120);
        const splitSub = doc.splitTextToSize(subtexto, boxW - 10);
        doc.text(splitSub, xPos + 5, yPos + 32);
    });

    yPos += 55;
    
    const chartTitleElement = document.getElementById('dd-tendencia-title');
    const chartTitleText = chartTitleElement ? chartTitleElement.innerText : "Análisis de Tendencia Histórica";

    doc.setFontSize(12); doc.setTextColor(97, 18, 50);
    doc.text(chartTitleText, margin, yPos);
    yPos += 10;

    if (ddChartTendenciaSesiones) {
        doc.addImage(ddChartTendenciaSesiones.toBase64Image(), 'PNG', margin, yPos, width - (margin*2), 80);
    }

    footerFn(1);
}

const getBase64ImageFromUrl = async (imageUrl) => {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result), false);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
    });
};



function renderReporteBalanceAnual(data) {
    const container = document.getElementById('rep-balance-container');
    if (!container) return;

    if (!data || Object.keys(data).length === 0) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">No hay datos disponibles.</div>';
        return;
    }

    const style = `
        <style>
            .ficha-tecnica { background: #fff; border: 1px solid #ccc; max-width: 950px; margin: 0 auto; font-family: 'Montserrat', sans-serif; color: #333; }
            .ficha-header { background-color: var(--color-gob-vino-oscuro); color: white; padding: 15px; text-align: center; font-size: 1.1em; font-weight: bold; letter-spacing: 1px; }
            .ficha-section-title { background-color: #e9ecef; color: var(--color-gob-gris); padding: 10px 15px; font-weight: bold; font-size: 0.95em; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; margin-top: 0; text-transform: uppercase; }
            
            /* Grid principal */
            .desglose-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 1px solid #ccc; }
            .desglose-col { border-right: 1px solid #eee; }
            .desglose-col:last-child { border-right: none; }
            
            .desglose-header { display: flex; justify-content: space-between; align-items: center; font-weight: bold; color: var(--color-gob-vino-oscuro); padding: 12px 20px; background-color: #fff; border-bottom: 1px solid #eee; font-size: 1.1em; }
            
            /* Tabla interna (Layout Fijo) */
            .sub-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0; }
            
            /* Filas de resumen (Ordinarias/Extraordinarias) */
            .summary-row td { 
                background-color: #fff; 
                font-weight: 700; 
                color: #000; 
                border-bottom: 1px solid #eee; 
                padding: 10px 20px; 
                font-size: 0.95em;
            }
            .summary-val { float: right; font-size: 1.1em; color: #000; }

            /* Encabezados Micro-tabla */
            .sub-table th {
                background-color: #f8f9fa;
                color: #666;
                font-size: 0.75em;
                text-transform: uppercase;
                padding: 8px 5px;
                border-bottom: 1px solid #ddd;
                font-weight: 700;
                vertical-align: middle;
            }
            /* Alineación específica para que 'Naturaleza' coincida con los datos */
            .th-left { text-align: left; padding-left: 15px !important; }
            .th-center { text-align: center; }

            /* Celdas de datos */
            .sub-table td.data-cell { padding: 10px 10px; border-bottom: 1px solid #f5f5f5; font-size: 0.9em; color: #444; vertical-align: middle; }
            .sub-table tr:last-child td.data-cell { border-bottom: none; }
            
            /* Estilos de celdas */
            .col-label { text-align: left; padding-left: 15px !important; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .col-val { text-align: center; font-family: monospace; font-size: 1em; color: #555; }
            .col-total { text-align: center; font-weight: bold; color: var(--color-gob-vino-oscuro); background-color: #fdfdfd; }

            /* Sección Recomendaciones */
            .ficha-row { display: flex; justify-content: space-between; padding: 10px 20px; border-bottom: 1px solid #eee; align-items: center; }
            .ficha-row.sub-row { padding: 8px 20px 8px 40px; background-color: #fff; font-size: 0.95em; border-bottom: 1px solid #f5f5f5; }
            .ficha-label { font-weight: 500; color: #444; }
            .ficha-value { font-weight: bold; color: var(--color-gob-vino-oscuro); font-size: 1.1em; text-align: right; }
            .ficha-value-sub { font-weight: normal; color: #555; font-size: 1em; text-align: right; }
        </style>
    `;

    const totalCocodi = Number(data.ses_ord_cocodi) + Number(data.ses_ext_cocodi);
    const totalGobierno = Number(data.ses_ord_gobierno) + Number(data.ses_ext_gobierno);

    let html = style + `<div class="ficha-tecnica">`;
    html += `<div class="ficha-header">BALANCE ANUAL DE RESULTADOS</div>`;

    // SECCIÓN I: RESUMEN
    html += `<div class="ficha-section-title">I. RESUMEN DE SESIONES</div>`;
    html += `
        <div class="ficha-row"><span class="ficha-label">Total de Sesiones Realizadas:</span><span class="ficha-value">${data.total_sesiones}</span></div>
        <div class="ficha-row"><span class="ficha-label">Sesiones Ordinarias:</span><span class="ficha-value">${data.total_sesiones_ord}</span></div>
        <div class="ficha-row"><span class="ficha-label">Sesiones Extraordinarias:</span><span class="ficha-value">${data.total_sesiones_ext}</span></div>
    `;

    // SECCIÓN II: DESGLOSE
    html += `<div class="ficha-section-title">II. DESGLOSE SESIONES POR NATURALEZA JURÍDICA</div>`;
    html += `<div class="desglose-grid">`;

    // COLUMNA IZQ: COCODI
    html += `
        <div class="desglose-col">
            <div class="desglose-header"><span>COCODI</span><span>${totalCocodi}</span></div>
            
            <table class="sub-table">
                <colgroup>
                    <col style="width: 40%;">
                    <col style="width: 20%;">
                    <col style="width: 20%;">
                    <col style="width: 20%;">
                </colgroup>
                
                <tr class="summary-row"><td colspan="4">Ordinarias <span class="summary-val">${data.ses_ord_cocodi}</span></td></tr>
                <tr class="summary-row"><td colspan="4">Extraordinarias <span class="summary-val">${data.ses_ext_cocodi}</span></td></tr>
                
                <tr>
                    <th class="th-left">Naturaleza</th>
                    <th class="th-center">Ord.</th>
                    <th class="th-center">Ext.</th>
                    <th class="th-center">Total</th>
                </tr>
                <tr><td class="data-cell col-label">Dependencias</td><td class="data-cell col-val">${data.cocodi_dep_ord}</td><td class="data-cell col-val">${data.cocodi_dep_ext}</td><td class="data-cell col-total">${data.cocodi_dep_total}</td></tr>
                <tr><td class="data-cell col-label">Desconcentrados</td><td class="data-cell col-val">${data.cocodi_desc_ord}</td><td class="data-cell col-val">${data.cocodi_desc_ext}</td><td class="data-cell col-total">${data.cocodi_desc_total}</td></tr>
                <tr><td class="data-cell col-label">Entidades</td><td class="data-cell col-val">${data.cocodi_ent_ord}</td><td class="data-cell col-val">${data.cocodi_ent_ext}</td><td class="data-cell col-total">${data.cocodi_ent_total}</td></tr>
                <tr><td class="data-cell col-label">Intersecretarial</td><td class="data-cell col-val">${data.cocodi_otros_ord}</td><td class="data-cell col-val">${data.cocodi_otros_ext}</td><td class="data-cell col-total">${data.cocodi_otros_total}</td></tr>
            </table>
        </div>
    `;

    // COLUMNA DER: GOBIERNO
    html += `
        <div class="desglose-col">
            <div class="desglose-header"><span>ÓRGANOS DE GOBIERNO</span><span>${totalGobierno}</span></div>
            
            <table class="sub-table">
                <colgroup>
                    <col style="width: 40%;">
                    <col style="width: 20%;">
                    <col style="width: 20%;">
                    <col style="width: 20%;">
                </colgroup>

                <tr class="summary-row"><td colspan="4">Ordinarias <span class="summary-val">${data.ses_ord_gobierno}</span></td></tr>
                <tr class="summary-row"><td colspan="4">Extraordinarias <span class="summary-val">${data.ses_ext_gobierno}</span></td></tr>
                
                <tr>
                    <th class="th-left">Naturaleza</th>
                    <th class="th-center">Ord.</th>
                    <th class="th-center">Ext.</th>
                    <th class="th-center">Total</th>
                </tr>
                <tr><td class="data-cell col-label">Dependencias</td><td class="data-cell col-val">${data.gob_dep_ord}</td><td class="data-cell col-val">${data.gob_dep_ext}</td><td class="data-cell col-total">${data.gob_dep_total}</td></tr>
                <tr><td class="data-cell col-label">Desconcentrados</td><td class="data-cell col-val">${data.gob_desc_ord}</td><td class="data-cell col-val">${data.gob_desc_ext}</td><td class="data-cell col-total">${data.gob_desc_total}</td></tr>
                <tr><td class="data-cell col-label">Entidades</td><td class="data-cell col-val">${data.gob_ent_ord}</td><td class="data-cell col-val">${data.gob_ent_ext}</td><td class="data-cell col-total">${data.gob_ent_total}</td></tr>
                <tr><td class="data-cell col-label">Intersecretarial</td><td class="data-cell col-val">${data.gob_otros_ord}</td><td class="data-cell col-val">${data.gob_otros_ext}</td><td class="data-cell col-total">${data.gob_otros_total}</td></tr>
            </table>
        </div>
    `;
    html += `</div>`; 

    // SECCIÓN III: RECOMENDACIONES
    html += `<div class="ficha-section-title">III. SEGUIMIENTO DE ACUERDOS Y RECOMENDACIONES</div>`;
    
    // Emitidas
    html += `
        <div class="ficha-row" style="background-color:#fff;">
            <span class="ficha-label">Total Recomendaciones Emitidas:</span>
            <span class="ficha-value">${data.recs_total_emitidas}</span>
        </div>
        <div class="ficha-row sub-row"><span class="ficha-label">En COCODI:</span><span class="ficha-value-sub">${data.recs_cocodi_emitidas}</span></div>
        <div class="ficha-row sub-row"><span class="ficha-label">En Órgano de Gobierno:</span><span class="ficha-value-sub">${data.recs_gob_emitidas}</span></div>
    `;

    // Atendidas
    html += `
        <div class="ficha-row" style="border-top:1px solid #eee; margin-top:5px;">
            <span class="ficha-label">Total Recomendaciones Atendidas:</span>
            <span class="ficha-value" style="color:var(--color-gob-verde);">${data.recs_total_atendidas}</span>
        </div>
        <div class="ficha-row sub-row"><span class="ficha-label">En COCODI:</span><span class="ficha-value-sub">${data.recs_cocodi_atendidas}</span></div>
        <div class="ficha-row sub-row"><span class="ficha-label">En Órgano de Gobierno:</span><span class="ficha-value-sub">${data.recs_gob_atendidas}</span></div>
    `;

    html += `</div>`; 
    container.innerHTML = html;
}