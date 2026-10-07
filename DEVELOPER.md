# 1equal - izstrādātāja dokumentācija

## Tech stack

- Next.js 16.3.8 App Router, React 19, TypeScript
- Tailwind CSS 4, DM Sans
- Ports: **3130** (`npm run dev` un `npm run start` klausās tikai šo portu)
- i18n: `t(key, params?)` no `useLanguage`. Kanons ir `app/lib/messages.ts` (lv, en, ru). `site_translations` ir overlay. Aktīvā valoda ir `string`; datumu formāts nāk no iestatījumiem
- Datumi UI: `dd.mm.yyyy` caur `formatDisplayDate` / `formatDisplayDateTime` (`app/lib/format.ts`). Iekšēji ISO `YYYY-MM-DD`
- Nauda: `formatMoney` kā `€ 1 234.56`, tūkstošu atdalītājs ir atstarpe, mīnuss priekšā
- Zīmols: noklusējuma attēlojums ir `1Equal`. `applyBrandName` aizstāj vārdu `1equal`, ja tam neseko `-` vai punkts. `1equal-lang`, `1equal-consent` un `1equal.com` paliek
- Favicon: `app/icon.tsx`. Ja admin ir augšupielādējis favicon, cilne rāda to, citādi pirmo burtu uz tumša kvadrāta

## Publiskās lapas

| Ceļš | Saturs |
|---|---|
| `/` | Landing. Ielogotu aizved uz `/dashboard`. Izvēlnes saites ritina līdz sadaļai. Enkurs seko valodai, piemēram `#kontakti` un `#contact` |
| `/login` | Ienākt |
| `/signup` | Reģistrēties. Service role `admin.createUser` ar `email_confirm: false`, tad apstiprinājuma vēstule caur Resend. Ja vēstuli nevar nosūtīt, lietotājs tiek dzēsts |
| `/forgot-password` | Tikai e-pasts. Ja Turnstile ir ieslēgts, prasa Cloudflare pārbaudi. Kontam bez paroles saite netiek sūtīta. Neatklāj, vai e-pasts eksistē |
| `/reset-password` | Jaunā parole pēc recovery sesijas, caur `updateUser` |
| `/auth/callback` | Supabase `code` apmaiņa pret sesiju. `next` drīkst būt `/reset-password`, `/training/{uuid}` vai `/join/{kods}`. Ja sesija ir adreses `#` daļā, pārlūks to saglabā un atver paneli vai `/reset-password`. Pēc sesijas `public.users.email` sakrīt ar sesijas e-pastu |
| `/join/[code]` | Komandas uzaicinājuma saite. Nav indeksējama. E-pasts aiziet gan jaunam, gan jau reģistrētam adresātam, un konts netiek izveidots sūtīšanas brīdī. Jauns lietotājs reģistrējas ar Google vai e-pastu. Ielogots lietotājs pievienojas uzreiz. Bez sesijas kods paliek sīkdatnē `1equal-join`, lai pēc apstiprinājuma paneļa ielāde pabeidz pievienošanos |
| `/auth/confirm-email` | Vienreizēja e-pasta maiņas saite. Tokens glabājas kā SHA-256, der 24 stundas. Pēc apstiprinājuma jaunais e-pasts tiek ierakstīts un pārlūks iet uz magic link |
| `/privacy` | Privātuma politika |
| `/terms` | Lietošanas noteikumi |
| `/cookies` | Sīkdatņu politika |
| `/demo` | Publisks panelis ar parauga datiem |
| `/panel` | Novirza uz `/demo` |
| `/training/[id]` | Publisks treniņš bez trenera, ja viesi ir atļauti un komandai ir `module_pond`. Kopīgam modulim vajag sporta veidu, individuālam vajag `team_modules`. Rāda komandu, veidu, cenu, datumu un laukumu. Lapa nav indeksējama. Bez sesijas pieteikšanās ved uz `/login?next=`. Viesis nemaksā un nav sastāvā. Vadītājs var nosūtīt šo saiti e-pastā |

`/dashboard` bez sesijas iet uz `/login`. Ielogots lietotājs no `/login` un `/signup` iet uz `/dashboard`. Ja `next` ir `/training/{uuid}` vai `/join/{kods}`, viņš atgriežas uz šo adresi.

