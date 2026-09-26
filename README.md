# 1equal

Amatieru komandas panelis. Kalendārs, sastāvs, dalība un laukumu maksa vienā skatā. Publiska landing lapa, demo bez konta un ielogots panelis ar Supabase.

**Current version:** `0.1.5`

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
- **Auth** — `/login`, `/signup`, `/forgot-password`. Reģistrācijā vārds un uzvārds, parole ar rādīt/paslēpt. Konts tiek izveidots uzreiz, bez apstiprinājuma e-pasta. Pirmais reģistrētais lietotājs ir `is_admin`. Aizmirsi paroli nomaina paroli uzreiz un ielogojas, e-pasts netiek sūtīts. Ielogotā izvēlnē Mainīt paroli prasa pašreizējo paroli, tad jauno. 2FA izvēlne vēl neko nedara
- **Demo** — `/demo` ir publisks panelis ar parauga komandu HK Rīga Amateiri. `/panel` novirza uz `/demo`. Nekas no demo kalendāra netiek glabāts serverī. Demo rāda visus moduļus
- **Panelis** — `/dashboard` prasa sesiju. Augšā valoda, lietotājs un komanda. Virs 600px komandas ikona atver komandu sarakstu, zem 600px tā ved uz kalendāru. Sānjosla: Kalendārs, Komanda, Apakškomandas, Laukumi. Zem 600px apakšējā izvēlne, un adminam ir atsevišķa izvēlne. No 600 līdz 1023px ikonu josla ar tooltip blakus ikonai
- **Komanda** — izveide, pievienošanās ar kodu, dalībnieki, apakškomandas, laukumi un notikumi glabājas datubāzē. Ielogotā kalendārā nav parauga spēļu un treniņu. Notikumu pievieno ar datumu, veidu, sākumu un laukumu. Dalība Būs / Nebūs un sastāva sadalījums paliek lapā, kamēr to neaizver. Uzaicinājuma e-pasts vēl netiek nosūtīts
- **Moduļi** — apakškomandas, spēļu izklājums un finanses var izslēgt. Kalendārs, komanda un laukumi vienmēr ir redzami. Izslēgts izklājums neļauj atvērt sastāvu. Izslēgtas finanses paslēpj komandas un spēlētāja bilanci
- **Admin** — tikai `is_admin`. `/dashboard/admin/users` lietotāji ar pēdējo redzēšanas laiku, `/teams` komandas ar apakškomandu un spēlētāju skaitu, `/subteams`, `/modules`, `/settings` nosaukums, logotips un favicon, `/integrations` Turnstile, Google auth, Resend, Umami un Sentry, `/languages` un `/translations`
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
