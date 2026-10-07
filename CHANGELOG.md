# Changelog

## v0.2.9

- Notikumu nevar izveidot bez laukuma, un bez finanšu cron komandas izdevums noņem no bilances uzreiz
- Vadītājam un administratoram Komandas uzstādījumi ir sānjoslā un mobilajā izvēlnē
- Telefonā apakšējā josla aizslīd ritinot, un paslēptai joslai kājenes atstarpe ir mazāka

## v0.2.8

- Spēles izklājumā zem trenera apļa ir pozīcijas nosaukums

## v0.2.7

- `sharp` ir 0.35.5, lai drošības pārbaude vairs nekrīt uz librsvg

## v0.2.6

- Treneris treniņā paliek vidū, spēlē ir laukuma malā, un tas pats spēlētājs var būt vairākās pozīcijās
- Vadītājs un administrators var labot ierašanos arī pēc notikuma

## v0.2.5

- Pirmās maiņas uzbrucēji ir vienā līmenī, un laukums ir pacelts tiem līdzi

## v0.2.4

- Izklājumā starp virsrakstu un laukumu ir mazāka atstarpe, un uzvārdam virs riņķa paliek vieta

## v0.2.3

- `source-map-js` ir 1.2.2, lai drošības pārbaude vairs nekrīt uz indeksēto source map

## v0.2.2

- Spēlei norāda mājas vai izbraukumu, un labojot to var saglabāt
- Izklājumā numurs ir aplī, uzvārds virs tā, logo kreisajā malā un Entuziastu forma labajā
- Telefonā sastāva rinda rāda avataru, un dati, kas neietilpst, paslēpjas veseli

## v0.2.1

- Velkot pozīciju, spraugā parādās līnija un kaimiņu rindas atvirzās

## v0.2.0

- Jauna pozīcija atveras savā logā. Kļūda un saglabāšana rādās kā paziņojums
- Pozīciju secību maina velkot. Kods TRAINER un citi 1-8 burtu kodi vairs netiek noraidīti
- Sākumlapa saka, ka pozīcijas pieder sporta veidam

## v0.1.39

- Sākumlapā komandas kalendāram ir viena saite
- Sastāvā, spēlētāja logā un admina komandā rādās šī sporta veida pozīcijas

## v0.1.38

- Katram sporta veidam ir savas pozīcijas. Hokejam sākumā ir LW, C, RW, D un G
- Sporta lapām katrā valodā ir savs slugs, vecās adreses iet ar 301, un lapu kartei ir hreflang
- Produkcijas būve prasa `https://1equal.com`. E-pasta balsojuma API CI atpazīst pēc tokena

## v0.1.37

- Publiskās lapas ir latviešu saknē, ar `/en` un `/ru`, kanonisko adresi, hreflang un lapu karti
- Sākumlapas teksts saka, ka citus sporta veidus var lietot, un pozīcijas paliek hokeja. Zīmols ir 1Equal
- Parasts spēlētājs neredz citu e-pastu, tālruni un IP. Paneļa saites priekšskats vairs neņem sākumlapas aprakstu

## v0.1.36

- Spēlētāja apmeklētība rādās komandas vadītājam, komandas administratoram un admina lietotājiem, ja modulis ir ieslēgts
- Skaitļi nāk tikai atverot komandas sarakstu. Kamēr tie nav atnākuši, šūnā ir «—»
- Admina vaicājums ņem tikai komandas ar ieslēgtu moduli, un virsgrāmata pirmajā kadrā nenāk

## v0.1.35

- Komandas biedram un viesim aiziet uzaicinājuma e-pasts, vairākas adreses parādās pēc kārtas, un balsojums no e-pasta atver sākumlapu ar paldies logu
- Notikuma izveidotājs e-pastu nesaņem, vietai vienmēr rādās cena, un tukšs viesu bloks nerādās
- Sākumlapa piemin uzaicinājumus un balsošanu. Ir `llms.txt`, juridisko lapu schema.org un `noindex` galvene privātajiem ceļiem

## v0.1.34

- Mobilajā kreisā un labā izvēlne ieslīd no malas, un valodu un lietotāja izvēlne iznāk zem augšējās joslas. Vienlaikus paliek atvērta tikai viena
- Pēc reģistrācijas, paroles saites un jaunās paroles rādās paziņojums, kas pēc 10 sekundēm aizved uz sākumu
- Google sesija paliek 30 dienas tikai tad, ja atzīmēts Atcerēties mani

## v0.1.33