SEO: latviešu sākums ir `/`. `/lv` ved uz `/`. Sporta un tēmu lapām katrā valodā ir savs slugs: `/hokeja-komandas`, `/en/hockey-teams`, `/ru/hokkejnye-komandy`, un tāpat florbolam, basketbolam, volejbolam, futbolam, ledus naudai un cenām. Vecie angļu `*-team-management` un latviešu slugi zem `/en` vai `/ru` ved uz šīs valodas slugu. Funkciju lapas paliek ar angļu slugu, piemēram `/lv/sports-team-management` un `/en/sports-team-management`. Saknes `/sports-team-management` un pārējie funkciju slugi bez `/lv` iet ar 301 uz latviešu adresi. E-pasta balsošanas `/v/...` lapa atkārto sākumlapu, tāpēc tās canonical ir `/`, un tā paliek `noindex`. `app/robots.ts` bloķē `/v/`, `/cal/`, `/training/`, `/join/`, `/auth/`, `/api/` un bez slīpsvītras `/demo`, `/dashboard`, `/panel`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/maintenance`, `/old-2-new`. `Host` nav. Slīpsvītra ir tāpēc, ka `/v` aizsegtu `/volejbola-komandas` un `/training` aizsegtu `/training-management`. Tiem pašiem maršrutiem `next.config.ts` sūta `X-Robots-Tag: noindex, nofollow`. `app/sitemap.ts` iekļauj tikai indeksējamās publiskās lapas, ar hreflang un bez `changefreq` un `priority`. Privātuma, noteikumu un sīkdatņu lapas tur nav. Vecie un svešvalodas slugi iet ar 301. Katrai publiskajai lapai ir canonical, hreflang (`lv`, `en`, `ru`, `x-default` uz latviešu) un JSON-LD. Adreses nāk no `NEXT_PUBLIC_SITE_URL`. Produkcijā bez publiska https URL tās ir `https://1equal.com`, nevis localhost. Otrs `www` vai bez `www` hosts tiek novirzīts uz kanonisko. Vercel nedrīkst novirzīt pretējā virzienā, citādi pārlūks paliek cilpā. Lokāli novirzes nav. Parasts spēlētājs nesaņem citu dalībnieku e-pastu, tālruni un IP. Tos redz vietnes administrators, komandas vadītājs un komandas administrators.

## Panelis

`TeamDashboard` ceļu ņem no URL (`app/lib/dashboard-path.ts`).

| Ceļš | Saturs |
|---|---|
| `/dashboard` | Kalendārs bez parauga notikumiem. Apakškomandas notikums ir tās krāsā, zem kalendāra ir leģenda, aplis ir spēle un kvadrāts ir treniņš. Ja ir notikumi, par kuriem vēl jābalso, atveras balsojuma skats. Klikšķis uz notikuma paliek kalendāra skatā un atver logu zem kalendāra. Balsojuma skatā jābalso bloks nerādās. Pievienot, labot un dzēst notikumu var tikai vadītājs un komandas administrators. Spēlei ir mājas vai izbraukums. Laiks ir no 08:00 līdz 22:55 ar 5 minūšu soli. Spēļu izklājums atver sastāvu, ja `module_game_layout` ir ieslēgts. Treniņā treneris paliek vidū, spēlē aplis ir galvenē starp norises vietu un formu. Logo, norise, treneris un forma dala rindu vienādi, un trūkstošā vieta nepaliek tukša. Pozīcijas nosaukums ir zem apļa, un spēlētājs var būt vairākās pozīcijās. Ierašanos pēc notikuma labo vadītājs un administrators |
| `/dashboard/team` | Komandas sastāvs no datubāzes. Klikšķis atver spēlētāja logu. Labot, citu spēlētāju noņemšana, uzaicinājuma kods un Uzaicināt ir vadītājam un komandas administratoram. Parasts spēlētājs labo savu vārdu, uzvārdu, e-pastu, tālruni, numuru, pozīcijas un Entuziastu saiti un var noņemt tikai sevi. Pirms noņemšanas ir apstiprinājums. Neprasīt samaksu un Apakškomandas redz tikai vadītājs un administrators. Komandas iestatījumus atver sānjoslas un mobilās Vairāk saite. Tur vadītājs un administrators labo nosaukumu, valūtu, balsošanas stundas, sporta veidu un Entuziastu saiti. Sporta slēdzis rādās tikai, ja aktīvi ir vairāk nekā viens veids. Tukša saite noņem `source_url` un no tās ielādēto logo, un tad var izgriezt kvadrāta attēlu. Uzaicināt nosūta e-pastu ar saiti `/join/{kods}` |
| `/dashboard/team/:id` | Spēlētāja logs. Bilances vēsture ir redzama tikai ar `module_finance`. Tikai vadītājs redz slēdzi Administrators, arī dalībnieka labošanā. Administrators dara to pašu, ko vadītājs, bet nevar iecelt administratorus |
| `/dashboard/guests` | Viesu reģistrs. Vārds, e-pasts, tālrunis, treniņi un komandas piezīme. Sānjoslas saite un saraksts rādās tikai, ja ir vismaz viens viesis. Redz tikai vadītājs un administrators, ja `module_pond` ir komandai. Tiešā saite bez moduļa vai bez viesiem ved uz kalendāru |
| `/dashboard/subteams` | Komandas apakškomandas. Krāsa, pievienot un labot. Redz tikai vadītājs un komandas administrators. Slēpts, ja `module_subteams` ir izslēgts. Tiešā saite ved uz kalendāru |
| `/dashboard/venues` | Komandas laukumi. Treniņa cena un meklēšana pēc nosaukuma. Dzēšana paslēpj rindu, neizdzēš to. Redz tikai vadītājs un komandas administrators. Tiešā saite ved uz kalendāru |
| `/demo/...` | Tie paši skati bez konta un ar visiem moduļiem. Notikumu datumi ir iepriekšējā, šajā un divos nākamajos mēnešos. `/demo/admin` nav |

