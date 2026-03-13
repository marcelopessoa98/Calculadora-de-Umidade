// Define a data atual no rodapé ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  const dateElement = document.getElementById("currentDate");
  const today = new Date();
  dateElement.innerText = today.toLocaleDateString("pt-BR");
});

function calcularUmidade() {
  const pesoUmido = parseFloat(document.getElementById("pesoUmido").value);
  const pesoSeco = parseFloat(document.getElementById("pesoSeco").value);
  const resultContainer = document.getElementById("resultContainer");
  const resultadoTexto = document.getElementById("resultado");

  // Validação simples
  if (isNaN(pesoUmido) || isNaN(pesoSeco) || pesoSeco <= 0) {
    alert(
      "Por favor, insira valores válidos. O peso seco deve ser maior que zero.",
    );
    return;
  }

  // Cálculo da umidade: ((Umida - Seca) / Seca) * 100
  const umidade = ((pesoUmido - pesoSeco) / pesoSeco) * 100;

  // Exibição do resultado
  resultadoTexto.innerText = umidade.toFixed(2) + "%";
  resultContainer.classList.remove("hidden");

  // Pequena animação de feedback
  resultadoTexto.style.color = "#d32f2f";
  setTimeout(() => {
    resultadoTexto.style.color = "#333";
  }, 500);
}
