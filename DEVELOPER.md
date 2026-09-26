# 1equal - izstrādātāja dokumentācija

## Tech stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4, DM Sans
- Ports: **3130** (`npm run dev` un `npm run start` klausās tikai šo portu)
- i18n: `t(key, fallback, params)` no `app/lib/messages.ts` (lv + en). `site_translations` ir overlay. Aktīvā valoda ir `string`; datumi un juridiskie teksti iet caur `formatLang` (`lv` vai `en`)
- Datumi UI: `dd.mm.yyyy` caur `formatDisplayDate` / `formatDisplayDateTime` (`app/lib/format.ts`). Iekšēji ISO `YYYY-MM-DD`
- Nauda: `formatMoney` kā `€ 1 234.56`, tūkstošu atdalītājs ir atstarpe, mīnuss priekšā
- Zīmols: `applyBrandName` aizstāj vārdu `1equal`, ja tam neseko `-`. `1equal-lang` un `1equal-consent` paliek
- Favicon: `app/icon.tsx`. Ja admin ir augšupielādējis favicon, cilne rāda to, citādi pirmo burtu uz tumša kvadrāta

## Publiskās lapas

| Ceļš | Saturs |
|---|---|
| `/` | Landing. Ielogotam joprojām redzama, panelis ir `/dashboard` |
| `/login` | Ienākt |
| `/signup` | Reģistrēties. Service role `admin.createUser` ar `email_confirm: true`, tad `signInWithPassword`. Nav apstiprinājuma vēstules |
| `/forgot-password` | E-pasts un jaunā parole. `updateUserById`, tad ielogošanās. Vēstule netiek sūtīta |
| `/auth/callback` | Supabase `code` apmaiņa pret sesiju |
| `/privacy` | Privātuma politika |
| `/terms` | Lietošanas noteikumi |
| `/cookies` | Sīkdatņu politika |
| `/demo` | Publisks panelis ar parauga datiem |
| `/panel` | Novirza uz `/demo` |

`/dashboard` bez sesijas iet uz `/login`. Ielogots lietotājs no `/login` un `/signup` iet uz `/dashboard`.

SEO: `app/robots.ts` bloķē `/dashboard`, `/demo`, `/panel`, `/login`, `/signup`, `/forgot-password`. `app/sitemap.ts` iekļauj `/`, `/privacy`, `/terms`, `/cookies`. Kanoniskais hosts ir `NEXT_PUBLIC_SITE_URL` vai `http://localhost:3130`.

## Panelis

`TeamDashboard` ceļu ņem no URL (`app/lib/dashboard-path.ts`).

| Ceļš | Saturs |
|---|---|
| `/dashboard` | Kalendārs. Čips atver notikumu ar dalību un naudu. Sānjoslas notikums atver sastāvu (spēle) vai trīs kolonnas (treniņš) |
| `/dashboard/team` | Parauga sastāvs. Klikšķis atver spēlētāju. Labot un Noņemt paliek uz kartītes |
| `/dashboard/subteams` | Parauga apakškomandas, lokāli |
| `/dashboard/venues` | Parauga laukumi un stundas cena, lokāli |
| `/demo/...` | Tie paši skati bez konta. `/demo/admin` nav |

Zem 600px sānjosla ir apakšējā izvēlne. No 600 līdz 1023px josla ir sašaurināta, izvēršana pārklāj saturu. No 1024px izvēršana maina režģi.

Ja ielogotajam lietotājam nav komandas, augšējā josla kreisajā pusē nerāda komandas vārdu. Demo rāda HK Rīga Amateiri.

## Administrācija

Tikai `public.users.is_admin`. Ne-admin `/dashboard/admin` iet atpakaļ uz `/dashboard`.

| Ceļš | Saturs |
|---|---|
| `/dashboard/admin/users` | Visi `public.users`. Meklēšana visā satura platumā. Vārds, e-pasts, loma, reģistrācijas laiks |
| `/dashboard/admin/teams` | `public.teams`. Meklēšana, labošana, noņemšana. Pievienot nav |
| `/dashboard/admin/subteams` | `public.subteams` ar komandas vārdu. Meklēšana, labošana, noņemšana. Pievienot nav |
| `/dashboard/admin/settings` | Nosaukums, logotips, favicon. Attēlu var izvēlēties vai ievilkt. Glabājas bucket `branding` |
| `/dashboard/admin/integrations` | Turnstile, Google auth, Resend, Umami, Sentry |
| `/dashboard/admin/languages` | Valodas: aktīva, noklusējums, nosaukums. Noklusējumu nevar izslēgt vai dzēst |
| `/dashboard/admin/translations` | Visas `messages.ts` atslēgas plus DB rindas. Labo visas valodas vienā logā |

Rakstīšana iet caur service role servera darbībās pēc `getAccountProfile().isAdmin`. Klienta lomām uz šīm tabulām nav insert/update/delete.

