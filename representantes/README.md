# AdHub — Programa de Indicações (módulo de validação)

Protótipo funcional, isolado da plataforma comercial publicada. **Não publicar na internet** sem configurar HTTPS, autorização administrativa, limite de tentativas de login, proteção contra abuso, política de privacidade e integração ao back-end financeiro.

## Executar

Requer Node.js 24+. Sem dependências externas.

```bash
cd representantes
npm test
npm start
```

Abra http://127.0.0.1:4310. O servidor aceita apenas conexões locais. Dados ficam em `representantes/data/representatives.sqlite` (não versionar). Registros de aceite são da **minuta**; não habilitam pagamentos.

## Entregue

- Cadastro, login e sessão HTTP-only com token aleatório armazenado apenas como hash.
- Exibição do contrato versionado com SHA-256, registro de ciência e retomada de conta.
- Cadastro de leads de anunciantes e estabelecimentos com duplicidade bloqueada por conta/tipo/e-mail.
- Isolamento de listagens por usuário, painel, código de indicação, comissão vazia sem dados fictícios.
- Cálculo verificável de 85% estabelecimento, 10% AdHub e 5% representante na primeira transação elegível.
- Testes automatizados de regras, autenticação, aceite, indicação, isolamento e centavos.

## NÃO entregue (bloqueia produção)

- E-mail verificado, redefinição de senha, prevenção de brute force e infraestrutura de envio.
- Integração oficial de leads/atribuição ao checkout, detecção de duplicidade global e disputas de dois indicadores.
- Auditoria administrativa para confirmação bancária e conversão real; lançamento/consulta de pagamentos e transferências.
- Comissões pagas/PIX, notas fiscais, impostos, assinaturas juridicamente verificadas.
- Adaptação ao Supabase/RLS e aos perfis existentes no Site AdHub.

O componente não possui rota que permita ao próprio representante creditar comissão. Critérios de elegibilidade dependem do contrato final e da validação jurídica/financeira.
