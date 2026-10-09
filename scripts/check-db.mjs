/**
 * Diagnóstico da conexão com o banco (Supabase).
 * Uso: npm run check:db
 *
 * Confere, em ordem: a variável existe → a conexão abre → as tabelas foram
 * criadas → a trava de datas sobrepostas está ativa.
 */
const TABELAS = ["bookings", "channel_blocks", "channel_sync_runs", "channel_conflict_alerts"];

function erro(titulo, ...dicas) {
  console.error(`\n❌ ${titulo}\n`);
  for (const d of dicas) console.error(`   ${d}`);
  console.error("");
  process.exit(1);
}

let postgres;
try {
  ({ default: postgres } = await import("postgres"));
} catch {
  erro(
    "As dependências do projeto ainda não foram instaladas.",
    "Rode primeiro:  npm install",
    "(na mesma pasta do package.json; demora alguns minutos na primeira vez)",
  );
}

const url = process.env.DATABASE_URL;

if (!url) {
  erro(
    "DATABASE_URL não encontrada.",
    "Verifique se o arquivo .env.local existe na raiz do projeto",
    "(mesma pasta do package.json) e tem a linha DATABASE_URL=postgresql://...",
  );
}

if (url.includes("[") || url.includes("]")) {
  erro("A senha ainda está com colchetes.", "Remova os [ ] e deixe só a senha.");
}

if (/:\/\/[^@]*:\s*@/.test(url)) {
  erro("A senha está vazia na DATABASE_URL.", "Confira o trecho entre os dois-pontos e o @.");
}

let host = "?";
try {
  host = new URL(url).host;
} catch {
  erro("A DATABASE_URL não tem um formato válido.", "Ela deve começar com postgresql:// e não ter espaços nem aspas.");
}

console.log(`\n🔌 Conectando em ${host} …`);

const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 5, connect_timeout: 15 });

try {
  const [{ versao }] = await sql`select version() as versao`;
  console.log(`✅ Conexão OK — ${versao.split(",")[0]}`);
} catch (err) {
  const msg = String(err?.message ?? err);
  if (/password authentication failed|SASL|SCRAM/i.test(msg)) {
    erro(
      "Senha incorreta.",
      "Se a senha tem símbolos (@ : / # ? % &), eles quebram o endereço.",
      "O mais simples: Supabase → Settings → Database → Reset database password,",
      "e gere uma senha só com letras e números.",
    );
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(msg)) {
    erro("Servidor não encontrado.", "Confira se o endereço depois do @ foi copiado inteiro.", `Detalhe: ${msg}`);
  }
  if (/ETIMEDOUT|ECONNREFUSED|timeout/i.test(msg)) {
    erro("Não deu para alcançar o servidor.", "Confira sua internet e se o projeto no Supabase está ativo.", `Detalhe: ${msg}`);
  }
  if (/Tenant or user not found/i.test(msg)) {
    erro(
      "Usuário do pooler incorreto.",
      "O usuário deve ser postgres.SEU_PROJETO (com o ponto), não só 'postgres'.",
      "Copie de novo em Connect → Direct → Transaction pooler.",
    );
  }
  erro("Falha ao conectar.", msg);
}

const encontradas = (
  await sql`select tablename from pg_tables where schemaname = 'public' and tablename = any(${sql.array(TABELAS)})`
).map((r) => r.tablename);

const faltando = TABELAS.filter((t) => !encontradas.includes(t));

if (faltando.length === TABELAS.length) {
  await sql.end();
  erro(
    "Conexão funciona, mas as tabelas não existem.",
    "Falta rodar o SQL: Supabase → SQL Editor → cole o conteúdo de",
    "supabase/migrations/20261008000000_init.sql → Run.",
  );
}
if (faltando.length > 0) {
  await sql.end();
  erro(`Faltam tabelas: ${faltando.join(", ")}`, "Rode o SQL de supabase/migrations/ inteiro, do começo ao fim.");
}
console.log(`✅ Tabelas criadas — ${encontradas.sort().join(", ")}`);

const [{ existe }] = await sql`
  select count(*) > 0 as existe from pg_constraint where conname = 'bookings_no_overlap'`;
console.log(
  existe
    ? "✅ Trava contra reserva dupla ativa"
    : "⚠️  Trava 'bookings_no_overlap' não encontrada — rode o SQL de novo",
);

const [{ total }] = await sql`select count(*)::int as total from bookings`;
console.log(`✅ Reservas no banco: ${total}`);

await sql.end();
console.log("\n🎉 Supabase configurado. Rode `npm run dev` e abra http://localhost:3000\n");
