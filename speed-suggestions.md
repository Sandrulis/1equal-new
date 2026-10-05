# Ātrdarbība

Pārbaudīts 2026-10-06, 1equal-new, pret kodu. Nav slodzes testa un nav produkcijas mērījuma.

**Atzīme šobrīd: 9.5/10**

27.09. bija 7/10, pēc paneļa klikšķu un pirmā kadra sašaurināšanas 9/10. Liela komanda vairs nesaņem visas 400 dienu balsis uzreiz, admin skats vairs nesaliek lietotājus, tulkojumus un dalībnieku sarakstu, kamēr tos neatver, un `touchUserLastSeen` vairs nestāv uz lasījuma.

06.10. pārbaude:

Apmeklētība vadītājam un administratoram skaitīja visus notikušos notikumus un «Būšu» balsis katrā paneļa atvēršanā. Tagad tas notiek tikai tad, kad atver komandas sarakstu (`/api/teams/:id/attendance`). Kamēr skaitļi nav atnākuši, šūnā ir «—», nevis nulles.

Admin lietotāji joprojām saņem apmeklētību tikai sadaļā Lietotāji, un vaicājums vairs neņem komandas, kurām modulis nav ieslēgts.

Virsgrāmata pirmajā kadrā jau nenāk. Dokuments to vēl solīja kopā ar 400 dienu pasākumiem. Tagad tas ir izlabots: virsgrāmata nāk, kad atver bilanci.

Atzīme nav 10, jo nav izmērīts reāls ielogošanās laiks, un aktīvās komandas pasākumi 400 dienās (bez sastāva) joprojām nāk pirmajā kadrā.

## Kas tagad ir pirmajā panelī

Īsta ielāde sauc `listOwnedTeams` tikai aktīvajai komandai. Pārējās ir īss saraksts.

Aktīvajai komandai paralēli nāk dalībnieki, bilances summa, apakškomandas, laukumi, moduļi, pasākumi 400 dienās bez `lineup` un turējumi tikai vēl nesāktiem pasākumiem. Virsgrāmata šajā solī nenāk.

Balsis:

- Ja dalībnieki × pasākumi ir 1500 vai mazāk, nāk viss 400 dienu logs.
- Ja vairāk, pirmajā kadrā ir tikai pēdējās 45 dienas un nākotnes balsis. Vecāku mēnesi panelis pielasa, kad to atver. Tas pats ceļš, kas mēnešiem aiz 400 dienām.

`settleFinishedEvents` un `touchUserLastSeen` iet `after()`, pēc atbildes. Ja finansu cron ir ieslēgts, norēķinu panelis nesauc.

Sastāvs, spēlētāja bilances rindas, komandas virsgrāmata, apmeklētība un citas komandas pilnais grafs nāk tikai tad, kad tos atver.

Moduļu saraksts, sporta saišu un komandas moduļu saites vienā pieprasījumā tiek lasītas vienu reizi.

## Admin

`/dashboard/admin` ielādē tikai atvērto sadaļu smagos sarakstus.

- Lietotāji nāk tikai `/admin/users`. Citur sidebar rāda lētu skaitu.
- Tulkojumi nāk tikai `/admin/translations`. Citur skaits ir iebūvēto atslēgu skaits.
- Dalībnieku rindas nāk tikai `/admin/teams`.

Pārslēgšana starp sadaļām paliek klientā. Trūkstošo sarakstu pieprasa `GET /api/admin/console?section=`, kad sadaļu atver. Iestatījumi, moduļi, valodas un pārējās vieglās sadaļas šos trīs sarakstus nelasa.

## Atlicis

Tālāk griezt kodu bez mērījuma vairs nav tā vērts. Nākamais solis ir ielogota `/dashboard` laiks produkcijā vai lokāli ar reālu komandu.

Ja tas joprojām ir lēns, palicis ir aktīvās komandas 400 dienu pasākumu saraksts bez sastāva. Tas ir mazāks par balsīm. Šķelt to tāpat kā balsis ir jēga tikai tad, ja mērījums rāda, ka šis saraksts ir griesti.

Balsis pirmajā kadrā nāk pēc pasākumu saraksta, nevis tajā pašā paralēlajā solī. To pārcelt blakus pasākumiem ir sīks ieguvums un bez mērījuma nav jātaisa.

## Ko vairs nemainīt

- DM Sans nāk no `next/font`.
- Publiskie iestatījumi kešojas 60 sekundes.
- Paneļa klikšķi paliek klientā. Serveri sauc, kad mainās dati, tiek pārslēgta komanda, atvērts sastāvs, komandas saraksts (apmeklētība), vecāks mēnesis, bilances rindas vai admin sadaļa, kas vēl nav ielādēta.
