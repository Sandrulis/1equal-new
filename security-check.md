# Drošība

Pārbaudīts atkārtoti 2026-10-03, 1equal-new, pēc MFA un izcelsmes IP labojuma. Nav penetrācijas testa pret produkciju.

**Atzīme šobrīd: 9/10**

Rīta pārbaudē bija 8.5/10, jo divu faktoru sesija aptvēra tikai paneļa lapu un izcelsmes IP ņēma pirmo `x-forwarded-for`. Abi ir salaboti. Atzīme nav 10 to pašu iemeslu dēļ, kas bija 27.09.

## Kas šajā kārtā salabots

### Divi faktori aptver datus

`getAccountProfile()` atgriež `null`, ja faktoram pienākas `aal2` un sesija vēl ir `aal1`. Komandu API, admin konsole un servera darbības, kas iet caur šo profilu, datus neatdod. API atbild 401. Darbības atgriež kļūdu.

`/dashboard` vispirms rāda koda logu un tikai pēc tam lasa komandu. Profila labošana, paroles maiņa, avatārs un pasākumu e-pasti arī prasa pabeigtu otro faktoru. Ielogošanās, izlogošanās, paroles saite un jaunās paroles iestatīšana paliek pieejamas, kamēr otrais faktors vēl nav ievadīts.

### Izcelsmes IP vairs nenāk no klienta pārsūtījuma

Adrese nāk no `x-vercel-forwarded-for` vai `x-real-ip`. `cf-connecting-ip` tiek ņemts tikai tad, kad platformas redzētais savienojums ir Cloudflare tīklā, vai kad ir `cf-ray` un platformas adreses nav. Pirmais `x-forwarded-for` vairs netiek lietots. Valsts galvene tiek ņemta no tā paša avota, kas IP. `ipwho.is` sauc tikai īstai publiskai IP. Tas pats lasījums ir kontakta limitam, Turnstile un finansu cron.

Ja nav ne Vercel, ne Cloudflare galvenes, adrese netiek saglabāta.

## Kas joprojām turas

- `style-src` atļauj `'unsafe-inline'`. Produkcijā `'unsafe-eval'` nav. Izstrādē ir, jo React labošanas rīki to prasa.
- Ja `consume_rate_limit` nav sasniedzams, limits krīt uz viena procesa atmiņu (līdz 5000 atslēgām).
- Noplūdušo paroļu pārbaude jāieslēdz Supabase Auth panelī. No migrācijas tā neieslēdzas.
- Parole ir vismaz 8 zīmes.
- "Atcerēties mani" sīkfails paliek lasāms no JavaScript. Sesijas sīkfails nav šis.

Šie nav jauni caurumi.

## Kas pārbaudīts un turas

- `GET /api/teams/[teamId]`, `history`, `ledger`, `lineup` un `GET /api/admin/console` iet caur `getAccountProfile()`. Bez sesijas vai bez pabeigta otrā faktora profils ir tukšs un atbilde ir 401. Sveša komanda ir 403. Vēsture ir visvairāk 62 dienas. Admina konsole prasa `is_admin`.
- `member_balance_totals` ir tikai `service_role`. Izcelsmes tabulas pārlūkam ir liegtas. IP panelī nonāk tikai admina lasījumā.
- Komandas administrators pats sev karogu nevar uzlikt. Sastāvu, bilanci un dzēšanu raksta vadītājs vai komandas administrators.
- Aizmirstā parole sūta saiti. Callback `next` ir tikai `/reset-password`. E-pasta balss ir POST ar SHA-256 un derīguma termiņu.
- Komandu RLS paliek `is_team_member`. Jaunās tabulas pārlūkam ir liegtas.
- Integrāciju noslēpumi paliek šifrēti. Audita žurnāls paliek. SVG zīmolam paliek aizliegts. Umami tikai no `cloud.umami.is`. Sporta ikonas nāk no pakotnes, nevis no ārēja skripta.
- Finansu cron salīdzina tokenu ar `timingSafeEqual`. Google OAuth state paliek nejaušs un httpOnly.

## Ko vairs nemainīt šajā kārtā

DM Sans un publisko lapu 60 sekunžu kešs nav drošības caurums.