## Integrācijas

Tabula `site_integrations`. Secret lauki klientam atpakaļ netiek sūtīti, tikai `hasSecret`. Slēdzis **Aktīva** darbojas pēc saglabātas konfigurācijas.

| Atslēga | Lauki | Kas notiek, kad aktīva |
|---|---|---|
| `turnstile` | Site Key, Secret Key | Atslēgas saglabājas. Reģistrācijas forma vēl neprasa Turnstile |
| `google_oauth` | Client ID, Client Secret, Redirect URI `/auth/callback` | Atslēgas saglabājas. Login vēl nerāda Google pogu |
| `resend` | From, Reply-To, API Key | Atslēgas saglabājas. E-pasti vēl netiek sūtīti |
| `umami` | Website ID, Script URL (noklusējums `https://cloud.umami.is/script.js`) | Skripts ielādējas tikai ar statistikas sīkdatņu piekrišanu |
| `sentry` | Environment, DSN | DSN saglabājas. Pārlūka kļūdu uzskaite vēl nav inicializēta |

## Sīkdatnes

`CookieConsentProvider` root layoutā. Josla, kamēr nav lēmuma. Iestatījumus var atvērt kājenē.

- Cookie: `1equal-consent`, 12 mēneši
- Kategorijas: obligātās, preferences, statistika, mārketings
- Valoda: `1equal-lang` pārlūka krātuvē, arī ja preferences ir izslēgtas
- Statistika: Umami tikai ar piekrišanu un ieslēgtu integrāciju

## Supabase

Klienti: `app/lib/supabase/server.ts` (sīkdatņu sesija), `app/lib/supabase/admin.ts` (service role, tikai serverī). Sesijas atsvaidzināšana: `proxy.ts` → `update-session.ts`.

Migrācijas `supabase/migrations/`, palaiž `npm run db:migrate`. Skripts pieraksta piemērotos failus `public.schema_migrations` un pēc tam `NOTIFY pgrst`. Neizdevusies migrācija netiek atzīmēta kā piemērota.

| Fails | Saturs |
|---|---|
| `001_users.sql` | `public.users`, RLS tikai sava rinda |
| `002_ensure_user_profile.sql` | `ensure_user_profile`, pirmais lietotājs `is_admin` |
| `003_user_names.sql` | `first_name`, `last_name` |
| `004_site_admin.sql` | `site_settings`, `site_languages`, `site_translations`, bucket `branding` |
| `005_teams.sql` | `teams`, `subteams` |
| `006_site_integrations.sql` | `site_integrations`. Nav select politikas, jo tur ir noslēpumi |

`postgres` pooler loma nevar mainīt `auth.users` trigeri uz `ENABLE ALWAYS`. Profilu tāpēc veido arī `ensure_user_profile` pēc reģistrācijas.

## Project structure

```
proxy.ts                     # Sesijas refresh un /dashboard aizsardzība
app/
  layout.tsx                 # Zīmols, valoda, sīkdatnes, Umami, toast
  page.tsx                   # Landing
  login/ signup/ forgot-password/
  auth/callback/route.ts
  privacy/ terms/ cookies/
  dashboard/[[...path]]/     # Ielogots panelis, ieskaitot /admin
  demo/[[...path]]/          # Publisks demo panelis
  panel/page.tsx             # Redirect uz /demo
  icon.tsx                   # Favicon
  robots.ts sitemap.ts
  components/
    team-dashboard.tsx       # Sānjosla, kalendārs, admin skati
    admin-users-list.tsx
    admin-teams-list.tsx
    admin-subteams-list.tsx
    admin-settings-form.tsx
    admin-integrations-page.tsx
    admin-languages-form.tsx
    admin-translations-manager.tsx
  lib/
    messages.ts              # lv + en
    auth/actions.ts          # signIn, signUp, resetPassword, signOut
    site-admin/              # Zīmols, valodas, tulkojumi, saraksti
    integrations/actions.ts  # Integrāciju saglabāšana
supabase/migrations/
```

## Versioning & commits

Commit ziņojums beidzas ar `. vX.Y.Z` un sakrīt ar `package.json` `"version"` un jaunāko `CHANGELOG.md` sadaļu.

Pirms release:

```bash
npm run typecheck
npm run build
```

Noklusējuma solis ir patch +0.0.1. `README.md` rāda **Current version**. Izmaiņu saraksts ir `CHANGELOG.md`, ne README.

## Roadmap

- Pievienot notikumu kalendārā (poga vēl neko nedara)
- Komandas dalībnieki un apakškomandas no datubāzes, ne no parauga
- Turnstile reģistrācijā, Google poga loginā, Resend vēstules un Sentry pārlūkā
- Paroles maiņa un 2FA lietotāja izvēlnē (tagad tikai aizver izvēlni)