Komandas izveide ieraksta `teams` ar uzaicinājuma kodu, logotipu, `leader_id` un aktīvo sporta veidu. Entuziastu saite izveides formā, arī ar sezonas numuru ceļā, pati ieraksta nosaukumu un zem lauka trijās kolonnās rāda logo, mājas un izbraukuma formu. Spēlētāja saite aizpilda vārdu, uzvārdu, numuru un pozīciju. Profilā ir attēls, sezonas bloki un regulārās sezonas tabula. Zem attēla apakšas saturs ir paslēpts ar pāreju uz caurspīdīgu, un ikona to atver. Ja aktīvs ir tikai viens, slēdzis nerādās un tas tiek piesaistīts. Izveidotājs ir pirmais dalībnieks. Pievienošanās notiek ar kodu. Dalībniekam var būt numurs 0-99, galvenā pozīcija no sava sporta veida saraksta un papildu pozīcijas. Pozīcija rādās kā kods un nosaukums, piemēram `C Centrs`, valodā lv, en vai ru. Vecie `LD` un `RD` ir `D`, ja sportam ir `D`. Sporta veids var ietvert savu kodu, arī `TRAINER`. Kods, kura sarakstā nav, sastāvā nerādās. Tālrunis, vairākas apakškomandas un samaksas atbrīvojums paliek. Bez Entuziastu saites lietotājs un komanda var augšupielādēt un izgriezt kvadrāta JPEG avataru. Lietotāja izvēlnē Paziņojumi izslēdz e-pastus par jauniem notikumiem (`users.event_emails`, noklusējums ieslēgts). Balsošana ir atvērta `training_voting_hours` (24) un `game_voting_hours` (72) stundas pirms sākuma. Ja cron rezervācijas ir izslēgtas, Būs uzreiz noņem laukuma cenu no `balance_entries` un pieskaita `teams.balance` ar `adjust_team_balance`, un komandas notikuma izdevums arī noņem no bilances uzreiz, arī nākotnes notikumam. `settle_finished_events` tad iet ar `only_started = false`, kad ielādējas komandas. Ja slēdzis ir ieslēgts, Būs rezervē summu, Nebūšu rezervāciju atceļ, un `GET /api/cron/finance` pēc notikuma sākuma (`Europe/Riga`) noņem spēlētāja maksu un spēles izdevumus. Jaunu notikumu nevar izveidot, ja komandai nav neviena redzama laukuma. Treniņa izdevumi nav obligāti. Ja tie ir norādīti, tie glabājas un noslēdzas tāpat kā spēlei. Treniņam bez trenera, ja komandai ir `module_pond`, vadītājs vai administrators var atļaut viesus. Kopīgam modulim vajag sporta veidu, individuālam vajag komandas slēdzi. Saite ir `/training/{id}`. Viesis piesakās ar kontu, nemaksā un nav `team_members`. Notikumā viesi ir virs Būs, un aiz e-pasta ir `users.phone`. `/dashboard/guests` glabā komandas piezīmi `team_guest_notes`. Bez moduļa viesis treniņu sānjoslā neredz. Spēles sastāvs stāv uz ledus attēla un saglabājas uzreiz `team_events.lineup`. To labo tikai vadītājs un administrators. Parasts spēlētājs redz saglabāto sadalījumu. Bilances vēsture un rezervācijas ir viens saraksts komandai, spēlētājam un augšējai joslai. Dzēšana atdod pieteikušos naudu un atgriež jau norautos izdevumus. Joslas Pievienot bilanci glabājas `balance_entries` ar `kind = manual`, un to redz, ja finanses ir ieslēgtas un sporta veidam tās ir piesaistītas. To drīkst komandas vadītājs un administrators. Vadītājs spēlētāja logā un dalībnieka labošanā ieslēdz `team_members.is_team_admin`. Administrators nevar iecelt citus administratorus un nevar kļūt par vadītāju. Parasts spēlētājs labo tikai savu vārdu, uzvārdu, e-pastu, tālruni, numuru, pozīcijas un Entuziastu saiti. Vadītājs un administrators to dara arī citiem un redz samaksas atbrīvojumu un apakškomandas. Jaunais e-pasts stājas spēkā tikai pēc apstiprinājuma saites, kas aiziet uz jauno adresi. Noņemšana prasa apstiprinājumu. Labošanas logam ir aizvēršanas X. Panelis ielādē aktīvās komandas pasākumus un virsgrāmatu par pēdējām 400 dienām. Komandas un spēlētāja bilances izraksts sākas ar šo mēnesi, nevis ar visu virsgrāmatu. Cits periods ir līdz 92 dienām un ielādējas pēc ķekša. Sastāvs, vecāks mēnesis un spēlētāja bilances rindas nāk, kad tos atver. Lielai komandai balsis pirmajā kadrā ir pēdējās 45 dienas un nākotne. Citas komandas ir īss saraksts, kamēr tās neizvēlas. Paneļa iekšējie klikšķi nemaina servera lapu, bet vēstures ieraksts neglabā iepriekšējo maršrutu, tāpēc pārlāde ielādē adresi joslā. Admina sadaļa bez datiem tos pieprasa pati.

