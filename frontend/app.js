document.addEventListener('DOMContentLoaded', () => {
    // --- NAVEGACIÓN ---
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.app-section');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            sections.forEach(section => section.classList.toggle('hidden', section.id !== sectionId));
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');
            
            if (sectionId === 'section-reportes') {
                showReportesMainView();
            }
            if (sectionId === 'section-sesiones') {
                resetSesionesView();
            }
            if (sectionId === 'section-recomendaciones-main') {
                resetRecomendacionesView();
            }
            if (sectionId === 'section-directorio') {
                resetDirectorioView();
            }
            if (sectionId === 'section-dashboard') {
                cargarDatosDashboard();
            }
        });
    });

    // --- INICIALIZACIÓN DE MÓDULOS ---
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
        setTimeout(() => notification.remove(), 5000);
    }, 5000);
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
    if (!(options.body instanceof FormData)) {
        options.headers = { 'Content-Type': 'application/json', ...options.headers };
        if (options.body) {
            options.body = JSON.stringify(options.body);
        }
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Error HTTP: ${response.status}` }));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
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
            const option = new Option('-- General (Toda la Institución) --', '0');
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
    if (!select) return;
    select.innerHTML = placeholder ? `<option value="">${placeholder}</option>` : '';
    opciones.forEach(opcion => {
        select.add(new Option(opcion, opcion));
    });
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
let sesionesData = {}; 

function initSesionesModule() {
    document.getElementById('filtro-responsable')?.addEventListener('change', (e) => poblarInstituciones(e.target.value, 'filtro-institucion', 'filtro-organo'));
    document.getElementById('filtro-institucion')?.addEventListener('change', (e) => poblarOrganosColegiados(e.target.value, 'filtro-organo', buscarCalendario));
    document.getElementById('filtro-organo')?.addEventListener('change', buscarCalendario);
    document.getElementById('filtro-año')?.addEventListener('change', buscarCalendario);
    document.getElementById('calendario-container')?.addEventListener('click', handleCalendarioClick);
    document.getElementById('ejecucion-form')?.addEventListener('submit', handleEjecucionSubmit);
    document.getElementById('btn-agendar-extraordinaria')?.addEventListener('click', () => abrirModalEjecucion({ modo: 'extraordinaria' }));
    document.getElementById('sesion-detalle-modal')?.addEventListener('click', handleDetalleModalClick);
    resetSesionesView();
}

async function resetSesionesView() {
    const añoSelect = document.getElementById('filtro-año');
    if (añoSelect) {
        const añoActual = new Date().getFullYear();
        añoSelect.innerHTML = '';
        for (let i = 2030; i >= 2024; i--) {
            añoSelect.add(new Option(i, i));
        }
        añoSelect.value = añoActual;
    }

    const filtroResponsable = document.getElementById('filtro-responsable');
    if (filtroResponsable) {
        await poblarSelectConAPI('http://localhost:5001/api/responsables', 'filtro-responsable', 'id_responsable', 'nombre_responsable', 'Seleccione un responsable...');
        filtroResponsable.value = '';
    }
    const selectInstitucion = document.getElementById('filtro-institucion');
    selectInstitucion.innerHTML = '<option value="">Seleccione...</option>';
    selectInstitucion.disabled = true;
    const selectOrgano = document.getElementById('filtro-organo');
    selectOrgano.innerHTML = '<option value="">Seleccione...</option>';
    selectOrgano.disabled = true;
    document.getElementById('calendario-container').innerHTML = '<p>Por favor, complete los filtros para comenzar.</p>';
    document.getElementById('btn-agendar-extraordinaria').disabled = true;
}

async function poblarInstituciones(responsableId, institucionSelectId, organoSelectId = null, callbackFn = null) {
    const selectInstitucion = document.getElementById(institucionSelectId);
    selectInstitucion.innerHTML = '<option value="">Todos</option>';
    selectInstitucion.disabled = true;
    if (organoSelectId) {
        const selectOrgano = document.getElementById(organoSelectId);
        if (selectOrgano) {
            selectOrgano.innerHTML = '<option value="">Todos</option>';
            selectOrgano.disabled = true;
        }
    }
    if (!responsableId) { 
        if (callbackFn) callbackFn();
        return; 
    }
    try {
        selectInstitucion.innerHTML = '<option value="">Cargando...</option>';
        await poblarSelectConAPI(`http://localhost:5001/api/instituciones?responsable_id=${responsableId}`, institucionSelectId, 'id_institucion', 'nombre_institucion', 'Todos');
        selectInstitucion.disabled = false;
        if (callbackFn) callbackFn();
    } catch (error) { console.error("Fallo en poblarInstituciones:", error); }
}


async function poblarOrganosColegiados(institucionId, organoSelectId, callbackFn = null, addGeneral = false) {
    const selectOrgano = document.getElementById(organoSelectId);
    selectOrgano.innerHTML = '<option value="">Todos</option>';
    selectOrgano.disabled = true;
    if (!institucionId) { 
        if (callbackFn) callbackFn();
        return; 
    }
    try {
        selectOrgano.innerHTML = '<option value="">Cargando...</option>';
        await poblarSelectConAPI(`http://localhost:5001/api/organos-colegiados?institucion_id=${institucionId}`, organoSelectId, 'id_organo_colegiado', 'nombre_organo', 'Todos', addGeneral);
        selectOrgano.disabled = false;
        if (callbackFn) callbackFn();
    } catch (error) { console.error("Fallo en poblarOrganosColegiados:", error); }
}

async function buscarCalendario() {
    const año = document.getElementById('filtro-año').value;
    const institucionId = document.getElementById('filtro-institucion').value;
    const organoId = document.getElementById('filtro-organo').value;
    const container = document.getElementById('calendario-container');
    document.getElementById('btn-agendar-extraordinaria').disabled = !año || !institucionId || !organoId;
    if (!año || !institucionId || !organoId) {
        container.innerHTML = '<p>Por favor, complete los filtros para ver el calendario.</p>';
        return;
    }
    try {
        container.innerHTML = '<p>Cargando calendario...</p>';
        const calendario = await fetchAPI(`http://localhost:5001/api/calendario-sesiones?año=${año}&institucion_id=${institucionId}&organo_id=${organoId}`);
        renderCalendario(calendario);
    } catch (error) { console.error('Error al buscar calendario:', error); }
}

function renderCalendario(sesiones) {
    const container = document.getElementById('calendario-container');
    container.innerHTML = '';
    sesionesData = {}; 
    if (!sesiones || sesiones.length === 0) { container.innerHTML = '<p>No hay sesiones programadas.</p>'; return; }
    
    sesiones.forEach(sesion => {
        sesionesData[sesion.id_calendario] = sesion;
        const card = document.createElement('div');
        card.className = 'sesion-card';
        card.dataset.idCalendario = sesion.id_calendario;

        let titulo = sesion.tipo_sesion.toLowerCase() === 'extraordinaria' ? `Sesión Extraordinaria` : `${sesion.numero_ordinal}ª Sesión Ordinaria`;
        const infoDiv = document.createElement('div');
        infoDiv.className = 'sesion-card-info';
        infoDiv.innerHTML = `<h3>${titulo} ${sesion.año}</h3><p>Estatus: <span class="estatus estatus-${sesion.estatus}">${sesion.estatus}</span></p>`;
        card.appendChild(infoDiv);

        if (sesion.estatus === 'Programada') {
            const button = document.createElement('button');
            button.className = 'btn-primary btn-registrar';
            button.textContent = 'Registrar Ejecución';
            card.appendChild(button);
        } else if (sesion.estatus === 'Realizada') {
            card.classList.add('realizada'); 
        }
        container.appendChild(card);
    });
}

