/**
 * SGI - ConcreFuji
 * Módulo de Treinamentos Internos
 */

const treinamentos = [
  {
    titulo: "Moldagem de CP",
    descricao:
      "Procedimento correto conforme NBR 5738:2015 para moldagem de corpos de prova cilíndricos.",
    categoria: "Laboratório",
    duracao: "12 min",
    icone: "fa-vial",
  },
  {
    titulo: "Ensaio de Slump Test",
    descricao:
      "Verificação da consistência do concreto pelo abatimento do tronco de cone.",
    categoria: "Campo",
    duracao: "08 min",
    icone: "fa-conveyor-belt",
  },
  {
    titulo: "Uso de EPIs",
    descricao:
      "Treinamento obrigatório sobre segurança no manuseio de prensas e produtos químicos.",
    categoria: "Segurança",
    duracao: "15 min",
    icone: "fa-helmet-safety",
  },
];

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("gridTreinamentos");

  treinamentos.forEach((item) => {
    const card = `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                <div class="h-32 bg-gray-100 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                    <i class="fa-solid ${item.icone} text-4xl text-gray-300 group-hover:text-red-600"></i>
                </div>
                <div class="p-5">
                    <span class="text-[10px] font-bold text-red-600 uppercase tracking-widest">${item.categoria}</span>
                    <h3 class="text-lg font-bold text-gray-800 mt-1">${item.titulo}</h3>
                    <p class="text-sm text-gray-500 mt-2 line-clamp-2">${item.descricao}</p>
                    
                    <div class="mt-4 flex items-center justify-between">
                        <span class="text-xs text-gray-400"><i class="fa-regular fa-clock mr-1"></i>${item.duracao}</span>
                        <button class="text-red-600 font-bold text-sm hover:underline">Acessar Aula</button>
                    </div>
                </div>
            </div>
        `;
    grid.innerHTML += card;
  });
});
