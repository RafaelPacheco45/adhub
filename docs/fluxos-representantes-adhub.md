# AdHub 1.0 — fluxos de representantes e parceiros

Referência funcional: `RafaelPacheco45/representantes` (AutoZap), analisado em 11/11/2026.
Este documento descreve fluxos **a implementar/validar**; não declara integração em produção.

## Papéis e separação

- **Representante comercial**: capta anunciantes e estabelecimentos, compartilha links/QR identificados e acompanha oportunidades e comissões.
- **Anunciante**: contrata espaço publicitário por semanas, envia arte e paga.
- **Parceiro exibidor**: verifica estabelecimento e TVs, define disponibilidade e preço, aprova/recusa campanhas em até 48h e comprova entrega.
- **Operador AdHub**: valida parceiros/evidências, confirma pagamentos bancários, media disputas, aprova ajustes/reembolsos e libera repasses.
- **TV client**: baixa campanha autorizada, reporta heartbeat/execução, não acessa dados financeiros.

Um usuário poderá ter mais de um papel, mas permissões e dados devem ser isolados por estabelecimento, representante e campanha.

## Fluxo A — adesão do representante (inspirado no AutoZap)

1. Landing de representantes com apresentação e regras comerciais aprovadas.
2. Cadastro (nome, contato, cidade, senha, verificação de e-mail); sem promessa de comissão percentual antes de decisão comercial.
3. Exibição do contrato oficial versionado; aceite persistido no servidor com versão, hash, instante, IP e identificador do usuário.
4. Cadastro criado mas aceite interrompido deve permitir retomar, **sem duplicar conta**.
5. Treinamento curto: produto, captação de exibidores, captação de anunciantes, ética/antifraude, como funciona o comissionamento.
6. Ativação após aceite + regras de aprovação que forem definidas.
7. Painel: link/QR, oportunidades, campanhas atribuídas, comissão prevista, aprovada e paga; dados de recebimento protegidos.
8. Revogação/suspensão do representante bloqueia novas indicações sem apagar trilha de atribuição histórica.

## Fluxo B — indicação rastreável

1. Representante cria lead com categoria `advertiser` ou `venue`; sistema devolve `lead_id` e URL com `ref` + `lead` (nunca nome/e-mail na URL).
2. Na abertura da URL, gravar atribuição em registro de servidor, com data e validade configurável.
3. Deduplicar por lead/identidade normalizada + tipo; detectar autocontratação, abuso e conflito de representantes.
4. Cada conversão vinculada a uma única atribuição congelada após a primeira contratação válida; alterações requerem ação auditada do operador.
5. Painel mostra etapas: `new`, `contacted`, `qualified`, `registered`, `converted`, `lost`.
6. Conversão não significa comissão paga: exige recebimento bancário confirmado e demais critérios da política aprovada.

## Fluxo C — estabelecimento/TV (parceiro exibidor)

1. Cadastro da pessoa responsável e estabelecimento; endereço, categoria, CNPJ/CPF conforme política, titularidade e evidências.
2. Revisão manual da legitimidade e das evidências; estados `submitted`, `under_review`, `approved`, `rejected`, `suspended`.
3. Vinculação de uma ou várias TVs; credenciais individuais, rotação/revogação, heartbeat e disponibilidade por TV.
4. Configuração dos preços semanais e formatos por TV ou conjunto; inventário bloqueia períodos incompatíveis.
5. Pedido pago gera reserva temporária e solicitação com prazo de 48h.
6. Aprovação registrada pelo parceiro libera campanha apenas se pagamento confirmado, arte validada, inventário disponível e prazo vigente.
7. Recusa/expiração libera reserva e abre fila de reembolso/solução, sem declarar estorno realizado automaticamente.
8. TV reporta prova técnica de entrega; operador apura falhas, compensação proporcional e repasse após o período.

## Fluxo D — contratação do anunciante

`draft -> pending_payment -> payment_under_review -> paid_reserved -> pending_partner_decision -> approved_scheduled -> active -> completed -> under_reconciliation -> settled`

Ramos de exceção:
- Falha/desistência antes da confirmação: `cancelled`.
- Pagamento comprovado mas pendente de conciliação manual: permanece `payment_under_review`, sem liberar anúncio.
- Recusa ou vencimento de 48h: `rejected` / `approval_expired` -> `refund_pending` -> `refunded` **somente com comprovante de execução**.
- Entrega insuficiente: `disputed` -> `adjusted` -> conciliação.
- Sinais de fraude: `manual_hold` e revisão, sem repasse.

