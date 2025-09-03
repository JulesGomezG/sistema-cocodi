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
    initAllFormValidations();
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

const formValidators = {};
function initAllFormValidations() {
    const forms = document.querySelectorAll('.modal-form');
    forms.forEach(form => {
        const submitButton = form.querySelector('button[type="submit"]');
        const requiredInputs = Array.from(form.querySelectorAll('[required]'));

        const validate = () => {
            const isFormValid = requiredInputs.every(input => {
                // For file inputs, required means a file must be selected, but only if it's visible/part of the current flow.
                // In edit mode, the file input is optional.
                if (input.type === 'file' && input.required) {
                    return input.files.length > 0;
                }
                return input.value.trim() !== '';
            });
            submitButton.disabled = !isFormValid;
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

// =============================================================
// =================== MÓDULO DE SESIONES ======================
// =============================================================
let sesionesData = {}; 

function initSesionesModule() {
    document.getElementById('filtro-responsable')?.addEventListener('change', (e) => poblarInstituciones(e.target.value, 'filtro-institucion', 'filtro-organo'));
    document.getElementById('filtro-institucion')?.addEventListener('change', (e) => poblarOrganosColegiados(e.target.value));
    document.getElementById('filtro-organo')?.addEventListener('change', buscarCalendario);
    document.getElementById('filtro-año')?.addEventListener('change', buscarCalendario);
    document.getElementById('calendario-container')?.addEventListener('click', handleCalendarioClick);
    document.getElementById('ejecucion-form')?.addEventListener('submit', handleEjecucionSubmit);
    document.getElementById('btn-agendar-extraordinaria')?.addEventListener('click', () => abrirModalEjecucion({ modo: 'extraordinaria' }));
    document.getElementById('sesion-detalle-modal')?.addEventListener('click', handleDetalleModalClick);
    resetSesionesView();
}

async function resetSesionesView() {
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
        if (organoSelectId) buscarCalendario();
        return; 
    }
    try {
        selectInstitucion.innerHTML = '<option value="">Cargando...</option>';
        await poblarSelectConAPI(`http://localhost:5001/api/instituciones?responsable_id=${responsableId}`, institucionSelectId, 'id_institucion', 'nombre_institucion', 'Seleccione...');
        selectInstitucion.disabled = false;
    } catch (error) { console.error("Fallo en poblarInstituciones:", error); }
}


async function poblarOrganosColegiados(institucionId) {
    const selectOrgano = document.getElementById('filtro-organo');
    selectOrgano.innerHTML = '<option value="">Seleccione...</option>';
    selectOrgano.disabled = true;
    if (!institucionId) { buscarCalendario(); return; }
    try {
        selectOrgano.innerHTML = '<option value="">Cargando...</option>';
        const organos = await poblarSelectConAPI(`http://localhost:5001/api/organos-colegiados?institucion_id=${institucionId}`, 'filtro-organo', 'id_organo_colegiado', 'nombre_organo', 'Seleccione...');
        selectOrgano.disabled = false;
        if (organos && organos.length === 1) { selectOrgano.value = organos[0].id_organo_colegiado; }
        buscarCalendario();
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
        const file = formData.get('acta_file');

        if (file && file.size > 0 && newEjecucionId) {
            const fileFormData = new FormData();
            fileFormData.append('file', file);
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
    document.getElementById('btn-nueva-recomendacion-informe')?.addEventListener('click', () => handleNuevaRecomendacionClick({ informeId: currentInformeId, institucionId: currentInformeData[currentInformeId]?.id_institucion }));
    document.getElementById('recomendacion-form')?.addEventListener('submit', handleRecomendacionFormSubmit);
    document.getElementById('responsable-select')?.addEventListener('change', (e) => poblarInstituciones(e.target.value, 'institucion-select'));
    document.getElementById('filtro-informe-periodo')?.addEventListener('change', cargarInformes);
    document.getElementById('filtro-informe-responsable')?.addEventListener('change', cargarInformes);
    document.getElementById('recomendaciones-informe-tbody')?.addEventListener('click', handleRecomendacionesTableClick);
    document.getElementById('evidencia-form')?.addEventListener('submit', handleEvidenciaFormSubmit);
    poblarFiltrosInformes();
}

let currentInformeId = null;
let currentRecomendacionId = null;
let currentRecomendacionData = {};
let currentInformeData = {};
let currentView = 'informes';

function showReportesMainView() {
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
        const añoActual = new Date().getFullYear();
        periodoSelect.innerHTML = '<option value="">Todos</option>';
        for (let i = 2030; i >= 2024; i--) {
            periodoSelect.add(new Option(i, i));
        }
        await poblarSelectConAPI('http://localhost:5001/api/responsables', 'filtro-informe-responsable', 'id_responsable', 'nombre_responsable', 'Todos');
    } catch (error) { console.error("Error al poblar filtros de informes:", error); }
}

async function cargarInformes() {
    const periodo = document.getElementById('filtro-informe-periodo').value;
    const responsableId = document.getElementById('filtro-informe-responsable').value;
    let url = new URL('http://localhost:5001/api/informes');
    if (periodo) url.searchParams.append('periodo', periodo);
    if (responsableId) url.searchParams.append('responsable_id', responsableId);
    try {
        const informes = await fetchAPI(url);
        const tbody = document.getElementById('informes-tbody');
        tbody.innerHTML = '';
        currentInformeData = {};
        if (informes.length === 0) {
            tbody.innerHTML = '<tr class="no-hover"><td colspan="7">No hay informes.</td></tr>';
        } else {
            informes.forEach(informe => {
                currentInformeData[informe.id_informe] = informe;
                const tr = document.createElement('tr');
                tr.dataset.informeId = informe.id_informe;
                tr.innerHTML = `<td data-cell="institucion">${informe.siglas}</td><td data-cell="tipo">${informe.tipo_informe}</td><td data-cell="periodo">${informe.periodo}</td><td data-cell="fecha">${new Date(informe.fecha_informe).toLocaleDateString('es-MX', { timeZone: 'UTC' })}</td><td data-cell="responsable">${informe.nombre_responsable}</td><td data-cell="recomendaciones">${informe.atendidas_recomendaciones} / ${informe.total_recomendaciones}</td><td class="actions-cell"><button class="btn-primary btn-view-detail">Ver Detalle</button><button class="btn-warning btn-edit-informe">Editar</button><button class="btn-danger btn-delete-informe">Eliminar</button></td>`;
                tbody.appendChild(tr);
            });
        }
    } catch (error) { console.error("Error al cargar informes:", error); }
}

async function handleNuevoInformeClick() { 
    const form = document.getElementById('informe-form');
    form.reset();
    document.getElementById('id_informe_hidden_form').value = '';
    document.getElementById('informe-modal-title').textContent = "Nuevo Informe";
    document.getElementById('responsable-select').disabled = false;
    document.getElementById('institucion-select').disabled = true;
    try {
        await poblarSelectConAPI('http://localhost:5001/api/responsables', 'responsable-select', 'id_responsable', 'nombre_responsable', 'Seleccione...');
        
        const periodoSelect = document.getElementById('periodo-select');
        const añoActual = new Date().getFullYear();
        periodoSelect.innerHTML = '';
        for (let i = 2030; i >= 2024; i--) {
            periodoSelect.add(new Option(i, i));
        }
        periodoSelect.value = añoActual;
        
        document.getElementById('institucion-select').innerHTML = '<option value="">Seleccione un responsable...</option>';
        document.getElementById('informe-modal').style.display = 'flex';
        formValidators[form.id].validate();
    } catch (error) { console.error("Error al preparar formulario:", error); }
}

async function handleInformeFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const file = formData.get('soporte_file');
    formData.delete('soporte_file');
    
    const informeId = formData.get('id_informe');
    const method = informeId ? 'PUT' : 'POST';
    const url = informeId ? `http://localhost:5001/api/informes/${informeId}` : 'http://localhost:5001/api/informes';
    
    try {
        const response = await fetchAPI(url, { method, body: Object.fromEntries(formData) });
        const newInformeId = informeId || response.id_informe;
        if (file && file.size > 0 && newInformeId) {
            const fileFormData = new FormData();
            fileFormData.append('file', file);
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
    const fechaUTC = new Date(informe.fecha_informe);
    const fechaLocal = new Date(fechaUTC.getTime() + fechaUTC.getTimezoneOffset() * 60000);
    form.querySelector('[name="fecha_informe"]').value = fechaLocal.toISOString().split('T')[0];
    form.querySelector('[name="id_informe"]').value = informe.id_informe;
    form.querySelector('[name="periodo"]').value = informe.periodo;
    responsableSelect.value = informe.id_responsable;
    await poblarInstituciones(informe.id_responsable, 'institucion-select'); 
    institucionSelect.value = informe.id_institucion;
    form.querySelector('[name="tipo_informe"]').value = informe.tipo_informe;
    responsableSelect.disabled = true;
    institucionSelect.disabled = true;
    document.getElementById('informe-modal-title').textContent = "Editar Informe";
    formValidators[form.id].validate();
}

async function handleDeleteInforme(informeId) {
    if (confirm("¿Estás seguro de que deseas eliminar este informe y todas sus recomendaciones?")) {
        try {
            await fetchAPI(`http://localhost:5001/api/informes/${informeId}`, { method: 'DELETE' });
            showNotification('Informe eliminado.');
            cargarInformes();
        } catch (error) { console.error("Error al eliminar informe:", error); showNotification(`Error: ${error.message}`, 'error'); }
    }
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
        document.getElementById('informe-detalle-header').innerHTML = `<h2>${informe.tipo_informe} - ${informe.periodo}</h2><p><strong>Institución:</strong> ${informe.nombre_institucion}</p>`;
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
    const includeInformeColumn = tbodyId === 'recomendaciones-independientes-tbody';

    if (recomendaciones.length === 0) {
        const colspan = includeInformeColumn ? 8 : 7;
        tbody.innerHTML = `<tr><td colspan="${colspan}">No hay recomendaciones.</td></tr>`;
    } else {
        recomendaciones.forEach(rec => {
            currentRecomendacionData[rec.id_recomendacion] = rec;
            const tr = document.createElement('tr');
            tr.dataset.recomendacionId = rec.id_recomendacion;
            const informeCell = includeInformeColumn ? `<td>${rec.id_informe || 'N/A'}</td>` : '';
            tr.innerHTML = `<td>${rec.descripcion}</td><td>${rec.area_responsable_atencion}</td><td>${rec.fecha_compromiso ? new Date(rec.fecha_compromiso).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : 'N/A'}</td><td>${rec.estatus}</td><td>${rec.prioridad}</td>${informeCell}<td>${rec.evidencias_count || 0}</td><td class="actions-cell"><button class="btn-warning btn-edit-rec">Editar</button><button class="btn-danger btn-delete-rec">Eliminar</button><button class="btn-info btn-evidencia-rec">Evidencia</button></td>`;
            tbody.appendChild(tr);
        });
    }
}


function handleNuevaRecomendacionClick({ informeId = null, institucionId = null }) {
    if (!informeId && !institucionId) {
        showNotification("Error: No se puede crear recomendación sin contexto.", 'error');
        return;
    }
    const form = document.getElementById('recomendacion-form');
    form.reset();
    document.getElementById('id_recomendacion_hidden').value = '';
    document.getElementById('id_informe_hidden_rec').value = informeId || '';
    document.getElementById('id_institucion_hidden_rec').value = institucionId || '';
    document.getElementById('recomendacion-modal-title').textContent = "Nueva Recomendación";
    document.getElementById('recomendacion-modal').style.display = 'flex';
    formValidators[form.id].validate();
}


async function handleRecomendacionFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const recId = formData.get('id_recomendacion');
    const method = recId ? 'PUT' : 'POST';
    const url = recId ? `http://localhost:5001/api/recomendaciones/${recId}` : 'http://localhost:5001/api/recomendaciones';

    try {
        await fetchAPI(url, { method, body: Object.fromEntries(formData) });
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
    if (target.classList.contains('btn-edit-rec')) {
        handleEditRecomendacion(recId);
    }
    if (target.classList.contains('btn-delete-rec')) {
        handleDeleteRecomendacion(recId);
    }
    if (target.classList.contains('btn-evidencia-rec')) {
        handleEvidenciaRecomendacion(recId);
    }
}

function handleEditRecomendacion(recId) {
    const rec = currentRecomendacionData[recId];
    if (!rec) return;
    const form = document.getElementById('recomendacion-form');
    document.getElementById('id_informe_hidden_rec').value = rec.id_informe || '';
    document.getElementById('id_institucion_hidden_rec').value = rec.id_institucion || '';
    
    form.querySelector('[name="id_recomendacion"]').value = rec.id_recomendacion;
    form.querySelector('[name="descripcion"]').value = rec.descripcion;
    form.querySelector('[name="area_responsable_atencion"]').value = rec.area_responsable_atencion;
    if (rec.fecha_compromiso) {
        const fechaUTC = new Date(rec.fecha_compromiso);
        const fechaLocal = new Date(fechaUTC.getTime() + fechaUTC.getTimezoneOffset() * 60000);
        form.querySelector('[name="fecha_compromiso"]').value = fechaLocal.toISOString().split('T')[0];
    } else {
        form.querySelector('[name="fecha_compromiso"]').value = '';
    }
    form.querySelector('[name="estatus"]').value = rec.estatus;
    form.querySelector('[name="prioridad"]').value = rec.prioridad;
    form.querySelector('[name="tipo_recomendacion"]').value = rec.tipo_recomendacion;
    document.getElementById('recomendacion-modal-title').textContent = "Editar Recomendación";
    document.getElementById('recomendacion-modal').style.display = 'flex';
    formValidators[form.id].validate();
}

async function handleDeleteRecomendacion(recId) {
    if (confirm("¿Estás seguro de que deseas eliminar esta recomendación?")) {
        try {
            await fetchAPI(`http://localhost:5001/api/recomendaciones/${recId}`, { method: 'DELETE' });
            showNotification('Recomendación eliminada.');
            if (currentView === 'informes') {
                cargarVistaDeDetalle(currentInformeId);
            } else {
                cargarRecomendacionesIndependientes();
            }
        } catch (error) { console.error("Error al eliminar recomendación:", error); showNotification(`Error: ${error.message}`, 'error'); }
    }
}

async function handleEvidenciaRecomendacion(recId) {
    currentRecomendacionId = recId;
    const form = document.getElementById('evidencia-form');
    form.reset();
    document.getElementById('id_parent_hidden').value = recId;
    document.getElementById('parent_type_hidden').value = 'recomendacion';
    const evidencias = await fetchAPI(`http://localhost:5001/api/evidencias?parent_type=recomendacion&parent_id=${recId}`);
    const list = document.getElementById('evidencia-list');
    list.innerHTML = '';
    if (evidencias.length > 0) {
        evidencias.forEach(ev => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="http://localhost:5001/uploads/${ev.url_almacenamiento}" target="_blank">${ev.nombre_archivo}</a>`;
            list.appendChild(li);
        });
    } else {
        list.innerHTML = '<li>No hay evidencias cargadas.</li>';
    }
    document.getElementById('evidencia-modal').style.display = 'flex';
    formValidators[form.id].validate();
}

async function handleEvidenciaFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    try {
        await fetchAPI('http://localhost:5001/api/upload', { method: 'POST', body: formData });
        form.reset();
        document.getElementById('evidencia-modal').style.display = 'none';
        showNotification('Evidencia subida correctamente.');
        
        if (currentView === 'informes') {
            cargarVistaDeDetalle(currentInformeId);
        } else {
            cargarRecomendacionesIndependientes();
        }
        handleEvidenciaRecomendacion(formData.get('parent_id'));
    } catch (error) { console.error('Error al subir evidencia:', error); showNotification(`Error: ${error.message}`, 'error'); }
}


// =============================================================
// MÓDULO PARA RECOMENDACIONES INDEPENDIENTES
// =============================================================
function initRecomendacionesModule() {
    document.getElementById('filtro-rec-responsable')?.addEventListener('change', (e) => poblarInstituciones(e.target.value, 'filtro-rec-institucion'));
    document.getElementById('filtro-rec-institucion')?.addEventListener('change', cargarRecomendacionesIndependientes);
    document.getElementById('btn-nueva-recomendacion-independiente')?.addEventListener('click', () => {
        const institucionId = document.getElementById('filtro-rec-institucion').value;
        if(institucionId) {
            handleNuevaRecomendacionClick({ institucionId });
        }
    });
    document.getElementById('recomendaciones-independientes-tbody')?.addEventListener('click', handleRecomendacionesTableClick);
    resetRecomendacionesView();
}

async function resetRecomendacionesView() {
    await poblarSelectConAPI('http://localhost:5001/api/responsables', 'filtro-rec-responsable', 'id_responsable', 'nombre_responsable', 'Seleccione...');
    const instSelect = document.getElementById('filtro-rec-institucion');
    instSelect.innerHTML = '<option value="">Seleccione un responsable...</option>';
    instSelect.disabled = true;
    document.getElementById('recomendaciones-independientes-tbody').innerHTML = '';
    document.getElementById('btn-nueva-recomendacion-independiente').disabled = true;
}


async function cargarRecomendacionesIndependientes() {
    const institucionId = document.getElementById('filtro-rec-institucion').value;
    const btnNueva = document.getElementById('btn-nueva-recomendacion-independiente');
    const tbody = document.getElementById('recomendaciones-independientes-tbody');
    
    currentView = 'recomendaciones';
    btnNueva.disabled = !institucionId;
    
    if (!institucionId) {
        tbody.innerHTML = '<tr><td colspan="8">Seleccione una institución para ver sus recomendaciones.</td></tr>';
        return;
    }
    
    try {
        tbody.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';
        const recomendaciones = await fetchAPI(`http://localhost:5001/api/recomendaciones?institucion_id=${institucionId}`);
        renderRecomendaciones(recomendaciones, 'recomendaciones-independientes-tbody');
    } catch (error) {
        console.error("Error al cargar recomendaciones independientes:", error);
        tbody.innerHTML = '<tr><td colspan="8">Error al cargar datos.</td></tr>';
    }
}

