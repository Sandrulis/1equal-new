import { TOPIC_SLUGS, type PublicLocale, type TopicSlug } from "@/app/lib/seo-slugs";

type Copy = Record<PublicLocale, string>;

export type TopicPage = {
  slug: TopicSlug;
  title: Copy;
  description: Copy;
  h1: Copy;
  lead: Copy;
  sections: { heading: Copy; paragraphs: Copy[] }[];
  related: string[];
};

function L(lv: string, en: string, ru: string): Copy {
  return { lv, en, ru };
}

export function topicCopy(lang: PublicLocale, value: Copy): string {
  return value[lang];
}

export const TOPIC_PAGES: TopicPage[] = [
  {
    slug: "hokeja-komandas",
    title: L(
      "Hokeja komandas vadība | Kalendārs, dalība, ledus nauda",
      "Hockey team management | Calendar, attendance, ice fees",
      "Управление хоккейной командой | Календарь, явка, лёд",
    ),
    description: L(
      "Hokeja komandas kalendārs spēlēm un treniņiem, spēlētāju dalība un ledus naudas uzskaite pēc halles cenas. Apskati demo bez konta.",
      "A hockey team calendar for games and training, player attendance and ice-fee tracking from the rink price. Open the demo without an account.",
      "Календарь хоккейной команды для игр и тренировок, явка игроков и учёт оплаты льда по цене катка. Демо без аккаунта.",
    ),
    h1: L("Hokeja komandas kalendārs un ledus nauda", "Hockey team calendar and ice fees", "Календарь хоккейной команды и оплата льда"),
    lead: L(
      "Hokeja komandai nedēļa sastāv no ledus laikiem. Spēle un treniņš ir atsevišķi notikumi ar savu laiku, halli un to, kuri spēlētāji būs. 1Equal ir komandas vadības panelis pārlūkā, kur treneris to saliek vienuviet: komandas kalendārs, komandas sastāvs, spēlētāju dalība un ledus nauda no halles cenas.",
      "A hockey week is a set of ice times. A game and a training session are separate events, each with its own time, rink and list of who is coming. 1Equal is a team panel in the browser where a coach keeps the team calendar, the roster, player attendance and the ice fee that comes from the rink price.",
      "Неделя хоккейной команды - это время на льду. Игра и тренировка - отдельные события со своим временем, катком и списком, кто придёт. 1Equal - панель команды в браузере: календарь, состав, явка и оплата льда от цены катка.",
    ),
    sections: [
      {
        heading: L("Komandas kalendārs uz ledus", "A team calendar on the ice", "Календарь команды на льду"),
        paragraphs: [
          L(
            "Kalendārā spēle un treniņš stāv blakus, nevis divos čatos. Katram notikumam ir sākums, un, ja ir beigas, redzams ilgums. Halle ir laukums ar nosaukumu un cenu stundā. Viena halle var maksāt citādi nekā otra, un katrs ledus laiks patur savu vietu un savu cenu. Atkārtojošs vakars ir atsevišķi notikumi, tāpēc otrdienas treniņam un ceturtdienas treniņam ir sava spēlētāju dalība.",
            "Games and training sit on one calendar, not in two chats. Each event has a start, and an end time shows the duration. The rink is a venue with a name and an hourly price. One rink can cost a different amount from another, and each ice time keeps its own place and its own price. A repeating evening is stored as separate events, so Tuesday and Thursday each have their own attendance.",
            "Игры и тренировки стоят в одном календаре, а не в двух чатах. У события есть начало, а по времени окончания видно длительность. Каток - это площадка с названием и ценой в час. У каждого выхода на лёд своё место и своя цена. Повторяющийся вечер хранится отдельными событиями, поэтому у вторника и четверга своя явка.",
          ),
        ],
      },
      {
        heading: L("Spēlētāju dalība un treniņu apmeklējums", "Player attendance", "Явка игроков"),
        paragraphs: [
          L(
            "Pirms sastāva uz spēli trenerim jāzina, kuri būs uz ledus. Spēlētājs atzīmē dalību panelī vai no e-pasta saites. Atsevišķa lietotne nav jāinstalē: panelis ir pārlūkā telefonā. Treniņam bez trenera viesis var saņemt saiti, un konts viņam netiek izveidots. Cilvēks, kurš ienāk komandas sastāvā, reģistrējas ar uzaicinājuma saiti. Tā spēlētāju dalība paliek pie konkrētā notikuma, nevis pazūd ziņās.",
            "Before a game lineup, the coach needs to know who will be on the ice. A player marks attendance in the panel or from an email link. There is no app to install: the panel is the browser on a phone. For a training session without a coach, a guest can receive a link and no account is created. A person who joins the roster registers from the invite link. Attendance stays on that event instead of disappearing into messages.",
            "Перед составом на игру тренеру нужно знать, кто будет на льду. Игрок отмечает явку в панели или по ссылке из письма. Отдельное приложение ставить не нужно: панель открывается в браузере телефона. На тренировку без тренера гость получает ссылку, и аккаунт ему не создаётся. Кто входит в состав, регистрируется по ссылке приглашения. Явка остаётся у конкретного события.",
          ),
        ],
      },
      {
        heading: L("Ledus nauda no halles cenas", "Ice money from the rink price", "Оплата льда от цены катка"),
        paragraphs: [
          L(
            "Ledus nauda 1Equal nav atsevišķs maksājums hallei un nav bankas pārskaitījums. Hallei saglabā cenu stundā. Ja notikumam ir beigu laiks, kalendārī izmaksu rāda kā ilgumu reiz šo stundas cenu. Kad spēlētājs atbild, ka piedalīsies, un viņš nav atbrīvots no maksas, halles cena tiek pierakstīta viņa bilancē par šo notikumu. Pie notikuma redzams, cik savākts: šī cena reiz to dalībnieku skaits, kuri nāk un nav atbrīvoti. Spēlētāju var atzīmēt kā atbrīvotu no maksas, piemēram, ja komanda tā ir nolēmusi.",
            "Ice money in 1Equal is not a payment to the rink and not a bank transfer. The rink stores an hourly price. If the event has an end time, the calendar shows the cost as duration times that hourly price. When a player says they are coming and they are not marked fee-exempt, the rink price is written to their balance for that event. The event shows what is collected: that price times the number of people who are coming and are not exempt. A player can be marked fee-exempt when the team has decided that.",
            "Оплата льда в 1Equal - это не платёж катку и не банковский перевод. У катка хранится цена в час. Если у события есть конец, в календаре стоимость показана как длительность, умноженная на эту цену. Когда игрок отмечает, что придёт, и он не освобождён от взноса, цена катка записывается в его баланс за это событие. У события видно, сколько собрано: эта цена умножается на число тех, кто идёт и не освобождён. Игрока можно отметить как освобождённого от взноса.",
          ),
        ],
      },
      {
        heading: L("Komandas sastāvs", "The roster", "Состав команды"),
        paragraphs: [
          L(
            "Komandas sastāvā ir dalībnieki ar numuru, pozīciju un, ja vajag, apakškomandu. Apakškomanda palīdz atdalīt grupas vienas komandas iekšienē, nevis jaukt visus vienā sarakstā. Uzaicinājums aiziet e-pastā. Tas ir tas pats panelis, ko lieto arī florbola, basketbola un volejbola komandas: kalendārs, dalība un laukuma cena. Atšķirība hokejā ir tā, ka laukums parasti ir ledus halle un izmaksu sarunā sauc par ledus naudu.",
            "The roster holds members with a number, a position and, when needed, a sub-team. A sub-team separates groups inside one team instead of mixing everyone in one list. The invite goes by email. It is the same panel floorball, basketball and volleyball teams use: a calendar, attendance and a venue price. For hockey the venue is usually an ice rink, and the cost is what teams call ice money.",
            "В составе участники с номером, позицией и, если нужно, подкомандой. Подкоманда отделяет группы внутри одной команды. Приглашение уходит по почте. Это та же панель, которой пользуются команды по флорболу, баскетболу и волейболу: календарь, явка и цена площадки. В хоккее площадка обычно каток, и расход называют оплатой льда.",
          ),
        ],
      },
    ],
    related: ["florbola-komandas", "ledus-naudas-uzskaite", "team-calendar", "player-attendance", "cenas"],
  },
  {
    slug: "florbola-komandas",
    title: L(
      "Florbola komandas vadība | Kalendārs, dalība, halle",
      "Floorball team management | Calendar, attendance, hall",
      "Управление флорбольной командой | Календарь и зал",
    ),
    description: L(
      "Florbola komandas kalendārs spēlēm un treniņiem zālē, spēlētāju dalība un halles izmaksu uzskaite. Demo bez konta.",
      "A floorball team calendar for games and hall training, player attendance and hall-cost tracking. Demo without an account.",
      "Календарь флорбольной команды для игр и тренировок в зале, явка и учёт стоимости зала. Демо без аккаунта.",
    ),
    h1: L("Florbola komandas kalendārs un halles izmaksas", "Floorball team calendar and hall costs", "Календарь флорбольной команды и стоимость зала"),
    lead: L(
      "Florbola komanda bieži spēlē un trenējas vairākos vakaros nedēļā, un zāle nav ledus. 1Equal nav hokeja programma ar nomainītu nosaukumu. Florbolam tas pats panelis satur komandas kalendāru, komandas sastāvu, treniņu apmeklējumu un laukuma izmaksas, kur laukums ir zāle ar savu cenu stundā.",
      "A floorball team often plays and trains on several evenings a week, and the hall is not ice. 1Equal is not a hockey product with the name swapped. For floorball the same panel holds the team calendar, the roster, training attendance and venue costs, where the venue is a hall with its own hourly price.",
      "Флорбольная команда часто играет и тренируется несколько вечеров в неделю, и зал - это не лёд. 1Equal - не хоккейная программа с подменённым названием. Для флорбола в той же панели календарь, состав, посещаемость тренировок и стоимость площадки, где площадка - зал со своей ценой в час.",
    ),
    sections: [
      {
        heading: L("Spēles un treniņi vienā kalendārā", "Games and training on one calendar", "Игры и тренировки в одном календаре"),
        paragraphs: [
          L(
            "Nedēļas treniņš un nedēļas nogales spēle ir divi notikumi. Katram ir savs laiks un sava zāle. Ja komanda maina halli, jaunajam notikumam izvēlas citu laukumu, un iepriekšējais patur savu vietu. Kalendārs rāda, kad ir spēle un kad ir treniņš, lai vadītājs neredz tikai vienu garu sarakstu ziņās. Atkārtojums nav viens ieraksts visam mēnesim: katrs vakars ir savs notikums ar savu treniņu apmeklējumu.",
            "A weekday training session and a weekend game are two events. Each has its own time and its own hall. If the team changes halls, the new event uses another venue and the earlier one keeps its place. The calendar shows when there is a game and when there is training, so the manager is not left with one long chat thread. A repeat is not one row for the whole month: each evening is its own event with its own attendance.",
            "Тренировка в будний день и игра на выходных - два события. У каждого своё время и свой зал. Если команда меняет зал, новое событие берёт другую площадку, а старое сохраняет своё место. Календарь показывает, где игра, а где тренировка. Повтор - не одна строка на весь месяц: каждый вечер - своё событие со своей явкой.",
          ),
        ],
      },
      {
        heading: L("Kas būs zālē", "Who will be in the hall", "Кто будет в зале"),
        paragraphs: [
          L(
            "Spēlētāju dalība florbolā ir atbilde uz konkrēto notikumu: būšu vai nebūšu. Atbilde ir panelī vai e-pasta saitē, bez atsevišķas lietotnes. Ja treniņš notiek bez trenera, viesis saņem saiti un konts netiek izveidots. Komandas sastāvā paliek numuri, pozīcijas un apakškomandas, ja vienā klubā ir vairākas grupas. Uzaicinājums jaunam cilvēkam aiziet e-pastā, un viņš pievienojas ar saiti.",
            "Floorball attendance is an answer on a specific event: coming or not. The answer is in the panel or on an email link, with no separate app. If a training session has no coach, a guest gets a link and no account is created. The roster keeps numbers, positions and sub-teams when one club has several groups. An invite to a new person goes by email, and they join from the link.",
            "Явка во флорболе - ответ на конкретное событие: приду или нет. Ответ в панели или по ссылке из письма, без отдельного приложения. Если тренировка без тренера, гость получает ссылку, и аккаунт не создаётся. В составе остаются номера, позиции и подкоманды, если в клубе несколько групп. Приглашение новому человеку уходит по почте, и он присоединяется по ссылке.",
          ),
        ],
      },
      {
        heading: L("Halles cena, nevis ledus nauda", "Hall price, not ice money", "Цена зала, не оплата льда"),
        paragraphs: [
          L(
            "Zālei saglabā nosaukumu un cenu stundā. Kalendārī, ja notikumam ir beigas, izmaksu rāda kā ilgumu reiz stundas cenu. Kad spēlētājs atzīmē, ka nāks, un nav atbrīvots no maksas, šī cena tiek pierakstīta viņam par šo notikumu. Savākto summu pie notikuma rēķina kā cenu reiz to cilvēku skaitu, kuri nāk un nav atbrīvoti. Tas ir iekšējs pieraksts komandai, nevis maksājums zāles īpašniekam. Hokeja komandas to pašu lauku sauc par ledus naudu, jo viņu laukums ir halle ar ledu. Florbolam tas ir halles nomas pieraksts. Vadītājs redz katru vakaru atsevišķi: kura zāle ir izvēlēta, kāda ir tās cena stundā un kuri spēlētāji atzīmējuši, ka būs.",
            "A hall stores a name and an hourly price. On the calendar, if the event has an end, the cost is duration times the hourly price. When a player marks that they are coming and they are not fee-exempt, that price is written against them for the event. The collected amount on the event is the price times the number of people who are coming and are not exempt. It is an internal note for the team, not a payment to the hall owner. Hockey teams call the same field ice money because their venue is an ice rink. For floorball it is the hall-hire note.",
            "У зала хранится название и цена в час. В календаре, если у события есть конец, стоимость - длительность, умноженная на цену часа. Когда игрок отмечает, что придёт, и не освобождён от взноса, эта цена записывается ему за событие. Собранная сумма у события - цена, умноженная на число тех, кто идёт и не освобождён. Это внутренняя запись команды, а не платёж владельцу зала. Хоккейные команды называют то же поле оплатой льда, потому что их площадка - каток. Для флорбола это запись аренды зала.",
          ),
        ],
      },
    ],
    related: ["hokeja-komandas", "basketbola-komandas", "ledus-naudas-uzskaite", "training-management", "cenas"],
  },
  {
    slug: "basketbola-komandas",
    title: L(
      "Basketbola komandas vadība | Kalendārs un dalība",
      "Basketball team management | Calendar and attendance",
      "Управление баскетбольной командой | Календарь и явка",
    ),
    description: L(
      "Basketbola komandas kalendārs spēlēm un treniņiem zālē, sastāvs, spēlētāju dalība un zāles izmaksas. Demo bez konta.",
      "A basketball team calendar for games and gym sessions, roster, attendance and gym costs. Demo without an account.",
      "Календарь баскетбольной команды для игр и тренировок в зале, состав, явка и стоимость зала. Демо без аккаунта.",
    ),
    h1: L("Basketbola komandas nedēļa vienā panelī", "A basketball team's week in one panel", "Неделя баскетбольной команды в одной панели"),
    lead: L(
      "Basketbola nedēļā bieži ir treniņš un vairāk nekā viena spēle. Katrai ir savs laiks, sava zāle un sava spēlētāju dalība. 1Equal saliek komandas kalendāru, komandas sastāvu un laukuma izmaksas vienā panelī pārlūkā. Tas nav statistikas rīks metieniem un nav tiesnešu protokols.",
      "A basketball week often has training and more than one game. Each has its own time, its own gym and its own attendance. 1Equal puts the team calendar, the roster and venue costs in one browser panel. It is not a shot chart and not a referee scoresheet.",
      "В баскетбольной неделе часто есть тренировка и больше одной игры. У каждой своё время, свой зал и своя явка. 1Equal собирает календарь, состав и стоимость площадки в одной панели браузера. Это не статистика бросков и не судейский протокол.",
    ),
    sections: [
      {
        heading: L("Divas spēles nav viens ieraksts", "Two games are not one entry", "Две игры - не одна запись"),
        paragraphs: [
          L(
            "Ja nedēļā ir divas spēles, tās ir divi notikumi. Pirmajai var būt cita zāle un cita cena stundā nekā otrajai. Dalība uz pirmo spēli nepaliek automātiski uz otro: spēlētājs atbild par katru notikumu. Treniņš starp spēlēm arī ir savs notikums ar savu treniņu apmeklējumu. Tā vadītājs redz, kurš būs tieši tajā vakarā, nevis vispār šomēnes. Komandas sastāvs ar numuru paliek blakus šīm atbildēm.",
            "If the week has two games, they are two events. The first can have a different gym and a different hourly price from the second. Attendance for the first game does not carry over to the second: a player answers for each event. Training between the games is its own event with its own attendance. The manager sees who is coming that evening, not who is around this month in general.",
            "Если в неделе две игры, это два события. У первой может быть другой зал и другая цена часа, чем у второй. Явка на первую не переносится на вторую: игрок отвечает по каждому событию. Тренировка между играми тоже своё событие со своей посещаемостью. Организатор видит, кто будет именно в тот вечер, а не вообще в этом месяце.",
          ),
        ],
      },
      {
        heading: L("Sastāvs un apakškomandas", "Roster and sub-teams", "Состав и подкоманды"),
        paragraphs: [
          L(
            "Komandas sastāvā ir cilvēki ar numuru un pozīciju. Ja vienā kontā ir jauniešu grupa un pieaugušo grupa, apakškomandas tās atdala pēc krāsas un nosaukuma, ko komanda pati ieliek. Uzaicinājums ir e-pasts ar saiti. Spēlētājs, kurš jau ir sastāvā, atzīmē dalību bez jaunas lietotnes. Viesis uz treniņu bez trenera saņem saiti, un konts netiek izveidots.",
            "The roster is people with a number and a position. If one account has a youth group and an adult group, sub-teams separate them by a colour and a name the team enters. An invite is an email with a link. A player already on the roster marks attendance without a new app. A guest for a training session without a coach gets a link, and no account is created.",
            "В составе люди с номером и позицией. Если в одном аккаунте есть юниорская и взрослая группа, подкоманды разделяют их цветом и названием, которое команда задаёт сама. Приглашение - письмо со ссылкой. Игрок, который уже в составе, отмечает явку без нового приложения. Гость на тренировку без тренера получает ссылку, и аккаунт не создаётся.",
          ),
        ],
      },
      {
        heading: L("Zāles izmaksas pie notikuma", "Gym cost on the event", "Стоимость зала у события"),
        paragraphs: [
          L(
            "Zāle ir laukums ar cenu stundā. Kalendāra rinda rāda ilgumu reiz stundas cenu, ja ir beigu laiks. Maksa spēlētājam rodas tad, kad viņš atzīmē, ka piedalīsies, un nav atbrīvots no maksas: bilancē ieraksta šo zāles cenu par šo notikumu. Otrai spēlei tajā pašā nedēļā ir savs ieraksts, ja arī tur viņš nāk. Treneris redz savākto un to, kas vēl nav savākts. Nauda netiek sūtīta zālei caur 1Equal. Tas ir komandas iekšējais pieraksts, tāpat kā florbola halles cena vai hokeja ledus nauda. Pirms spēles sastāvā paliek numurs un pozīcija, lai redzētu, kuri no tiem, kas atzīmējuši dalību, ir šajā zālē.",
            "The gym is a venue with an hourly price. The calendar row shows duration times the hourly price when there is an end time. A player is charged when they mark that they are coming and they are not fee-exempt: their balance gets that gym price for that event. The second game the same week gets its own entry if they are coming there too. The coach sees what is collected and what is still open. Money is not sent to the gym through 1Equal. It is the team's internal note, the same way a floorball hall price or hockey ice money is recorded.",
            "Зал - площадка с ценой в час. Строка календаря показывает длительность, умноженную на цену часа, если есть время окончания. Взнос у игрока появляется, когда он отмечает, что придёт, и не освобождён от взноса: в баланс пишется эта цена зала за это событие. У второй игры той же недели своя запись, если он идёт и туда. Тренер видит собранное и то, что ещё открыто. Деньги залу через 1Equal не отправляются. Это внутренняя запись команды, как цена зала во флорболе или оплата льда в хоккее.",
          ),
        ],
      },
    ],
    related: ["volejbola-komandas", "florbola-komandas", "team-calendar", "player-attendance", "cenas"],
  },
  {
    slug: "volejbola-komandas",
    title: L(
      "Volejbola komandas vadība | Kalendārs un sastāvs",
      "Volleyball team management | Calendar and roster",
      "Управление волейбольной командой | Календарь и состав",
    ),
    description: L(
      "Volejbola komandas kalendārs, komandas sastāvs, spēlētāju dalība un zāles izmaksas. Darbojas pārlūkā, bez atsevišķas lietotnes. Demo bez konta.",
      "A volleyball team calendar, roster, player attendance and hall costs. It runs in the browser, with no separate app. Demo without an account.",
      "Календарь волейбольной команды, состав, явка и стоимость зала. Работает в браузере, без отдельного приложения. Демо без аккаунта.",
    ),
    h1: L("Volejbola komandas sastāvs un kalendārs", "Volleyball roster and calendar", "Состав и календарь волейбольной команды"),
    lead: L(
      "Volejbola komandai pirms treniņa vajag zināt, kuri būs zālē, un pirms spēles redzēt komandas sastāvu. 1Equal to tur komandas kalendārā kopā ar spēlētāju dalību un zāles cenu. Atsevišķu lietotni spēlētājiem instalēt nav jā: atbilde ir pārlūkā vai e-pasta saitē.",
      "A volleyball team needs to know who will be in the hall before training, and to see the roster before a game. 1Equal keeps that on the team calendar together with attendance and the hall price. Players do not install a separate app: the answer is in the browser or on an email link.",
      "Волейбольной команде перед тренировкой нужно знать, кто будет в зале, а перед игрой видеть состав. 1Equal держит это в календаре вместе с явкой и ценой зала. Отдельное приложение игрокам ставить не нужно: ответ в браузере или по ссылке из письма.",
    ),
    sections: [
      {
        heading: L("Kalendārs zālei, nevis ledum", "A calendar for the hall, not the ice", "Календарь для зала, не для льда"),
        paragraphs: [
          L(
            "Spēle un treniņš ir notikumi ar laiku un vietu. Vieta ir zāle, ko saglabā kā laukumu ar nosaukumu un cenu stundā. Ja komanda trenējas vienā zālē un spēlē citā, tie ir divi laukumi ar divām cenām. Katrs notikums patur savējo. Komandas kalendārs tāpēc der volejbolam tieši tāpat kā citiem zāles sporta veidiem, un tas nav jātaisa par ledus grafiku.",
            "A game and a training session are events with a time and a place. The place is a hall saved as a venue with a name and an hourly price. If the team trains in one hall and plays in another, those are two venues with two prices. Each event keeps its own. The team calendar fits volleyball the same way it fits other hall sports, and it does not have to be an ice schedule.",
            "Игра и тренировка - события со временем и местом. Место - зал, сохранённый как площадка с названием и ценой в час. Если команда тренируется в одном зале, а играет в другом, это две площадки с двумя ценами. У каждого события своя. Календарь подходит волейболу так же, как другим зальным видам, и его не нужно превращать в график льда.",
          ),
        ],
      },
      {
        heading: L("Sastāvs un dalība no telefona", "Roster and attendance from a phone", "Состав и явка с телефона"),
        paragraphs: [
          L(
            "Komandas sastāvā ieraksta cilvēku, numuru un sava sporta veida pozīciju. Spēlētāju dalība ir atzīme, vai cilvēks būs uz šo notikumu. To var izdarīt telefonā pārlūkā. E-pasta saite ved uz to pašu atbildi. Treniņam bez trenera viesis saņem saiti bez konta. Cilvēks, kurš pievienojas sastāvam, reģistrējas ar uzaicinājumu.",
            "The roster stores a person, a number and a position for that sport. Attendance is a mark of whether the person is coming to that event. It can be done on a phone in the browser. The email link opens the same answer. For a training session without a coach, a guest gets a link without an account. A person who joins the roster registers from the invite.",
            "В составе хранится человек, номер и позиция своего вида спорта. Явка - отметка, придёт ли человек на это событие. Это можно сделать с телефона в браузере. Ссылка из письма открывает тот же ответ. На тренировку без тренера гость получает ссылку без аккаунта. Кто входит в состав, регистрируется по приглашению.",
          ),
        ],
      },
      {
        heading: L("Zāles izmaksas bez atsevišķas tabulas", "Hall costs without a separate sheet", "Стоимость зала без отдельной таблицы"),
        paragraphs: [
          L(
            "Cena ir pie laukuma, nevis jaunā izklājlapā katru nedēļu. Notikuma izmaksu kalendārī rāda kā ilgumu reiz stundas cenu, ja beigu laiks ir ievadīts. Dalībniekam, kurš nāk un nav atbrīvots no maksas, šī cena tiek pierakstīta bilancē. Atbrīvotos neskaita savāktajā summā. Vadītājs redz, cik par šo vakaru ir savākts un cik vēl ir atvērts. Tas nepaliek maksājums zālei caur sistēmu. Basketbola un florbola komandas lieto to pašu lauka cenu. Hokejā to pašu mehānismu sauc par ledus naudu, jo laukums ir ledus halle. Volejbola komandai pietiek ar zāles nosaukumu, laiku un atbildēm no telefona, bez atsevišķas tabulas par katru vakaru.",
            "The price lives on the venue, not in a new spreadsheet every week. The calendar shows the event cost as duration times the hourly price when an end time is entered. A member who is coming and is not fee-exempt gets that price on their balance. Exempt people are not counted in the collected amount. The manager sees how much is collected for that evening and how much is still open. It does not become a payment to the hall through the system. Basketball and floorball teams use the same venue price. In hockey the same mechanism is called ice money because the venue is an ice rink.",
            "Цена живёт у площадки, а не в новой таблице каждую неделю. Календарь показывает стоимость события как длительность, умноженную на цену часа, если введено время окончания. Участнику, который идёт и не освобождён от взноса, эта цена пишется в баланс. Освобождённых в собранную сумму не считают. Организатор видит, сколько собрано за этот вечер и сколько ещё открыто. Это не становится платежом залу через систему. Баскетбольные и флорбольные команды используют ту же цену площадки. В хоккее тот же механизм называют оплатой льда, потому что площадка - каток.",
          ),
        ],
      },
    ],
    related: ["basketbola-komandas", "florbola-komandas", "player-attendance", "team-expenses", "cenas"],
  },
  {
    slug: "ledus-naudas-uzskaite",
    title: L(
      "Ledus naudas un laukuma izmaksu uzskaite",
      "Ice money and venue cost tracking",
      "Учёт оплаты льда и стоимости площадки",
    ),
    description: L(
      "Kā 1Equal pieraksta ledus naudu un laukuma izmaksas: halles cena stundā, notikuma ilgums un dalībnieki, kuri nāk. Demo bez konta.",
      "How 1Equal records ice money and venue costs: the hourly rink price, the event length and the players who are coming. Demo without an account.",
      "Как 1Equal записывает оплату льда и стоимость площадки: цена часа, длительность и игроки, которые идут. Демо без аккаунта.",
    ),
    h1: L("Ledus naudas un laukuma izmaksu uzskaite", "Tracking ice money and venue costs", "Учёт оплаты льда и стоимости площадки"),
    lead: L(
      "Ledus nauda komandā ir jautājums, cik maksā halle un kuri spēlētāji tajā vakarā piedalās. 1Equal to pieraksta pie laukuma un pie notikuma. Tas nav rēķins hallei un nav maksājumu sistēma. Tas pats pieraksts der zālei florbolā, basketbolā un volejbolā: tur to sauc par laukuma izmaksām, nevis par ledus naudu.",
      "Ice money for a team is the question of what the rink costs and which players are there that evening. 1Equal records it on the venue and on the event. It is not an invoice to the rink and not a payment system. The same record fits a hall in floorball, basketball and volleyball: there it is a venue cost, not ice money.",
      "Оплата льда для команды - это вопрос, сколько стоит каток и кто из игроков там в тот вечер. 1Equal записывает это у площадки и у события. Это не счёт катку и не платёжная система. Та же запись подходит залу во флорболе, баскетболе и волейболе: там это стоимость площадки, а не оплата льда.",
    ),
    sections: [
      {
        heading: L("Laukums ar cenu stundā", "A venue with an hourly price", "Площадка с ценой в час"),
        paragraphs: [
          L(
            "Komanda saglabā laukumu: nosaukumu un cenu stundā. Hokejā tas ir ledus halle. Citos sporta veidos tā ir zāle. Cenu ievada komanda. 1Equal neņem cenu no halles mājaslapas un nepublicē savu cenrādi par ledu. Ja ir divas halles, katrai ir sava cena. Paslēptu laukumu var novākt no izvēles, neizdzēšot vēsturi. Cena paliek pie laukuma, nevis jaunā tabulā katru nedēļu.",
            "The team saves a venue: a name and an hourly price. In hockey that is an ice rink. In other sports it is a hall. The team enters the price. 1Equal does not pull the price from the rink website and does not publish its own ice price list. If there are two rinks, each has its own price. A hidden venue can be taken out of the picker without deleting history.",
            "Команда сохраняет площадку: название и цену в час. В хоккее это каток. В других видах это зал. Цену вводит команда. 1Equal не берёт цену с сайта катка и не публикует свой прайс на лёд. Если катка два, у каждого своя цена. Скрытую площадку можно убрать из выбора, не удаляя историю.",
          ),
        ],
      },
      {
        heading: L("Ko rāda kalendārs", "What the calendar shows", "Что показывает календарь"),
        paragraphs: [
          L(
            "Notikumam izvēlas laukumu, sākumu un, ja zināms, beigas. Ja beigu laiks ir, kalendārī izmaksu rāda kā ilgumu reiz stundas cenu. Bez beigu laika šo reizinājumu neparāda. Spēle un treniņš katrs nēsā savu summu, tāpēc garāks ledus laiks un īsāks treniņš nesajaucas vienā skaitlī. Tas ir attēlojums notikumam, nevis rēķins, ko sistēma nosūta hallei.",
            "An event gets a venue, a start and, when known, an end. If there is an end time, the calendar shows the cost as duration times the hourly price. Without an end time that multiplication is not shown. A game and a training session each carry their own figure, so a longer ice slot and a shorter practice do not collapse into one number. It is a display on the event, not an invoice the system sends to the rink.",
            "У события выбирают площадку, начало и, если известно, конец. Если конец есть, календарь показывает стоимость как длительность, умноженную на цену часа. Без конца это умножение не показывают. Игра и тренировка несут свою сумму, поэтому длинный лёд и короткая тренировка не сливаются в одно число. Это показ у события, а не счёт, который система шлёт катку.",
          ),
        ],
      },
      {
        heading: L("Kas tiek pierakstīts spēlētājam", "What is written to a player", "Что записывается игроку"),
        paragraphs: [
          L(
            "Kad spēlētājs atzīmē, ka piedalīsies, un finanses komandai ir ieslēgtas, laukuma cena tiek pierakstīta viņa bilancē par šo notikumu, ja viņš nav atbrīvots no maksas. Atbrīvojumu ieliek pie dalībnieka. Ja viņš atbild, ka nenāks, šis ieraksts par notikumu tiek noņemts. Pie notikuma savākto rēķina kā laukuma cenu reiz to dalībnieku skaitu, kuri nāk un nav atbrīvoti. Redzams arī, cik vēl nav savākts. Nauda caur 1Equal netiek pārskaitīta ne hallei, ne spēlētājam. Tas ir komandas iekšējais pieraksts par ledus naudu vai laukuma izmaksām. Treneris salīdzina šo pierakstu ar to, kuri spēlētāji atzīmējuši, ka būs, un kuri ir atbrīvoti no maksas.",
            "When a player marks that they are coming, and finance is enabled for the team, the venue price is written to their balance for that event if they are not fee-exempt. The exemption is set on the member. If they later say they are not coming, that event entry is removed. Collected on the event is the venue price times the number of members who are coming and are not exempt. What is still open is visible too. Money is not transferred through 1Equal to the rink or to the player. It is the team's internal note for ice money or venue costs.",
            "Когда игрок отмечает, что придёт, и финансы у команды включены, цена площадки записывается в его баланс за это событие, если он не освобождён от взноса. Освобождение ставят у участника. Если потом он отвечает, что не придёт, запись за событие снимается. Собранное у события - цена площадки, умноженная на число участников, которые идут и не освобождены. Видно и то, что ещё не собрано. Деньги через 1Equal не переводятся ни катку, ни игроку. Это внутренняя запись команды об оплате льда или стоимости площадки.",
          ),
        ],
      },
    ],
    related: ["hokeja-komandas", "florbola-komandas", "team-expenses", "player-attendance", "cenas"],
  },
  {
    slug: "cenas",
    title: L(
      "1Equal cenas",
      "1Equal pricing",
      "Цены 1Equal",
    ),
    description: L(
      "Publiska cena 1Equal lietošanai vēl nav norādīta. Vari apskatīt demo bez konta vai uzrakstīt caur kontaktu formu.",
      "A public price for using 1Equal is not listed yet. You can open the demo without an account or write through the contact form.",
      "Публичная цена 1Equal ещё не указана. Можно открыть демо без аккаунта или написать через форму контактов.",
    ),
    h1: L("Cik maksā 1Equal", "What 1Equal costs", "Сколько стоит 1Equal"),
    lead: L(
      "Publiska cena 1Equal lietošanai vēl nav publicēta. Šajā lapā nav izdomāta summa, nav mēneša plāna un nav atlaides. Kad cena būs apstiprināta, tā tiks ierakstīta šeit. Līdz tam vari apskatīt demo bez konta vai izveidot kontu un uzrakstīt caur sākumlapas kontaktu formu.",
      "A public price for using 1Equal is not published yet. This page does not invent an amount, a monthly plan or a discount. When a price is confirmed, it will be written here. Until then you can open the demo without an account, or create an account and write through the contact form on the homepage.",
      "Публичная цена за использование 1Equal ещё не опубликована. На этой странице нет выдуманной суммы, месячного плана и скидки. Когда цена будет подтверждена, её запишут здесь. До тех пор можно открыть демо без аккаунта или создать аккаунт и написать через форму контактов на главной.",
    ),
    sections: [
      {
        heading: L("Kas šobrīd ir zināms", "What is known today", "Что известно сейчас"),
        paragraphs: [
          L(
            "Demo paneli var atvērt bez konta un apskatīt kalendāru, sastāvu un notikumus ar parauga datiem. Konts ir vajadzīgs, lai veidotu savu komandu, uzaicinātu cilvēkus un glabātu savus notikumus. Viesis uz treniņu bez trenera saņem saiti, un konts viņam netiek izveidots. Cilvēks, kurš pievienojas komandas sastāvam, reģistrējas ar uzaicinājuma saiti. Neviena no šīm darbībām šajā lapā nav pārvērsta par cenu.",
            "The demo panel can be opened without an account to look at a calendar, a roster and events with sample data. An account is needed to create your own team, invite people and store your own events. A guest for a training session without a coach gets a link, and no account is created for them. A person who joins the roster registers from the invite link. None of these actions is turned into a price on this page.",
            "Демо-панель можно открыть без аккаунта и посмотреть календарь, состав и события с примерными данными. Аккаунт нужен, чтобы создать свою команду, пригласить людей и хранить свои события. Гость на тренировку без тренера получает ссылку, и аккаунт ему не создаётся. Человек, который входит в состав, регистрируется по ссылке приглашения. Ни одно из этих действий на этой странице не превращено в цену.",
          ),
        ],
      },
      {
        heading: L("Ko cena nepiesedz", "What a price would not be", "Чем цена не является"),
        paragraphs: [
          L(
            "Ledus nauda un laukuma izmaksas, ko komanda pieraksta pie notikuma, nav 1Equal abonements. Tā ir halles vai zāles cena, ko ievada komanda, un pieraksts, kurš spēlētājs nāk. 1Equal šo naudu nepārskaita hallei. Programmas lietošanas cena ir cits jautājums, un tā vēl nav publicēta. Tāpēc lapā nav piedāvājuma shēmas ar cenu.",
            "Ice money and venue costs that a team records on an event are not a 1Equal subscription. That is the rink or hall price the team enters, and a note of which player is coming. 1Equal does not transfer that money to the rink. The price of using the software is a different question, and it is not published yet. That is why this page has no offer with a price.",
            "Оплата льда и стоимость площадки, которую команда записывает у события, - это не подписка 1Equal. Это цена катка или зала, которую вводит команда, и отметка, какой игрок идёт. 1Equal эти деньги катку не переводит. Цена использования программы - другой вопрос, и она ещё не опубликована. Поэтому на странице нет предложения с ценой.",
          ),
        ],
      },
      {
        heading: L("Ko var apskatīt jau tagad", "What you can look at now", "Что можно посмотреть уже сейчас"),
        paragraphs: [
          L(
            "Demo rāda komandas kalendāru ar spēlēm un treniņiem, komandas sastāvu un laukumus ar cenu. Tas ir paraugs, nevis tava komanda. Savā kontā tu veido komandu, sūti uzaicinājumus e-pastā, liec notikumus kalendārā un redzi spēlētāju dalību. Laukuma cenu ievada komanda pati. Ledus nauda vai zāles izmaksas paliek pie notikuma kā iekšējs pieraksts. Nevienā no šiem soļiem sistēma neprasa publisku abonementa cenu, jo tā vēl nav noteikta. Ja cena mainīsies, šī lapa tiks atjaunināta ar apstiprinātu summu, nevis ar aptuvenu skaitli.",
            "The demo shows a team calendar with games and training, a roster and venues with a price. It is a sample, not your team. In your own account you create a team, send email invites, put events on the calendar and see player attendance. The team enters the venue price. Ice money or hall costs stay on the event as an internal note. None of these steps asks for a public subscription price, because that price is not set yet. If the price changes, this page will be updated with a confirmed amount, not with a guess.",
            "Демо показывает календарь команды с играми и тренировками, состав и площадки с ценой. Это образец, не твоя команда. В своём аккаунте ты создаёшь команду, шлёшь приглашения по почте, ставишь события в календарь и видишь явку. Цену площадки вводит команда. Оплата льда или стоимость зала остаётся у события как внутренняя запись. Ни один из этих шагов не требует публичной цены подписки, потому что она ещё не назначена. Если цена изменится, эту страницу обновят подтверждённой суммой, а не догадкой.",
          ),
        ],
      },
      {
        heading: L("Kur jautāt", "Where to ask", "Куда спросить"),
        paragraphs: [
          L(
            "Ja vajag zināt, vai komandai šobrīd var sākt lietot paneli, atver demo vai izveido kontu. Ja vajag atbildi par cenu, raksti sākumlapas kontaktu formā. Atbilde aiziet uz norādīto e-pastu. Kamēr publiskas cenas nav, šī lapa paliek paskaidrojums, nevis cenrādis.",
            "If you need to know whether a team can start using the panel now, open the demo or create an account. If you need an answer about price, use the contact form on the homepage. The reply goes to the email you enter. Until a public price exists, this page stays an explanation, not a price list.",
            "Если нужно понять, может ли команда уже начать пользоваться панелью, открой демо или создай аккаунт. Если нужен ответ о цене, напиши через форму контактов на главной. Ответ придёт на указанный e-mail. Пока публичной цены нет, эта страница остаётся пояснением, а не прайсом.",
          ),
        ],
      },
    ],
    related: ["ledus-naudas-uzskaite", "hokeja-komandas", "florbola-komandas", "sports-team-management"],
  },
];

const bySlug = new Map(TOPIC_PAGES.map((page) => [page.slug, page]));

export function getTopicPage(slug: string): TopicPage | null {
  return bySlug.get(slug as TopicSlug) ?? null;
}

if (TOPIC_PAGES.length !== TOPIC_SLUGS.length || TOPIC_SLUGS.some((slug) => !bySlug.has(slug))) {
  throw new Error("Topic page slugs and content are out of sync.");
}
