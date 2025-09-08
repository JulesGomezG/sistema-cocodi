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
        confirmModal.style.display = 'none';
        confirmCallback = null;
    };

    confirmOkBtn.addEventListener('click', () => {
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
        closeModal();
    });

    confirmCancelBtn.addEventListener('click', closeModal);
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


async function poblarSelectConAPI(url, selectId, valueField, textField, placeholder) {
    try {
        const data = await fetchAPI(url);
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = `<option value="">${placeholder}</option>`;
        data.forEach(item => {
            select.add(new Option(item[textField], item[valueField]));
        });
        return data;
    } catch (error) {
        console.error(`Fallo en poblarSelect ${selectId}:`, error);
        showNotification(`Error al cargar datos para ${selectId}`, 'error');
    }
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

async function poblarInstituciones(responsableId, institucionSelectId, organoSelectId = null) {
    const selectInstitucion = document.getElementById(institucionSelectId);
    selectInstitucion.innerHTML = '<option value="">Seleccione...</option>';
    selectInstitucion.disabled = true;
    if (organoSelectId) {
        const selectOrgano = document.getElementById(organoSelectId);
        if (selectOrgano) {
            selectOrgano.innerHTML = '<option value="">Seleccione...</option>';
            selectOrgano.disabled = true;
        }
    }
    if (!responsableId) { 
        if (organoSelectId && typeof buscarCalendario === 'function') buscarCalendario();
        if (organoSelectId && typeof cargarRecomendacionesIndependientes === 'function') cargarRecomendacionesIndependientes();
        if (institucionSelectId === 'filtro-informe-institucion') cargarInformes();
        return; 
    }
    try {
        selectInstitucion.innerHTML = '<option value="">Cargando...</option>';
        await poblarSelectConAPI(`http://localhost:5001/api/instituciones?responsable_id=${responsableId}`, institucionSelectId, 'id_institucion', 'nombre_institucion', 'Seleccione...');
        selectInstitucion.disabled = false;
    } catch (error) { console.error("Fallo en poblarInstituciones:", error); }
}


async function poblarOrganosColegiados(institucionId, organoSelectId, callbackFn = null) {
    const selectOrgano = document.getElementById(organoSelectId);
    selectOrgano.innerHTML = '<option value="">Seleccione...</option>';
    selectOrgano.disabled = true;
    if (!institucionId) { 
        if (callbackFn) callbackFn();
        return; 
    }
    try {
        selectOrgano.innerHTML = '<option value="">Cargando...</option>';
        await poblarSelectConAPI(`http://localhost:5001/api/organos-colegiados?institucion_id=${institucionId}`, organoSelectId, 'id_organo_colegiado', 'nombre_organo', 'Seleccione...');
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
        poblarInstituciones(e.target.value, 'filtro-informe-institucion', 'filtro-informe-organo');
        cargarInformes(); 
    });
    document.getElementById('filtro-informe-institucion')?.addEventListener('change', (e) => {
        poblarOrganosColegiados(e.target.value, 'filtro-informe-organo', cargarInformes);
    });
    document.getElementById('filtro-informe-organo')?.addEventListener('change', cargarInformes);
    
    // CORRECCIÓN: Listeners restaurados
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

    // CORRECCIÓN: Llamar a la validación explícitamente después de poblar el formulario.
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