/**
 * SGI - ConcreFuji | Cloud Version (Firebase Realtime Database)
 * Desenvolvido por: Marcelo Pessoa
 */

// 1. Configuração do Firebase com suas credenciais
const firebaseConfig = {
    apiKey: "AIzaSyAHb8-BZYbCano40rDz9xJTqVSJrXrbD1A",
    authDomain: "sgi-concrefuji.firebaseapp.com",
    databaseURL: "https://sgi-concrefuji-default-rtdb.firebaseio.com",
    projectId: "sgi-concrefuji",
    storageBucket: "sgi-concrefuji.firebasestorage.app",
    messagingSenderId: "811243775203",
    appId: "1:811243775203:web:7647d8c79cbcd19e7fd1d6",
    measurementId: "G-GF740Y87LC"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const SENHA_ADMIN = "fuji2026";

// Elementos da Interface
const formCadastro = document.getElementById('formCadastro');
const btnLogin = document.getElementById('btnAdminLogin');
const btnLogout = document.getElementById('btnLogout');
const btnSalvar = document.getElementById('btnSalvarCliente');
const listaClientes = document.getElementById('listaClientes');
const contadorDoc = document.getElementById('contadorClientes');

// Inputs
const inputCliente = document.getElementById('nomeCliente');
const inputObra = document.getElementById('nomeObra');
const inputRef = document.getElementById('refObra');
const inputObs = document.getElementById('obsObra');

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    verificarSessao();
    escutarBancoDeDados();
});

// --- Lógica de Segurança (Admin) ---
btnLogin.addEventListener('click', () => {
    const senha = prompt("Acesso Restrito. Digite a senha de administrador:");
    if (senha === SENHA_ADMIN) {
        sessionStorage.setItem('isAdmin', 'true');
        verificarSessao();
    } else if (senha !== null) {
        alert("Senha incorreta!");
    }
});

btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('isAdmin');
    verificarSessao();
});

function verificarSessao() {
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    if (isAdmin) {
        formCadastro.classList.remove('hidden');
        btnLogin.classList.add('hidden');
    } else {
        formCadastro.classList.add('hidden');
        btnLogin.classList.remove('hidden');
    }
}

// --- Operações no Banco de Dados (Firebase) ---

// Escuta mudanças na nuvem em tempo real
function escutarBancoDeDados() {
    database.ref('clientes').on('value', (snapshot) => {
        const dados = snapshot.val();
        renderizarLista(dados);
    });
}

function salvarCliente() {
    const nome = inputCliente.value.trim();
    const obra = inputObra.value.trim();
    const ref = inputRef.value.trim();
    const obs = inputObs.value.trim();

    if (!nome || !obra || !ref) return alert("Por favor, preencha os campos obrigatórios!");

    const id = Date.now();
    
    // Envia para a nuvem
    database.ref('clientes/' + id).set({
        id,
        nome,
        obra,
        ref,
        obs: obs || "Sem observações adicionais."
    }).then(() => {
        // Limpar campos após sucesso
        inputCliente.value = '';
        inputObra.value = '';
        inputRef.value = '';
        inputObs.value = '';
    }).catch(error => {
        console.error("Erro ao salvar:", error);
        alert("Erro de conexão com a nuvem.");
    });
}

btnSalvar.addEventListener('click', salvarCliente);

function renderizarLista(dados) {
    listaClientes.innerHTML = '';
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true');

    if (!dados) {
        contadorDoc.innerText = "0";
        listaClientes.innerHTML = `<li class="text-center py-10 text-gray-400 text-sm italic">Nenhuma obra cadastrada na nuvem.</li>`;
        return;
    }

    const arrayClientes = Object.values(dados);
    contadorDoc.innerText = arrayClientes.length;

    // Listar do mais recente para o mais antigo
    arrayClientes.reverse().forEach(cliente => {
        const li = document.createElement('li');
        li.className = "bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-start animate-in fade-in duration-300";
        
        const btnDelete = isAdmin ? 
            `<button onclick="deletarCliente(${cliente.id})" class="text-gray-300 hover:text-red-600 p-2 transition-colors">
                <i class="fa-solid fa-trash-can"></i>
            </button>` : '';

        li.innerHTML = `
            <div class="flex-1 pr-4">
                <h4 class="font-black text-gray-800 uppercase text-sm tracking-tight">${cliente.nome}</h4>
                <div class="flex items-center gap-3 mt-1">
                    <span class="text-[11px] text-gray-500 font-medium">
                        <i class="fa-solid fa-building text-red-500 mr-1"></i> ${cliente.obra}
                    </span>
                    <span class="text-[11px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-md uppercase">
                        Ref: ${cliente.ref}
                    </span>
                </div>
                <div class="mt-3 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p class="text-[11px] text-gray-600 leading-relaxed italic">"${cliente.obs}"</p>
                </div>
            </div>
            ${btnDelete}
        `;
        listaClientes.appendChild(li);
    });
}

function deletarCliente(id) {
    if (confirm("Deseja excluir permanentemente este cliente da nuvem da ConcreFuji?")) {
        database.ref('clientes/' + id).remove();
    }
}