/**
 * SGI - ConcreFuji
 * Módulo de Conversão de Cargas
 */

// Estado da Aplicação
let selectedUnit = null;
const GRAVITY_CONSTANT = 9.80665;

// Elementos do DOM
const elements = {
  tipoCP: document.getElementById("tipoCP"),
  valorCarga: document.getElementById("valorCarga"),
  unitBtns: document.querySelectorAll(".unit-btn"),
  btnProcessar: document.getElementById("btnProcessar"),
  btnLimpar: document.getElementById("btnLimpar"),
  btnSalvar: document.getElementById("btnSalvar"),
  resBox: document.getElementById("resBox"),
  resTf: document.getElementById("resTf"),
  resKn: document.getElementById("resKn"),
  resMpa: document.getElementById("resMpa"),
  captureArea: document.getElementById("captureArea"),
};

// --- Inicialização de Eventos ---

// Seleção de unidade (Tf ou kN) via data-attributes
elements.unitBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedUnit = btn.getAttribute("data-unit");
    updateUISelection(btn);
  });
});

elements.btnProcessar.addEventListener("click", handleCalculation);
elements.btnLimpar.addEventListener("click", resetForm);
elements.btnSalvar.addEventListener("click", saveAsImage);

// --- Funções de Lógica ---

function updateUISelection(activeBtn) {
  elements.unitBtns.forEach((btn) => {
    btn.classList.remove("border-red-600", "text-red-600", "bg-red-50");
    btn.classList.add("border-gray-200", "text-gray-400");
  });
  activeBtn.classList.replace("border-gray-200", "border-red-600");
  activeBtn.classList.replace("text-gray-400", "text-red-600");
  activeBtn.classList.add("bg-red-50");
}

function handleCalculation() {
  const rawValue = parseFloat(elements.valorCarga.value);
  const areaCm2 = parseFloat(elements.tipoCP.value);

  if (!selectedUnit)
    return alert("Por favor, selecione a unidade primeiro (Tf ou kN).");
  if (!rawValue || rawValue <= 0)
    return alert("Insira um valor de carga válido.");

  const results = calculateMetrics(rawValue, selectedUnit, areaCm2);
  displayResults(results);
}

function calculateMetrics(value, unit, area) {
  let tf, kn;

  if (unit === "tf") {
    tf = value;
    kn = value * GRAVITY_CONSTANT;
  } else {
    kn = value;
    tf = value / GRAVITY_CONSTANT;
  }

  // MPa = (kN * 1000) / (Área em mm²)
  // Área em mm² = Área em cm² * 100
  const mpa = (kn * 1000) / (area * 100);

  return { tf, kn, mpa };
}

function displayResults({ tf, kn, mpa }) {
  elements.resTf.textContent =
    tf.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " tf";
  elements.resKn.textContent =
    kn.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " kN";
  elements.resMpa.textContent = mpa.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
  });

  elements.resBox.classList.remove("hidden");
}

function resetForm() {
  elements.valorCarga.value = "";
  elements.resBox.classList.add("hidden");
  selectedUnit = null;
  elements.unitBtns.forEach((btn) => {
    btn.classList.remove("border-red-600", "text-red-600", "bg-red-50");
    btn.classList.add("border-gray-200", "text-gray-400");
  });
}

async function saveAsImage() {
  try {
    const canvas = await html2canvas(elements.captureArea, {
      scale: 2,
      backgroundColor: "#f9fafb",
    });
    const link = document.createElement("a");
    link.download = `CONCREFUJI-ENSAIO-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  } catch (err) {
    console.error("Erro ao gerar imagem:", err);
  }
}