Zem 600px komandas saites ir peldoša josla ar Sākumu un Komandu, un atsevišķa + poga jaunam notikumam. Ritinot uz leju josla aizslīd par tik, cik paritināts, un pazūd. Ritinot uz augšu atgriežas. Kad josla ir paslēpta, kājenes apakšējā atstarpe ir `0.75rem` plus drošā zona, nevis `5rem`. Vadītājam un administratoram Vairāk izvēlnē ir Komandas uzstādījumi. Kreisā un labā izvēlne ieslīd no malas, un valodu un lietotāja izvēlne iznāk zem augšējās joslas. Vienlaikus paliek atvērta tikai viena. Virs 600px tā pati + poga ir labajā apakšējā stūrī. Pāreja starp Sākumu, Komandu, Apakškomandām un Laukumiem slīd 180 ms no tās puses, uz kuru iet, un izslēdzas, ja kustība ir samazināta. Vadītājam un administratoram Apakškomandas un Laukumi ir joslā, ja ietilpst. Citādi tie ir centrētā izvēlnē pa satura platumu. Parasts spēlētājs redz tikai Sākumu un Komandu. Adminam turpat augšā ir izvēlne tikai ar admin saitēm. No 600 līdz 1023px josla ir ikonas, tooltip ir blakus ikonai un josla neritinās no tooltip. Komandas poga augšā virs 600px atver sarakstu, zem 600px ved uz kalendāru. Izvēlētā komanda glabājas `users.active_team_id` un paliek pēc atsvaidzināšanas. Apskatē (`watching`) saraksta rindā ir Neredzams un X. X atvieno un aizved uz `/dashboard/admin/teams`. Pieslēgšanās uzliek `users.active_team_id` un atver šīs komandas kalendāru. Sānjoslā zem palīdzības ir atsauksmes un kontakti. No 1024px izvērsta josla maina režģi. Kalendāra saitei skaita nav. Pārējām komandas un admin saitēm labajā pusē ir skaits.

