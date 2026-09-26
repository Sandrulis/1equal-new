# Drošība

Pārbaudīts atkārtoti 2026-09-27, 1equal-new, pēc koda un migrācijām `029_security_speed.sql`, `030_advisor_warnings.sql` un `031_audit_rate_limit.sql` (visas pielietotas). Nav penetrācijas testa pret produkciju.

**Atzīme šobrīd: 9/10**

Iepriekšējā atzīme bija 8/10. Ātruma limiti tagad ir Postgres, integrāciju noslēpumi tabulā ir šifrēti, admin un vadītāja darbības raksta audita žurnālā, un skriptu CSP izmanto nonce.

Atzīme nav 10, jo `style-src` joprojām atļauj `'unsafe-inline'` (Tailwind un React inline stili). Ja `consume_rate_limit` nav sasniedzams, limits krīt atpakaļ uz viena procesa atmiņu. Noplūdušo paroļu pārbaude joprojām jāieslēdz Supabase Auth panelī. Parole ir vismaz 8 zīmes. "Atcerēties mani" sīkfails paliek lasāms no JavaScript ar nolūku. Produkcijā `'unsafe-eval'` nav. Izstrādē tas ir, jo pretējā gadījumā React labošanas rīki lokāli krīt.

## HIGH

### 1. Aizmirsu paroli sūta saiti

`/forgot-password` prasa tikai e-pastu un Turnstile, ja tas ir ieslēgts. `resetPassword` vairs neizsauc `updateUserById` ar formas paroli. Tas ģenerē Supabase recovery saiti un sūta to caur Resend. Atbilde vienmēr ir "ja e-pasts ir reģistrēts", arī ja lietotāja nav vai limits ir pārsniegts.

Jaunā parole tiek saglabāta tikai `/reset-password`, kad recovery saite ir ielikusi sesiju. Callback pieņem `next` tikai tad, ja tas ir `/reset-password`.

Pārbaudīts pārlūkā: forma rāda e-pastu un pogu "Nosūtīt saiti". `/reset-password` rāda tikai jaunās paroles lauku.

### 2. Komandu lasīšana ir tikai saviem dalībniekiem

Migrācija `029` nomaina `using (true)` uz `is_team_member(...)` tabulām `teams`, `subteams`, `team_members`, `team_member_subteams`, `venues`, `team_events`, `team_event_rsvps`, `balance_entries`, `team_ledger`. Funkcija ir `security definer` ar `search_path = public`. Izpilde ir tikai `authenticated`.

Lietotnes rakstīšana paliek caur service role. Ielūguma kodu meklēšana arī. Anon joprojām nevar šīs tabulas lasīt.

### 3. E-pasta balss ir POST

`GET /v/[token]/[choice]` rāda pogas. Balsojums notiek tikai `POST`, kas izsauc `voteFromEmailLink`. Saitei ir `expires_at` (14 dienas, esošajām saitēm `created_at + 14 days`). Hash paliek SHA-256.

## MID

### 4. Reģistrācija vairs neapstiprina e-pastu uzreiz

`signUp` veido lietotāju ar `email_confirm: false` un sūta magic link. Ja vēstuli nevar nosūtīt, lietotājs tiek dzēsts un forma rāda kļūdu. Google pieslēgums joprojām apstiprina e-pastu, jo Google to jau ir pārbaudījis.

Ja Resend nav ieslēgts, jaunu kontu ar paroli izveidot nevar.

### 5. Ātruma limits ir kopīgs

Kontakts (5 / 15 min no IP), reģistrācija un paroles saite (5 / 15 min no e-pasta), ielūguma kods (10 / 15 min no konta). `consume_rate_limit` raksta `rate_limit_buckets`. Funkcija ir `security definer`, izpilde tikai `service_role`. Tabula ir liegta anon un authenticated. Ja izsaukums neizdodas, paliek atmiņas karte līdz 5000 atslēgām.

### 6. Bilance mainās vienā SQL

`adjust_team_balance(target, delta)` dara `balance = balance + delta` un atgriež jauno summu. To lieto balss un pasākuma dzēšana/noslēgšana. Ja pieskaitīšana neizdodas, balss atjauno iepriekšējo RSVP un maksas rindu.

### 7. Drošības galvenes ir

`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS ja vietnes URL sākas ar `https://`, un CSP. Kalendāra atbildei ir `Referrer-Policy: no-referrer`.

