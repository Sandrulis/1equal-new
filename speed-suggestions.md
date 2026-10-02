# Ātrdarbība

Pārbaudīts 2026-10-02, 1equal-new, pēc koda un lokālā servera (`http://localhost:3130`). Nav slodzes testa un nav produkcijas mērījuma.

**Atzīme šobrīd: 9.5/10**

27.09. bija 7/10, pēc paneļa klikšķu un pirmā kadra sašaurināšanas 9/10. Tagad liela komanda vairs nesaņem visas 400 dienu balsis uzreiz, admin skats vairs nesaliek lietotājus, tulkojumus un dalībnieku sarakstu, kamēr tos neatver, un `touchUserLastSeen` vairs nestāv uz lasījuma.

Atzīme nav 10, jo nav izmērīts reāls ielogošanās laiks, un aktīvās komandas pasākumi 400 dienās (bez sastāva) joprojām nāk pirmajā kadrā.

## Kas tagad ir pirmajā panelī

Īsta ielāde sauc `listOwnedTeams` tikai aktīvajai komandai. Pārējās ir īss saraksts.

Aktīvajai komandai paralēli nāk dalībnieki, bilances summa, apakškomandas, laukumi, moduļi, pasākumi 400 dienās bez `lineup`, virsgrāmata 400 dienās un turējumi tikai vēl nesāktiem pasākumiem.

Balsis:

- Ja dalībnieki × pasākumi ir 1500 vai mazāk, nāk viss 400 dienu logs.
- Ja vairāk, pirmajā kadrā ir tikai pēdējās 45 dienas un nākotnes balsis. Vecāku mēnesi panelis pielasa, kad to atver. Tas pats ceļš, kas mēnešiem aiz 400 dienām.

`settleFinishedEvents` un `touchUserLastSeen` iet `after()`, pēc atbildes. Ja finansu cron ir ieslēgts, norēķinu panelis nesauc.

Sastāvs, spēlētāja bilances rindas un citas komandas pilnais grafs nāk tikai tad, kad tos atver.

## Admin

`/dashboard/admin` ielādē tikai atvērto sadaļu smagos sarakstus.

- Lietotāji nāk tikai `/admin/users`. Citur sidebar rāda lētu skaitu.
- Tulkojumi nāk tikai `/admin/translations`. Citur skaits ir iebūvēto atslēgu skaits.
- Dalībnieku rindas nāk tikai `/admin/teams`.

Pārslēgšana starp sadaļām paliek klientā. Trūkstošo sarakstu pieprasa `GET /api/admin/console?section=`, kad sadaļu atver. Iestatījumi, moduļi, valodas un pārējās vieglās sadaļas šos trīs sarakstus nelasa.

## Atlicis

Tālāk griezt kodu bez mērījuma vairs nav tā vērts. Nākamais solis ir ielogota `/dashboard` laiks produkcijā vai lokāli ar reālu komandu.

Ja tas joprojām ir lēns, palicis ir aktīvās komandas 400 dienu pasākumu saraksts bez sastāva. Tas ir mazāks par balsīm. Šķelt to tāpat kā balsis ir jēga tikai tad, ja mērījums rāda, ka šis saraksts ir griesti.

## Ko vairs nemainīt

- DM Sans nāk no `next/font`.
- Publiskie iestatījumi kešojas 60 sekundes.
- Paneļa klikšķi paliek klientā. Serveri sauc, kad mainās dati, tiek pārslēgta komanda, atvērts sastāvs, vecāks mēnesis, bilances rindas vai admin sadaļa, kas vēl nav ielādēta.
