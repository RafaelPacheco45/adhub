import {createHash} from 'node:crypto';
import {CONTRACT_VERSION} from './domain.mjs';

export const CONTRACT = `MINUTA — TERMO DE PARTICIPAÇÃO NO PROGRAMA DE INDICAÇÕES ADHUB
Versão: ${CONTRACT_VERSION}

PARTES. CONTRATANTE: [RAZÃO SOCIAL DA OPERADORA ADHUB], CNPJ [PREENCHER], endereço [PREENCHER], contato [PREENCHER], doravante “AdHub”. PARTICIPANTE: pessoa física ou jurídica devidamente identificada no cadastro eletrônico.

1. OBJETO. Participação não exclusiva em programa de indicação de potenciais anunciantes e estabelecimentos que disponibilizam telas para publicidade. Este termo não autoriza o participante a assinar contratos, receber valores, garantir resultados ou assumir obrigações em nome da AdHub.

2. INDICAÇÃO E ATRIBUIÇÃO. Cada indicação deverá ser registrada pelos canais oficiais do AdHub, com código próprio e identificação da oportunidade. Não são elegíveis indicações fictícias, autocontratações, clientes já ativos ou duplicidades. Em caso de indicação concorrente ou das duas pontas da mesma campanha, a atribuição ficará suspensa para análise, sem comissão automática ou duplicada.

3. COMISSÃO INICIAL. Para uma primeira transação elegível vinculada a indicação válida, será considerada comissão de 5% (cinco por cento) sobre o valor bruto efetivamente recebido pela AdHub relativo àquela campanha, antes de eventual devolução ou ajuste. O percentual é custeado exclusivamente pela parcela de 15% da AdHub: a previsão de repasse de 85% ao estabelecimento não é reduzida. A comissão não é recorrente. Campanhas seguintes não geram comissão, salvo nova política formalmente aceita.

4. AQUISIÇÃO DO DIREITO E PAGAMENTO. A comissão só poderá ser aprovada após pagamento real conciliado, verificação da atribuição, conclusão/apuração da prestação e ausência de fraude ou devolução que torne a operação inelegível. O prazo e o procedimento de pagamento serão definidos em anexo comercial antes da ativação de pagamentos. Os valores em painel identificados como “previstos” não são créditos exigíveis. Estornos e ajustes serão registrados e comunicados. A AdHub não poderá reter remunerações legalmente devidas em desacordo com a legislação aplicável.

5. CONDUTA. O participante deverá usar informações verdadeiras, respeitar direitos de terceiros, não prometer preço, entrega ou garantia sem autorização, não fazer spam e observar instruções de marca e proteção de dados. É proibido registrar dados de terceiros sem finalidade e base legal adequadas.

6. DADOS PESSOAIS. A AdHub tratará cadastro, indicações, registros de aceite, informações de pagamento e eventos de segurança para execução do programa, cumprimento legal e prevenção de fraudes, de acordo com aviso de privacidade próprio. Direitos dos titulares e canal do encarregado: [PREENCHER].

7. RESPONSABILIDADES E TRIBUTOS. Cada parte responde pelas obrigações tributárias e legais que lhe couberem. O enquadramento jurídico da atividade (inclusive eventual representação comercial regida pela Lei nº 4.886/1965 e obrigações perante CORE) deverá ser avaliado antes da contratação. Nenhuma cláusula deste termo afasta direitos obrigatórios previstos em lei.

8. VIGÊNCIA E ENCERRAMENTO. A participação inicia após aprovação cadastral e aceite validado pela AdHub e pode ser encerrada conforme procedimento e aviso definidos no instrumento definitivo, respeitados direitos adquiridos e disposições legais obrigatórias. Suspensão por suspeita de fraude deve preservar auditoria e permitir análise.

9. REGISTRO ELETRÔNICO. O aceite registra identificação da conta, versão e hash do termo, data/hora e evidências técnicas da operação. O clique não substitui eventuais formalidades adicionais exigidas para o vínculo e seus efeitos jurídicos.

10. CONDIÇÕES PENDENTES. Antes de uso real, completar identificação das partes, anexos comercial e de privacidade, tratamento de disputas, tributos, regras de atribuição, prazo de pagamento e cláusulas legalmente exigidas. Esta é uma minuta para revisão jurídica, não um contrato final disponibilizado a participantes.
`;
export const CONTRACT_HASH = createHash('sha256').update(CONTRACT).digest('hex');