Ja ielogotajam lietotājam nav komandas, augšējā josla kreisajā pusē nerāda komandas vārdu. Demo rāda HK Rīga Amateiri.

## Administrācija

Tikai `public.users.is_admin`. Ne-admin `/dashboard/admin` iet atpakaļ uz `/dashboard`.

| Ceļš | Saturs |
|---|---|
| `/dashboard/admin/users` | Visi `public.users`. Meklēšana un alfabeta josla Visi, A-Z un #. Aiz vārda ir `users.language_code` un valodas nosaukums. E-pasts, tālrunis no komandas dalības, valsts un IP no `user_origins`, loma, komanda ar sporta veidu, reģistrēts un pēdējo reizi redzēts (`last_seen_at`, atjaunojas paneļa ielādē). Publiska IP maiņa pārraksta valsti. Administrators dzēš citu lietotāju pēc modāļa apstiprinājuma. Savu kontu un pēdējo administratoru dzēst nevar |
| `/dashboard/admin/teams` | `public.teams`. Meklēšana, alfabeta josla, labošana. Noņemšana prasa apstiprinājumu. Kolonnas: apakškomandas un spēlētāji. Aiz komandas vārda ir sporta veids, un vārds atver logu ar sarakstu. Pie spēlētāja ir vadītāja un administratora atzīme, e-pasts, tālrunis un valsts ar IP. Pievienot nav. Pieslēgties ieraksta `admin_team_watches`, uzliek aktīvo komandu un atver tās kalendāru. Admins sastāvā neparādās. Atvienošana no pārslēdzēja aizved atpakaļ uz šo sarakstu |
| `/dashboard/admin/subteams` | `public.subteams` ar komandas vārdu. Meklēšana, labošana, noņemšana. Pievienot nav |
| `/dashboard/admin/modules` | `site_frontend_modules`. Slēdzis, individuāls slēdzis, pievienot pēc atslēgas, dzēst. Individuāls modulis sākas izslēgts katrā komandā. Ja komandu veido no Latvijas IP (`LV`) vai no `localhost`, `module_entuziasti` tiek ierakstīts `team_modules`. Izveides formā Entuziastu saite rādās, ja sporta veidam modulis ir pieejams, arī jaunam lietotājam ārpus Latvijas. Ievadītā saite aizpilda nosaukumu, rāda logo un abas formas, un individuālo moduli ieslēdz šai komandai. `module_calendar`, `module_team` un `module_venues` nav sarakstā un tos nevar izveidot |
| `/dashboard/admin/sports` | Sporta veidi visās valodās. Ikonu meklē starp brīvajām Font Awesome solid, regular un brands ikonām, un ielāde rāda indikatoru. Formā ir tikai kopīgie moduļi. Individuālos ieslēdz komandai. Pie katra veida poga Pozīcijas: jauna pozīcija atveras savā logā, kods un nosaukums katrā valodā, secību maina velkot, vilkšanas laikā redzama sprauga, labošana un dzēšana. Kļūda un saglabāšana rādās kā paziņojums. Dzēst nevar, ja pozīciju lieto spēlētājs. Koda maiņa pārraksta to komandu dalībniekiem. Sastāvs rāda tikai šī sporta pozīcijas. Vismaz vienam sporta veidam jābūt aktīvam. Pirmais, Hokejs, ir piesaistīts esošajām komandām un sākumā saņem LW, C, RW, D un G |
| `/dashboard/admin/cron` | Finanšu rezervāciju slēdzis un saite cron-job.org pārbaudei katru stundu. Tokens ir tikai admina lapā |
| `/dashboard/admin/settings` | Nosaukums, logotips, favicon, slogans katrai valodai un apkopes slēdzis. Tukšs slogans e-pasta kājenē nerādās. Attēlu var izvēlēties vai ievilkt. Glabājas bucket `branding`. Apkope izslēdz sistēmu: `/login` paliek, un ielogoties var tikai `users.is_admin` |
| `/maintenance` | Apkopes lapa, kad `site_settings.maintenance` ir ieslēgts. Bez apkopes ved uz `/` |
| `/dashboard/admin/integrations` | Turnstile, Google auth, Resend, Umami, Sentry |
| `/dashboard/admin/umami` | Umami pārskats no saglabātās EU koplietošanas saites. Saite sānjoslā redzama tikai tad, ja Umami integrācija ir ieslēgta un saite ir saglabāta |
| `/dashboard/admin/languages` | Valodas: aktīva, noklusējums, nosaukums. Noklusējumu nevar izslēgt vai dzēst |
| `/dashboard/admin/translations` | Visas `messages.ts` atslēgas plus DB rindas. Labo visas valodas vienā logā |

