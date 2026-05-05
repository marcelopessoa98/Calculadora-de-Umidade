/**
 * SGI - ConcreFuji | Versao Nuvem Profissional
 * Desenvolvedor: Marcelo Pessoa
 */

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
const SENHA_ADMIN = "fuji2026";

const formCadastro = document.getElementById("formCadastro");
const btnLogin = document.getElementById("btnAdminLogin");
const btnLogout = document.getElementById("btnLogout");
const btnSalvar = document.getElementById("btnSalvarCliente");
const listaClientes = document.getElementById("listaClientes");
const contadorDoc = document.getElementById("contadorClientes");

const inputCliente = document.getElementById("nomeCliente");
const inputObra = document.getElementById("nomeObra");
const inputRef = document.getElementById("refObra");
const inputObs = document.getElementById("obsObra");
const inputEndereco = document.getElementById("enderecoObra");

document.addEventListener("DOMContentLoaded", () => {
  verificarSessao();
  monitorarConexao();
  escutarNuvem();
});

function verificarSessao() {
  const isAdmin = sessionStorage.getItem("isAdmin") === "true";
  if (isAdmin) {
    formCadastro?.classList.remove("hidden");
    btnLogin?.classList.add("hidden");
  } else {
    formCadastro?.classList.add("hidden");
    btnLogin?.classList.remove("hidden");
  }
}

if (btnLogin) {
  btnLogin.onclick = () => {
    const senha = prompt("Acesso Restrito ConcreFuji. Digite a senha:");
    if (senha === SENHA_ADMIN) {
      sessionStorage.setItem("isAdmin", "true");
      verificarSessao();
      database
        .ref("clientes")
        .once("value", (snapshot) => renderizarLista(snapshot.val()));
    } else if (senha !== null) {
      alert("Senha incorreta!");
    }
  };
}

if (btnLogout) {
  btnLogout.onclick = () => {
    sessionStorage.removeItem("isAdmin");
    verificarSessao();
    database
      .ref("clientes")
      .once("value", (snapshot) => renderizarLista(snapshot.val()));
  };
}

function monitorarConexao() {
  database.ref(".info/connected").on("value", (snapshot) => {
    const conectado = snapshot.val() === true;
    if (!conectado) {
      console.warn("Firebase offline: sem conexao com o Realtime Database.");
    } else {
      console.info("Firebase online: conexao ativa com o Realtime Database.");
    }
  });
}

function escutarNuvem() {
  database.ref("clientes").on(
    "value",
    (snapshot) => {
      renderizarLista(snapshot.val());
    },
    (erro) => {
      console.error("Erro ao ler dados de clientes:", erro);
      alert("Falha ao carregar clientes da nuvem. Verifique permissoes/rede.");
    }
  );
}

function salvarCliente() {
  const nome = inputCliente.value.trim();
  const obra = inputObra.value.trim();
  const ref = inputRef.value.trim();
  const obs = inputObs.value.trim();
  const endereco = inputEndereco.value.trim();

  if (!nome || !obra || !ref) return alert("Preencha Nome, Obra e Referencia!");

  const id = Date.now();
  database
    .ref("clientes/" + id)
    .set({
      id,
      nome,
      obra,
      ref,
      obs: obs || "Sem observacoes.",
      endereco: endereco || "",
    })
    .then(() => {
      inputCliente.value = "";
      inputObra.value = "";
      inputRef.value = "";
      inputObs.value = "";
      inputEndereco.value = "";
      alert("Cliente salvo com sucesso na nuvem.");
    })
    .catch((erro) => {
      console.error("Erro ao salvar cliente no Firebase:", erro);
      alert("Nao foi possivel salvar no banco. Confira conexao e regras do Firebase.");
    });
}

if (btnSalvar) {
  btnSalvar.onclick = salvarCliente;
}

function renderizarLista(dados) {
  listaClientes.innerHTML = "";
  const isAdmin = sessionStorage.getItem("isAdmin") === "true";

  if (!dados) {
    contadorDoc.innerText = "0";
    listaClientes.innerHTML = '<li class="text-center py-10 text-gray-300 italic text-sm">Nenhum registro encontrado.</li>';
    return;
  }

  const arrayClientes = Object.values(dados);
  contadorDoc.innerText = arrayClientes.length;

  arrayClientes.reverse().forEach((cliente) => {
    const endereco = (cliente.endereco || "").trim();
    const enderecoHtml = endereco
      ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"><i class="fa-solid fa-location-dot"></i> Endereco</a>`
      : "";

    const li = document.createElement("li");
    li.className =
      "bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm flex justify-between items-start";

    const btnDelete = isAdmin
      ? `<button onclick="deletarCliente(${cliente.id})" class="text-gray-200 hover:text-red-600 transition-colors p-1"><i class="fa-solid fa-trash-can"></i></button>`
      : "";

    li.innerHTML = `
      <div class="flex-1 pr-2">
        <h4 class="font-black text-gray-800 uppercase text-xs tracking-tight">${cliente.nome}</h4>
        <div class="flex flex-wrap gap-2 mt-2">
          <span class="text-[10px] text-gray-500 font-bold bg-gray-50 px-2 py-1 rounded-lg"><i class="fa-solid fa-hard-hat text-red-600 mr-1"></i>${cliente.obra}</span>
          <span class="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-1 rounded-lg uppercase">REF: ${cliente.ref}</span>
          ${enderecoHtml}
        </div>
        <div class="mt-3 p-3 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
          <p class="text-[10px] text-gray-500 italic leading-relaxed">${cliente.obs}</p>
        </div>
      </div>
      ${btnDelete}
    `;
    listaClientes.appendChild(li);
  });
}

function deletarCliente(id) {
  if (confirm("Excluir definitivamente da nuvem?")) {
    database.ref("clientes/" + id).remove();
  }
}