function handleCalendarioClick(event) {
    const card = event.target.closest('.sesion-card');
    if (!card) return;

    const idCalendario = card.dataset.idCalendario;

    if (event.target.classList.contains('btn-registrar')) {
        abrirModalEjecucion({ modo: 'ordinaria', idCalendario });
    } else if (card.classList.contains('realizada')) {
        abrirModalDetalleSesion(idCalendario);
    }
}

async function abrirModalDetalleSesion(idCalendario) {
    const sesion = sesionesData[idCalendario];
    if (!sesion) return;

    const modal = document.getElementById('sesion-detalle-modal');
    const titleEl = document.getElementById('sesion-detalle-title');
    const bodyEl = document.getElementById('sesion-detalle-body');
    const footerEl = document.getElementById('sesion-detalle-footer');

    let titulo = sesion.tipo_sesion.toLowerCase() === 'extraordinaria' ? `Sesión Extraordinaria ${sesion.año}` : `${sesion.numero_ordinal}ª Sesión Ordinaria ${sesion.año}`;
    titleEl.textContent = `Detalles de la ${titulo}`;

    bodyEl.innerHTML = `
        <p><strong>Número de Oficio:</strong> ${sesion.numero_sesion_oficial || 'No registrado'}</p>
        <p><strong>Fecha Real de Ejecución:</strong> ${new Date(sesion.fecha_real).toLocaleDateString('es-MX', { timeZone: 'UTC' }) || 'N/A'}</p>
        <p><strong>Responsable de la Ejecución:</strong> ${sesion.responsable_ejecucion || 'No registrado'}</p>
        <hr>
        <h3>Documentos Adjuntos</h3>
        <ul id="sesion-evidencias-list"><li>Cargando...</li></ul>
    `;
    
    footerEl.innerHTML = `<button id="btn-edit-sesion" class="btn-warning" data-id-calendario="${idCalendario}">Editar Ejecución</button>`;
    
    modal.style.display = 'flex';

    const evidenciasList = document.getElementById('sesion-evidencias-list');
    try {
        const evidencias = await fetchAPI(`http://localhost:5001/api/evidencias?parent_type=sesion&parent_id=${sesion.id_ejecucion}`);
        if (evidencias && evidencias.length > 0) {
            evidenciasList.innerHTML = '';
            evidencias.forEach(ev => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="http://localhost:5001/uploads/${ev.url_almacenamiento}" target="_blank">${ev.nombre_archivo}</a>`;
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
        const idCalendario = event.target.dataset.idCalendario;
        const sesion = sesionesData[idCalendario];
        if (sesion) {
            document.getElementById('sesion-detalle-modal').style.display = 'none';
            abrirModalEjecucion({ modo: 'edit', sesionData: sesion });
        }
    }
}

function abrirModalEjecucion({ modo, idCalendario = null, sesionData = null }) {
    const modal = document.getElementById('ejecucion-modal');
    const form = document.getElementById('ejecucion-form');
    const modalTitle = document.getElementById('modal-title');
    form.reset();
    
    fileManagers['sesion-files-input'].clearFiles();

    form.querySelector('#id_calendario_hidden').value = '';
    form.querySelector('#id_ejecucion_hidden').value = '';
    
    if (modo === 'ordinaria') {
        modalTitle.textContent = 'Registrar Ejecución de Sesión Ordinaria';
        form.querySelector('#id_calendario_hidden').value = idCalendario;
    } else if (modo === 'extraordinaria') {
        modalTitle.textContent = 'Registrar Sesión Extraordinaria';
    } else if (modo === 'edit' && sesionData) {
        modalTitle.textContent = 'Editar Ejecución de Sesión';
        form.querySelector('#id_ejecucion_hidden').value = sesionData.id_ejecucion;
        form.querySelector('[name="numero_sesion_oficial"]').value = sesionData.numero_sesion_oficial;
        const fechaUTC = new Date(sesionData.fecha_real);
        form.querySelector('[name="fecha_real"]').value = fechaUTC.toISOString().split('T')[0];
        form.querySelector('[name="responsable"]').value = sesionData.responsable_ejecucion;
    }

    modal.style.display = 'flex';
    formValidators[form.id].validate();
}

async function handleEjecucionSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const files = fileManagers['sesion-files-input'].getFiles();
    formData.delete('files');

    const idCalendario = formData.get('id_calendario');
    const idEjecucion = formData.get('id_ejecucion');

    let url;
    let method;
    let successMessage;

    if (idEjecucion) {
        url = `http://localhost:5001/api/ejecucion-sesiones/${idEjecucion}`;
        method = 'PUT';
        successMessage = 'Ejecución actualizada exitosamente.';
    } else if (idCalendario) {
        url = 'http://localhost:5001/api/ejecucion-sesiones';
        method = 'POST';
        successMessage = 'Ejecución registrada exitosamente.';
    } else {
        url = 'http://localhost:5001/api/sesiones-extraordinarias';
        method = 'POST';
        successMessage = 'Sesión extraordinaria registrada exitosamente.';
        formData.append('año', document.getElementById('filtro-año').value);
        formData.append('institucion_id', document.getElementById('filtro-institucion').value);
        formData.append('organo_id', document.getElementById('filtro-organo').value);
    }
    
    try {
        const response = await fetchAPI(url, { method, body: formData });
        const newEjecucionId = response.id_ejecucion;

        if (files.length > 0 && newEjecucionId) {
            const fileFormData = new FormData();
            for (const file of files) {
                fileFormData.append('files', file);
            }
            fileFormData.append('parent_type', 'sesion');
            fileFormData.append('parent_id', newEjecucionId);
            await fetchAPI('http://localhost:5001/api/upload', { method: 'POST', body: fileFormData });
        }
        
        form.reset();
        document.getElementById('ejecucion-modal').style.display = 'none';
        showNotification(successMessage);
        buscarCalendario();
    } catch (error) { 
        console.error('Error al guardar:', error); 
        showNotification(`Error: ${error.message}`, 'error');
    }
}


// =============================================================
// =================== MÓDULO DE INFORMES ======================
// =============================================================
function initReportesModule() {
    document.getElementById('btn-nuevo-informe')?.addEventListener('click', handleNuevoInformeClick);
    document.getElementById('informe-form')?.addEventListener('submit', handleInformeFormSubmit);
    document.getElementById('informes-tbody')?.addEventListener('click', handleInformeRowClick);
    document.getElementById('btn-volver-a-informes')?.addEventListener('click', showReportesMainView);
    document.getElementById('btn-nueva-recomendacion-informe')?.addEventListener('click', () => handleNuevaRecomendacionClick({ informe: currentInformeData[currentInformeId] }));
    
    document.getElementById('responsable-select-informe')?.addEventListener('change', (e) => poblarInstituciones(e.target.value, 'institucion-select-informe', 'organo-select-informe'));
    document.getElementById('institucion-select-informe')?.addEventListener('change', (e) => poblarOrganosColegiados(e.target.value, 'organo-select-informe'));

    document.getElementById('filtro-informe-periodo')?.addEventListener('change', cargarInformes);
    document.getElementById('filtro-informe-responsable')?.addEventListener('change', (e) => {
        poblarInstituciones(e.target.value, 'filtro-informe-institucion', 'filtro-informe-organo', cargarInformes);
        cargarInformes(); 
    });
    document.getElementById('filtro-informe-institucion')?.addEventListener('change', (e) => {
        poblarOrganosColegiados(e.target.value, 'filtro-informe-organo', cargarInformes, true);
    });
    document.getElementById('filtro-informe-organo')?.addEventListener('change', cargarInformes);
    
    document.getElementById('recomendacion-form')?.addEventListener('submit', handleRecomendacionFormSubmit);
    document.getElementById('recomendaciones-informe-tbody')?.addEventListener('click', handleRecomendacionesTableClick);
    document.getElementById('recomendacion-detalle-modal')?.addEventListener('click', handleDetalleRecomendacionModalClick);
    
    poblarFiltrosInformes().then(cargarInformes);
}

let currentInformeId = null;
let currentRecomendacionData = {};
let currentInformeData = {};
let currentView = 'informes';

function showReportesMainView() {
    const periodoSelect = document.getElementById('filtro-informe-periodo');
    if (periodoSelect) periodoSelect.value = "";
    
    const responsableSelect = document.getElementById('filtro-informe-responsable');
    if (responsableSelect) responsableSelect.value = "";
    
    const institucionSelect = document.getElementById('filtro-informe-institucion');
    if (institucionSelect) {
        institucionSelect.innerHTML = '<option value="">Todos</option>';
        institucionSelect.disabled = true;
    }

    const organoSelect = document.getElementById('filtro-informe-organo');
    if (organoSelect) {
        organoSelect.innerHTML = '<option value="">Todos</option>';
        organoSelect.disabled = true;
    }

    document.getElementById('reportes-main-view').classList.remove('hidden');
    document.getElementById('reportes-detail-view').classList.add('hidden');
    cargarInformes();
}

function showReportesDetailView() {
    document.getElementById('reportes-main-view').classList.add('hidden');
    document.getElementById('reportes-detail-view').classList.remove('hidden');
}

async function poblarFiltrosInformes() {
    try {
        const periodoSelect = document.getElementById('filtro-informe-periodo');
        periodoSelect.innerHTML = '<option value="">Todos</option>';
        for (let i = 2030; i >= 2024; i--) {
            periodoSelect.add(new Option(i, i));
        }
        await poblarSelectConAPI('http://localhost:5001/api/responsables', 'filtro-informe-responsable', 'id_responsable', 'nombre_responsable', 'Todos');
        
        document.getElementById('filtro-informe-institucion').innerHTML = '<option value="">Todos</option>';
        document.getElementById('filtro-informe-institucion').disabled = true;
        document.getElementById('filtro-informe-organo').innerHTML = '<option value="">Todos</option>';
        document.getElementById('filtro-informe-organo').disabled = true;

    } catch (error) { console.error("Error al poblar filtros de informes:", error); }
}

async function cargarInformes() {
    const periodo = document.getElementById('filtro-informe-periodo').value;
    const responsableId = document.getElementById('filtro-informe-responsable').value;
    const institucionId = document.getElementById('filtro-informe-institucion').value;
    const organoId = document.getElementById('filtro-informe-organo').value;

    let url = new URL('http://localhost:5001/api/informes');
    if (periodo) url.searchParams.append('periodo', periodo);
    if (responsableId) url.searchParams.append('responsable_id', responsableId);
    if (institucionId) url.searchParams.append('institucion_id', institucionId);
    if (organoId) url.searchParams.append('organo_id', organoId);

    try {
        const informes = await fetchAPI(url);
        const tbody = document.getElementById('informes-tbody');
        tbody.innerHTML = '';
        currentInformeData = {};
        if (informes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9">No se encontraron informes con los filtros seleccionados.</td></tr>`;
        } else {
            informes.forEach(informe => {
                currentInformeData[informe.id_informe] = informe;
                const tr = document.createElement('tr');
                tr.dataset.informeId = informe.id_informe;
                tr.innerHTML = `
                    <td>${informe.siglas}</td>
                    <td>${informe.nombre_organo}</td>
                    <td>${informe.descripcion ? informe.descripcion.substring(0, 40) + '...' : 'Sin descripción'}</td>
                    <td>${informe.tipo_informe}</td>
                    <td>${informe.periodo}</td>
                    <td>${new Date(informe.fecha_informe).toLocaleDateString('es-MX', { timeZone: 'UTC' })}</td>
                    <td>${informe.nombre_responsable}</td>
                    <td>
                        <div>Emitidas: ${informe.recomendaciones_emitidas}</div>
                        <div>Atendidas: ${informe.recomendaciones_atendidas}</div>
                    </td>
                    <td class="actions-cell">
                        <button class="btn-info btn-view-detail">Ver</button>
                        <button class="btn-warning btn-edit-informe">Editar</button>
                        <button class="btn-danger btn-delete-informe">Eliminar</button>
                    </td>`;
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
    
    document.getElementById('responsable-select-informe').disabled = false;
    document.getElementById('institucion-select-informe').disabled = true;
    document.getElementById('organo-select-informe').disabled = true;
    
    try {
        await poblarSelectConAPI('http://localhost:5001/api/responsables', 'responsable-select-informe', 'id_responsable', 'nombre_responsable', 'Seleccione...');
        
        const periodoSelect = document.getElementById('periodo-select');
        const añoActual = new Date().getFullYear();
        periodoSelect.innerHTML = '';
        for (let i = 2030; i >= 2024; i--) {
            periodoSelect.add(new Option(i, i));
        }
        periodoSelect.value = añoActual;
        
        document.getElementById('institucion-select-informe').innerHTML = '<option value="">Seleccione un responsable...</option>';
        document.getElementById('organo-select-informe').innerHTML = '<option value="">Seleccione una institución...</option>';
        document.getElementById('informe-modal').style.display = 'flex';
        formValidators[form.id].validate();
    } catch (error) { console.error("Error al preparar formulario:", error); }
}

async function handleInformeFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const files = fileManagers['informe-files-input'].getFiles();
    formData.delete('files');

    const informeId = formData.get('id_informe');
    const method = informeId ? 'PUT' : 'POST';
    const url = informeId ? `http://localhost:5001/api/informes/${informeId}` : 'http://localhost:5001/api/informes';
    
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
            await fetchAPI('http://localhost:5001/api/upload', { method: 'POST', body: fileFormData });
        }

        form.reset();
        document.getElementById('informe-modal').style.display = 'none';
        showNotification('Informe guardado exitosamente.');
        cargarInformes();
    } catch (error) { console.error("Error al guardar informe:", error); showNotification(`Error: ${error.message}`, 'error'); }
}


async function handleInformeRowClick(event) {
    const target = event.target;
    const row = target.closest('tr');
    if (!row || !row.dataset.informeId) return;
    const informeId = row.dataset.informeId;
    if (target.classList.contains('btn-edit-informe')) {
        handleEditInforme(informeId);
    } else if (target.classList.contains('btn-delete-informe')) {
        handleDeleteInforme(informeId);
    } else if (target.classList.contains('btn-view-detail')){
        await cargarVistaDeDetalle(informeId);
    }
}

async function handleEditInforme(informeId) {
    const informe = currentInformeData[informeId];
    if (!informe) return;
    await handleNuevoInformeClick(); 
    const form = document.getElementById('informe-form');
    const responsableSelect = form.querySelector('[name="id_responsable"]');
    const institucionSelect = form.querySelector('[name="id_institucion"]');
    const organoSelect = form.querySelector('[name="id_organo_colegiado"]');
    
    form.querySelector('[name="fecha_informe"]').value = new Date(informe.fecha_informe).toISOString().split('T')[0];
    form.querySelector('[name="id_informe"]').value = informe.id_informe;
    form.querySelector('[name="periodo"]').value = informe.periodo;
    form.querySelector('[name="descripcion"]').value = informe.descripcion || '';
    responsableSelect.value = informe.id_responsable;
    
    await poblarInstituciones(informe.id_responsable, 'institucion-select-informe', 'organo-select-informe'); 
    institucionSelect.value = informe.id_institucion;
    
    await poblarOrganosColegiados(informe.id_institucion, 'organo-select-informe');
    organoSelect.value = informe.id_organo_colegiado;
    
    form.querySelector('[name="tipo_informe"]').value = informe.tipo_informe;
    responsableSelect.disabled = true;
    institucionSelect.disabled = true;
    organoSelect.disabled = false;
    document.getElementById('informe-modal-title').textContent = "Editar Informe";
    formValidators[form.id].validate();
}

async function handleDeleteInforme(informeId) {
    showConfirmModal(
        'Confirmar Eliminación de Informe',
        '¿Estás seguro de que deseas eliminar este informe y todas sus recomendaciones asociadas? Esta acción no se puede deshacer.',
        async () => {
            try {
                await fetchAPI(`http://localhost:5001/api/informes/${informeId}`, { method: 'DELETE' });
                showNotification('Informe eliminado.');
                cargarInformes();
            } catch (error) { 
                console.error("Error al eliminar informe:", error); 
                showNotification(`Error: ${error.message}`, 'error'); 
            }
        }
    );
}

async function cargarVistaDeDetalle(informeId) {
    currentInformeId = informeId;
    currentView = 'informes';
    try {
        const [informe, evidencias] = await Promise.all([
            fetchAPI(`http://localhost:5001/api/informes/${informeId}`),
            fetchAPI(`http://localhost:5001/api/evidencias?parent_type=informe&parent_id=${informeId}`)
        ]);
        currentInformeData[informeId] = { ...currentInformeData[informeId], ...informe };
        document.getElementById('informe-detalle-header').innerHTML = `
            <h2>${informe.nombre_institucion}</h2>
            <p><strong>Órgano Colegiado:</strong> ${informe.nombre_organo}</p>
            <p><strong>Tipo de Informe:</strong> ${informe.tipo_informe} - ${informe.periodo}</p>
            <hr>
            <p><strong>Descripción:</strong></p>
            <p>${informe.descripcion || 'No se proporcionó una descripción.'}</p>
        `;
        const evidenciasList = document.getElementById('informe-evidencias-list');
        evidenciasList.innerHTML = '';
        if (evidencias.length > 0) {
            evidencias.forEach(ev => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="http://localhost:5001/uploads/${ev.url_almacenamiento}" target="_blank">${ev.nombre_archivo}</a>`;
                evidenciasList.appendChild(li);
            });
        } else {
            evidenciasList.innerHTML = '<li>No hay documentos de soporte.</li>';
        }
        const recomendaciones = await fetchAPI(`http://localhost:5001/api/recomendaciones?informe_id=${informeId}`);
        renderRecomendaciones(recomendaciones, 'recomendaciones-informe-tbody');
        showReportesDetailView();
    } catch (error) { console.error("Error al cargar vista de detalle:", error); }
}

function renderRecomendaciones(recomendaciones, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    currentRecomendacionData = {};
    const isIndependentView = tbodyId === 'recomendaciones-independientes-tbody';
    const colspan = isIndependentView ? 11 : 9;

    if (recomendaciones.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colspan}">No hay recomendaciones.</td></tr>`;
    } else {
        recomendaciones.forEach(rec => {
            currentRecomendacionData[rec.id_recomendacion] = rec;
            const tr = document.createElement('tr');
            tr.dataset.recomendacionId = rec.id_recomendacion;

            const institucionCell = isIndependentView ? `<td>${rec.siglas}</td>` : '';
            const organoCell = isIndependentView ? `<td>${rec.nombre_organo}</td>` : '';
            const informeCell = isIndependentView ? `<td>${rec.id_informe || 'Independiente'}</td>` : '';
            
            tr.innerHTML = `
                ${institucionCell}
                ${organoCell}
                <td>${rec.descripcion}</td>
                <td>${rec.area_responsable_atencion}</td>
                ${!isIndependentView ? `<td>${rec.nombre_organo}</td>` : ''}
                <td>${new Date(rec.fecha_emision).toLocaleDateString('es-MX', { timeZone: 'UTC' })}</td>
                <td>${rec.fecha_compromiso ? new Date(rec.fecha_compromiso).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : 'N/A'}</td>
                <td>${rec.estatus}</td>
                <td>${rec.prioridad}</td>
                ${informeCell}
                <td>${rec.evidencias_count || 0}</td>
                <td class="actions-cell">
                    <button class="btn-primary btn-view-rec">Detalle</button>
                    <button class="btn-warning btn-edit-rec">Editar</button>
                    <button class="btn-danger btn-delete-rec">Eliminar</button>
                </td>`;
            tbody.appendChild(tr);
        });
    }
}


async function handleNuevaRecomendacionClick({ informe = null }) {
    const form = document.getElementById('recomendacion-form');
    form.reset();
    fileManagers['recomendacion-files-input'].clearFiles();

    const independentFieldsDiv = document.getElementById('rec-independent-fields');
    const independentSelects = independentFieldsDiv.querySelectorAll('select');
    const hiddenInformeId = document.getElementById('id_informe_hidden_rec');
    
    if (informe) { 
        document.getElementById('recomendacion-modal-title').textContent = "Nueva Recomendación para Informe";
        independentFieldsDiv.classList.add('hidden');
        independentSelects.forEach(sel => sel.required = false);
        hiddenInformeId.value = informe.id_informe;
    } else { 
        document.getElementById('recomendacion-modal-title').textContent = "Nueva Recomendación Independiente";
        independentFieldsDiv.classList.remove('hidden');
        independentSelects.forEach(sel => sel.required = true);
        hiddenInformeId.value = '';
        await poblarSelectConAPI('http://localhost:5001/api/responsables', 'rec-responsable-select', 'id_responsable', 'nombre_responsable', 'Seleccione...');
        document.getElementById('rec-institucion-select').innerHTML = '<option value="">Seleccione responsable...</option>';
        document.getElementById('rec-organo-select').innerHTML = '<option value="">Seleccione institución...</option>';
    }
    
    document.getElementById('id_recomendacion_hidden').value = '';
    form.querySelector('[name="fecha_emision"]').value = new Date().toISOString().split('T')[0];
    document.getElementById('recomendacion-evidencia-list').innerHTML = '<li>No hay evidencias.</li>';
    document.getElementById('recomendacion-modal').style.display = 'flex';
    formValidators[form.id].validate();
}

async function handleRecomendacionFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    if (formData.get('id_informe')) {
        const informe = currentInformeData[formData.get('id_informe')];
        if (informe) {
            formData.set('id_institucion', informe.id_institucion);
            formData.set('id_organo_colegiado', informe.id_organo_colegiado);
        }
    }

    const files = fileManagers['recomendacion-files-input'].getFiles();
    formData.delete('files');

    const recId = formData.get('id_recomendacion');
    const method = recId ? 'PUT' : 'POST';
    const url = recId ? `http://localhost:5001/api/recomendaciones/${recId}` : 'http://localhost:5001/api/recomendaciones';

    try {
        const response = await fetchAPI(url, { method, body: formData });
        const newRecId = recId || response.id_recomendacion;

        if (files.length > 0) {
            const fileFormData = new FormData();
            for(const file of files) {
                fileFormData.append('files', file);
            }
            fileFormData.append('parent_type', 'recomendacion');
            fileFormData.append('parent_id', newRecId);
            await fetchAPI('http://localhost:5001/api/upload', { method: 'POST', body: fileFormData });
        }

        form.reset();
        document.getElementById('recomendacion-modal').style.display = 'none';
        showNotification('Recomendación guardada.');
        if (currentView === 'informes') {
            cargarVistaDeDetalle(currentInformeId);
        } else {
            cargarRecomendacionesIndependientes();
        }
    } catch (error) { console.error("Error al guardar recomendación:", error); showNotification(`Error: ${error.message}`, 'error'); }
}


function handleRecomendacionesTableClick(event) {
    const target = event.target;
    const recId = target.closest('tr')?.dataset.recomendacionId;
    if (!recId) return;

    if (target.classList.contains('btn-view-rec')) {
        abrirModalDetalleRecomendacion(recId);
    }
    if (target.classList.contains('btn-edit-rec')) {
        handleEditRecomendacion(recId);
    }
    if (target.classList.contains('btn-delete-rec')) {
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
        const evidencias = await fetchAPI(`http://localhost:5001/api/evidencias?parent_type=recomendacion&parent_id=${recId}`);
        if (evidencias.length > 0) {
            evidenciaList.innerHTML = '';
            evidencias.forEach(ev => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="http://localhost:5001/uploads/${ev.url_almacenamiento}" target="_blank">${ev.nombre_archivo}</a>`;
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

async function handleEditRecomendacion(recId) {
    const rec = currentRecomendacionData[recId];
    if (!rec) return;

    await handleNuevaRecomendacionClick({ informe: rec.id_informe ? rec : null });

    const form = document.getElementById('recomendacion-form');
    document.getElementById('recomendacion-modal-title').textContent = "Editar Recomendación";

    form.querySelector('[name="id_recomendacion"]').value = rec.id_recomendacion;
    form.querySelector('[name="descripcion"]').value = rec.descripcion;
    form.querySelector('[name="area_responsable_atencion"]').value = rec.area_responsable_atencion;
    
    form.querySelector('[name="fecha_emision"]').value = new Date(rec.fecha_emision).toISOString().split('T')[0];

    if (rec.fecha_compromiso) {
        form.querySelector('[name="fecha_compromiso"]').value = new Date(rec.fecha_compromiso).toISOString().split('T')[0];
    } else {
        form.querySelector('[name="fecha_compromiso"]').value = '';
    }

    form.querySelector('[name="estatus"]').value = rec.estatus;
    form.querySelector('[name="prioridad"]').value = rec.prioridad;
    form.querySelector('[name="tipo_recomendacion"]').value = rec.tipo_recomendacion;
    
    if (!rec.id_informe) {
        const respSelect = document.getElementById('rec-responsable-select');
        const instSelect = document.getElementById('rec-institucion-select');
        const orgSelect = document.getElementById('rec-organo-select');
        
        if (rec.id_responsable) {
            respSelect.value = rec.id_responsable;
            await poblarInstituciones(rec.id_responsable, 'rec-institucion-select', 'rec-organo-select');
            instSelect.value = rec.id_institucion;
            await poblarOrganosColegiados(rec.id_institucion, 'rec-organo-select');
            orgSelect.value = rec.id_organo_colegiado;
        }
    }

    formValidators[form.id].validate();
}


async function handleDeleteRecomendacion(recId) {
    showConfirmModal(
        'Confirmar Eliminación de Recomendación',
        '¿Estás seguro de que deseas eliminar esta recomendación?',
        async () => {
            try {
                await fetchAPI(`http://localhost:5001/api/recomendaciones/${recId}`, { method: 'DELETE' });
                showNotification('Recomendación eliminada.');
                if (currentView === 'informes') {
                    cargarVistaDeDetalle(currentInformeId);
                } else {
                    cargarRecomendacionesIndependientes();
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
    document.getElementById('filtro-rec-año')?.addEventListener('change', cargarRecomendacionesIndependientes);
    document.getElementById('filtro-rec-responsable')?.addEventListener('change', (e) => {
        poblarInstituciones(e.target.value, 'filtro-rec-institucion', 'filtro-rec-organo');
        cargarRecomendacionesIndependientes(); 
    });
    document.getElementById('filtro-rec-institucion')?.addEventListener('change', (e) => poblarOrganosColegiados(e.target.value, 'filtro-rec-organo', cargarRecomendacionesIndependientes));
    document.getElementById('filtro-rec-organo')?.addEventListener('change', cargarRecomendacionesIndependientes);
    
    document.getElementById('btn-nueva-recomendacion-independiente')?.addEventListener('click', () => handleNuevaRecomendacionClick({}));
    
    document.getElementById('recomendaciones-independientes-tbody')?.addEventListener('click', handleRecomendacionesTableClick);
    
    document.getElementById('rec-responsable-select')?.addEventListener('change', (e) => poblarInstituciones(e.target.value, 'rec-institucion-select', 'rec-organo-select'));
    document.getElementById('rec-institucion-select')?.addEventListener('change', (e) => poblarOrganosColegiados(e.target.value, 'rec-organo-select'));

    resetRecomendacionesView();
}

async function resetRecomendacionesView() {
    const añoSelect = document.getElementById('filtro-rec-año');
    if (añoSelect) {
        const añoActual = new Date().getFullYear();
        añoSelect.innerHTML = '<option value="">Todos</option>';
        for (let i = 2030; i >= 2024; i--) {
            añoSelect.add(new Option(i, i));
        }
        añoSelect.value = ""; 
    }

    await poblarSelectConAPI('http://localhost:5001/api/responsables', 'filtro-rec-responsable', 'id_responsable', 'nombre_responsable', 'Todos');
    const instSelect = document.getElementById('filtro-rec-institucion');
    instSelect.innerHTML = '<option value="">Todos</option>';
    instSelect.disabled = true;
    
    const organoSelect = document.getElementById('filtro-rec-organo');
    organoSelect.innerHTML = '<option value="">Todos</option>';
    organoSelect.disabled = true;

    document.getElementById('recomendaciones-independientes-tbody').innerHTML = '';
    document.getElementById('btn-nueva-recomendacion-independiente').disabled = false;

    cargarRecomendacionesIndependientes();
}


async function cargarRecomendacionesIndependientes() {
    const año = document.getElementById('filtro-rec-año').value;
    const responsableId = document.getElementById('filtro-rec-responsable').value;
    const institucionId = document.getElementById('filtro-rec-institucion').value;
    const organoId = document.getElementById('filtro-rec-organo').value; 
    const tbody = document.getElementById('recomendaciones-independientes-tbody');
    
    currentView = 'recomendaciones';
    
    tbody.innerHTML = `<tr><td colspan="11">Cargando...</td></tr>`;

    let url = new URL('http://localhost:5001/api/recomendaciones');
    if (año) url.searchParams.append('año', año);
    if (responsableId) url.searchParams.append('responsable_id', responsableId);
    if (institucionId) url.searchParams.append('institucion_id', institucionId);
    if (organoId) url.searchParams.append('organo_id', organoId);
    
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
    document.getElementById('filtro-dir-responsable')?.addEventListener('change', (e) => poblarInstituciones(e.target.value, 'filtro-dir-institucion', 'filtro-dir-organo', cargarContactos));
    document.getElementById('filtro-dir-institucion')?.addEventListener('change', (e) => poblarOrganosColegiados(e.target.value, 'filtro-dir-organo', cargarContactos, true));
    document.getElementById('filtro-dir-organo')?.addEventListener('change', cargarContactos);

    document.getElementById('btn-nuevo-contacto')?.addEventListener('click', handleNuevoContactoClick);
    document.getElementById('directorio-form')?.addEventListener('submit', handleDirectorioFormSubmit);
    document.getElementById('directorio-tbody')?.addEventListener('click', handleDirectorioRowClick);

    document.getElementById('dir-responsable-select')?.addEventListener('change', (e) => poblarInstituciones(e.target.value, 'dir-institucion-select', 'dir-organo-select'));
    document.getElementById('dir-institucion-select')?.addEventListener('change', (e) => poblarOrganosColegiados(e.target.value, 'dir-organo-select', null, true));
}

async function resetDirectorioView() {
    await poblarSelectConAPI('http://localhost:5001/api/responsables', 'filtro-dir-responsable', 'id_responsable', 'nombre_responsable', 'Seleccione...');
    const instSelect = document.getElementById('filtro-dir-institucion');
    instSelect.innerHTML = '<option value="">Seleccione responsable...</option>';
    instSelect.disabled = true;
    
    const organoSelect = document.getElementById('filtro-dir-organo');
    organoSelect.innerHTML = '<option value="">Seleccione institución...</option>';
    organoSelect.disabled = true;

    document.getElementById('directorio-tbody').innerHTML = '<tr><td colspan="6">Por favor, complete los filtros para ver los contactos.</td></tr>';
    document.getElementById('btn-nuevo-contacto').disabled = false;
}

async function cargarContactos() {
    const institucionId = document.getElementById('filtro-dir-institucion').value;
    const organoId = document.getElementById('filtro-dir-organo').value;
    const tbody = document.getElementById('directorio-tbody');

    if (!institucionId) {
        tbody.innerHTML = '<tr><td colspan="6">Por favor, seleccione una institución.</td></tr>';
        return;
    }

    tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    try {
        let url = `http://localhost:5001/api/directorio?institucion_id=${institucionId}`;
        if (organoId) {
            url += `&organo_id=${organoId}`;
        }
        const contactos = await fetchAPI(url);
        renderContactos(contactos);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6">Error al cargar los contactos.</td></tr>';
    }
}

function renderContactos(contactos) {
    const tbody = document.getElementById('directorio-tbody');
    tbody.innerHTML = '';
    directorioData = {};
    if (contactos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No hay contactos para esta selección.</td></tr>';
        return;
    }
    contactos.forEach(contacto => {
        directorioData[contacto.id_contacto] = contacto;
        const tr = document.createElement('tr');
        tr.dataset.contactoId = contacto.id_contacto;
        tr.innerHTML = `
            <td>${contacto.nombre_contacto}</td>
            <td>${contacto.telefono || 'N/A'}</td>
            <td>${contacto.extension || 'N/A'}</td>
            <td>${contacto.email || 'N/A'}</td>
            <td>${contacto.movil || 'N/A'}</td>
            <td class="actions-cell">
                <button class="btn-warning btn-edit-contacto">Editar</button>
                <button class="btn-danger btn-delete-contacto">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleNuevoContactoClick() {
    const form = document.getElementById('directorio-form');
    form.reset();
    document.getElementById('id_contacto_hidden').value = '';
    document.getElementById('directorio-modal-title').textContent = 'Nuevo Contacto';
    
    document.getElementById('dir-creation-fields').classList.remove('hidden');
    form.querySelectorAll('#dir-creation-fields select').forEach(sel => sel.required = true);
    
    await poblarSelectConAPI('http://localhost:5001/api/responsables', 'dir-responsable-select', 'id_responsable', 'nombre_responsable', 'Seleccione...');
    document.getElementById('dir-institucion-select').innerHTML = '<option value="">Seleccione responsable...</option>';
    document.getElementById('dir-institucion-select').disabled = true;
    document.getElementById('dir-organo-select').innerHTML = '<option value="">Seleccione institución...</option>';
    document.getElementById('dir-organo-select').disabled = true;

    document.getElementById('directorio-modal').style.display = 'flex';
    formValidators[form.id].validate();
}

async function handleDirectorioFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const contactoId = formData.get('id_contacto');
    const method = contactoId ? 'PUT' : 'POST';
    const url = contactoId ? `http://localhost:5001/api/directorio/${contactoId}` : 'http://localhost:5001/api/directorio';

    if (contactoId) {
        const contacto = directorioData[contactoId];
        formData.append('id_institucion', contacto.id_institucion);
        formData.append('id_organo_colegiado', contacto.id_organo_colegiado || '0');
    }
    
    try {
        await fetchAPI(url, { method, body: formData });
        form.reset();
        document.getElementById('directorio-modal').style.display = 'none';
        showNotification('Contacto guardado exitosamente.');
        cargarContactos();
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

function handleDirectorioRowClick(event) {
    const target = event.target;
    const contactoId = target.closest('tr')?.dataset.contactoId;
    if (!contactoId) return;

    if (target.classList.contains('btn-edit-contacto')) {
        handleEditContacto(contactoId);
    }
    if (target.classList.contains('btn-delete-contacto')) {
        handleDeleteContacto(contactoId);
    }
}

function handleEditContacto(contactoId) {
    const contacto = directorioData[contactoId];
    if (!contacto) return;

    const form = document.getElementById('directorio-form');
    form.reset();
    document.getElementById('id_contacto_hidden').value = contacto.id_contacto;
    document.getElementById('directorio-modal-title').textContent = 'Editar Contacto';

    document.getElementById('dir-creation-fields').classList.add('hidden');
    form.querySelectorAll('#dir-creation-fields select').forEach(sel => sel.required = false);

    form.querySelector('[name="nombre_contacto"]').value = contacto.nombre_contacto || '';
    form.querySelector('[name="telefono"]').value = contacto.telefono || '';
    form.querySelector('[name="extension"]').value = contacto.extension || '';
    form.querySelector('[name="email"]').value = contacto.email || '';
    form.querySelector('[name="movil"]').value = contacto.movil || '';
    form.querySelector('[name="direccion"]').value = contacto.direccion || '';

    document.getElementById('directorio-modal').style.display = 'flex';
    formValidators[form.id].validate();
}

function handleDeleteContacto(contactoId) {
    showConfirmModal('Confirmar Eliminación', '¿Está seguro de que desea eliminar este contacto?', async () => {
        try {
            await fetchAPI(`http://localhost:5001/api/directorio/${contactoId}`, { method: 'DELETE' });
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

let recomendacionesChartInstance = null;
let prioridadChartInstance = null;
let tipoChartInstance = null;

function initDashboardModule() {
    // Función de inicialización para futuros listeners del dashboard.
}

async function cargarDatosDashboard() {
    const kpiContainerVencidas = document.getElementById('dashboard-kpi-vencidas');
    const kpiContainerAntiguedad = document.getElementById('dashboard-kpi-antiguedad');
    const kpiContainerSesiones = document.getElementById('dashboard-kpi-sesiones');
    const topTbody = document.getElementById('dashboard-top-instituciones-tbody');
    
    // Mostrar estado de carga inicial
    kpiContainerVencidas.innerHTML = '<p>Cargando...</p>';
    kpiContainerAntiguedad.innerHTML = '<p>Cargando...</p>';
    kpiContainerSesiones.innerHTML = '<p>Cargando...</p>';
    topTbody.innerHTML = '<tr><td colspan="2">Cargando...</td></tr>';
    
    try {
        const data = await fetchAPI('http://localhost:5001/api/dashboard/stats');
        
        // Renderizar KPI de Alertas Vencidas
        kpiContainerVencidas.innerHTML = `
            <p>Recomendaciones con fecha vencida:</p>
            <p class="${data.vencidas_count > 0 ? 'kpi-alert' : 'kpi-number'}">${data.vencidas_count}</p>
        `;
        
        // Renderizar KPI de Tiempo Promedio de Atención
		kpiContainerAntiguedad.innerHTML = `
			<p>Promedio de días sin resolver:</p>
			<p class="kpi-number">${data.antiguedad_promedio}</p>
			<p>días por recomendación pendiente</p>
		`;

        // Renderizar KPI de Sesiones
        kpiContainerSesiones.innerHTML = `
            <p><strong>${data.sesiones_stats.realizadas}</strong> de <strong>${data.sesiones_stats.total_programadas}</strong> Sesiones Realizadas</p>
            <p class="kpi-number">${data.sesiones_stats.cumplimiento_pct}%</p>
            <p>de Cumplimiento</p>
        `;
        
        // Renderizar Top 5 Instituciones
        const { top_instituciones_pendientes } = data;
        topTbody.innerHTML = '';
        if (top_instituciones_pendientes.length > 0) {
            top_instituciones_pendientes.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.siglas}</td>
                    <td>${item.pendientes_count}</td>
                `;
                topTbody.appendChild(tr);
            });
        } else {
            topTbody.innerHTML = '<tr><td colspan="2">No hay recomendaciones pendientes.</td></tr>';
        }

        // Renderizar Gráficos
        renderRecomendacionesChart(data.recomendaciones_stats);
        renderPrioridadChart(data.prioridad_stats);
        renderTipoChart(data.tipo_stats);

    } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
        showNotification('No se pudieron cargar los datos del dashboard.', 'error');
        kpiContainerVencidas.innerHTML = '<p>Error al cargar datos.</p>';
        kpiContainerAntiguedad.innerHTML = '<p>Error al cargar datos.</p>';
        kpiContainerSesiones.innerHTML = '<p>Error al cargar datos.</p>';
        topTbody.innerHTML = '<tr><td colspan="2">Error al cargar datos.</td></tr>';
    }
}

function renderRecomendacionesChart(stats) {
    const ctx = document.getElementById('recomendaciones-chart').getContext('2d');

    if (recomendacionesChartInstance) {
        recomendacionesChartInstance.destroy();
    }

    const labels = stats.map(item => item.estatus);
    const data = stats.map(item => item.count);

    const backgroundColors = [ '#1e5b4f', '#a57f2c', '#9b2247', '#6c757d' ];
    const estatusOrden = ['Completada', 'Cerrada', 'Pendiente', 'En Proceso', 'Cancelada'];
    const chartColors = labels.map(label => {
        const index = estatusOrden.indexOf(label);
        return backgroundColors[index % backgroundColors.length];
    });

    recomendacionesChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Recomendaciones',
                data: data,
                backgroundColor: chartColors,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Distribución de Recomendaciones por Estatus' }
            }
        }
    });
}

function renderPrioridadChart(stats) {
    const ctx = document.getElementById('prioridad-chart').getContext('2d');

    if (prioridadChartInstance) {
        prioridadChartInstance.destroy();
    }

    const prioridadOrden = ['Alta', 'Media', 'Baja'];
    const dataMap = new Map(stats.map(item => [item.prioridad, item.count]));
    
    const labels = prioridadOrden;
    const data = prioridadOrden.map(p => dataMap.get(p) || 0);

    prioridadChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nº de Pendientes',
                data: data,
                backgroundColor: [
                    'rgba(220, 53, 69, 0.7)',  // Rojo para Alta
                    'rgba(255, 193, 7, 0.7)',   // Amarillo para Media
                    'rgba(25, 135, 84, 0.7)'    // Verde para Baja
                ],
                borderColor: [
                    'rgb(220, 53, 69)',
                    'rgb(255, 193, 7)',
                    'rgb(25, 135, 84)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Recomendaciones Pendientes por Prioridad' }
            },
            scales: { x: { beginAtZero: true } }
        }
    });
}

function renderTipoChart(stats) {
    const ctx = document.getElementById('tipo-chart').getContext('2d');

    if (tipoChartInstance) {
        tipoChartInstance.destroy();
    }

    const labels = stats.map(item => item.tipo_recomendacion);
    const data = stats.map(item => item.count);

    tipoChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total de Recomendaciones',
                data: data,
                backgroundColor: [
                    'rgba(155, 34, 71, 0.7)', // Vino
                    'rgba(30, 91, 79, 0.7)', // Verde
                    'rgba(165, 127, 44, 0.7)' // Dorado
                ],
                borderColor: [
                    'rgb(155, 34, 71)',
                    'rgb(30, 91, 79)',
                    'rgb(165, 127, 44)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Total de Recomendaciones por Tipo' }
            },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// =============================================================
// =================== MÓDULO DE REPORTERÍA ====================
// =============================================================
let reporteActualData = []; // Variable para guardar los datos del último reporte generado

function initReporteriaModule() {
    const reportTypeSelect = document.getElementById('report-type-select');
    const filtersRecomendaciones = document.getElementById('filters-recomendaciones');
    const filtersSesiones = document.getElementById('filters-sesiones');
    const generateBtn = document.getElementById('generate-report-btn');
    const exportBtn = document.getElementById('export-excel-btn');
    
    if (!reportTypeSelect) return;

    // Poblar los filtros estáticos de recomendaciones
    poblarSelectConOpciones('report-rec-estatus', ['Pendiente', 'En Proceso', 'Completada', 'Cerrada', 'Cancelada'], 'Todos');
    poblarSelectConOpciones('report-rec-prioridad', ['Alta', 'Media', 'Baja'], 'Todas');
    poblarSelectConOpciones('report-rec-tipo', ['Correctiva', 'Preventiva', 'De Mejora Continua'], 'Todos');
    
    // Poblar el filtro de responsables
    poblarSelectConAPI('http://localhost:5001/api/responsables', 'report-rec-responsable', 'id_responsable', 'nombre_responsable', 'Todos');

    // Lógica de filtros en cascada para recomendaciones
    document.getElementById('report-rec-responsable')?.addEventListener('change', (e) => {
        poblarInstituciones(e.target.value, 'report-rec-institucion', 'report-rec-organo');
    });
    document.getElementById('report-rec-institucion')?.addEventListener('change', (e) => {
        poblarOrganosColegiados(e.target.value, 'report-rec-organo', null, true);
    });

    // --- NUEVO: Poblar filtros para Reporte de Sesiones ---
    const añoSelect = document.getElementById('report-ses-año');
    añoSelect.innerHTML = '<option value="">Todos</option>';
    for (let i = 2030; i >= 2024; i--) {
        añoSelect.add(new Option(i, i));
    }
    poblarSelectConAPI('http://localhost:5001/api/responsables', 'report-ses-responsable', 'id_responsable', 'nombre_responsable', 'Todos');
    poblarSelectConOpciones('report-ses-tipo', ['Ordinaria', 'Extraordinaria'], 'Todos');
    poblarSelectConOpciones('report-ses-estatus', ['Programada', 'Realizada'], 'Todos');
    
    // --- NUEVO: Lógica de filtros en cascada para sesiones ---
    document.getElementById('report-ses-responsable')?.addEventListener('change', (e) => {
        poblarInstituciones(e.target.value, 'report-ses-institucion', 'report-ses-organo');
    });
    document.getElementById('report-ses-institucion')?.addEventListener('change', (e) => {
        poblarOrganosColegiados(e.target.value, 'report-ses-organo', null, true);
    });


    // Mostrar/ocultar panel de filtros y habilitar botones
    reportTypeSelect.addEventListener('change', () => {
        const selectedType = reportTypeSelect.value;
        document.querySelectorAll('.report-filters').forEach(panel => panel.classList.add('hidden'));

        if (selectedType === 'recomendaciones') {
            filtersRecomendaciones.classList.remove('hidden');
        } else if (selectedType === 'sesiones') {
            filtersSesiones.classList.remove('hidden');
        }
        
        generateBtn.disabled = !selectedType;
        exportBtn.disabled = true; // Siempre se deshabilita al cambiar de tipo
        document.getElementById('report-preview-area').innerHTML = '<p>Aún no se ha generado ningún reporte.</p>';
    });

    // Evento para el botón de generar reporte
    generateBtn.addEventListener('click', () => {
        const selectedType = document.getElementById('report-type-select').value;
        if (selectedType === 'recomendaciones') {
            generarReporteRecomendaciones();
        } else if (selectedType === 'sesiones') {
            generarReporteSesiones();
        }
    });

    // Evento para el botón de exportar a Excel
    exportBtn.addEventListener('click', exportarReporteExcel);
}

function recogerFiltrosRecomendaciones() {
    const filters = {};
    const responsable = document.getElementById('report-rec-responsable').value;
    const institucion = document.getElementById('report-rec-institucion').value;
    const organo = document.getElementById('report-rec-organo').value;
    const fechaDesde = document.getElementById('report-rec-date-from').value;
    const fechaHasta = document.getElementById('report-rec-date-to').value;
    const estatus = document.getElementById('report-rec-estatus').value;
    const prioridad = document.getElementById('report-rec-prioridad').value;
    const tipo = document.getElementById('report-rec-tipo').value;
    const vencidas = document.getElementById('report-rec-vencidas').checked;

    if (responsable) filters.responsable_id = parseInt(responsable);
    if (institucion) filters.institucion_id = parseInt(institucion);
    if (organo) filters.organo_id = parseInt(organo);
    if (fechaDesde) filters.date_from = fechaDesde;
    if (fechaHasta) filters.date_to = fechaHasta;
    
    if (estatus) filters.estatus = [estatus];
    if (prioridad) filters.prioridad = [prioridad];
    if (tipo) filters.tipo = [tipo];

    if (vencidas) filters.vencidas_only = true;

    return filters;
}

async function generarReporteRecomendaciones() {
    const previewArea = document.getElementById('report-preview-area');
    const exportBtn = document.getElementById('export-excel-btn');
    previewArea.innerHTML = '<p>Generando reporte, por favor espere...</p>';
    exportBtn.disabled = true;
    reporteActualData = [];

    const filters = recogerFiltrosRecomendaciones();

    try {
        const data = await fetchAPI('http://localhost:5001/api/reportes/recomendaciones', {
            method: 'POST',
            body: filters
        });
        
        reporteActualData = data; // Guardamos los datos para la exportación
        const headerMap = {
            'id_recomendacion': 'ID',
            'institucion': 'Institución',
            'nombre_organo': 'Órgano Colegiado',
            'descripcion': 'Descripción',
            'area_responsable_atencion': 'Área Responsable',
            'fecha_emision': 'Fecha Emisión',
            'fecha_compromiso': 'Fecha Compromiso',
            'estatus': 'Estatus',
            'prioridad': 'Prioridad',
            'tipo_recomendacion': 'Tipo'
        };
        renderTablaReporte(data, headerMap);
        exportBtn.disabled = data.length === 0;

    } catch (error) {
        console.error("Error al generar el reporte:", error);
        previewArea.innerHTML = `<p style="color: red;">Error al generar el reporte: ${error.message}</p>`;
        showNotification('Error al generar el reporte.', 'error');
    }
}

function recogerFiltrosSesiones() {
    const filters = {};
    const fechaDesde = document.getElementById('report-ses-date-from').value;
    const fechaHasta = document.getElementById('report-ses-date-to').value;
    const año = document.getElementById('report-ses-año').value;
    const responsable = document.getElementById('report-ses-responsable').value;
    const institucion = document.getElementById('report-ses-institucion').value;
    const organo = document.getElementById('report-ses-organo').value;
    const tipo = document.getElementById('report-ses-tipo').value;
    const estatus = document.getElementById('report-ses-estatus').value;

    if (fechaDesde) filters.date_from = fechaDesde;
    if (fechaHasta) filters.date_to = fechaHasta;
    if (año) filters.año = parseInt(año);
    if (responsable) filters.responsable_id = parseInt(responsable);
    if (institucion) filters.institucion_id = parseInt(institucion);
    if (organo) filters.organo_id = parseInt(organo);
    if (tipo) filters.tipo_sesion = tipo;
    if (estatus) filters.estatus = estatus;

    return filters;
}

async function generarReporteSesiones() {
    const previewArea = document.getElementById('report-preview-area');
    const exportBtn = document.getElementById('export-excel-btn');
    previewArea.innerHTML = '<p>Generando reporte de sesiones, por favor espere...</p>';
    exportBtn.disabled = true;
    reporteActualData = [];

    const filters = recogerFiltrosSesiones();

    try {
        const data = await fetchAPI('http://localhost:5001/api/reportes/sesiones', {
            method: 'POST',
            body: filters
        });
        
        reporteActualData = data;
        
        const headerMap = {
            'año': 'Año',
            'responsable': 'Responsable',
            'institucion': 'Institución',
            'organo_colegiado': 'Órgano Colegiado',
            'tipo_sesion': 'Tipo de Sesión',
            'numero_ordinal': 'Nº Sesión',
            'estatus': 'Estatus',
            'oficio': 'Nº de Oficio',
            'fecha_real': 'Fecha Realizada'
        };
        
        renderTablaReporte(data, headerMap);
        exportBtn.disabled = data.length === 0;

    } catch (error) {
        console.error("Error al generar el reporte de sesiones:", error);
        previewArea.innerHTML = `<p style="color: red;">Error al generar el reporte: ${error.message}</p>`;
        showNotification('Error al generar el reporte de sesiones.', 'error');
    }
}

function renderTablaReporte(data, headerMap) {
    const previewArea = document.getElementById('report-preview-area');
    if (!data || data.length === 0) {
        previewArea.innerHTML = '<p>No se encontraron resultados con los filtros aplicados.</p>';
        return;
    }

    const table = document.createElement('table');
    table.id = 'report-table';
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    // Crear cabeceras de la tabla
    const headers = Object.keys(data[0]);
    const headerRow = document.createElement('tr');
    
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = headerMap[header] || header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Llenar filas de la tabla
    data.forEach(rowData => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            let cellData = rowData[header];
            if ((header.startsWith('fecha_') || header === 'fecha_real') && cellData) {
                cellData = new Date(cellData).toLocaleDateString('es-MX', { timeZone: 'UTC' });
            }
            td.textContent = cellData === null ? 'N/A' : cellData;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    previewArea.innerHTML = '';
    previewArea.appendChild(table);
}

function exportarReporteExcel() {
    if (reporteActualData.length === 0) {
        showNotification("No hay datos para exportar.", "error");
        return;
    }

    const selectedType = document.getElementById('report-type-select').value;
    let fileName = "Reporte_COCODI.xlsx";
    let sheetName = "Reporte";

    if (selectedType === 'recomendaciones') {
        fileName = "Reporte_Recomendaciones_COCODI.xlsx";
        sheetName = "Recomendaciones";
    } else if (selectedType === 'sesiones') {
        fileName = "Reporte_Sesiones_COCODI.xlsx";
        sheetName = "Sesiones";
    }
    
    // Formatear fechas en los datos antes de exportar
    const dataParaExportar = reporteActualData.map(row => {
        const newRow = {...row};
        for (const key in newRow) {
            if ((key.startsWith('fecha_') || key === 'fecha_real') && newRow[key]) {
                const date = new Date(newRow[key]);
                newRow[key] = `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
            }
        }
        return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataParaExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    XLSX.writeFile(workbook, fileName);
    showNotification("Exportación a Excel iniciada.");
}