Rakstīšana iet caur service role servera darbībās pēc `getAccountProfile().isAdmin`. Klienta lomām uz šīm tabulām nav insert/update/delete.

## Integrācijas

Tabula `site_integrations`. Secret lauki klientam atpakaļ netiek sūtīti, tikai `hasSecret`. Slēdzis **Aktīva** darbojas pēc saglabātas konfigurācijas.

| Atslēga | Lauki | Kas notiek, kad aktīva |
|---|---|---|
| `turnstile` | Site Key, Secret Key | Ienākšana, reģistrācija, Google pieslēgums un aizmirstā parole prasa pārbaudi. Skripts saņem lapas CSP nonce |
| `google_oauth` | Client ID, Client Secret, Redirect URI ir publiskais hosts plus `/auth/callback` | Login un reģistrācija rāda Google pogu. Google e-pasts tiek uzskatīts par apstiprinātu. Kontam bez paroles jaunu var uzlikt bez pašreizējās |
| `resend` | From, Reply-To, API Key | Reģistrācijas, paroles, e-pasta maiņas, notikumu un konta dzēšanas vēstules ar vienotu izkārtojumu. Dzēšanas apstiprinājums, uzsākšana un pabeigšana nāk no `email_templates`. Kājene rāda valodas sloganu. Saite zem pogas ir tā pati, kas pogai. Tekstā garā domuzīme ir defise. Bez šīs integrācijas jaunu kontu ar paroli izveidot nevar |
| `umami` | Website ID, Script URL tikai `https://cloud.umami.is`, neobligāta EU koplietošanas saite `https://cloud.umami.is/analytics/eu/share/…` | Skripts ielādējas tikai ar statistikas sīkdatņu piekrišanu. Saglabāta saite un ieslēgta integrācija rāda admina lapu `/dashboard/admin/umami` |
| `sentry` | Environment, DSN | Pārlūka un servera kļūdas. Sesiju replay ir izslēgts. Kļūdu replay maskē tekstu un ievadi |

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
| `018_team_voting_hours.sql` | `teams.training_voting_hours`, `teams.game_voting_hours` |
| `019_event_attendance_balance.sql` | `teams.balance`, `team_event_rsvps`, notikuma ieraksts `balance_entries` |
| `020_team_event_settlement.sql` | `team_events.settled_at`, `team_ledger` |
| `021_admin_email_todos.sql` | `email_templates`, admin uzdevumi |
| `022_calendar_integration.sql` | `users.calendar_token`, kalendāra modulis |
| `023_display_preferences.sql` | Datuma un laika iestatījumi |
| `024_team_currency_voting_defaults.sql` | Valūta un balsošanas stundu noklusējumi |
| `025_event_email_vote_links.sql` | Notikuma e-pasts un `event_vote_links` |
| `026_site_contact_email.sql` | `site_settings.contact_email` |
| `027_russian_language.sql` | Valoda `ru` |
| `028_admin_team_watches.sql` | Admin komandas apskate bez dalības |
| `029_security_speed.sql` | Dalības RLS, bilances un noslēgšanas SQL, kalendāra hash, balss termiņš |
| `030_advisor_warnings.sql` | Noņem brendinga saraksta politiku un `update_own_profile` |
| `031_audit_rate_limit.sql` | `rate_limit_buckets`, `consume_rate_limit`, `audit_log` |
| `032_rls_deny_policies.sql` | Lieguma RLS politikas tabulām bez politikas |
| `033_email_plain_dash.sql` | E-pasta sagatavēs garā domuzīme ir defise |
| `034_avatars.sql` | `users.avatar_url`, publisks JPEG spainis `avatars` |
| `035_event_email_preference.sql` | `users.event_emails`, noklusējums ieslēgts |
| `036_finance_cron.sql` | `cron_jobs`, `finance_reservations`, `settle_finance_reservations` |
| `037_sports.sql` | `sports`, nosaukumi, moduļi, `teams.sport_id`. Sākumā Hokejs |
| `038_team_member_admin.sql` | `team_members.is_team_admin`. Iecelšanu dara tikai `teams.leader_id` |
| `039_member_extra_positions.sql` | `team_members.extra_positions`. Papildu pozīciju kodi |
| `040_email_change_requests.sql` | `email_change_requests`. Jaunā e-pasta apstiprinājuma saite |
| `041_remove_coach_position.sql` | Noņem saglabāto pozīciju `TR` |
| `042_training_event_expense.sql` | Treniņa `expense` drīkst būt tukšs |
| `043_event_lineup.sql` | `team_events.lineup` jsonb |
| `044_entuziasti_module.sql` | `module_entuziasti`. Komandas un spēlētāja saite, arī pa sporta veidiem |
| `045_team_modules.sql` | Moduļa slēdzis `is_individual` un `team_modules` katrai komandai |
| `046_user_active_team.sql` | `users.active_team_id`. Izvēlētā komanda paliek pēc atsvaidzināšanas |
| `047_sport_fontawesome_icons.sql` | Sporta ikona ir Font Awesome nosaukums. Vecās ikonas pāriet uz jaunajām |
| `048_sport_icon_free_styles.sql` | Ikona drīkst būt arī `far:` un `fab:` |
| `049_admin_origins.sql` | `user_origins` un `team_origins`. IP un valsts kods, redzams tikai adminam |
| `052_account_deletion.sql` | `users.deletion_requested_at`, `deletion_due_at`, `deletion_claimed_at`. 30 dienu dzēšana |
| `053_account_deletion_confirm.sql` | `account_deletion_confirmations`. E-pasta saites hash kontam bez paroles |
| `054_account_deletion_email_templates.sql` | E-pasta veidi `delete_confirm`, `delete_started`, `delete_done` |
| `055_language_slogans.sql` | `site_languages.slogan`. E-pasta kājenes teksts katrai valodai |
| `056_module_pond_guests.sql` | `module_pond`, `team_events.allow_guests`, `team_event_rsvps.is_guest` |
| `057_user_phone.sql` | `users.phone`. Aizpilda no pēdējā `team_members.phone` |
| `058_team_guest_notes.sql` | `team_guest_notes`. Komandas piezīme viesim, līdz 500 rakstzīmēm |
| `059_site_maintenance.sql` | `site_settings.maintenance`. Apkopes režīms |
| `060_user_language.sql` | `users.language_code`. Lietotāja izvēlētā valoda |
| `061_guest_invite_email.sql` | E-pasta veids `guest`. Viesa uzaicinājums uz treniņu |
| `063_sport_positions.sql` | `sport_positions` un nosaukumi katram sporta veidam. Hokejam un sportiem ar jau lietotiem hokeja kodiem sākumā LW, C, RW, D un G |
| `064_event_home_away.sql` | `team_events.is_home`. Spēlei mājas vai izbraukums, treniņam tukšs |
| `065_team_kit_urls.sql` | `teams.home_kit_url` un `away_kit_url` no Entuziastu lapas |
| `066_settle_events_without_cron.sql` | `settle_finished_events` ar `only_started`. Bez cron noslēdz arī nākotnes izdevumus |

