// ===== Mis deberes =====
// Dos apartados: pendientes y completados.
// Al añadir una tarea: asignatura, fecha de entrega y en qué consiste.
// Cuando pasa el día de entrega, la tarea se elimina sola.
// Los datos se guardan en el navegador (localStorage) y, si entras con
// tu cuenta en ⚙️, también en tu base de datos de Firebase (ver firebase.js).

const CLAVE = 'misDeberesV1';
const MENSAJE_MOTIVADOR = 'El esfuerzo de hoy es el éxito del mañana.';

// ---------- Datos ----------

function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    if (guardado && Array.isArray(guardado.tareas)) {
      return { tareas: guardado.tareas, modificado: guardado.modificado || 0 };
    }
  } catch {
    // Si los datos guardados están rotos, se empieza de cero
  }
  return { tareas: [], modificado: 0 };
}

const datos = cargar();

function guardar() {
  datos.modificado = Date.now(); // cuándo se cambió por última vez (para la nube)
  localStorage.setItem(CLAVE, JSON.stringify(datos));
  if (typeof programarNube === 'function') programarNube();
}

const idNuevo = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Fechas ----------

// Hoy a medianoche, para comparar días enteros (sin horas ni minutos)
function hoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// 'YYYY-MM-DD' → Date a medianoche (la T00:00 evita líos de zona horaria)
const fechaDe = texto => new Date(texto + 'T00:00');

function diasQueFaltan(fecha) {
  return Math.round((fechaDe(fecha) - hoy()) / 86400000);
}

const fechaBonita = fecha =>
  fechaDe(fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

function textoEntrega(fecha) {
  const dias = diasQueFaltan(fecha);
  if (dias === 0) return '¡hoy!';
  if (dias === 1) return 'mañana';
  return 'en ' + dias + ' días';
}

// ---------- Autolimpieza: pasado el día de entrega, la tarea se elimina ----------

function quitarPasadas() {
  const antes = datos.tareas.length;
  datos.tareas = datos.tareas.filter(t => diasQueFaltan(t.fecha) >= 0);
  if (datos.tareas.length !== antes) guardar(); // el cambio también se sube a GitHub
}

// ---------- Ayudas para crear elementos ----------

function elemento(tag, clase, texto) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function botonIcono(caracter, titulo, alPulsar, extra) {
  const boton = elemento('button', 'icono' + (extra ? ' ' + extra : ''), caracter);
  boton.type = 'button';
  boton.title = titulo;
  boton.setAttribute('aria-label', titulo);
  boton.addEventListener('click', alPulsar);
  return boton;
}

// ---------- Dibujar la página ----------

// La web se abre en Pendientes
let pestañaActual = 'pendientes';
let diaComprobado = hoy().getTime();

function dibujar() {
  dibujarFecha();
  dibujarPestanas();
  document.getElementById('seccion-pendientes').classList.toggle('oculto', pestañaActual !== 'pendientes');
  document.getElementById('seccion-completados').classList.toggle('oculto', pestañaActual !== 'completados');
  dibujarPendientes();
  dibujarCompletados();
  dibujarAsignaturas();
}

function dibujarFecha() {
  const hoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  document.getElementById('fecha-hoy').textContent = 'Hoy es ' + hoy;
}

function dibujarPestanas() {
  const pendientes = datos.tareas.filter(t => !t.hecha).length;
  const completadas = datos.tareas.length - pendientes;
  const nav = document.getElementById('pestanas');
  nav.replaceChildren();
  [['pendientes', 'Pendientes', pendientes], ['completados', 'Completados', completadas]].forEach(([id, nombre, total]) => {
    const boton = elemento('button', null, `${nombre} (${total})`);
    boton.type = 'button';
    if (id === pestañaActual) boton.classList.add('activo');
    boton.addEventListener('click', () => { pestañaActual = id; dibujar(); });
    nav.append(boton);
  });
}

// Sugerencias al escribir la asignatura: las que ya has usado
function dibujarAsignaturas() {
  const datalist = document.getElementById('lista-asignaturas');
  datalist.replaceChildren(
    ...[...new Set(datos.tareas.map(t => t.asignatura))].slice(0, 15)
      .map(a => elemento('option', null, a)),
  );
}

// ---------- Pendientes ----------

function dibujarPendientes() {
  const lista = document.getElementById('lista-pendientes');
  lista.replaceChildren();

  const pendientes = datos.tareas
    .filter(t => !t.hecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha)); // la más urgente, la primera

  if (pendientes.length === 0) {
    lista.append(elemento('li', 'motivador', MENSAJE_MOTIVADOR));
    return;
  }

  pendientes.forEach(t => lista.append(filaDeber(t, 'pendientes')));
}

// ---------- Completados ----------

