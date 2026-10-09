"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { inicioSemanaIso, datasDaSemana } = require("../server/rompimentos/datas");

test("semana começa na segunda-feira, inclusive para domingo", () => {
  assert.equal(inicioSemanaIso("2026-10-12"), "2026-10-12");
  assert.equal(inicioSemanaIso("2026-10-18"), "2026-10-12");
  assert.deepEqual(datasDaSemana("2026-10-12"), [
    "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15",
    "2026-10-16", "2026-10-17", "2026-10-18",
  ]);
});
