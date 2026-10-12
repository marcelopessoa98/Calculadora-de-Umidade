SEGURANÇA E EXPERIÊNCIA DO USUÁRIO

1. As credenciais do sistema ConcreFuji devem existir exclusivamente
   como variáveis de ambiente server-side.

   CONCREFUJI_USERNAME
   CONCREFUJI_PASSWORD

2. É PROIBIDO expor essas variáveis:
   - no frontend;
   - em arquivos JS públicos;
   - no Firebase;
   - em localStorage/sessionStorage;
   - nas respostas da API;
   - em mensagens de erro;
   - nos logs enviados ao navegador.

3. O frontend NÃO deve apresentar informações técnicas ao funcionário.

   PROIBIDO exibir:
   - "Conectando ao Firebase..."
   - "Firebase conectado"
   - "Autenticando no ConcreFuji..."
   - "Executando Playwright..."
   - "Fazendo scraping..."
   - URLs/endpoints internos
   - status HTTP
   - stack traces
   - cookies/sessões
   - usuário utilizado pela automação
   - mensagens do banco de dados

4. Estados permitidos na interface:

   "Carregando rompimentos..."
   "Nenhum rompimento para esta data."
   "Rompimentos atualizados."
   "Não foi possível carregar os rompimentos. Tente novamente."

5. Logs técnicos devem existir SOMENTE no ambiente do servidor
   para diagnóstico pelos desenvolvedores.