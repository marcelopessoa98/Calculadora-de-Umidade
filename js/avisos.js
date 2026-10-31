(function () {
  "use strict";

  const DB_AVISOS = "administracao/avisos";
  const modal = document.getElementById("modalAvisos");
  const lista = document.getElementById("listaAvisosAtivos");
  const btnFechar = document.getElementById("btnFecharAvisos");
  let avisosExibidos = "";
  let avisosDispensados = "";
  let todosAvisos = {};
  let temporizador = null;

  function fecharModal() {
    if (!modal.classList.contains("hidden")) avisosDispensados = avisosExibidos;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
  }

  function escapeHtml(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function avisosVigentes(objeto) {
    const agora = Date.now();
    return Object.entries(objeto || {})
      .map(([id, aviso]) => ({ id, ...aviso }))
      .filter((aviso) => {
        const inicio = Date.parse(aviso.inicioEm);
        const fim = Date.parse(aviso.fimEm);
        return aviso.ativo !== false && Number.isFinite(inicio) && Number.isFinite(fim) && inicio <= agora && agora <= fim;
      })
      .sort((a, b) => Date.parse(b.inicioEm) - Date.parse(a.inicioEm));
  }

  function imagemAvisoValida(valor) {
    return /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(valor || ""));
  }

  function exibirAvisos(avisos) {
    if (!avisos.length) {
      fecharModal();
      avisosExibidos = "";
      return;
    }

    const assinatura = avisos.map((aviso) => {
      const imagem = String(aviso.imagemDataUrl || "");
      return [aviso.id, aviso.mensagem, imagem.length, imagem.slice(-64), aviso.inicioEm, aviso.fimEm].join(":");
    }).join("|");
    if (assinatura === avisosDispensados) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      document.body.classList.remove("overflow-hidden");
      return;
    }
    if (assinatura === avisosExibidos && !modal.classList.contains("hidden")) return;
    avisosExibidos = assinatura;
    lista.innerHTML = avisos.map((aviso) => `
      <article class="py-5">
        ${imagemAvisoValida(aviso.imagemDataUrl) ? `<img src="${aviso.imagemDataUrl}" alt="Imagem do aviso" class="max-h-[55vh] w-full rounded-2xl bg-slate-100 object-contain" />` : ""}
        ${aviso.mensagem ? `<p class="${imagemAvisoValida(aviso.imagemDataUrl) ? "mt-4 " : ""}whitespace-pre-line break-words text-base font-semibold leading-relaxed text-slate-800">${escapeHtml(aviso.mensagem)}</p>` : ""}
      </article>
    `).join("");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.classList.add("overflow-hidden");
    requestAnimationFrame(() => btnFechar.focus());
  }

  function programarReavaliacao() {
    clearTimeout(temporizador);
    const agora = Date.now();
    const proximoLimite = Object.values(todosAvisos || {})
      .flatMap((aviso) => [Date.parse(aviso.inicioEm), Date.parse(aviso.fimEm) + 1])
      .filter((instante) => Number.isFinite(instante) && instante > agora)
      .sort((a, b) => a - b)[0];
    if (!proximoLimite) return;
    temporizador = setTimeout(reavaliar, Math.min(proximoLimite - agora + 50, 2147483647));
  }

  function reavaliar() {
    exibirAvisos(avisosVigentes(todosAvisos));
    programarReavaliacao();
  }

  btnFechar?.addEventListener("click", fecharModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) fecharModal();
  });

  const database = window.SGIFirebase?.database;
  if (!database || !modal || !lista || !btnFechar) return;

  database.ref(DB_AVISOS).on("value", (snapshot) => {
    todosAvisos = snapshot.val() || {};
    reavaliar();
  });
})();
