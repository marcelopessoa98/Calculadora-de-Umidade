# Módulo Passagens Extras

O módulo possui um cadastro próprio em `administracao/funcionariosPassagens`. Ele é independente de `administracao/funcionariosRompimentos`: um funcionário pode existir em apenas uma das listas ou nas duas, conforme sua função. Nenhum registro de rompimentos é alterado ou migrado.

## Fluxo do funcionário

1. abra **Passagens Extras** no menu principal;
2. selecione o funcionário;
3. selecione a data no calendário;
4. informe a obra de origem e a obra de destino;
5. clique em **Adicionar passagem extra**.

O dia da semana é calculado automaticamente a partir da data. Cada envio gera um registro independente, portanto podem existir várias passagens na mesma data. A lista abaixo do formulário mostra todas as passagens do mês e o total mensal.

## Acompanhamento administrativo

Cadastre primeiro a equipe em **Administração → Funcionários / Passagens**. Depois, em **Administração → Passagens extras**, selecione o funcionário, a data inicial e a data final. A consulta mostra data, dia da semana, origem, destino e total do período.

## Estrutura no Firebase

Os dados existentes não são alterados. Os novos registros ficam isolados por funcionário e mês:

```text
passagensExtras/{funcionarioId}/{AAAA-MM}/{idGerado}
  funcionarioId
  funcionarioNome
  data             # AAAA-MM-DD
  diaSemana
  origemObraId
  origemObra
  destinoObraId
  destinoObra
  criadoEm         # ISO 8601
```

O nome das obras é salvo junto ao registro para preservar o histórico mesmo que uma obra seja renomeada depois.

## Liberação em produção

Antes do deploy, confirme em um ambiente de homologação que as regras do Realtime Database permitem leitura e criação em `passagensExtras` e o gerenciamento de `administracao/funcionariosPassagens`, além da leitura já usada em `administracao/obras`. Não é necessária migração ou remoção de dados.

