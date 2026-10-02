# Changelog

## v0.1.20

- Admina lietotāju sarakstā ir e-pasts, tālrunis un valsts ar IP. Pie komandas nosaukuma ir sporta veids
- Google atgriešanās adrese ir publiskais hosts. Turnstile skripts saņem lapas nonce, lai pārbaude ielādētos produkcijā

## v0.1.19

- Admina komandas logā pie spēlētāja ir vadītāja un administratora atzīme, e-pasts un tālrunis
- Sporta veida ikonu meklē starp visām brīvajām Font Awesome ikonām. Ielāde rāda indikatoru
- Individuālie moduļi sporta veidu lapā nerādās. Tos ieslēdz katrai komandai

## v0.1.18

- Ielogotu no sākumlapas aizved uz paneli
- Apakškomandas notikums kalendārā ir tās krāsā. Aplis ir spēle, kvadrāts ir treniņš
- Privātums, noteikumi un sīkdatnes apraksta saglabātos datus. Spēkā no 02.10.2026

## v0.1.17

- Entuziastu saites un profils rādās tikai, ja modulis ir ieslēgts. Individuālu moduli admins ieslēdz katrai komandai atsevišķi
- Izvēlētā komanda paliek pēc atsvaidzināšanas. Jaunai un atkārtotai parolei rādās stiprums
- Spēlētāji ir alfabētā. Numurs ir pozīcijas bloka labajā augšā, un bez apakškomandas bloks ir pilnā platumā

## v0.1.16

- Spēļu izklājums ir uz ledus un saglabājas uzreiz. To labo tikai komandas vadītājs un administrators
- Notikuma laiks ir no 08:00 līdz 22:55 ar 5 minūšu soli. Treniņa izdevumi nav obligāti
- Bilances vēsture un rezervācijas ir vienā sarakstā komandai, spēlētājam un augšējai joslai

## v0.1.15

- Next.js ir 16.3.8. Tas aizver kritisko `next/og` attēlu ģenerēšanas ievainojamību

## v0.1.14

- E-pasta maiņas saite paliek vienreizējs tokens. Drošības pārbaude to vairs neuzskata par maršrutu bez autentifikācijas

## v0.1.13

- Komandas vadītājs ieceļ administratorus. Spēlētājam ir galvenā un papildu pozīcijas, bez trenera
- Dalībnieka labošanā ir vārds un e-pasts. Jaunais e-pasts stājas spēkā tikai pēc saites uz jauno adresi
- Parasts spēlētājs labo tikai sevi, var noņemt sevi pēc apstiprinājuma un neredz laukumus, apakškomandas un notikumu izveidi

## v0.1.12

- Bez Entuziastu saites var izgriezt kvadrāta avataru lietotājam un komandai. Paziņojumos var izslēgt e-pastus par jauniem notikumiem
- Admina cron slēdzis rezervē notikuma naudu līdz sākumam. Stundas saite to noņem cron-job.org
- Sporta veidiem ir nosaukums katrā valodā un moduļi. Komandas slēdzis rādās tikai, ja aktīvi ir vairāk nekā viens

## v0.1.11

- Sākumlapas izvēlne ritina līdz sadaļai, un enkurs seko aktīvajai valodai
- Vēstulēm ir vienots izkārtojums. Tekstā garā domuzīme ir defise, un saite zem pogas ir tā pati, kas pogai
- Kalendāra notikums paliek kalendāra skatā. Balsojuma skatā vairs nav atsevišķā jābalso bloka

## v0.1.10

- Komandas iestatījumos var pievienot, labot vai noņemt Entuziastu saiti
- Produkcijas lapas vairs nekrīt Sentry startā. Supabase adrese der arī ar `/rest/v1` galā

## v0.1.9

- Google pieslēgums iet ar lapas navigāciju, Umami sūtījumi vairs nav CSP bloķēti, un avatari paliek savā izmērā
- Demo kalendāra datumi seko tekošajam mēnesim, iepriekšējam un diviem nākamajiem

## v0.1.8

- Lint iziet tīri. Formu stāvoklis vairs netiek rakstīts efekta iekšienē, un attēli iet caur Next attēlu komponenti

## v0.1.7

- Reģistrācija sūta apstiprinājuma vēstuli. Aizmirsi paroli sūta saiti ar Cloudflare pārbaudi, un parole mainās tikai pēc saites. Izlogošanās aizved uz sākumlapu
- Admin var apskatīt komandu, neparādoties sastāvā. Kontaktu formai ir temats. Sānjoslā ir atsauksmes un kontakti
- Mobilajā kreisā izvēlne ir apakšā, admina izvēlne pa labi ar burger pogu. Sakļautas ikonas paliek kvadrātā, kājene sniedzas līdz apakšai
- Uzaicinājuma kodu var paslēpt un atvērt ar QR pogu. Daļai demo spēlētāju ir Entuziastu profils
- Komandu dati ir tikai saviem dalībniekiem. E-pasta balss notiek ar pogu. Kalendāra saite glabājas kā hash
- Integrāciju noslēpumi ir šifrēti. Ātruma limits un audita žurnāls ir datubāzē. Skriptu CSP izmanto nonce
- Supabase tabulām bez politikas ir liegums, nevis atvērta piekļuve

## v0.1.6

- Notikumu var labot un dzēst. Dzēšana atdod pieteikušos naudu un atgriež jau norautos spēles izdevumus
- Būs noņem laukuma cenu no spēlētāja uz komandu. Pēc notikuma sākuma spēles izdevumi vienreiz noiet no komandas bilances
- Balsošanas stundas, atskaite un datuma izvēle notikuma formā. Kalendāra notikums, kam vēl jābalso, pulsē

## v0.1.5

- Ielogotā komandas kalendārā vairs nerādās parauga spēles un treniņi
- Notikumu pievieno un saglabā. Datums ar veidu, sākums ar treneri un vieta ar apakškomandu ir divās kolonnās. Apakškomanda nav obligāta. Spēlei ir izdevumi, treniņam slēdzis ar treneri

## v0.1.4

- Komandas, dalībnieki, apakškomandas un laukumi glabājas datubāzē. Uzaicinājuma kods, vadītājs, numurs no 0 un spēlētāja bilance
- Moduļi apakškomandām, spēļu izklājumam un finansēm. Kalendārs, komanda un laukumi vienmēr redzami. Adminā komandas logs, pēdējo reizi redzēts un admin izvēlne zem 600px
- Paroles maiņa no lietotāja izvēlnes prasa pašreizējo paroli. Virs 600px komandas ikona atver komandu sarakstu

## v0.1.3

- Supabase reģistrācija, ielogošanās un paroles maiņa bez e-pasta. Pirmais lietotājs ir administrators
- Admin panelis: lietotāji, komandas, apakškomandas, iestatījumi, integrācijas, valodas un tulkojumi
- Integrācijas: Cloudflare Turnstile, Google auth, Resend, Umami un Sentry. Umami skripts ielādējas pēc statistikas piekrišanas
- Sistēmas nosaukums, logotips un favicon. Logotipu un favicon var ievilkt
- Atsauksmes logs apakšā pa labi, valodu karogi un kājene ar noteikumu saitēm

## v0.1.2

- Privātuma politika, lietošanas noteikumi, sīkdatņu politika un piekrišanas josla

## v0.1.1

- Vairāk vietas sezonas aicinājuma blokam landing lapā

## v0.1.0

- Komandas panelis, landing lapa un demo ieeja
