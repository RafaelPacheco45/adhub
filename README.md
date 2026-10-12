# AdHub TV

Site: https://achadoagora.blog.br/adhub/

Abra na TV, inicie a tela e escaneie o QR no celular. Copie o link de um vídeo do YouTube e envie pelo controle. Os anúncios laterais são demonstrações fictícias.

O QR abre o controle AdHub; não é transmissão nativa do aplicativo YouTube. A sessão expira em duas horas.

GitHub Pages publica a pasta docs. Código do frontend em src; serviço de sessões no Supabase em backend, com tokens separados por função e autenticação própria. Nenhum segredo de servidor é distribuído.

Build: npm ci && node build.cjs
Testes: node --test backend/handler.test.mjs
