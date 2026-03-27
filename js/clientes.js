/**
 * SGI - ConcreFuji
 * Gestão de Clientes com Autenticação Administrativa
 */

const SENHA_ADMIN = "fuji2026"; // Altere sua senha aqui

// Elementos
const formCadastro = document.getElementById("formCadastro");
const btnLogin = document.getElementById("btnAdminLogin");
const btnLogout = document.getElementById("btnLogout");
const btnSalvar = document.getElementById("btnSalvarCliente");
const listaClientes = document.getElementById("listaClientes");

// Inputs
const inputCliente = document.getElementById("nomeCliente");
const inputObra = document.getElementById("nomeObra");
const inputRef = document.getElementById("refObra");
const inputObs = document.getElementById("obsObra");

document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
  verificarSessao();
});

// --- Lógica de Segurança ---

btnLogin.addEventListener("click", () => {
  const senha = prompt("Digite a senha de administrador:");
  if (senha === SENHA_ADMIN) {
    sessionStorage.setItem("isAdmin", "true");
    verificarSessao();
  } else if (senha !== null) {
    alert("Senha incorreta!");
  }
});

btnLogout.addEventListener("click", () => {
  sessionStorage.removeItem("isAdmin");
  verificarSessao();
});

function verificarSessao() {
  const isAdmin = sessionStorage.getItem("isAdmin") === "true";
  if (isAdmin) {
    formCadastro.classList.remove("hidden");
    btnLogin.classList.add("hidden");
  } else {
    formCadastro.classList.add("hidden");
    btnLogin.classList.remove("hidden");
  }
  carregarClientes(); // Recarrega para mostrar/esconder botões de delete
}

// --- Lógica de Dados ---

function salvarCliente() {
  const nome = inputCliente.value.trim();
  const obra = inputObra.value.trim();
  const ref = inputRef.value.trim();
  const obs = inputObs.value.trim();

  if (!nome || !obra || !ref) return alert("Preencha os campos obrigatórios!");

  const novoCliente = {
    id: Date.now(),
    nome,
    obra,
    ref,
    obs: obs || "Sem observações.",
  };

  const clientes =
    JSON.parse(localStorage.getItem("concrefuji_clientes")) || [];
  clientes.push(novoCliente);
  localStorage.setItem("concrefuji_clientes", JSON.stringify(clientes));

  // Limpar campos
  [inputCliente, inputObra, inputRef, inputObs].forEach((i) => (i.value = ""));
  carregarClientes();
}

btnSalvar.addEventListener("click", salvarCliente);

function carregarClientes() {
  listaClientes.innerHTML = "";
  const clientes =
    JSON.parse(localStorage.getItem("concrefuji_clientes")) || [];
  const isAdmin = sessionStorage.getItem("isAdmin") === "true";

  document.getElementById("contadorClientes").innerText = clientes.length;

  if (clientes.length === 0) {
    listaClientes.innerHTML = `<li class="text-center py-10 text-gray-400 text-sm italic">Nenhuma obra cadastrada.</li>`;
    return;
  }

  clientes.forEach((cliente) => {
    const li = document.createElement("li");
    li.className =
      "bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all";

    // Só mostra o botão de deletar se for Admin
    const btnDelete = isAdmin
      ? `<button onclick="deletarCliente(${cliente.id})" class="text-gray-300 hover:text-red-600 transition-colors">
                <i class="fa-solid fa-trash-can"></i>
            </button>`
      : "";

    li.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h4 class="font-black text-gray-800 uppercase text-sm tracking-tight">${cliente.nome}</h4>
                    <div class="flex items-center gap-3 mt-1">
                        <span class="text-[11px] text-gray-500 font-medium"><i class="fa-solid fa-building text-red-500 mr-1"></i> ${cliente.obra}</span>
                        <span class="text-[11px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-md">REF: ${cliente.ref}</span>
                    </div>
                    <div class="mt-3 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p class="text-[11px] text-gray-600 leading-relaxed italic">"${cliente.obs}"</p>
                    </div>
                </div>
                ${btnDelete}
            </div>
        `;
    listaClientes.appendChild(li);
  });
}

function deletarCliente(id) {
  if (!confirm("Deseja realmente excluir este registro?")) return;
  let clientes = JSON.parse(localStorage.getItem("concrefuji_clientes")) || [];
  clientes = clientes.filter((c) => c.id !== id);
  localStorage.setItem("concrefuji_clientes", JSON.stringify(clientes));
  carregarClientes();
}
