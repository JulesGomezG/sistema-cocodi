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
        });
    });

    // --- MÓDULO REPORTES ---
    document.getElementById('btn-nuevo-informe')?.addEventListener('click', handleNuevoInformeClick);
    document.getElementById('informe-form')?.addEventListener('submit', handleInformeFormSubmit);
    document.getElementById('informes-tbody')?.addEventListener('click', handleInformeRowClick);
    document.getElementById('btn-volver-a-informes')?.addEventListener('click', showReportesMainView);
    document.getElementById('btn-nueva-recomendacion')?.addEventListener('click', handleNuevaRecomendacionClick);
    document.getElementById('recomendacion-form')?.addEventListener('submit', handleRecomendacionFormSubmit);
    document.getElementById('responsable-select')?.addEventListener('change', (e) => poblarInstitucionesModal(e.target.value));

    // --- MÓDULO SESIONES ---
    document.getElementById('filtro-responsable')?.addEventListener('change', (e) => poblarInstituciones(e.target.value));
    document.getElementById('filtro-institucion')?.addEventListener('change', (e) => poblarOrganosColegiados(e.target.value));
    document.getElementById('filtro-organo')?.addEventListener('change', buscarCalendario);
    document.getElementById('filtro-año')?.addEventListener('change', buscarCalendario);
    document.getElementById('calendario-container')?.addEventListener('click', handleCalendarioClick);
    document.getElementById('ejecucion-form')?.addEventListener('submit', handleEjecucionSubmit);
    document.getElementById('btn-agendar-extraordinaria')?.addEventListener('click', handleAgendarExtraordinaria);

    // --- MANEJO DE TODOS LOS MODALES ---
    document.querySelectorAll('.modal').forEach(modal => {
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (event) => { if (event.target == modal) modal.style.display = 'none'; });
    });

    // --- CARGA INICIAL ---
    poblarResponsables();
});

// --- API HELPER ---
async function fetchAPI(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Error HTTP: ${response.status}` }));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
    }
    return response.status !== 204 ? response.json() : null;
}

// --- LÓGICA MÓDULO REPORTES ---
let currentInformeId = null;

function showReportesMainView() {
    document.getElementById('reportes-main-view').classList.remove('hidden');
    document.getElementById('reportes-detail-view').classList.add('hidden');
    cargarInformes();
}

function showReportesDetailView() {
    document.getElementById('reportes-main-view').classList.add('hidden');
    document.getElementById('reportes-detail-view').classList.remove('hidden');
}

async function cargarInformes() {
    try {
        const informes = await fetchAPI('http://localhost:5001/api/informes');
        const tbody = document.getElementById('informes-tbody');
        tbody.innerHTML = '';
        if (informes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No hay informes.</td></tr>';
        } else {
            informes.forEach(informe => {
                const tr = document.createElement('tr');
                tr.dataset.informeId = informe.id_informe;
                tr.innerHTML = `<td>${informe.siglas}</td><td>${informe.tipo_informe}</td><td>${informe.periodo}</td><td>${new Date(informe.fecha_informe).toLocaleDateString()}</td><td>${informe.nombre_responsable}</td>`;
                tbody.appendChild(tr);
            });
        }
    } catch (error) { console.error("Error al cargar informes:", error); }
}

async function handleNuevoInformeClick() { 
    try {
        const responsables = await fetchAPI('http://localhost:5001/api/responsables');
        const periodoSelect = document.getElementById('periodo-select');
        const añoActual = new Date().getFullYear();
        periodoSelect.innerHTML = '';
        for (let i = 2030; i >= 2024; i--) {
            periodoSelect.add(new Option(i, i));
        }
        periodoSelect.value = añoActual;
        const responsableSelect = document.getElementById('responsable-select');
        responsableSelect.innerHTML = '<option value="">Seleccione...</option>';
        responsables.forEach(r => responsableSelect.add(new Option(r.nombre_responsable, r.id_responsable)));
        const institucionSelect = document.getElementById('institucion-select');
        institucionSelect.innerHTML = '<option value="">Seleccione un responsable...</option>';
        institucionSelect.disabled = true;
        document.getElementById('informe-modal').style.display = 'flex';
    } catch (error) { console.error("Error al preparar formulario:", error); }
}

async function poblarInstitucionesModal(responsableId) {
    const institucionSelect = document.getElementById('institucion-select');
    institucionSelect.innerHTML = '<option value="">Seleccione...</option>';
    institucionSelect.disabled = true;
    if (!responsableId) return;
    try {
        institucionSelect.innerHTML = '<option value="">Cargando...</option>';
        const instituciones = await fetchAPI(`http://localhost:5001/api/instituciones?responsable_id=${responsableId}`);
        let optionsHTML = '<option value="">Seleccione...</option>';
        instituciones.forEach(inst => { optionsHTML += `<option value="${inst.id_institucion}">${inst.nombre_institucion}</option>`; });
        institucionSelect.innerHTML = optionsHTML;
        institucionSelect.disabled = false;
    } catch (error) { console.error("Fallo en poblarInstituciones del modal:", error); }
}

