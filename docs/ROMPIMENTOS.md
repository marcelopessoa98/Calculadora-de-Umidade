# Módulo Rompimentos

## Visão geral

O módulo mantém a aplicação existente em HTML, JavaScript, Tailwind via CDN e Firebase Realtime Database. A coleta do sistema externo ocorre exclusivamente na função server-side `api/rompimentos.js`; usuário, senha, cookies e sessão nunca são enviados ao navegador nem persistidos no Firebase.

Fluxo:

1. o funcionário abre **Rompimentos** e seleciona seu card;
2. ao selecionar uma data, o frontend solicita a semana à API;
3. a API procura uma coleta global válida para aquela semana;
4. sem cache válido, a API adquire um lock persistente e executa o coletor uma vez;
5. o coletor acessa **Relatórios → Calendário de Rompimento → Pendentes (CE)**;
6. a tabela é interpretada pelos nomes dos cabeçalhos;
7. a API filtra referências e idades do funcionário;
8. os CPs são normalizados e agrupados para apresentação.

`Pendentes (MA)` e `Lançados` não fazem parte dos localizadores aceitos pelo coletor.

## Estrutura no Realtime Database

Funcionários:

```text
administracao/funcionariosRompimentos/{id}
  nome
  sobrenome
  obra
  referencias: ["CSP", "VSP"]
  idades: [7, 28]
  ativo: true
  criadoEm | atualizadoEm
```

Cache global e lock:

```text
rompimentos/coletas/{AAAA_MM_DD}
  status: "concluida"
  inicioSemana
  coletadoEm
  expiraEm
  dados[]

rompimentos/locks/{AAAA_MM_DD}
  id
  iniciadoEm
  expiraEm
```

A chave usa a segunda-feira da semana. O cache é válido por 60 minutos. O lock usa escrita condicional com ETag do Realtime Database e expira em 2 minutos, evitando coletores duplicados entre instâncias serverless.

## Cadastro de funcionários

1. entre na Administração com o acesso já existente;
2. localize **Funcionários dos rompimentos**;
3. informe nome, sobrenome e obra;
4. marque uma ou mais referências;
5. marque uma ou mais idades (1, 3, 7, 14, 28, 56 e 63 dias ficam disponíveis inicialmente);
6. se necessário, informe outra idade inteira positiva e clique em **Adicionar**;
7. salve.

Uma referência nova pode ser incluída no próprio formulário. Editar e excluir ficam disponíveis na lista abaixo do cadastro.

## Dados apresentados

A listagem preserva o resumo usado pelo sistema e também apresenta cada linha retornada pelo sistema externo com **Obra**, **CP**, **Idade** e **FCK estimado**. O CP original, incluindo seu sufixo, é mantido na visualização.

## Variáveis na Vercel

Configure somente no ambiente server-side:

```text
CONCREFUJI_USERNAME
CONCREFUJI_PASSWORD
CONCREFUJI_BASE_URL
FIREBASE_SERVICE_ACCOUNT
```

No painel da Vercel:

1. abra o projeto;
2. acesse **Settings → Environment Variables**;
3. cadastre cada nome exatamente como acima;
4. selecione **Production** e, se usado, **Preview**;
5. não use prefixos de exposição ao frontend;
6. faça um novo deploy após salvar.

`CONCREFUJI_BASE_URL` deve ser uma URL HTTPS legítima, sem usuário, senha ou token. Os valores reais não devem ser escritos no repositório.

## Validação necessária no sistema externo

O ambiente fornecido não incluiu acesso ao sistema externo nem screenshots/HTML do DOM. Por isso, nenhum ID ou endpoint foi inventado. Antes da liberação em produção, confirmar em `server/rompimentos/coletor.js`:

- o formulário possui um campo de usuário identificável semanticamente e um campo `type="password"`;
- o botão de entrada contém “Entrar”, “Acessar” ou “Login”;
- as opções visíveis são “Relatórios” e “Calendário de Rompimento”;
- o mês/ano aparece em `h1`, `h2`, `h3`, `h4`, `caption` ou elemento com `role="heading"`;
- os controles de mês possuem nome acessível de anterior/próximo;
- cada data do calendário pode ser associada ao link “Pendentes (CE)” por `data-date`, `data-data`, `data-day`, `datetime` ou pelo número isolado do dia;
- a listagem é uma tabela HTML com cabeçalhos equivalentes a Data, Referência, CP, Idade e, opcionalmente, FCK Estimado.

Se algum item não corresponder ao DOM real, ajuste somente o adaptador do coletor. O restante do módulo, cache, filtros, calendário e normalização não depende desses localizadores.

## Testes

Execute:

```powershell
npm install
npm test
```

A suíte cobre datas/semana, parser por cabeçalhos, normalização e intervalos, separação por data/referência/idade, filtro por funcionário, regressão das calculadoras, Administração, fluxo do calendário e ausência de overflow em 320, 360, 375, 390, 412, 768 e 1280 px.

Para testar a automação real, configure as três variáveis, cadastre um funcionário com referências/idades presentes na semana e abra uma data sem cache. Confirme nos dados de cache que as linhas correspondem à tabela aberta exclusivamente por “Pendentes (CE)”. Não use credenciais reais em testes automatizados versionados.
