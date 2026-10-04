# 1equal

Komandas vadības panelis. Spēles, treniņi, dalība un komandas izdevumi vienuviet. Publiska landing lapa, demo bez konta un ielogots panelis ar Supabase.

**Current version:** `0.1.24`

## Palaist

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Atver [http://localhost:3130](http://localhost:3130).

`.env.local` vajag Supabase projekta URL, anon atslēgu, service role atslēgu un datubāzes paroli. `NEXT_PUBLIC_SUPABASE_URL` ir projekta hosts (`https://….supabase.co`), bez `/rest/v1/`.

## Kas iekšā

- **Landing** — `/` ar pilna mēneša kalendāra priekšskatu, priekšrocībām, jautājumiem un kontaktu formu (vārds, e-pasts, temats, ziņa). Ielogotu aizved uz `/dashboard`. Galvene: Iespējas, Priekšrocības, Jautājumi, Kā tas strādā
- **Auth** — `/login`, `/signup`, `/forgot-password`, `/reset-password`. Reģistrācijā vārds un uzvārds, parole ar rādīt/paslēpt un stipruma joslu, un apstiprinājuma vēstule pirms pirmās sesijas. Pirmais reģistrētais lietotājs ir `is_admin`. Aizmirsi paroli prasa e-pastu un Cloudflare pārbaudi, ja Turnstile ir ieslēgts, un nosūta saiti. Jaunā parole tiek saglabāta tikai pēc saites. Ielogotā izvēlnē Mainīt paroli prasa pašreizējo paroli. 2FA ir Authenticator (TOTP). Google poga ir, ja integrācija ir ieslēgta. Atgriešanās adrese ir publiskais hosts, un Cloudflare pārbaude ielādējas arī produkcijā
- **Demo** — `/demo` ir publisks panelis ar parauga komandu HK Rīga Amateiri. Daļai spēlētāju ir Entuziastu profils. `/panel` novirza uz `/demo`. Kalendāra datumi seko tekošajam mēnesim. Nekas no demo kalendāra netiek glabāts serverī. Demo rāda visus moduļus
- **Panelis** — `/dashboard` prasa sesiju. Apakškomandas notikums kalendārā ir tās krāsā. Aplis ir spēle, kvadrāts ir treniņš, un zem kalendāra ir leģenda. Augšā valoda, lietotājs un komanda. Virs 600px komandas ikona atver komandu sarakstu, un izvēlētā komanda paliek pēc atsvaidzināšanas. Kreisā sānjosla sākas ar Sākumu. Zem 600px peldoša josla ar Sākumu un Komandu, un atsevišķa + poga notikumam. Virs 600px tā pati + poga ir labajā apakšējā stūrī. Sadaļas slīd no tās puses, uz kuru pāriet. Vadītājam un administratoram Apakškomandas un Laukumi ir joslā, ja ietilpst, citādi centrētā izvēlnē. Burger pogas ir augšā. Admina izvēlne ir pa labi. Izlogošanās aizved uz `/`
- **Komanda** — izveide, pievienošanās ar kodu, dalībnieki, apakškomandas, laukumi un notikumi glabājas datubāzē. Ielogotā kalendārā nav parauga spēļu un treniņu. Notikumu pievieno, labo un dzēš ar datuma izvēli, veidu, sākumu un laukumu. To, kā arī apakškomandas, laukumus, uzaicināšanu un citu spēlētāju labošanu, dara tikai komandas vadītājs un komandas administrators. Vadītājs ieceļ administratoru. Parasts spēlētājs labo tikai sevi: vārdu, e-pastu, tālruni, numuru, pozīcijas un Entuziastu saiti, un var noņemt tikai sevi pēc apstiprinājuma. Jaunais e-pasts stājas spēkā pēc saites uz jauno adresi. Pozīcijas ir LW, C, RW, D un G. Bez Entuziastu saites var izgriezt kvadrāta avataru. Ja cron rezervācijas ir ieslēgtas, Būs rezervē naudu un to noņem pēc notikuma sākuma. Komandas bilancē rezervētā summa ir ar vārdu Rezervēts. Citādi Būs noņem laukuma cenu uzreiz. Paziņojumos var izslēgt e-pastus par jauniem notikumiem. Spēļu izklājums ir uz ledus un saglabājas uzreiz. To labo tikai vadītājs un administrators. Bilances vēsture un rezervācijas ir vienā sarakstā. Uzaicinājuma e-pasts vēl netiek nosūtīts
- **Moduļi** — apakškomandas, spēļu izklājums, finanses un Entuziasti var izslēgt. Individuāls modulis sākas izslēgts un to ieslēdz katrai komandai. Kalendārs un komanda vienmēr ir redzami. Laukumu lapa ir tikai vadītājam un komandas administratoram. Izslēgts izklājums neļauj atvērt sastāvu. Izslēgtas finanses paslēpj komandas un spēlētāja bilanci
- **Admin** — tikai `is_admin`. `/dashboard/admin/users` lietotāji ar pēdējo redzēšanas laiku, tālruni un valsti ar IP. `/teams` komandas ar apakškomandu un spēlētāju skaitu, un aiz nosaukuma ir sporta veids. Komandas logs rāda pie spēlētāja vadītāja un administratora atzīmi, e-pastu, tālruni un valsti ar IP. Pieslēgties pievieno komandu apskatei, admins sastāvā neparādās. `/feedback` rāda kļūdas, ieteikumus un atsauksmes, un tos var dzēst. Tālāk `/subteams`, `/modules`, `/sports` sporta veidi ar Font Awesome ikonu un kopīgajiem moduļiem, `/settings` nosaukums, logotips un favicon, `/integrations` Turnstile, Google auth, Resend, Umami un Sentry, `/languages`, `/translations` un `/cron` finanšu rezervāciju saite
- **Zīmols** — nosaukums nomaina redzamo 1equal tekstu galvenē, sānjoslā un lapu virsrakstos. Tehniskās atslēgas `1equal-lang` un `1equal-consent` paliek
- **Valodas** — sākumā lv, en un ru. Karogi augšējā joslā. Jaunas valodas var pievienot adminā; datumu formāts nāk no iestatījumiem, juridiskie teksti ir lv, en vai ru
- **Sīkdatnes un noteikumi** — `/privacy`, `/terms`, `/cookies` apraksta saglabātos konta un komandas datus. Kategorijas: obligātās, preferences, statistika, mārketings. Umami ielādējas tikai ar statistikas piekrišanu un ieslēgtu integrāciju

## Skripti

| Komanda | Apraksts |
|---|---|
| `npm run dev` | Izstrāde, ports **3130** |
| `npm run start` | Produkcijas serveris, ports **3130** |
| `npm run build` | Produkcijas būve |
| `npm run typecheck` | TypeScript pārbaude |
| `npm run lint` | ESLint |
| `npm run audit:check` | npm audit, tikai high un critical |
| `npm run db:migrate` | Pending `supabase/migrations/*.sql` |

Tehniskā dokumentācija: [DEVELOPER.md](DEVELOPER.md). Izmaiņu vēsture: [CHANGELOG.md](CHANGELOG.md).