CSP tiek likts katrā atbildē no `update-session.ts`, ar jaunu nonce. `script-src` ir `'self'`, nonce un `'strict-dynamic'`, plus Cloudflare Turnstile un `cloud.umami.is`. Produkcijā `'unsafe-eval'` nav. `style-src` paliek `'unsafe-inline'`. Pārbaudīts pārlūkā: ienākšanas lapa ielādē Turnstile un saņem tokenu. Aizmirsu paroli rāda Cloudflare logrīti. Sākumlapa atveras.

### 8. SVG zīmolam vairs nav atļauts

Augšupielāde un brendinga spainis pieņem png, jpeg, webp, gif un ikonu. QR kods MFA dialogā paliek data-URI un nav šis spainis.

### 9. Umami skripts tikai no cloud.umami.is

Saglabāšana un publiskā ielāde atļauj tikai `https://cloud.umami.is`.

### 10. Sentry vāc mazāk

`includeLocalVariables` ir izslēgts. Sesiju replay ir 0. Kļūdu replay maskē tekstu un ievades.

### 11. Kalendāra tokens glabājas kā hash

`calendar_token_hash` ir SHA-256. Atklātais `calendar_token` pēc migrācijas ir `null`. Esošās saites turpina strādāt, jo hash tika aprēķināts pirms nullēšanas. Dialogs esošu saiti vairs neparāda. Lai to nokopētu vēlreiz, saite jāatjauno, un vecā pārstāj strādāt.

## LOW

### 12. Parole ir vismaz 8 zīmes

Tas paliek. Tas nav caurums.

### 13. Turnstile ir arī paroles saitei

Ja integrācija ir ieslēgta, login, reģistrācija un aizmirstā parole to prasa. Ja integrācija ir izslēgta, pārbaude izlaiž, kā iepriekš.

### 14. Integrāciju noslēpumi tabulā ir šifrēti

`site_integrations.client_secret` glabājas kā `enc1:` ar AES-256-GCM. Atslēga ir SHA-256 no `SUPABASE_SERVICE_ROLE_KEY`, lai nevajag jaunu env mainīgo. Lasīšana atšifrē pirms Resend, Google, Turnstile, Umami un Sentry. Saglabāšana šifrē pirms rakstīšanas. Tukšs lauks atkārtoti izmanto jau atšifrēto vērtību, lai to nešifrētu otrreiz. Esošās piecas rindas ir pārrakstītas un atšifrējas. Tabula joprojām ir liegta anon un authenticated. Ja service role atslēga noplūst, šifrēšana vairs neaizsargā. Atslēgas rotācija prasa noslēpumus saglabāt no jauna.

### 15. Audita žurnāls ir

`audit_log` ir liegts anon un authenticated. Serveris raksta pēc veiksmīgas bilances korekcijas, dalībnieka noņemšanas, pasākuma dzēšanas, vietnes iestatījumu saglabāšanas, komandas skatīšanās vai dzēšanas, un integrācijas saglabāšanas, ieslēgšanas vai notīrīšanas. Žurnālā nav noslēpumu. Ja ieraksts neizdodas, pati darbība paliek.

### 16. "Atcerēties mani" sīkfails nav httpOnly

Tas paliek ar nolūku. Sesijas sīkfails nav šis.

## Kas jau turas

- Komandu tabulu rakstīšana no `authenticated` ir atņemta, un lasīšana tagad ir tikai savām komandām.
- Admin servera darbības sākas ar `is_admin` pārbaudi.
- `event_vote_links` un `site_integrations` ir liegtas pārlūkam.
- Google OAuth state ir nejaušs, salīdzināts ar `timingSafeEqual`, sīkfails ir httpOnly.
- `npx tsc --noEmit` pēc šīm izmaiņām iziet.
- GitHub smoke solis joprojām krīt uz jau esošajām `react-hooks/set-state-in-effect` lint kļūdām. Tās šajā kārtā netika tīrītas.

## Supabase Advisor

- `storage.branding` vairs nav SELECT politikas, kas ļauj uzskaitīt failus. Tiešā saite uz zināmu failu paliek.
- `update_own_profile` ir noņemta. Vārdu un spēlētāja profilu raksta serveris pēc sesijas pārbaudes.
- `admin_team_watches`, `audit_log`, `email_templates`, `rate_limit_buckets` un `user_todos` ir lieguma politika `using (false)`. Pārlūks tās joprojām neredz. Service role paliek.
- Leaked password protection jāieslēdz Auth panelī. Tas ir pieejams Pro plānā un no migrācijas neieslēdzas.
