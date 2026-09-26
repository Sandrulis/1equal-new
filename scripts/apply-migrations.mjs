import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import pg from "pg";

const { Client } = pg;

function loadEnv(file) {
  const env = {};
  for (const line of readFileSync(join(process.cwd(), file), "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

function getProjectRef(url) {
  return url.replace("https://", "").replace(".supabase.co", "");
}

function getConnectionCandidates(env) {
  if (env.DATABASE_URL) return [env.DATABASE_URL];

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const password = env.SUPABASE_DB_PASSWORD;
  if (!url || !password) {
    console.error(
      "Missing DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local\n" +
        "Supabase Dashboard → Project Settings → Database → Database password",
    );
    process.exit(1);
  }

  const projectRef = getProjectRef(url);
  const encodedPassword = encodeURIComponent(password);
  const region = env.SUPABASE_DB_REGION || "eu-west-1";
  const poolerUser = `postgres.${projectRef}`;
  const poolers = [`aws-1-${region}`, `aws-0-${region}`].flatMap((host) => [
    `postgresql://${poolerUser}:${encodedPassword}@${host}.pooler.supabase.com:5432/postgres`,
    `postgresql://${poolerUser}:${encodedPassword}@${host}.pooler.supabase.com:6543/postgres`,
  ]);

  return [
    ...poolers,
    `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`,
  ];
}

async function ensureMigrationTable(client) {
  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );

    alter table public.schema_migrations enable row level security;
    revoke all on table public.schema_migrations from anon, authenticated;

    drop policy if exists "schema_migrations deny clients" on public.schema_migrations;
    create policy "schema_migrations deny clients"
      on public.schema_migrations
      as restrictive
      for all
      to anon, authenticated
      using (false)
      with check (false);
  `);
}

const env = loadEnv(".env.local");
const migrationsDir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const candidates = getConnectionCandidates(env);
let client;
let connectedVia = "";

for (const connectionString of candidates) {
  const attempt = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  try {
    await attempt.connect();
    client = attempt;
    connectedVia = connectionString.replace(/:([^:@/]+)@/, ":***@");
    break;
  } catch (error) {
    console.log(`Connect skip: ${error.message}`);
    await attempt.end().catch(() => {});
  }
}

if (!client) {
  console.error("Could not connect to Supabase Postgres. Check SUPABASE_DB_PASSWORD, SUPABASE_DB_REGION, or DATABASE_URL.");
  process.exit(1);
}

try {
  console.log("Connected to Supabase Postgres via", connectedVia);
  await ensureMigrationTable(client);
  const { rows } = await client.query(`select filename from public.schema_migrations`);
  const applied = new Set(rows.map((row) => row.filename));
  const pending = files.filter((file) => !applied.has(file));

  if (pending.length === 0) {
    console.log("No pending migrations.");
    process.exit(0);
  }

  for (const file of pending) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}...`);
    await client.query(sql);
    await client.query(`insert into public.schema_migrations (filename) values ($1) on conflict (filename) do nothing`, [file]);
    console.log(`OK - ${file}`);
  }

  console.log(`Applied ${pending.length} migration(s).`);
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
