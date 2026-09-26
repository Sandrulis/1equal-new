# 1equal

Amatieru komandas panelis. Kalendārs, sastāvs, dalība un laukumu maksa vienā skatā. Publiska landing lapa, demo bez konta un ielogots panelis ar Supabase.

**Current version:** `0.1.3`

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

- **Landing** — `/` ar pilna mēneša kalendāra priekšskatu, priekšrocībām un jautājumiem. Galvene: Iespējas, Priekšrocības, Jautājumi, Kā tas strādā
- **Auth** — `/login`, `/signup`, `/forgot-password`. Reģistrācijā vārds un uzvārds, parole ar rādīt/paslēpt. Konts tiek izveidots uzreiz, bez apstiprinājuma e-pasta. Pirmais reģistrētais lietotājs ir `is_admin`. Aizmirsi paroli nomaina paroli uzreiz un ielogojas, e-pasts netiek sūtīts
- **Demo** — `/demo` ir publisks panelis ar parauga komandu HK Rīga Amateiri. `/panel` novirza uz `/demo`. Nekas no demo kalendāra netiek glabāts serverī
- **Panelis** — `/dashboard` prasa sesiju. Augšā valoda un lietotājs. Sānjosla: Kalendārs, Komanda, Apakškomandas, Laukumi. Zem 600px apakšējā izvēlne, no 600 līdz 1023px ikonu josla ar pārklājumu
- **Kalendārs un sastāvs** — parauga spēles, treniņi, dalībnieki un laukumi vēl ir lokāli. Dalība Būs / Nebūs un sastāva sadalījums paliek lapā, kamēr to neaizver
- **Admin** — tikai `is_admin`. `/dashboard/admin/users` visi sistēmas lietotāji, `/teams` un `/subteams` sistēmas komandas un apakškomandas ar meklēšanu, `/settings` nosaukums, logotips un favicon, `/integrations` Turnstile, Google auth, Resend, Umami un Sentry, `/languages` un `/translations`
- **Zīmols** — nosaukums nomaina redzamo 1equal tekstu galvenē, sānjoslā un lapu virsrakstos. Tehniskās atslēgas `1equal-lang` un `1equal-consent` paliek
- **Valodas** — sākumā lv un en. Karogi augšējā joslā. Jaunas valodas var pievienot adminā; datumi un juridiskie teksti joprojām ir lv vai en
- **Sīkdatnes un noteikumi** — `/privacy`, `/terms`, `/cookies`. Kategorijas: obligātās, preferences, statistika, mārketings. Umami ielādējas tikai ar statistikas piekrišanu un ieslēgtu integrāciju

## Skripti

| Komanda | Apraksts |
|---|---|
| `npm run dev` | Izstrāde, ports **3130** |
| `npm run start` | Produkcijas serveris, ports **3130** |
| `npm run build` | Produkcijas būve |
| `npm run typecheck` | TypeScript pārbaude |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Pending `supabase/migrations/*.sql` |

Tehniskā dokumentācija: [DEVELOPER.md](DEVELOPER.md). Izmaiņu vēsture: [CHANGELOG.md](CHANGELOG.md).
