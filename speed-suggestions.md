# Ātrdarbība

Pārbaudīts atkārtoti 2026-09-27, 1equal-new, pēc koda un lokālā servera (`http://localhost:3130`). Nav slodzes testa un nav produkcijas mērījuma.

**Atzīme šobrīd: 7/10**

Iepriekšējā atzīme bija 5/10. Sākums, login un juridiskās lapas vairs nelasa zīmolu, valodas, tulkojumus, Umami un Sentry katrā pieprasījumā. Veco spēļu noslēgšana ir viens SQL izsaukums. Panelis vairs nevelk pasākumus un virsgrāmatu, kas vecāki par 400 dienām.

Atzīme nav augstāka, jo visas trīs valodas joprojām ir klienta paketē, attēli iet caur parasto `img`, un demo dati joprojām nonāk sākuma lapas paketē. Panelis joprojām ielādē visu dalībnieku bilanci, nevis tikai redzamo logu.

## HIGH

### 1. Saknes layout vairs neiet uz datubāzi katrā lapā

`getSiteBrand`, `listSiteLanguages`, `getPublicI18n`, `getPublicUmami` un `getPublicSentry` ir `unstable_cache` ar `revalidate: 60` un tagu `site-public`. Admin zīmola, valodas un integrāciju saglabāšana izsauc `refreshSitePublic()`.

Atlicis: `getPublicI18n` joprojām kešo visu `site_translations` tabulu, tikai retāk.

### 2. Panelis velk 400 dienu logu, nevis visu vēsturi

`listOwnedTeams` pasākumiem un `team_ledger` liek `event_date >= šodien - 400 dienas`. Dalībnieku `balance_entries` paliek pilni, jo no tiem rēķina atlikumu. Komandas kopsumma paliek `teams.balance`.

Atlicis: vecāku mēnesi panelī neatvērs, kamēr nav atsevišķa pieprasījuma. Tas ir apzināts ātruma logs, nevis pilna lapošana.

### 3. Veco pasākumu noslēgšana ir viens SQL

`settleFinishedEvents` izsauc `settle_finished_events(team_ids)`. Funkcija vienā piegājienā iezīmē nenokārtotās spēles, ieraksta virsgrāmatu un pieskaita summu bilancei. Laiks ir `Europe/Riga`, nevis servera lokālā josla.

## MID

### 4. Publiskās lapas bez sesijas vairs neprasa `getUser()`

`updateSession` izlaiž Supabase, ja nav `*-auth-token` sīkdatnes un ceļš ir `/`, `/privacy`, `/terms`, `/cookies` vai `/demo`. Panelis un login ar esošu sīkdatni joprojām pārbauda lietotāju.

### 5. Visas trīs valodas joprojām ir klienta paketē

`app/lib/messages.ts` joprojām iet uz katru lapu ar `lv`, `en` un `ru`. Šo nešķēlu, lai nepārbūvētu valodas pārslēdzēju.

### 6. Komandas darbība vairs neizmet visu layout kešu

Komandas darbības un e-pasta balss izsauc `refreshTeamData()` (`revalidateTag("team-data")`). Zīmols un integrācijas izsauc `refreshSitePublic()`.

### 7. Sentry sesiju replay ir izslēgts

`replaysSessionSampleRate` ir 0. Kļūdu replay paliek, ar maskētu tekstu, ievadi un medijiem.

### 8. Attēli joprojām iet caur `<img>`

Logo, favicon un spēlētāju foto neizmanto `next/image`.

## LOW

### 9. Fonts jau ir kārtībā

`DM Sans` nāk no `next/font`.

### 10. Demo dati joprojām ir sākuma lapā

`landing-page.tsx` importē `EVENTS` un `VENUES` no `app/lib/demo-data.ts`, tāpēc demo dati ir sākuma paketē.

### 11. Sīki vaicājumi jau ir paralēli

`listOwnedTeams` pamata lasīšana paliek `Promise.all`.

## Kas jau strādā

- Publiskie iestatījumi kešojas 60 sekundes un invalidējas tikai tad, kad admins tos saglabā.
- Noslēgšana un bilances pieskaitīšana vairs nav N atsevišķi raksti katram pasākumam.
- Sākumlapa lokāli atveras, FAQ un kontaktu forma (vārds, e-pasts, temats, ziņa) ir vietā.
