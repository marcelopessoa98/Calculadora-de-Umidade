"use strict";

function parseDataIso(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor || ""))) return null;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null;
  }
  return data;
}

function dataIso(data) {
  return data.toISOString().slice(0, 10);
}

function inicioSemanaIso(valor) {
  const data = valor instanceof Date ? new Date(valor) : parseDataIso(valor);
  if (!data || Number.isNaN(data.getTime())) return null;
  const dia = data.getUTCDay();
  const deslocamento = dia === 0 ? -6 : 1 - dia;
  data.setUTCDate(data.getUTCDate() + deslocamento);
  return dataIso(data);
}

function datasDaSemana(inicioIso) {
  const inicio = parseDataIso(inicioIso);
  if (!inicio) return [];
  return Array.from({ length: 7 }, (_, indice) => {
    const data = new Date(inicio);
    data.setUTCDate(data.getUTCDate() + indice);
    return dataIso(data);
  });
}

function chaveSemana(inicioIso) {
  return String(inicioIso || "").replace(/-/g, "_");
}

module.exports = {
  parseDataIso,
  dataIso,
  inicioSemanaIso,
  datasDaSemana,
  chaveSemana,
};

