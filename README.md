# 1equal

Komandas vadības panelis. Spēles, treniņi, dalība un komandas izdevumi vienuviet. Publiska landing lapa, demo bez konta un ielogots panelis ar Supabase.

**Current version:** `0.1.9`

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

- **Landing** — `/` ar pilna mēneša kalendāra priekšskatu, priekšrocībām, jautājumiem un kontaktu formu (vārds, e-pasts, temats, ziņa). Galvene: Iespējas, Priekšrocības, Jautājumi, Kā tas strādā
- **Auth** — `/login`, `/signup`, `/forgot-password`, `/reset-password`. Reģistrācijā vārds un uzvārds, parole ar rādīt/paslēpt, un apstiprinājuma vēstule pirms pirmās sesijas. Pirmais reģistrētais lietotājs ir `is_admin`. Aizmirsi paroli prasa e-pastu un Cloudflare pārbaudi, ja Turnstile ir ieslēgts, un nosūta saiti. Jaunā parole tiek saglabāta tikai pēc saites. Ielogotā izvēlnē Mainīt paroli prasa pašreizējo paroli. 2FA ir Authenticator (TOTP). Google poga ir, ja integrācija ir ieslēgta
- **Demo** — `/demo` ir publisks panelis ar parauga komandu HK Rīga Amateiri. Daļai spēlētāju ir Entuziastu profils. `/panel` novirza uz `/demo`. Kalendāra datumi seko tekošajam mēnesim. Nekas no demo kalendāra netiek glabāts serverī. Demo rāda visus moduļus
- **Panelis** — `/dashboard` prasa sesiju. Augšā valoda, lietotājs un komanda. Virs 600px komandas ikona atver komandu sarakstu. Kreisā sānjosla sākas ar Sākumu. Zem 600px apakšējā izvēlne un burger pogas augšā. Admina izvēlne ir pa labi. Izlogošanās aizved uz `/`
- **Komanda** — izveide, pievienošanās ar kodu, dalībnieki, apakškomandas, laukumi un notikumi glabājas datubāzē. Ielogotā kalendārā nav parauga spēļu un treniņu. Notikumu pievieno, labo un dzēš ar datuma izvēli, veidu, sākumu un laukumu. Būs noņem laukuma cenu no spēlētāja un pievieno komandai. Pēc notikuma sākuma spēles izdevumi vienreiz noiet no komandas. Sastāva sadalījums paliek lapā, kamēr to neaizver. Uzaicinājuma e-pasts vēl netiek nosūtīts
- **Moduļi** — apakškomandas, spēļu izklājums un finanses var izslēgt. Kalendārs, komanda un laukumi vienmēr ir redzami. Izslēgts izklājums neļauj atvērt sastāvu. Izslēgtas finanses paslēpj komandas un spēlētāja bilanci
- **Admin** — tikai `is_admin`. `/dashboard/admin/users` lietotāji ar pēdējo redzēšanas laiku, `/teams` komandas ar apakškomandu un spēlētāju skaitu. Pieslēgties pievieno komandu apskatei, admins sastāvā neparādās. Tālāk `/subteams`, `/modules`, `/settings` nosaukums, logotips un favicon, `/integrations` Turnstile, Google auth, Resend, Umami un Sentry, `/languages` un `/translations`
- **Zīmols** — nosaukums nomaina redzamo 1equal tekstu galvenē, sānjoslā un lapu virsrakstos. Tehniskās atslēgas `1equal-lang` un `1equal-consent` paliek
- **Valodas** — sākumā lv, en un ru. Karogi augšējā joslā. Jaunas valodas var pievienot adminā; datumu formāts nāk no iestatījumiem, juridiskie teksti ir lv, en vai ru
- **Sīkdatnes un noteikumi** — `/privacy`, `/terms`, `/cookies`. Kategorijas: obligātās, preferences, statistika, mārketings. Umami ielādējas tikai ar statistikas piekrišanu un ieslēgtu integrāciju

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
