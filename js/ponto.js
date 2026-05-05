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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const MODELS_URI = "https://justadudewhohacks.github.io/face-api.js/models";
const MATCH_THRESHOLD = 0.55;
const ADMIN_SENHA = "fuji2026";

const video = document.getElementById("video");
const btnIniciarCamera = document.getElementById("btnIniciarCamera");
const btnCadastrarFace = document.getElementById("btnCadastrarFace");
const btnRegistrarPonto = document.getElementById("btnRegistrarPonto");
const statusEl = document.getElementById("status");

const btnAdminAcesso = document.getElementById("btnAdminAcesso");
const btnLogoutAdmin = document.getElementById("btnLogoutAdmin");
const secaoAdmin = document.getElementById("secaoAdmin");

const funcionarioIdInput = document.getElementById("funcionarioId");
const funcionarioNomeInput = document.getElementById("funcionarioNome");
const funcionarioSenhaInput = document.getElementById("funcionarioSenha");

const loginFuncionarioId = document.getElementById("loginFuncionarioId");
const loginFuncionarioSenha = document.getElementById("loginFuncionarioSenha");
const btnLoginFuncionario = document.getElementById("btnLoginFuncionario");
const btnLogoutFuncionario = document.getElementById("btnLogoutFuncionario");
const funcionarioLogadoInfo = document.getElementById("funcionarioLogadoInfo");

let cameraAtiva = false;
let modelosCarregados = false;
let funcionarioLogado = null;

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = isError
    ? "text-xs text-red-600 leading-relaxed"
    : "text-xs text-gray-500 leading-relaxed";
}

function isAdmin() {
  return sessionStorage.getItem("isAdminPonto") === "true";
}

function atualizarUIAdmin() {
  if (isAdmin()) {
    secaoAdmin.classList.remove("hidden");
    btnAdminAcesso.classList.add("hidden");
  } else {
    secaoAdmin.classList.add("hidden");
    btnAdminAcesso.classList.remove("hidden");
  }
}

function atualizarUIFuncionario() {
  if (funcionarioLogado) {
    funcionarioLogadoInfo.textContent = `Logado: ${funcionarioLogado.nome} (${funcionarioLogado.funcionarioId})`;
    btnRegistrarPonto.disabled = false;
    btnRegistrarPonto.classList.remove("opacity-50", "cursor-not-allowed");
  } else {
    funcionarioLogadoInfo.textContent = "Nenhum funcionário logado.";
    btnRegistrarPonto.disabled = true;
    btnRegistrarPonto.classList.add("opacity-50", "cursor-not-allowed");
  }
}

async function carregarModelos() {
  if (modelosCarregados) return;
  setStatus("Carregando modelos de reconhecimento facial...");

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URI),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URI),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URI),
  ]);

  modelosCarregados = true;
  setStatus("Modelos carregados com sucesso.");
}

async function iniciarCamera() {
  if (cameraAtiva) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    video.srcObject = stream;
    cameraAtiva = true;
    setStatus("Câmera ativa. Posicione o rosto no centro.");
  } catch (err) {
    console.error(err);
    setStatus("Não foi possível acessar a câmera. Verifique as permissões.", true);
  }
}

async function capturarDescriptorAtual() {
  if (!cameraAtiva) throw new Error("Ative a câmera antes de continuar.");
  await carregarModelos();

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) throw new Error("Nenhum rosto detectado. Aproxime-se e tente novamente.");
  return Array.from(detection.descriptor);
}

