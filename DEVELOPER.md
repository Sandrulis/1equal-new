# 1equal - izstrādātāja dokumentācija

## Tech stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4, DM Sans
- Ports: **3130** (`npm run dev` un `npm run start` klausās tikai šo portu)
- i18n: `t(key, params?)` no `useLanguage`. Kanons ir `app/lib/messages.ts` (lv + en). `site_translations` ir overlay. Aktīvā valoda ir `string`; datumi un juridiskie teksti iet caur `formatLang` (`lv` vai `en`)
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
| `/dashboard` | Kalendārs bez parauga notikumiem. Pievienot notikumu saglabā `team_events`. Spēļu izklājums atver sastāvu tikai parauga notikumiem, ja modulis `module_game_layout` ir ieslēgts |
| `/dashboard/team` | Komandas sastāvs no datubāzes. Klikšķis atver spēlētāju. Labot un Noņemt saglabājas. Uzaicināt sagatavo e-pastu, bet vēl nenosūta |
| `/dashboard/team/:id` | Spēlētāja profils. Bilances vēsture ir redzama tikai ar `module_finance` |
| `/dashboard/subteams` | Komandas apakškomandas. Krāsa, pievienot un labot. Slēpts, ja `module_subteams` ir izslēgts |
| `/dashboard/venues` | Komandas laukumi. Treniņa cena. Dzēšana paslēpj rindu, neizdzēš to |
| `/demo/...` | Tie paši skati bez konta un ar visiem moduļiem. `/demo/admin` nav |

Komandas izveide ieraksta `teams` ar uzaicinājuma kodu, logotipu un `leader_id`. Izveidotājs ir pirmais dalībnieks. Pievienošanās notiek ar kodu. Dalībniekam var būt numurs 0-99, pozīcija, telefons, vairākas apakškomandas un samaksas atbrīvojums. Spēlētāja bilance ir `balance_entries`. Komandas bilances josla augšā ir tikai šīs sesijas saraksts, un to redz, ja finanses ir ieslēgtas. Pievienot bilanci drīkst tikai komandas vadītājs.

Zem 600px komandas saites ir apakšējā izvēlne. Adminam turpat augšā ir izvēlne tikai ar admin saitēm. No 600 līdz 1023px josla ir ikonas, tooltip ir blakus ikonai un josla neritinās no tooltip. Komandas poga augšā virs 600px atver sarakstu, zem 600px ved uz kalendāru. No 1024px izvērsta josla maina režģi. Kalendāra saitei skaita nav. Pārējām komandas un admin saitēm labajā pusē ir skaits.

Ja ielogotajam lietotājam nav komandas, augšējā josla kreisajā pusē nerāda komandas vārdu. Demo rāda HK Rīga Amateiri.

## Administrācija

Tikai `public.users.is_admin`. Ne-admin `/dashboard/admin` iet atpakaļ uz `/dashboard`.

| Ceļš | Saturs |
|---|---|
| `/dashboard/admin/users` | Visi `public.users`. Meklēšana. Vārds, e-pasts, loma, komanda, reģistrēts un pēdējo reizi redzēts (`last_seen_at`, atjaunojas paneļa ielādē) |
| `/dashboard/admin/teams` | `public.teams`. Meklēšana, labošana, noņemšana. Kolonnas: apakškomandas un spēlētāji. Komandas vārds atver logu ar sarakstu. Pievienot nav |
| `/dashboard/admin/subteams` | `public.subteams` ar komandas vārdu. Meklēšana, labošana, noņemšana. Pievienot nav |
| `/dashboard/admin/modules` | `site_frontend_modules`. Slēdzis, pievienot pēc atslēgas, dzēst. `module_calendar`, `module_team` un `module_venues` nav sarakstā un tos nevar izveidot |
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

Migrācijas `supabase/migrations/`, palaiž `npm run db:migrate`. Skripts pieraksta piemērotos failus `public.schema_migrations`. Neizdevusies migrācija netiek atzīmēta. Skripts shēmas kešu nepārlādē, tāpēc migrācija, kas pievieno kolonnas, beigās izsauc `notify pgrst, 'reload schema'`.

| Fails | Saturs |
|---|---|
| `001_users.sql` | `public.users`, RLS tikai sava rinda |
| `002_ensure_user_profile.sql` | `ensure_user_profile`, pirmais lietotājs `is_admin` |
| `003_user_names.sql` | `first_name`, `last_name` |
| `004_site_admin.sql` | `site_settings`, `site_languages`, `site_translations`, bucket `branding` |
| `005_teams.sql` | `teams`, `subteams` |
| `006_site_integrations.sql` | `site_integrations`. Nav select politikas, jo tur ir noslēpumi |
| `007_user_ehl_player.sql` | `users.ehl_player` |
| `008_user_ehl_players_by_team.sql` | Spēlētāja profils pa komandas kodu |
| `009_team_members.sql` | `invite_code`, `source_url`, `logo_url`, `team_members` |
| `010_member_subteams.sql` | `fee_exempt`, `team_member_subteams` |
| `011_jersey_number_zero.sql` | Numurs 0-99 |
| `012_team_leader_balance.sql` | `teams.leader_id`, `balance_entries` |
| `013_venues.sql` | `venues`, slēpšana ar `hidden` |
| `014_site_frontend_modules.sql` | `site_frontend_modules`, sākumā `module_subteams` |
| `015_default_nav_not_modules.sql` | Noņem `module_calendar`, `module_team`, `module_venues` |
| `016_user_last_seen.sql` | `users.last_seen_at` |
| `017_team_events.sql` | `team_events`. Spēlei izdevumi, treniņam treneris, apakškomanda nav obligāta |

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
    team-dashboard.tsx       # Sānjosla, kalendārs, admin skati, moduļu vārti
    event-form-dialog.tsx    # Notikuma pievienošana
    team-switcher.tsx        # Komandu saraksts virs 600px
    change-password-dialog.tsx
    admin-users-list.tsx
    admin-teams-list.tsx
    admin-subteams-list.tsx
    admin-modules-page.tsx
    admin-settings-form.tsx
    admin-integrations-page.tsx
    admin-languages-form.tsx
    admin-translations-manager.tsx
  lib/
    messages.ts              # lv + en
    auth/actions.ts          # signIn, signUp, resetPassword, changePassword, signOut
    frontend-modules.ts      # module_subteams, module_game_layout, module_finance
    team-actions.ts          # Komandas, dalībnieki, laukumi, bilance, notikumi
    site-admin/              # Zīmols, valodas, tulkojumi, moduļi, saraksti
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

- Kalendāra notikumus rediģēt un dzēst. Pievienot jau var: datums, veids, sākums, laukums, apakškomanda, spēlei izdevumi, treniņam slēdzis ar treneri
- Komandas bilanci un treniņu vai spēļu maksu glabāt datubāzē. Tagad komandas josla ir tikai šajā sesijā
- Uzaicinājuma e-pasts, Turnstile reģistrācijā, Google poga loginā, Resend vēstules un Sentry pārlūkā
- 2FA lietotāja izvēlnē (tagad tikai aizver izvēlni)