Transições críticas devem ser transacionais, idempotentes por `request_id`, validadas pelo servidor e registradas em auditoria.

## Fluxo E — financeiro

- Definição vigente: do valor elegível da campanha, **85% para o parceiro exibidor e 15% para o AdHub**, sujeitos à apuração, compensações e validação jurídica/financeira.
- **Comissão do representante comercial NÃO definida.** Não reutilizar os 25% da primeira mensalidade da AutoZap.
- Antes de ativar comissões: decidir base, taxa, fato gerador, eventuais estornos, limites e fonte do custeio; registrar versão da política.
- Separar razão de recebíveis (pagamentos bancários), obrigações de repasse ao exibidor, eventuais comissões de representantes e desembolsos reais.
- Registro `payment_confirmed` só por operador autorizado, com valor, moeda, referência externa, comprovante, horário, autor e trilha auditável.
- Repasse `paid` apenas após conciliação e confirmação de transferência; impedir lançamento duplo.
- Dados PIX/bancários criptografados ou tokenizados no servidor; UI só mostra versão mascarada.

## Modelo de dados mínimo

- `representatives`: id, user_id, status, referral_code único, created_at.
- `contract_acceptances`: id, user_id, version, hash, signed_name, accepted_at, ip, user_agent.
- `leads`: id, representative_id, type, status, normalized_fingerprint, created_at, converted_at.
- `attributions`: id, lead_id, representative_id, campaign_id/venue_id, source, attributed_at, expires_at, locked_at.
- `venues`: id, owner_id, verification_status; `screens`: id, venue_id, status, last_heartbeat.
- `campaign_orders`: id, advertiser_id, venue_id, schedule, amount, state, approval_deadline, version.
- `payment_receipts`: id, order_id, external_reference, amount, evidence_ref, reviewed_by, confirmed_at.
- `campaign_delivery_events`: id, screen_id, order_id, event_type, occurred_at, authenticated_at.
- `settlements`: id, order_id, gross, adjustments, venue_due, platform_due, status, paid_at.
- `representative_commissions`: id, representative_id, attribution_id, policy_version, amount, status, paid_at.
- `audit_events`: id, actor_id, action, target_type, target_id, before, after, request_id, created_at.

Todas as consultas aplicam autorização por papel/entidade no servidor e políticas de acesso no banco; QR/link público nunca concede acesso ao painel.

## API proposta (não implantada)

- `POST /api/representatives/register`, `POST /login`, `GET /me`
- `GET /api/representatives/contract`, `POST /contract/accept`
- `POST /api/representatives/leads`, `GET /leads`, `GET /commissions`
- `GET /api/venues/me`, `POST /api/venues/verification`, `POST /api/screens/pair`
- `POST /api/orders`, `POST /api/orders/:id/payment-confirmation` (operador)
- `POST /api/orders/:id/partner-decision`, `POST /api/orders/:id/refund-confirmation` (operador)
- `POST /api/screens/:id/heartbeat`, `POST /api/screens/:id/delivery-events`
- `POST /api/settlements/:id/approve`, `POST /api/settlements/:id/mark-paid`

## Critérios de aceite antes do lançamento

1. Aceite de contrato continua após interrupção, não duplica usuário nem retorna sucesso falso.
2. Dois cliques simultâneos não criam dois leads, pedidos, comissões ou pagamentos.
3. Lead e campanha de outra conta retornam 403/404 sem dados sensíveis.
4. Código de indicação inválido não atribui vendas; tentativa de manipular URL não altera atribuição fechada.
5. Reserva ocorre depois de pagamento confirmado, expira corretamente; 48h contam de evento auditável.
6. Anúncio não é entregue antes do pagamento confirmado e da aprovação.
7. Recusa/expiração nunca declara reembolso pago sem confirmação bancária.
8. Heartbeat falso de uma TV não credita exibição de outra TV.
9. Compensação proporcional, 85/15 e eventual comissão são calculados sobre base explicitamente definida.
10. Backup/restauração, logs, alertas, HTTPS e reexecução de tarefas após queda da VM validados.

## Integração com código existente

- O repositório `adhub` possui `relay-prototype/campaigns.mjs` com pedidos e aprovação **simulados**, `payment:'simulated'`, e painel local em `flow-server.mjs`; não promover essas rotas como checkout de produção.
- O `backend/handler.mjs` existente trata sessões do controle remoto, **não** autenticação/comissões de representantes.
- O Site AdHub é uma base comercial distinta; consolidar seus contratos/API reais antes de escolher a fonte única.
- Não copiar endpoints `aip.autozap.log.br/api/representatives` nem regras de 25% para o AdHub.