- Viesu saite un saraksts rādās tikai tad, ja ir vismaz viens viesis. Laukumus var meklēt pēc nosaukuma
- Admina uzdevuma atzīme griežas tikai uz nospiestās rindas, un pārējās paliek klikšķināmas
- Vienā pieprasījumā sesija tiek pārbaudīta vienreiz, un checkboxiem ir rokas kursors

## v0.1.32

- Noņemta `www` novirze uz `1equal.com`, jo Vercel jau sūta otrādi un pārlūks palika noviržu cilpā

## v0.1.31

- Apkopes slēdzis izslēdz sistēmu. Ielogoties var tikai administrators, un publiskā lapa atvainojas bez ielogošanās pogas
- Admina lietotājiem aiz vārda ir izvēlētā valoda. IP un valsts atjauninās no pēdējās publiskās adreses
- `www.1equal.com` novirza uz `https://1equal.com`, lai Google OAuth adrese sakrīt ar reģistrēto

## v0.1.30

- Konta dzēšanas saite ir vienreizējs tokens, un drošības pārbaude to vairs neuzskata par maršrutu bez autentifikācijas
- Admina komandas dzēšana prasa apstiprinājumu

## v0.1.29

- Ielogošanās forma treniņa atgriešanās adresi ņem no lapas, lai lint vairs nekrīt uz stāvokļa maiņu efektā

## v0.1.28

- Iestatījumos e-pasts un tālrunis ir blakus. Viesa tālrunis rādās aiz e-pasta notikumā un viesu reģistrā
- Viesu piezīme ir trešā kolonna. Individuālu moduli ieslēdz komandai, un bez tā viesis treniņu sānjoslā neredz

## v0.1.27

- Treniņam bez trenera vadītājs vai administrators var atļaut viesus, ja sportam ir modulis Viesi bez trenera. Viesis piesakās ar saiti, nemaksā un nav sastāvā
- Publiskā lapa rāda komandu un veidu vienā līmenī ar cenu, datumu un laukumu. Ielogotais redz vārdu, e-pastu un iziešanu
- Sporta veida ikona saglabājas no Font Awesome kataloga

## v0.1.26

- Lietotājs pats ieplāno konta dzēšanu pēc 30 dienām. Parole vai e-pasta saite apstiprina, ielogošanās atceļ, un trīs vēstules ir e-pasta dizainā
- Admina lietotājiem un komandām ir alfabeta josla Visi, A-Z un #
- Sistēmas iestatījumos katrai valodai ir slogans, kas rādās e-pasta kājenē

## v0.1.25

- Neredzams admins pieslēdzas komandai un uzreiz redz tās kalendāru. Sastāvā viņš neparādās. Atvienošana no saraksta aizved uz admina komandām
- Bilances izraksts sākas ar šo mēnesi. Citu periodu līdz trim mēnešiem apstiprina ar ķeksi, un datums ir tas pats kalendāra logs, ko notikumam
- Paneļa saite vairs neatjauno iepriekšējo lapu. Admina sadaļa bez datiem tos pieprasa pati. `/old-2-new` rāda Pingvīnu pārneses priekšskatu

## v0.1.24

- `audit:check` pieņem `braces` brīdinājumu, kamēr nav labotas versijas. Pakotne ir tikai ESLint izstrādes atkarība

## v0.1.23

- Notikuma + poga datorā ir labajā apakšējā stūrī. Pāreja starp sadaļām slīd no tās puses, uz kuru iet
- Admina Ziņojumi glabā kļūdas, ieteikumus un atsauksmes, un tos var dzēst. Modāļiem ir X
- Komandas bilancē rezervētā summa ir ar vārdu Rezervēts

## v0.1.22

- Zem 600px izvēlne ir peldoša josla ar Sākumu, Komandu un atsevišķu + pogu notikumam
- Vadītājam un administratoram Apakškomandas un Laukumi ir joslā, ja ietilpst. Citādi tie ir centrētā izvēlnē virs joslas

## v0.1.21

- Pirmajā kadrā ielādējas aktīvā komanda. Sastāvs, vecāki mēneši, spēlētāja bilances rindas un admina lietotāji, tulkojumi vai dalībnieki nāk, kad tos atver
- Divi faktori jāpabeidz, pirms komandas un admin dati tiek atdoti. Izcelsmes IP nāk no platformas, nevis no klienta pārsūtītās adreses
- Paneļa klikšķi paliek lapā. Lielai komandai balsis pirmajā kadrā ir pēdējās 45 dienas un nākotne

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
