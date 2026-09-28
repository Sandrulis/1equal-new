# Changelog

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
