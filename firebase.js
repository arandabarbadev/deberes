// ===== Firebase: tus deberes en una base de datos en la nube =====
// Entras con tu cuenta de Google (sin token ni contraseña que apuntar)
// y los datos se guardan en Firestore, dentro de TU proyecto de Firebase.
// Esta configuración NO es un secreto: es la dirección pública de tu
// proyecto. La seguridad la ponen las reglas de Firestore + tu sesión.

const CONFIG_FIREBASE = {
  apiKey: 'AIzaSyC1mBofZooE010PRKjCo-fENDYU1lqWbh0',
  authDomain: 'deberes-e3282.firebaseapp.com',
  projectId: 'deberes-e3282',
  storageBucket: 'deberes-e3282.firebasestorage.app',
  messagingSenderId: '457365914046',
  appId: '1:457365914046:web:e3cf994128c4b75da479ef',
  measurementId: 'G-9P4TQD5DYE',
};

// ¿Ya está pegada la configuración?
const NUBE_LISTA = !!CONFIG_FIREBASE.apiKey;

let db = null;
let oyente = null;       // el "oído" puesto en tu documento de la nube
let temporizador = null; // para no subir la nube a cada cambio pequeño
let ultimaSubida = 0;    // lo último que subimos (para no subir dos veces)

// ---------- Poner en marcha Firebase ----------

function iniciarNube() {
  firebase.initializeApp(CONFIG_FIREBASE);
  db = firebase.firestore();
  // Guardar una copia local también sin conexión: al volver internet,
  // Firestore sincroniza solo
  db.enablePersistence({ synchronizeTabs: true }).catch(() => {
    // Si el navegador no deja (p.ej. modo privado), seguimos sin copia offline
  });

  // Botón ⚙️: abrir/cerrar el panel de la cuenta
  document.getElementById('boton-ajustes').addEventListener('click', () => {
    document.getElementById('ajustes').classList.toggle('oculto');
  });

  document.getElementById('boton-cuenta').addEventListener('click', async () => {
    const proveedor = new firebase.auth.GoogleAuthProvider();
    try {
      await firebase.auth().signInWithPopup(proveedor);
    } catch {
      // Si el navegador bloquea la ventanita, va con redirección
      firebase.auth().signInWithRedirect(proveedor);
    }
  });

  document.getElementById('boton-salir').addEventListener('click', () => {
    firebase.auth().signOut();
  });

  // Completar un "entrar" que quedó a medias por redirección
  firebase.auth().getRedirectResult().catch(() => {});

  // Cuando entras o sales, la página se entera aquí
  firebase.auth().onAuthStateChanged(usuario => {
    if (oyente) { oyente(); oyente = null; } // apagar el oído anterior
    dibujarCuenta(usuario);
    if (usuario) escucharNube(usuario.uid);
  });
}

// ---------- El panel ⚙️ ----------

function dibujarCuenta(usuario) {
  const info = document.getElementById('cuenta-info');
  const botonEntrar = document.getElementById('boton-cuenta');
  const botonSalir = document.getElementById('boton-salir');

  if (!usuario) {
    info.replaceChildren();
    info.append(elemento('span', 'sin-sesion',
      'Sin sesión: los deberes se guardan solo en este navegador.'));
    botonEntrar.classList.remove('oculto');
    botonSalir.classList.add('oculto');
    estado('');
    return;
  }

  const contenedor = elemento('span', 'con-sesion');
  const foto = document.createElement('img');
  foto.src = usuario.photoURL || '';
  foto.alt = '';
  contenedor.append(foto, document.createTextNode(' ' + (usuario.displayName || usuario.email)));
  info.replaceChildren(contenedor);
  botonEntrar.classList.add('oculto');
  botonSalir.classList.remove('oculto');
}

// ---------- Escuchar la nube (multi-dispositivo en directo) ----------

function escucharNube(uid) {
  oyente = db.collection('usuarios').doc(uid).onSnapshot(doc => {
    if (!doc.exists) {
      // La nube está vacía: si aquí había deberes, se suben (mudanza)
      if (datos.modificado > 0) subirNube();
      return;
    }
    const remoto = doc.data();
    if ((remoto.modificado || 0) > datos.modificado) {
      datos.tareas = Array.isArray(remoto.tareas) ? remoto.tareas : [];
      datos.modificado = remoto.modificado;
      ultimaSubida = remoto.modificado;
      localStorage.setItem(CLAVE, JSON.stringify(datos));
      dibujar();
      estado('✅ Datos actualizados desde la nube a las ' + new Date().toLocaleTimeString('es-ES'));
    }
  }, error => {
    if (error.code === 'permission-denied') {
      estado('⚠️ La base de datos rechazó la conexión: revisa las reglas de Firestore');
    } else {
      estado('⚠️ Error con la nube: ' + error.message);
    }
  });
}

// ---------- Subir cambios a la nube ----------

// app.js llama a esto cada vez que cambian los datos:
// espera 3 segundos por si haces más cambios y entonces sube
function programarNube() {
  if (!NUBE_LISTA) return;
  clearTimeout(temporizador);
  temporizador = setTimeout(subirNube, 3000);
}

async function subirNube() {
  if (!NUBE_LISTA) return;
  const usuario = firebase.auth().currentUser;
  if (!usuario) return; // sin sesión: solo se guarda en este navegador
  if (datos.modificado <= ultimaSubida) return; // ya está subido
  try {
    await db.collection('usuarios').doc(usuario.uid).set({
      tareas: datos.tareas,
      modificado: datos.modificado,
    });
    ultimaSubida = datos.modificado;
    estado('✅ Guardado en la nube a las ' + new Date().toLocaleTimeString('es-ES'));
  } catch (error) {
    estado('⚠️ No se pudo guardar en la nube: ' + (error.code || error.message));
  }
}

// ---------- Estado (mensaje bajo el título y dentro del panel) ----------

function estado(texto) {
  const panel = document.getElementById('estado-sync');
  if (panel) panel.textContent = texto;
  const global = document.getElementById('estado-global');
  if (global) {
    global.textContent = texto;
    global.className = texto.startsWith('⚠️') ? 'estado-global mal' : 'estado-global';
  }
}

// ---------- Arrancar ----------

function alIniciarNube() {
  if (!NUBE_LISTA) {
    // Sin configurar todavía: la app funciona igual, solo en local
    document.getElementById('boton-ajustes').addEventListener('click', () => {
      document.getElementById('ajustes').classList.toggle('oculto');
    });
    return;
  }
  iniciarNube();
}

alIniciarNube();
