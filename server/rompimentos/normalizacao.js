"use strict";

function numeroPrincipalCp(cp) {
  const encontrado = String(cp ?? "").trim().match(/^\D*(\d+)/);
  return encontrado ? Number(encontrado[1]) : null;
}

function intervalosNumericos(valores) {
  const numeros = [...new Set(valores.filter(Number.isInteger))].sort((a, b) => a - b);
  if (!numeros.length) return [];

  const intervalos = [];
  let inicio = numeros[0];
  let fim = numeros[0];

  for (let indice = 1; indice < numeros.length; indice += 1) {
    const atual = numeros[indice];
    if (atual === fim + 1) {
      fim = atual;
      continue;
    }
    intervalos.push([inicio, fim]);
    inicio = atual;
    fim = atual;
  }

  intervalos.push([inicio, fim]);
  return intervalos;
}

function textoIntervalos(intervalos) {
  const partes = intervalos.map(([inicio, fim]) =>
    inicio === fim ? String(inicio) : `${inicio} a ${fim}`,
  );

  if (partes.length <= 1) return partes[0] || "";
  if (partes.length === 2) return `${partes[0]} e ${partes[1]}`;
  return `${partes.slice(0, -1).join(", ")} e ${partes.at(-1)}`;
}

function agruparRompimentos(registros) {
  const grupos = new Map();

  for (const registro of registros || []) {
    const data = String(registro.data || "");
    const referencia = String(registro.referencia || "").trim();
    const idade = Number(registro.idade);
    if (!data || !referencia || !Number.isFinite(idade)) continue;

    const chave = JSON.stringify([data, referencia.toLocaleUpperCase("pt-BR"), idade]);
    if (!grupos.has(chave)) {
      grupos.set(chave, {
        data,
        referencia,
        idade,
        cps: [],
        cpsBrutos: [],
      });
    }

    const grupo = grupos.get(chave);
    const bruto = String(registro.cp ?? "").trim();
    if (bruto) grupo.cpsBrutos.push(bruto);
    const principal = numeroPrincipalCp(bruto);
    if (principal !== null) grupo.cps.push(principal);
  }

  return [...grupos.values()]
    .map((grupo) => {
      const intervalos = intervalosNumericos(grupo.cps);
      return {
        data: grupo.data,
        referencia: grupo.referencia,
        idade: grupo.idade,
        cps: [...new Set(grupo.cps)].sort((a, b) => a - b),
        cpsBrutos: [...new Set(grupo.cpsBrutos)],
        cpTexto: intervalos.length ? `CP ${textoIntervalos(intervalos)}` : "CP não informado",
      };
    })
    .sort((a, b) =>
      a.data.localeCompare(b.data) ||
      a.referencia.localeCompare(b.referencia, "pt-BR") ||
      a.idade - b.idade,
    );
}

function filtrarPorFuncionario(registros, funcionario) {
  const referencias = new Set(
    (funcionario?.referencias || []).map((valor) => String(valor).trim().toLocaleUpperCase("pt-BR")),
  );
  const idades = new Set((funcionario?.idades || []).map(Number));

  return (registros || []).filter((registro) =>
    referencias.has(String(registro.referencia || "").trim().toLocaleUpperCase("pt-BR")) &&
    idades.has(Number(registro.idade)),
  );
}

module.exports = {
  numeroPrincipalCp,
  intervalosNumericos,
  textoIntervalos,
  agruparRompimentos,
  filtrarPorFuncionario,
};