`postgres` pooler loma nevar mainīt `auth.users` trigeri uz `ENABLE ALWAYS`. Profilu tāpēc veido arī `ensure_user_profile` pēc reģistrācijas.

## Project structure

```
proxy.ts                     # Sesijas refresh un /dashboard aizsardzība
app/
  layout.tsx                 # Zīmols, valoda, sīkdatnes, Umami, toast
  page.tsx                   # Landing
  login/ signup/ forgot-password/ reset-password/
  auth/callback/route.ts
  auth/confirm-email/route.ts # E-pasta maiņas tokens
  auth/confirm-delete/route.ts # Konta dzēšanas saite
  privacy/ terms/ cookies/
  dashboard/[[...path]]/     # Ielogots panelis, ieskaitot /admin
  training/[id]/page.tsx     # Publisks treniņš viesim
  join/[code]/page.tsx       # Komandas uzaicinājuma saite
  demo/[[...path]]/          # Publisks demo panelis
  panel/page.tsx             # Redirect uz /demo
  icon.tsx                   # Favicon
  robots.ts sitemap.ts
  components/
    team-dashboard.tsx       # Sānjosla, kalendārs, admin skati, moduļu vārti
    event-form-dialog.tsx    # Notikuma pievienošana un labošana, datuma izvēle
    event-details.tsx        # Notikuma dati, balsošanas atskaite, labot un dzēst
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
    messages.ts              # lv, en, ru
    positions.ts             # Sporta pozīcijas. Hokejam sākumā LW, C, RW, D, G
    email/email-change.ts    # Jaunā e-pasta saite, SHA-256, 24 h
    auth/actions.ts          # signIn, signUp, resetPassword, changePassword, signOut
    frontend-modules.ts      # module_subteams, module_game_layout, module_finance, module_entuziasti, module_pond
    training-guests.ts       # Viesu saite, pieteikšanās un noņemšana
    event-voting.ts          # Balsošanas termiņš un vai notikums ir beidzies
    team-actions.ts          # Komandas, dalībnieki, laukumi, bilance, notikumi, dalība
    balance-entry.ts         # Spēlētāja bilances rinda ar notikumu un vietu
    balance-range.ts         # Bilances periods, līdz 92 dienām, Europe/Riga
    soft-nav.ts              # Adreses maiņa bez iepriekšējā Next maršruta
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

Pēc push un pull request GitHub Actions palaiž trīs pārbaudes:

- **Secret scan** (gitleaks) - atslēgas un paroles git vēsturē. Repozitorijam vajag secret `GITLEAKS_LICENSE`, ja tas nav organizācijas secret.
- **Security audit** - `npm run audit:check`, krīt uz neakceptētu high vai critical.
- **Security smoke** - `typecheck`, `lint`, production `build`, auth pārbaude `*actions.ts` un `route.ts`, nav `eval()`, drošības galvenes `next.config.ts`. Maršruti bez sesijas ir atsevišķi: Google Turnstile, OAuth atgriešanās, e-pasta maiņas tokens, konta dzēšanas saite, balsošanas saite un kalendāra tokens.

Noklusējuma solis ir patch +0.0.1. `README.md` rāda **Current version**. Izmaiņu saraksts ir `CHANGELOG.md`, ne README.

## Drošība un ātrums

Pārskati: [security-check.md](security-check.md) (9/10) un [speed-suggestions.md](speed-suggestions.md) (9.5/10).

Komandu tabulas `authenticated` lasa tikai caur `is_team_member`. Rakstīšana paliek service role. `getAccountProfile()` neatdod profilu, kamēr divu faktoru sesija vēl ir `aal1`. Vienā servera pieprasījumā lietotājs tiek pārbaudīts vienreiz. E-pasta balss ir POST, saite der 14 dienas. Bilanci maina `adjust_team_balance`, un summas nāk no `member_balance_totals`. Nenoslēgtos notikumu izdevumus, arī nākotnes, noslēdz `settle_finished_events` ar `only_started = false` pēc atbildes, ja finanšu cron nav ieslēgts. Publiskie iestatījumi kešojas 60 sekundes. Aktīvā komanda velk pasākumus par pēdējām 400 dienām. Virsgrāmata nāk, kad atver bilanci. Apmeklētība nāk, kad atver komandas sarakstu. Izcelsmes IP nāk no Vercel vai Cloudflare galvenes, nevis no pirmās `x-forwarded-for`. CSP skriptiem ir nonce. Pārējās galvenes ir `nosniff`, `X-Frame-Options` un `Permissions-Policy`. Integrāciju noslēpumi tabulā ir AES-256-GCM. Ātruma limits un audita žurnāls ir `031_audit_rate_limit.sql`. Brendinga spainis ir publisks, bet failus nevar uzskaitīt, un SVG nav atļauts. Kalendāra tokens glabājas kā SHA-256. Noplūdušo paroļu pārbaude jāieslēdz Supabase Auth panelī. Tas ir Pro plāna iestatījums, ne migrācija.

## Roadmap

- (none)
