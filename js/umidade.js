/**
 * SGI - ConcreFuji
 * Módulo de Umidade de Areia - Cálculo sobre Massa Úmida
 */

const elements = {
  pesoUmido: document.getElementById("pesoUmido"),
  pesoSeco: document.getElementById("pesoSeco"),
  btnCalcular: document.getElementById("btnCalcular"),
  btnLimpar: document.getElementById("btnLimpar"),
  btnSalvar: document.getElementById("btnSalvar"),
  resBox: document.getElementById("resBox"),
  valorTxt: document.getElementById("valor"),
  captureArea: document.getElementById("captureArea"),
};

// Eventos
if (elements.btnCalcular) {
  elements.btnCalcular.addEventListener("click", calcularUmidade);
}

if (elements.btnLimpar) {
  elements.btnLimpar.addEventListener("click", () => {
    elements.pesoUmido.value = "";
    elements.pesoSeco.value = "";
    elements.resBox.classList.add("hidden");
  });
}

if (elements.btnSalvar) {
  elements.btnSalvar.addEventListener("click", async () => {
    try {
      const canvas = await html2canvas(elements.captureArea, { scale: 2 });
      const link = document.createElement("a");
      link.download = `UMIDADE-AREIA-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      console.error("Erro ao gerar print:", err);
    }
  });
}

function calcularUmidade() {
  const pu = parseFloat(elements.pesoUmido.value);
  const ps = parseFloat(elements.pesoSeco.value);

  // Validação: Peso úmido deve ser maior que o seco e ambos maiores que zero
  if (pu > 0 && ps > 0 && pu > ps) {
    // NOVA FÓRMULA: (Areia Úmida - Areia Seca) / Areia Úmida
    const umidade = ((pu - ps) / pu) * 100;

    // Exibição com 2 casas decimais e vírgula
    elements.valorTxt.innerText = umidade.toFixed(2).replace(".", ",") + "%";
    elements.resBox.classList.remove("hidden");
  } else {
    alert("Verifique os valores. O peso úmido deve ser maior que o seco.");
  }
}
