/**
 * SGI - ConcreFuji
 * Módulo de Umidade de Areia
 */

const elements = {
  pesoUmido: document.getElementById("pesoUmido"),
  pesoSeco: document.getElementById("pesoSeco"),
  btnCalcular: document.getElementById("btnCalcular"), // Certifique-se de que o ID no HTML seja este
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
    const canvas = await html2canvas(elements.captureArea, { scale: 2 });
    const link = document.createElement("a");
    link.download = `UMIDADE-AREIA-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  });
}

function calcularUmidade() {
  const pu = parseFloat(elements.pesoUmido.value);
  const ps = parseFloat(elements.pesoSeco.value);

  if (pu > 0 && ps > 0 && ps < pu) {
    const umidade = ((pu - ps) / ps) * 100;
    elements.valorTxt.innerText = umidade.toFixed(2).replace(".", ",") + "%";
    elements.resBox.classList.remove("hidden");
  } else {
    alert("Verifique os valores. O peso úmido deve ser maior que o seco.");
  }
}