function dibujarCompletados() {
  const lista = document.getElementById('lista-completados');
  lista.replaceChildren();

  const completadas = datos.tareas
    .filter(t => t.hecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (completadas.length === 0) {
    lista.append(elemento('li', 'vacio', 'Aún no has completado ninguna tarea.'));
  } else {
    completadas.forEach(t => lista.append(filaDeber(t, 'completados')));
  }

  document.getElementById('quitar-hechas').classList.toggle(
    'oculto', completadas.length === 0,
  );
}

// ---------- Una fila de deber (en cualquiera de los dos apartados) ----------

function filaDeber(t, seccion) {
  const li = elemento('li', 'deber' + (t.hecha ? ' hecha' : ''));
  li.dataset.id = t.id;

  const cuerpo = elemento('div', 'cuerpo');
  cuerpo.append(elemento('span', 'chip', t.asignatura));
  cuerpo.append(elemento('span', 'texto', t.texto));

  const entrega = elemento('div', 'entrega' + (!t.hecha && diasQueFaltan(t.fecha) === 0 ? ' hoy' : ''));
  entrega.append(elemento('span', 'fecha', fechaBonita(t.fecha)));
  entrega.append(elemento('span', 'cuenta', t.hecha ? 'hecha' : textoEntrega(t.fecha)));

  const acciones = elemento('div', 'acciones');
  if (seccion === 'pendientes') {
    acciones.append(botonIcono('✓', 'Marcar como completada', () => completar(t.id), 'ok'));
    acciones.append(botonIcono('✎', 'Editar', () => editar(t.id)));
  } else {
    acciones.append(botonIcono('↩', 'Devolver a pendientes', () => deshacer(t.id)));
  }
  acciones.append(botonIcono('✕', 'Borrar', () => borrar(t.id), 'borrar'));

  li.append(cuerpo, entrega, acciones);
  return li;
}

function completar(id) {
  const t = datos.tareas.find(x => x.id === id);
  t.hecha = true;
  guardar();
  dibujar();
}

function deshacer(id) {
  const t = datos.tareas.find(x => x.id === id);
  t.hecha = false;
  guardar();
  dibujar();
}

function borrar(id) {
  const t = datos.tareas.find(x => x.id === id);
  if (confirm(`¿Borrar "${t.asignatura}: ${t.texto}"?`)) {
    datos.tareas = datos.tareas.filter(x => x.id !== id);
    guardar();
    dibujar();
  }
}

// ---------- Editar una tarea (el formulario ocupa su fila) ----------

function editar(id) {
  const t = datos.tareas.find(x => x.id === id);
  const li = document.querySelector(`#lista-pendientes .deber[data-id="${id}"]`);

  const form = elemento('form', 'form-editar');

  const fecha = document.createElement('input');
  fecha.type = 'date';
  fecha.value = t.fecha;
  fecha.required = true;

  const asignatura = document.createElement('input');
  asignatura.type = 'text';
  asignatura.value = t.asignatura;
  asignatura.maxLength = 30;
  asignatura.required = true;

  const texto = document.createElement('input');
  texto.type = 'text';
  texto.value = t.texto;
  texto.maxLength = 140;
  texto.required = true;
  texto.className = 'campo-largo';

  const botones = elemento('div', 'acciones');
  botones.append(botonIcono('✓', 'Guardar cambios', () => form.requestSubmit(), 'ok'));
  botones.append(botonIcono('✕', 'Cancelar', () => dibujar()));

  form.append(asignatura, fecha, botones, texto);
  form.addEventListener('submit', evento => {
    evento.preventDefault();
    t.fecha = fecha.value;
    t.asignatura = asignatura.value.trim();
    t.texto = texto.value.trim();
    guardar();
    dibujar();
  });

  li.replaceChildren(form);
  asignatura.focus();
}

// ---------- Formulario para añadir ----------

// No se pueden añadir deberes para días que ya pasaron
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
document.getElementById('fecha').min = hoyISO();

document.getElementById('form-nueva').addEventListener('submit', evento => {
  evento.preventDefault();
  const asignatura = document.getElementById('asignatura');
  const fecha = document.getElementById('fecha');
  const texto = document.getElementById('texto');
  datos.tareas.push({
    id: idNuevo(),
    asignatura: asignatura.value.trim(),
    fecha: fecha.value,
    texto: texto.value.trim(),
    hecha: false,
  });
  guardar();
  evento.target.reset();
  fecha.min = hoyISO();
  pestañaActual = 'pendientes';
  dibujar();
  asignatura.focus();
});

document.getElementById('quitar-hechas').addEventListener('click', () => {
  if (confirm('¿Quitar todas las tareas completadas?')) {
    datos.tareas = datos.tareas.filter(t => !t.hecha);
    guardar();
    dibujar();
  }
});

// Medianoche: si el día cambia con la web abierta, eliminar las pasadas
setInterval(() => {
  if (hoy().getTime() !== diaComprobado) {
    diaComprobado = hoy().getTime();
    quitarPasadas();
    dibujar();
  }
}, 60000);

// Registrar el service worker: así la web se instala como app
// y funciona incluso sin conexión (en el PC con el archivo suelto no hace falta)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js');
}

// Al arrancar: fuera las tareas pasadas y ¡a por los deberes!
quitarPasadas();
dibujar();
