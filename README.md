# clone-tabnews

Implementação do https://www.tabnews.com.br para o https://curso.dev

## Propósito

ComentarIA é o fórum de IA em português para quem busca clareza no caos. A quantidade de informação sobre IA só cresce hoje, mas é raro achar conteúdos de qualidade, que não sejam _hype_ vazio ou _doomerism_ apocalíptico. O projeto é ser lar de conteúdos com profundidade: tutoriais de workflows técnicos, análises de artigos científicos, cases de uso, apresentação de projetos, discussões éticas sobre implementação de IA, etc.

## Perfil do usuário

Usuários técnicos, de produto ou de business que tenham interesse em botar a mão na massa. É o tipo de pessoa que está cansada de ver o milésimo post sobre como IA resolve tudo, vai tirar o emprego das pessoas e acabar a água do mundo. Eles sabem que IA tem valor e querem aprender a usar esse valor de forma eficaz e eficiente, cortando todo o ruído. São profissionais que entendem que IA é uma ferramenta, não uma solução mágica, e buscam compreender seus limites reais tanto quanto suas possibilidades.

## Banco local e status

Use o Node indicado em `.nvmrc` e Docker com Compose v2.

```bash
npm ci
cp .env.example .env.development.local
npm run services:up
npm run dev
```

O PostgreSQL 16 fica disponível apenas em localhost. O volume mantém os dados
entre reinícios; `npm run services:down` encerra o serviço sem apagar esse volume.
Se a porta 5432 estiver ocupada, ajuste `POSTGRES_PORT` no arquivo local.

`GET /status` e `GET /api/v1/status` retornam o horário do probe e dados do banco
consultado: versão, limite de conexões e conexões da base atual. Banco inacessível
retorna 503; outros métodos retornam 405. As respostas não são cacheadas.

`infra/database.js` usa um pool limitado e aceita consultas parametrizadas:

```js
const database = require("./infra/database");
await database.query({ text: "SELECT $1::text AS value", values: ["example"] });
```

Para validar:

```bash
cp .env.development.local .env.test.local
npm run test:unit
npm run test:integration # requer PostgreSQL com as variáveis POSTGRES_* definidas
npm run build
```

Os testes de integração usam as variáveis do processo ou `.env.test.local`;
sem overrides, seguem os valores de `.env.example`. Só executam consultas de teste, e encerram seu pool no final.

## Migrations

As alterações versionadas ficam em `infra/migrations/`. O runner usa a mesma
configuração `POSTGRES_*` do módulo de banco e registra aplicações em
`pgmigrations`, com lock e transação para o conjunto pendente.

```bash
npm run migrations:plan
npm run migrations:up
npm run migrations:create -- create-posts
```

O plano conecta ao banco e pode inicializar a tabela de controle do migrador,
mas não aplica as alterações nas tabelas da aplicação. Repetir `up` aplica apenas
migrations pendentes. Novas migrations devem preencher `up` e `down` no template.

A primeira migration cria `users`, com UUID, nomes/emails únicos, campo para hash
de senha e timestamps. `updated_at` é inicializado; alterações futuras devem
atualizá-lo.

`npm run migrations:down` desfaz **uma** migration. No caso inicial, isso remove
`users` e seus dados; use o rollback no banco de desenvolvimento apropriado.
Os testes usam um schema exclusivo e descartável, verificando aplicação,
repetição, rollback/reaplicação e falha atômica de DDL.
