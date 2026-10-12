"use strict";

function normalizarCabecalho(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function indiceCabecalho(cabecalhos, nomes) {
  const normalizados = cabecalhos.map(normalizarCabecalho);
  return normalizados.findIndex((cabecalho) =>
    nomes.some((nome) => cabecalho === nome || cabecalho.includes(nome)),
  );
}

function normalizarData(valor, dataPadrao = "") {
  const texto = String(valor || "").trim();
  const iso = texto.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = texto.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  return dataPadrao;
}

function normalizarIdade(valor) {
  const encontrado = String(valor || "").match(/\d+/);
  return encontrado ? Number(encontrado[0]) : null;
}

function parseTabela({ cabecalhos, linhas, dataPadrao, coletadoEm }) {
  const indices = {
    data: indiceCabecalho(cabecalhos, ["data"]),
    referencia: indiceCabecalho(cabecalhos, ["referencia", "obra"]),
    cp: indiceCabecalho(cabecalhos, ["cp", "corpo de prova"]),
    idade: indiceCabecalho(cabecalhos, ["idade"]),
    fck: indiceCabecalho(cabecalhos, ["fck estimado", "fck"]),
  };

  if (indices.referencia < 0 || indices.cp < 0 || indices.idade < 0) {
    throw new Error("CABECALHOS_TABELA_NAO_RECONHECIDOS");
  }

  return (linhas || []).map((colunas) => ({
    data: normalizarData(indices.data >= 0 ? colunas[indices.data] : "", dataPadrao),
    referencia: String(colunas[indices.referencia] || "").trim(),
    cp: String(colunas[indices.cp] || "").trim(),
    idade: normalizarIdade(colunas[indices.idade]),
    fckEstimado: indices.fck >= 0 ? String(colunas[indices.fck] || "").trim() : "",
    coletadoEm,
  })).filter((registro) =>
    registro.data && registro.referencia && registro.cp && Number.isFinite(registro.idade),
  );
}

module.exports = {
  normalizarCabecalho,
  normalizarData,
  normalizarIdade,
  parseTabela,
};