async function handleInformeFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    try {
        await fetchAPI('http://localhost:5001/api/informes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        form.reset();
        document.getElementById('informe-modal').style.display = 'none';
        cargarInformes();
    } catch (error) { console.error("Error al guardar informe:", error); alert(`Error: ${error.message}`); }
}

async function handleInformeRowClick(event) {
    const row = event.target.closest('tr');
    if (row && row.dataset.informeId) {
        await cargarVistaDeDetalle(row.dataset.informeId);
    }
}

async function cargarVistaDeDetalle(informeId) {
    currentInformeId = informeId;
    try {
        const [informe, recomendaciones] = await Promise.all([
            fetchAPI(`http://localhost:5001/api/informes/${informeId}`),
            fetchAPI(`http://localhost:5001/api/recomendaciones?informe_id=${informeId}`)
        ]);
        document.getElementById('informe-detalle-header').innerHTML = `<h2>${informe.tipo_informe} - ${informe.periodo}</h2><p><strong>Institución:</strong> ${informe.nombre_institucion}</p>`;
        renderRecomendaciones(recomendaciones);
        showReportesDetailView();
    } catch (error) { console.error("Error al cargar vista de detalle:", error); }
}

function renderRecomendaciones(recomendaciones) {
    const tbody = document.getElementById('recomendaciones-tbody');
    tbody.innerHTML = '';
    if (recomendaciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No hay recomendaciones.</td></tr>';
    } else {
        recomendaciones.forEach(rec => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${rec.descripcion}</td><td>${rec.area_responsable_atencion}</td><td>${rec.fecha_compromiso ? new Date(rec.fecha_compromiso).toLocaleDateString() : 'N/A'}</td><td>${rec.estatus}</td><td>${rec.prioridad}</td>`;
            tbody.appendChild(tr);
        });
    }
}

function handleNuevaRecomendacionClick() {
    document.getElementById('recomendacion-form').reset();
    document.getElementById('recomendacion-modal').style.display = 'flex';
}

async function handleRecomendacionFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.id_informe = currentInformeId;
    try {
        await fetchAPI('http://localhost:5001/api/recomendaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        form.reset();
        document.getElementById('recomendacion-modal').style.display = 'none';
        cargarVistaDeDetalle(currentInformeId);
    } catch (error) { console.error("Error al guardar recomendación:", error); }
}

// --- LÓGICA MÓDULO SESIONES ---
async function poblarResponsables() {
    try {
        const responsables = await fetchAPI('http://localhost:5001/api/responsables');
        const select = document.getElementById('filtro-responsable');
        let optionsHTML = '<option value="">Seleccione...</option>';
        responsables.forEach(r => { optionsHTML += `<option value="${r.id_responsable}">${r.nombre_responsable}</option>`; });
        select.innerHTML = optionsHTML;
    } catch (error) { console.error("Fallo en poblarResponsables:", error); }
}
async function poblarInstituciones(responsableId) {
    const selectInstitucion = document.getElementById('filtro-institucion');
    const selectOrgano = document.getElementById('filtro-organo');
    selectInstitucion.innerHTML = '<option value="">Seleccione...</option>';
    selectOrgano.innerHTML = '<option value="">Seleccione...</option>';
    selectInstitucion.disabled = true;
    selectOrgano.disabled = true;
    if (!responsableId) { buscarCalendario(); return; }
    try {
        selectInstitucion.innerHTML = '<option value="">Cargando...</option>';
        const instituciones = await fetchAPI(`http://localhost:5001/api/instituciones?responsable_id=${responsableId}`);
        let optionsHTML = '<option value="">Seleccione...</option>';
        instituciones.forEach(inst => { optionsHTML += `<option value="${inst.id_institucion}">${inst.nombre_institucion}</option>`; });
        selectInstitucion.innerHTML = optionsHTML;
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
        const organos = await fetchAPI(`http://localhost:5001/api/organos-colegiados?institucion_id=${institucionId}`);
        let optionsHTML = '<option value="">Seleccione...</option>';
        organos.forEach(org => { optionsHTML += `<option value="${org.id_organo_colegiado}">${org.nombre_organo}</option>`; });
        selectOrgano.innerHTML = optionsHTML;
        selectOrgano.disabled = false;
        if (organos.length === 1) { selectOrgano.value = organos[0].id_organo_colegiado; }
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
        container.innerHTML = '<p>Por favor, complete los filtros.</p>';
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
    if (!sesiones || sesiones.length === 0) { container.innerHTML = '<p>No hay sesiones programadas.</p>'; return; }
    sesiones.forEach(sesion => {
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
            button.className = 'btn-registrar';
            button.textContent = 'Registrar Ejecución';
            card.appendChild(button);
        }
        container.appendChild(card);
    });
}
function handleCalendarioClick(event) {
    if (event.target.classList.contains('btn-registrar')) {
        const card = event.target.closest('.sesion-card');
        const idCalendario = card.dataset.idCalendario;
        abrirModalEjecucion('ordinaria', idCalendario);
    }
}
function handleAgendarExtraordinaria() {
    abrirModalEjecucion('extraordinaria');
}
function abrirModalEjecucion(modo, idCalendario = null) {
    const modal = document.getElementById('ejecucion-modal');
    const form = document.getElementById('ejecucion-form');
    const modalTitle = document.getElementById('modal-title');
    const idCalendarioHidden = document.getElementById('id_calendario_hidden');
    form.reset();
    modalTitle.textContent = modo === 'extraordinaria' ? 'Registrar Sesión Extraordinaria' : 'Registrar Ejecución de Sesión Ordinaria';
    idCalendarioHidden.value = modo === 'extraordinaria' ? '' : idCalendario;
    modal.style.display = 'flex';
}
async function handleEjecucionSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const idCalendario = data.id_calendario;
    let url, body;
    if (idCalendario) {
        url = 'http://localhost:5001/api/ejecucion-sesiones';
        body = data;
    } else {
        url = 'http://localhost:5001/api/sesiones-extraordinarias';
        body = {
            ...data,
            año: document.getElementById('filtro-año').value,
            institucion_id: document.getElementById('filtro-institucion').value,
            organo_id: document.getElementById('filtro-organo').value,
        };
    }
    try {
        await fetchAPI(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        form.reset();
        document.getElementById('ejecucion-modal').style.display = 'none';
        buscarCalendario();
    } catch (error) {
        console.error('Error al guardar:', error);
        alert(`Error: ${error.message}`);
    }
}
