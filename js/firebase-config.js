(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyAHb8-BZYbCano40rDz9xJTqVSJrXrbD1A",
    authDomain: "sgi-concrefuji.firebaseapp.com",
    databaseURL: "https://sgi-concrefuji-default-rtdb.firebaseio.com",
    projectId: "sgi-concrefuji",
    storageBucket: "sgi-concrefuji.firebasestorage.app",
    messagingSenderId: "811243775203",
    appId: "1:811243775203:web:7647d8c79cbcd19e7fd1d6",
    measurementId: "G-GF740Y87LC",
  };

  const statusEl = document.getElementById("firebaseStatus");
  const statusDotEl = document.getElementById("firebaseStatusDot");

  function setStatus(text, colorClass, textClass) {
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.className = `text-[10px] font-bold uppercase ${textClass}`;
    }

    if (statusDotEl) {
      statusDotEl.className = `flex h-2 w-2 rounded-full ${colorClass}`;
    }
  }

  if (!window.firebase) {
    setStatus("Firebase indisponível", "bg-red-500", "text-red-700");
    window.SGIFirebase = { app: null, database: null, config: firebaseConfig };
    return;
  }

  try {
    const app = firebase.apps.length
      ? firebase.app()
      : firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    window.SGIFirebase = {
      app,
      database,
      config: firebaseConfig,
      root(path) {
        return database.ref(path);
      },
    };

    database
      .ref(".info/connected")
      .on("value", (snapshot) => {
        if (snapshot.val() === true) {
          setStatus("Firebase conectado", "bg-emerald-500 animate-pulse", "text-emerald-700");
        } else {
          setStatus("Firebase offline", "bg-amber-400", "text-amber-700");
        }
      });
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
    setStatus("Erro no Firebase", "bg-red-500", "text-red-700");
    window.SGIFirebase = { app: null, database: null, config: firebaseConfig };
  }
})();