function obterLocalizacao() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null, accuracy: null, error: "Geolocalização não suportada" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, error: null }),
      (err) => resolve({ latitude: null, longitude: null, accuracy: null, error: err.message }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

async function cadastrarFaceFuncionario() {
  if (!isAdmin()) {
    setStatus("Apenas administrador pode cadastrar funcionários.", true);
    return;
  }

  const funcionarioId = funcionarioIdInput.value.trim();
  const funcionarioNome = funcionarioNomeInput.value.trim();
  const funcionarioSenha = funcionarioSenhaInput.value.trim();

  if (!funcionarioId || !funcionarioNome || !funcionarioSenha) {
    setStatus("Preencha matrícula, nome e senha do funcionário.", true);
    return;
  }

  try {
    setStatus("Capturando face para cadastro...");
    const descriptor = await capturarDescriptorAtual();

    await database.ref("funcionarios/" + funcionarioId).set({
      funcionarioId,
      nome: funcionarioNome,
      senha: funcionarioSenha,
      faceDescriptor: descriptor,
      atualizadoEm: new Date().toISOString(),
    });

    funcionarioIdInput.value = "";
    funcionarioNomeInput.value = "";
    funcionarioSenhaInput.value = "";
    setStatus("Funcionário cadastrado com sucesso.");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Falha no cadastro facial.", true);
  }
}

async function loginFuncionario() {
  const funcionarioId = loginFuncionarioId.value.trim();
  const senha = loginFuncionarioSenha.value.trim();

  if (!funcionarioId || !senha) {
    setStatus("Informe matrícula e senha para login.", true);
    return;
  }

  try {
    const snapshot = await database.ref("funcionarios/" + funcionarioId).once("value");
    const funcionario = snapshot.val();

    if (!funcionario) {
      setStatus("Funcionário não encontrado.", true);
      return;
    }

    if (funcionario.senha !== senha) {
      setStatus("Senha inválida para este funcionário.", true);
      return;
    }

    funcionarioLogado = {
      funcionarioId: funcionario.funcionarioId,
      nome: funcionario.nome,
      faceDescriptor: funcionario.faceDescriptor,
    };
    loginFuncionarioSenha.value = "";
    atualizarUIFuncionario();
    setStatus(`Login efetuado. ${funcionario.nome} já pode bater ponto.`);
  } catch (err) {
    console.error(err);
    setStatus("Erro ao realizar login do funcionário.", true);
  }
}

function logoutFuncionario() {
  funcionarioLogado = null;
  atualizarUIFuncionario();
  setStatus("Logout realizado.");
}

async function registrarPonto() {
  if (!funcionarioLogado) {
    setStatus("Faça login do funcionário antes de bater ponto.", true);
    return;
  }

  try {
    setStatus("Validando rosto e coletando localização...");

    const queryDescriptor = await capturarDescriptorAtual();
    const descriptorCadastro = funcionarioLogado.faceDescriptor;

    if (!Array.isArray(descriptorCadastro)) {
      throw new Error("Cadastro facial inválido para este funcionário.");
    }

    const distancia = faceapi.euclideanDistance(queryDescriptor, descriptorCadastro);
    if (distancia > MATCH_THRESHOLD) {
      setStatus("Rosto não confere com o funcionário logado.", true);
      return;
    }

    const geo = await obterLocalizacao();
    const agora = new Date();
    const registroId = Date.now().toString();

    await database.ref("pontos/" + registroId).set({
      registroId,
      funcionarioId: funcionarioLogado.funcionarioId,
      nome: funcionarioLogado.nome,
      distanciaFace: Number(distancia.toFixed(4)),
      limiteAceito: MATCH_THRESHOLD,
      dataIso: agora.toISOString(),
      dataLocal: agora.toLocaleString("pt-BR"),
      localizacao: {
        latitude: geo.latitude,
        longitude: geo.longitude,
        precisaoMetros: geo.accuracy,
        erro: geo.error,
      },
      dispositivo: navigator.userAgent,
    });

    setStatus(`Ponto registrado para ${funcionarioLogado.nome} às ${agora.toLocaleTimeString("pt-BR")}.`);
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Erro ao registrar ponto.", true);
  }
}

btnAdminAcesso.addEventListener("click", () => {
  const senha = prompt("Digite a senha de administrador:");
  if (senha === ADMIN_SENHA) {
    sessionStorage.setItem("isAdminPonto", "true");
    atualizarUIAdmin();
    setStatus("Área do administrador liberada.");
  } else if (senha !== null) {
    setStatus("Senha de administrador inválida.", true);
  }
});

btnLogoutAdmin.addEventListener("click", () => {
  sessionStorage.removeItem("isAdminPonto");
  atualizarUIAdmin();
  setStatus("Admin desconectado.");
});

btnIniciarCamera.addEventListener("click", iniciarCamera);
btnCadastrarFace.addEventListener("click", cadastrarFaceFuncionario);
btnRegistrarPonto.addEventListener("click", registrarPonto);
btnLoginFuncionario.addEventListener("click", loginFuncionario);
btnLogoutFuncionario.addEventListener("click", logoutFuncionario);

atualizarUIAdmin();
atualizarUIFuncionario();
