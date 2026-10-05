import { FEATURE_SLUGS, SPORT_SLUGS, type PublicLocale } from "@/app/lib/seo-slugs";

type Copy = Record<PublicLocale, string>;

export type SeoLandingPage = {
  slug: string;
  kind: "feature" | "sport";
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

export function seoCopy(lang: PublicLocale, value: Copy): string {
  return value[lang];
}

export const SEO_PAGES: SeoLandingPage[] = [
  {
    slug: "sports-team-management",
    kind: "feature",
    title: L(
      "1Equal – Sporta komandas vadības programmatūra",
      "1Equal – Sports team management software",
      "1Equal – Программа для управления спортивной командой",
    ),
    description: L(
      "Sporta komandas vadības platforma treneriem un vadītājiem: spēles, treniņi, sastāvs, spēlētāju dalība, laukumi un komandas izdevumi vienuviet.",
      "Sports team management software for coaches and managers: games, training, the roster, player attendance, venues and team expenses in one place.",
      "Программа управления спортивной командой для тренеров: игры, тренировки, состав, явка, площадки и расходы команды в одном месте.",
    ),
    h1: L("Sporta komandas vadība vienā platformā", "Sports team management in one platform", "Управление спортивной командой в одной платформе"),
    lead: L(
      "1Equal ir sporta komandas vadības sistēma komandām, kuras pašas organizē nedēļu. Treneris un komandas vadītājs redz kalendāru, cilvēkus un izmaksas, nevis meklē tās čatā.",
      "1Equal is sports team management software for teams that organise their own week. A coach or team manager sees the calendar, the people and the costs without hunting through a chat.",
      "1Equal - система управления спортивной командой для тех, кто сам собирает неделю. Тренер или организатор видит календарь, людей и расходы, а не ищет их в чате.",
    ),
    sections: [
      {
        heading: L("Ko komanda tur vienuviet", "What the team keeps in one place", "Что команда держит в одном месте"),
        paragraphs: [
          L(
            "Kalendārā ir spēles un treniņi ar laiku un vietu. Sastāvā ir dalībnieki, numuri, pozīcijas un apakškomandas. Spēlētājs atzīmē, vai būs, panelī vai no e-pasta.",
            "The calendar holds games and training sessions with a time and a place. The roster holds members, numbers, positions and sub-teams. A player marks whether they are coming, in the panel or from the email.",
            "В календаре игры и тренировки со временем и местом. В составе участники, номера, позиции и подкоманды. Игрок отмечает, будет ли он, в панели или из письма.",
          ),
          L(
            "Laukumus var saglabāt ar cenu, lai pasākuma izmaksas nerēķinātu ar roku. Komandas izdevumi un tas, cik katram jāmaksā, paliek pie tā paša notikuma.",
            "Venues can be saved with a price, so the cost of an event is not calculated by hand. Team expenses and what each person owes stay with that same event.",
            "Площадки можно сохранить с ценой, чтобы стоимость события не считать вручную. Расходы команды и сумма для каждого остаются у того же события.",
          ),
        ],
      },
      {
        heading: L("Treneris un spēlētājs", "Coach and player", "Тренер и игрок"),
        paragraphs: [
          L(
            "Vispirms trenerim un cilvēkam, kurš vada komandu: sapulcina sastāvu, liek spēles un treniņus, un redz, kurš atbildējis. Spēlētājs redz savu dalību un maksu, nevis visu komandas naudu. Kalendāru, dalību un laukuma cenu var lietot arī cita komandu sporta komanda. Katram sporta veidam ir savas pozīcijas. Hokejam sākumā ir LW, C, RW, D un G.",
            "It starts with the coach and the person who runs the team: they gather the roster, add games and training, and see who has replied. A player sees their own attendance and fee, not the whole team's money. Another team sport can use the calendar, attendance and venue price. Each sport has its own positions. Hockey starts with LW, C, RW, D and G.",
            "В первую очередь это для тренера и человека, который ведёт команду: собирает состав, ставит игры и тренировки и видит, кто ответил. Игрок видит свою явку и свой взнос, а не все деньги команды. Календарь, явку и цену площадки может использовать и другая командная игра. У каждого вида спорта свои позиции. У хоккея в начале LW, C, RW, D и G.",
          ),
          L(
            "Telefons un dators abi der, jo tas ir pārlūks, nevis atsevišķa lietotne.",
            "A phone and a computer both work, because it is a browser, not a separate app.",
            "Подойдёт и телефон, и компьютер: это браузер, а не отдельное приложение.",
          ),
        ],
      },
    ],
    related: [...FEATURE_SLUGS.filter((slug) => slug !== "sports-team-management"), ...SPORT_SLUGS],
  },
  {
    slug: "team-calendar",
    kind: "feature",
    title: L(
      "1Equal – Sporta komandas kalendārs",
      "1Equal – Sports team calendar",
      "1Equal – Календарь спортивной команды",
    ),
    description: L(
      "Komandas kalendārs spēlēm un treniņiem: laiks, vieta un nākamais notikums vienā skatā telefonā vai datorā.",
      "A team calendar for games and training: time, venue and the next event in one view on a phone or a computer.",
      "Календарь команды для игр и тренировок: время, площадка и следующее событие в одном виде на телефоне или компьютере.",
    ),
    h1: L("Komandas kalendārs spēlēm un treniņiem", "A team calendar for games and training", "Календарь команды для игр и тренировок"),
    lead: L(
      "Spēļu un treniņu plānošana sākas ar vienu kalendāru. Komanda redz, kas notiek šonedēļ, nevis lasa vecu ziņu pavedienu.",
      "Planning games and training starts with one calendar. The team sees what is happening this week instead of reading an old message thread.",
      "Планирование игр и тренировок начинается с одного календаря. Команда видит, что будет на этой неделе, а не читает старую переписку.",
    ),
    sections: [
      {
        heading: L("Spēle un treniņš vienā mēnesī", "A game and a training in the same month", "Игра и тренировка в одном месяце"),
        paragraphs: [
          L(
            "Katram notikumam ir datums, sākuma laiks un vieta. Spēles un treniņi ir atšķirami, tāpēc nedēļas ritms ir redzams uzreiz. Nākamā spēle paliek redzama, nevis pazūd starp citiem ierakstiem.",
            "Each event has a date, a start time and a place. Games and training sessions are distinct, so the rhythm of the week is visible at once. The next game stays visible instead of disappearing among other entries.",
            "У каждого события есть дата, время начала и место. Игры и тренировки отличаются, поэтому ритм недели виден сразу. Следующая игра остаётся на виду, а не теряется среди других записей.",
          ),
        ],
      },
      {
        heading: L("Viena komanda, vairāki sastāvi", "One club, more than one roster", "Один клуб, несколько составов"),
        paragraphs: [
          L(
            "Ja klubam ir vairākas apakškomandas, katrai var būt savi notikumi. Pārslēdzoties starp tām, otrs kalendārs nepazūd. Tas der klubam, kur vienā zālē vai laukumā trenējas vairāk nekā viena komanda.",
            "If a club has several sub-teams, each can keep its own events. Switching between them does not drop the other calendar. That fits a club where more than one team trains in the same hall or on the same ground.",
            "Если у клуба несколько подкоманд, у каждой могут быть свои события. При переключении второй календарь не пропадает. Это подходит клубу, где в одном зале или на одном поле тренируется больше одной команды.",
          ),
        ],
      },
      {
        heading: L("Atverams telefonā", "Open it on a phone", "Открывается на телефоне"),
        paragraphs: [
          L(
            "Kalendārs ir pārlūkā. Spēlētājs var apskatīt nedēļu telefonā pa ceļam uz laukumu, un treneris var to pašu atvērt datorā, kad liek nākamo notikumu.",
            "The calendar is in the browser. A player can check the week on a phone on the way to the venue, and a coach can open the same view on a computer when adding the next event.",
            "Календарь в браузере. Игрок может посмотреть неделю на телефоне по дороге на площадку, а тренер открыть тот же вид на компьютере, когда ставит следующее событие.",
          ),
        ],
      },
    ],
    related: ["sports-team-management", "training-management", "player-attendance", "football-team-management", "basketball-team-management"],
  },
  {
    slug: "training-management",
    kind: "feature",
    title: L(
      "1Equal – Treniņu plānošana komandai",
      "1Equal – Training management for a team",
      "1Equal – Планирование тренировок команды",
    ),
    description: L(
      "Treniņu plānošana sporta komandai: laiks, laukums, uzaicinājums un atbildes par dalību, ieskaitot viesi bez jauna konta.",
      "Training management for a sports team: time, venue, the invite and attendance replies, including a guest without a new account.",
      "Планирование тренировок спортивной команды: время, площадка, приглашение и ответы о явке, включая гостя без нового аккаунта.",
    ),
    h1: L("Treniņu plānošana bez čata", "Training management without the group chat", "Планирование тренировок без общего чата"),
    lead: L(
      "Treniņš ir notikums ar laiku, vietu un cilvēkiem, kuri atbild, vai būs. 1Equal to tur pie komandas, nevis atstāj pēdējā ziņā.",
      "A training session is an event with a time, a place and people who reply whether they are coming. 1Equal keeps that with the team instead of leaving it in the last message.",
      "Тренировка - это событие со временем, местом и людьми, которые отвечают, придут ли они. 1Equal хранит это у команды, а не в последнем сообщении.",
    ),
    sections: [
      {
        heading: L("Kā noliek treniņu", "How a session is added", "Как ставится тренировка"),
        paragraphs: [
          L(
            "Treniņam norāda datumu, laiku un laukumu. Ja laukumam ir cena, izmaksas paliek pie šī notikuma. Atkārtojošos vakarus liek kā atsevišķus treniņus, lai katram ir sava dalība.",
            "A session gets a date, a time and a venue. If the venue has a price, the cost stays with that event. A repeating evening is added as separate sessions, so each one has its own attendance.",
            "У тренировки указывают дату, время и площадку. Если у площадки есть цена, расход остаётся у этого события. Повторяющийся вечер ставят отдельными тренировками, чтобы у каждой была своя явка.",
          ),
        ],
      },
      {
        heading: L("Uzaicinājums un viesis", "The invite and a guest", "Приглашение и гость"),
        paragraphs: [
          L(
            "Jauns notikums var aiziet e-pastā. Spēlētājs atzīmē, vai būs, no vēstules. Viesis uz treniņu, kuram nav trenera, saņem saiti, un konts netiek izveidots.",
            "A new event can go out by email. A player marks whether they are coming from the message. A guest for a training session that has no coach receives a link, and no account is created.",
            "Новое событие может уйти на почту. Игрок отмечает, будет ли он, прямо из письма. Гость на тренировку без тренера получает ссылку, и аккаунт не создаётся.",
          ),
          L(
            "Termiņš, līdz kuram jāatbild, ir redzams. Treneris redz sarakstu pirms treniņa, nevis skaita atbildes čatā.",
            "The deadline for a reply is visible. The coach sees the list before the session instead of counting replies in a chat.",
            "Срок, до которого нужно ответить, виден. Тренер видит список до тренировки, а не считает ответы в чате.",
          ),
        ],
      },
    ],
    related: ["team-calendar", "player-attendance", "team-expenses", "sports-team-management", "floorball-team-management"],
  },
  {
    slug: "player-attendance",
    kind: "feature",
    title: L(
      "1Equal – Spēlētāju dalības uzskaite",
      "1Equal – Player attendance for a sports team",
      "1Equal – Учёт явки игроков",
    ),
    description: L(
      "Spēlētāju dalība un pieejamība: atbilde no e-pasta vai paneļa, redzams termiņš un saraksts trenerim pirms spēles vai treniņa.",
      "Player attendance and availability: a reply from email or the panel, a visible deadline and a list for the coach before a game or training.",
      "Явка и доступность игроков: ответ из письма или панели, видимый срок и список для тренера перед игрой или тренировкой.",
    ),
    h1: L("Spēlētāju dalība un pieejamība", "Player attendance and availability", "Явка и доступность игроков"),
    lead: L(
      "Komandai jāzina, kurš būs, pirms tiek salikts sastāvs vai sadalīta laukuma maksa. 1Equal apkopo šīs atbildes pie notikuma.",
      "A team needs to know who is coming before the lineup is set or the venue cost is split. 1Equal collects those replies on the event.",
      "Команде нужно знать, кто придёт, до того как собран состав или разделена оплата площадки. 1Equal собирает эти ответы у события.",
    ),
    sections: [
      {
        heading: L("Atbilde no vēstules", "A reply from the email", "Ответ из письма"),
        paragraphs: [
          L(
            "Spēlētājs var atzīmēt, vai būs, tieši no e-pasta saites. Tajā brīdī nav jāatver panelis un nav jāveido jauns konts, lai atbildētu uz šo uzaicinājumu. To pašu var izdarīt arī panelī.",
            "A player can mark whether they are coming directly from the email link. At that moment they do not have to open the panel or create a new account to answer that invite. The same reply can be made in the panel.",
            "Игрок может отметить, будет ли он, прямо по ссылке из письма. В этот момент не нужно открывать панель и создавать новый аккаунт, чтобы ответить на приглашение. То же самое можно сделать и в панели.",
          ),
        ],
      },
      {
        heading: L("Ko redz treneris un spēlētājs", "What the coach and the player see", "Что видят тренер и игрок"),
        paragraphs: [
          L(
            "Treneris redz, kurš būs, kurš nebūs un kurš vēl nav atbildējis. Spēlētājs redz savu dalību. Termiņš ir redzams, tāpēc vēla atbilde nav pārsteigums abām pusēm.",
            "The coach sees who is coming, who is not, and who has not replied. A player sees their own attendance. The deadline is visible, so a late reply is not a surprise for either side.",
            "Тренер видит, кто будет, кого не будет и кто ещё не ответил. Игрок видит свою явку. Срок виден, поэтому поздний ответ не становится сюрпризом для обеих сторон.",
          ),
          L(
            "Dalība ir arī pamats maksai: ja pasākumam ir summa, redzams, kurš piedalās un cik katram jāmaksā. Tas ir tas pats notikums, nevis otra tabula.",
            "Attendance is also the basis for the fee: if an event has an amount, you can see who is taking part and what each person owes. It is the same event, not a second spreadsheet.",
            "Явка ещё и основа взноса: если у события есть сумма, видно, кто участвует и сколько каждому платить. Это то же событие, а не вторая таблица.",
          ),
        ],
      },
    ],
    related: ["training-management", "team-calendar", "team-expenses", "sports-team-management", "volleyball-team-management"],
  },
  {
    slug: "team-expenses",
    kind: "feature",
    title: L(
      "1Equal – Komandas izdevumu uzskaite",
      "1Equal – Team expense tracking",
      "1Equal – Учёт расходов команды",
    ),
    description: L(
      "Komandas izdevumu uzskaite spēlēm un treniņiem: laukuma cena, dalības maksa un tas, cik savākts un cik vēl jāmaksā.",
      "Team expense tracking for games and training: the venue price, the attendance fee, and what is collected versus what is still due.",
      "Учёт расходов команды на игры и тренировки: цена площадки, взнос за участие и то, сколько собрано и сколько ещё нужно.",
    ),
    h1: L("Komandas izdevumi pie spēles un treniņa", "Team expenses on the game and the training", "Расходы команды у игры и тренировки"),
    lead: L(
      "Laukuma noma un dalības maksa parasti dzīvo atsevišķā tabulā. 1Equal tur tās pie notikuma, kuram tās pieder.",
      "Pitch hire and attendance fees usually live in a separate sheet. 1Equal keeps them on the event they belong to.",
      "Аренда площадки и взносы обычно живут в отдельной таблице. 1Equal держит их у события, к которому они относятся.",
    ),
    sections: [
      {
        heading: L("Laukums ar cenu", "A venue with a price", "Площадка с ценой"),
        paragraphs: [
          L(
            "Laukumus saglabā vienreiz, kopā ar cenu. Kad spēli vai treniņu liek šajā vietā, izmaksas var aprēķināt no šīs cenas, nevis ievadīt no jauna katrā ziņā.",
            "Venues are saved once, together with a price. When a game or training is placed there, the cost can be calculated from that price instead of being typed again in every message.",
            "Площадки сохраняют один раз, вместе с ценой. Когда игру или тренировку ставят в это место, расход можно посчитать из этой цены, а не вписывать заново в каждое сообщение.",
          ),
        ],
      },
      {
        heading: L("Cik katram jāmaksā", "What each person owes", "Сколько каждому платить"),
        paragraphs: [
          L(
            "Par spēli un treniņu var būt sava summa. Redzams, kurš piedalās un cik katram jāmaksā. Treneris redz, cik savākts un cik vēl jāmaksā. Spēlētājs redz savu maksu, nevis visas komandas norēķinus.",
            "A game and a training can each have their own amount. You see who is taking part and what each person owes. The coach sees what is collected and what is still due. A player sees their own fee, not the whole team's accounts.",
            "У игры и у тренировки может быть своя сумма. Видно, кто участвует и сколько каждому платить. Тренер видит, сколько собрано и сколько ещё нужно. Игрок видит свой взнос, а не все расчёты команды.",
          ),
          L(
            "Šī ir uzskaite komandas iekšienē. 1Equal neaizstāj banku un nepublicē cenu lapu. Summas nāk no jūsu laukumiem un notikumiem.",
            "This is bookkeeping inside the team. 1Equal does not replace a bank and does not publish a price list. The amounts come from your venues and events.",
            "Это учёт внутри команды. 1Equal не заменяет банк и не публикует прайс. Суммы берутся из ваших площадок и событий.",
          ),
        ],
      },
    ],
    related: ["player-attendance", "training-management", "sports-team-management", "hockey-team-management", "football-team-management"],
  },
  {
    slug: "hockey-team-management",
    kind: "sport",
    title: L(
      "1Equal – Hokeja komandas vadība",
      "1Equal – Hockey team management",
      "1Equal – Управление хоккейной командой",
    ),
    description: L(
      "Hokeja komandas kalendārs, ledus laiks, sastāvs un izmaksas. 1Equal der arī citiem sporta veidiem, ne tikai hokejam.",
      "A hockey team calendar, ice time, roster and costs. 1Equal is also for other sports, not only hockey.",
      "Календарь хоккейной команды, лёд, состав и расходы. 1Equal подходит и другим видам спорта, не только хоккею.",
    ),
    h1: L("Hokeja komandas vadība", "Hockey team management", "Управление хоккейной командой"),
    lead: L(
      "Hokeja komandai dārgs ir ledus laiks, un sastāvs mainās starp spēli un treniņu. 1Equal palīdz to saplānot. Tā pati platforma nav hokeja programma: to lieto arī citi komandu sporta veidi.",
      "A hockey team pays for ice time, and the group changes between a game and a practice. 1Equal helps plan that. The same platform is not a hockey product: other team sports use it too.",
      "Хоккейной команде лёд стоит дорого, и состав меняется между игрой и тренировкой. 1Equal помогает это спланировать. Та же платформа не является хоккейным продуктом: её используют и другие командные виды.",
    ),
    sections: [
      {
        heading: L("Ledus laiks un izbraukums", "Ice time and away games", "Лёд и выезд"),
        paragraphs: [
          L(
            "Treniņu liek kā notikumu ar ledus halli un laiku. Izbraukuma spēle ir atsevišķs kalendāra ieraksts ar savu vietu. Abiem var būt sava dalības maksa, jo ledus un izbraukums nemaksā vienādi.",
            "A practice is an event with a rink and a time. An away game is a separate calendar entry with its own place. Each can have its own attendance fee, because ice and travel do not cost the same.",
            "Тренировку ставят как событие с катком и временем. Выездная игра - отдельная запись в календаре со своим местом. У каждой может быть свой взнос: лёд и выезд стоят по-разному.",
          ),
        ],
      },
      {
        heading: L("Sastāvs un tas, kurš būs uz ledus", "The roster and who will be on the ice", "Состав и кто будет на льду"),
        paragraphs: [
          L(
            "Sastāvā paliek numuri un pozīcijas, ieskaitot vārtsargus. Pirms treniņa spēlētāji atbild, vai būs. Ja ledus ir jau nopirkts, treneris redz, cik cilvēku dala šīs izmaksas.",
            "The roster keeps numbers and positions, including goalies. Before practice, players reply whether they are coming. If the ice is already booked, the coach sees how many people share that cost.",
            "В составе остаются номера и позиции, включая вратарей. Перед тренировкой игроки отвечают, будут ли они. Если лёд уже куплен, тренер видит, сколько человек делят этот расход.",
          ),
          L(
            "Ja klubam ir vairāk nekā viena hokeja komanda, apakškomandas tur savus notikumus atsevišķi. Florbola, futbola vai basketbola komanda tajā pašā platformā lieto laukumu, nevis ledu, bet to pašu kalendāru, dalību un izmaksas.",
            "If a club has more than one hockey team, sub-teams keep their events apart. A floorball, football or basketball team on the same platform uses a hall or a pitch instead of ice, with the same calendar, attendance and expenses.",
            "Если у клуба больше одной хоккейной команды, подкоманды держат свои события отдельно. Флорбольная, футбольная или баскетбольная команда на той же платформе использует зал или поле вместо льда, но тот же календарь, явку и расходы.",
          ),
        ],
      },
    ],
    related: ["sports-team-management", "team-calendar", "team-expenses", "player-attendance", "floorball-team-management"],
  },
  {
    slug: "football-team-management",
    kind: "sport",
    title: L(
      "1Equal – Futbola komandas vadība",
      "1Equal – Football team management",
      "1Equal – Управление футбольной командой",
    ),
    description: L(
      "Futbola komandas vadība: nedēļas treniņi, spēles nedēļas nogalē, lielāks sastāvs, laukuma noma un spēlētāju dalība.",
      "Football team management: weekday training, weekend matches, a larger squad, pitch hire and player attendance.",
      "Управление футбольной командой: тренировки по будням, игры на выходных, большой состав, аренда поля и явка игроков.",
    ),
    h1: L("Futbola komandas vadība", "Football team management", "Управление футбольной командой"),
    lead: L(
      "Futbola komandai parasti ir divi vai trīs treniņi nedēļā un spēle brīvdienās. Sastāvs ir lielāks par tiem, kas iziet uz laukuma, tāpēc dalība jāzina pirms spēles dienas.",
      "A football team usually has two or three training sessions in the week and a match at the weekend. The squad is larger than the group that walks out, so attendance has to be known before match day.",
      "У футбольной команды обычно две или три тренировки в неделю и игра на выходных. Состав больше тех, кто выходит на поле, поэтому явку нужно знать до дня матча.",
    ),
    sections: [
      {
        heading: L("Nedēļas ritms", "The shape of the week", "Ритм недели"),
        paragraphs: [
          L(
            "Treniņus un spēli liek vienā kalendārā. Laukums ir vieta ar cenu: vakara noma un spēles dienas laukums var maksāt atšķirīgi, un katrs notikums saglabā savu summu.",
            "Training and the match sit on one calendar. The pitch is a venue with a price: an evening booking and the match-day ground can cost different amounts, and each event keeps its own figure.",
            "Тренировки и матч стоят в одном календаре. Поле - это площадка с ценой: вечерняя аренда и поле в день игры могут стоить по-разному, и каждое событие хранит свою сумму.",
          ),
        ],
      },
      {
        heading: L("Liels sastāvs", "A large squad", "Большой состав"),
        paragraphs: [
          L(
            "Ne visi ierodas uz katru treniņu. Spēlētājs atbild no e-pasta vai paneļa, un treneris redz, kurš būs, pirms domā par sastāvu spēlei. Spēlētājs redz savu dalību un savu maksu.",
            "Not everyone comes to every session. A player replies from the email or the panel, and the coach sees who is coming before thinking about the match squad. A player sees their own attendance and their own fee.",
            "Не все приходят на каждую тренировку. Игрок отвечает из письма или панели, и тренер видит, кто будет, до того как думает о составе на игру. Игрок видит свою явку и свой взнос.",
          ),
          L(
            "Ja klubam ir pieaugušo un jaunatnes komanda, tās var būt apakškomandas ar atsevišķiem notikumiem. Tas pats modelis der hokejam vai florbolam, ja klubā ir vairāk nekā viena komanda.",
            "If a club has a senior side and a youth side, they can be sub-teams with separate events. The same model fits hockey or floorball when a club has more than one team.",
            "Если у клуба есть взрослая и молодёжная команда, они могут быть подкомандами с отдельными событиями. Та же модель подходит хоккею или флорболу, если в клубе больше одной команды.",
          ),
        ],
      },
    ],
    related: ["sports-team-management", "team-calendar", "training-management", "player-attendance", "basketball-team-management"],
  },
  {
    slug: "basketball-team-management",
    kind: "sport",
    title: L(
      "1Equal – Basketbola komandas vadība",
      "1Equal – Basketball team management",
      "1Equal – Управление баскетбольной командой",
    ),
    description: L(
      "Basketbola komandas vadība īsākam ritmam: vairākas spēles nedēļā, zāles laiks, neliels sastāvs un ātras atbildes par dalību.",
      "Basketball team management for a shorter rhythm: several games a week, gym time, a small roster and fast attendance replies.",
      "Управление баскетбольной командой при коротком ритме: несколько игр в неделю, время зала, небольшой состав и быстрые ответы о явке.",
    ),
    h1: L("Basketbola komandas vadība", "Basketball team management", "Управление баскетбольной командой"),
    lead: L(
      "Basketbolā spēles bieži ir tuvu cita citai, un zāles logs ir īss. Komandai vajag ātru atbildi, kurš būs, nevis garu saraksti čatā.",
      "In basketball, games often sit close together and the gym window is short. The team needs a fast answer on who is coming, not a long list in a chat.",
      "В баскетболе игры часто стоят близко друг к другу, а окно зала короткое. Команде нужен быстрый ответ, кто придёт, а не длинный список в чате.",
    ),
    sections: [
      {
        heading: L("Zāle un biežas spēles", "The gym and frequent games", "Зал и частые игры"),
        paragraphs: [
          L(
            "Spēli un treniņu liek kalendārā ar zāli un laiku. Zāles noma ir laukums ar cenu. Ja nedēļā ir divas spēles, katrai ir sava dalība un sava maksa, nevis viena kopīga ziņa par visu mēnesi.",
            "A game and a training go on the calendar with a gym and a time. Gym hire is a venue with a price. If the week has two games, each has its own attendance and its own fee, rather than one message for the whole month.",
            "Игру и тренировку ставят в календарь с залом и временем. Аренда зала - площадка с ценой. Если в неделе две игры, у каждой своя явка и свой взнос, а не одно сообщение на весь месяц.",
          ),
        ],
      },
      {
        heading: L("Neliels sastāvs", "A small roster", "Небольшой состав"),
        paragraphs: [
          L(
            "Basketbola sastāvs ir mazāks nekā futbolā, tāpēc viens iztrūkums maina treniņu. Atbilde no e-pasta saites der, kad spēlētājs to redz telefonā starp darba dienu un zāli. Termiņš ir redzams, lai vēla atbilde nenāktu tad, kad pieci jau ir zālē.",
            "A basketball roster is smaller than a football squad, so one absence changes the session. A reply from the email link works when a player sees it on a phone between the work day and the gym. The deadline is visible, so a late reply does not arrive when five people are already in the hall.",
            "Баскетбольный состав меньше футбольного, поэтому одно отсутствие меняет тренировку. Ответ по ссылке из письма удобен, когда игрок видит его на телефоне между работой и залом. Срок виден, чтобы поздний ответ не приходил, когда пятеро уже в зале.",
          ),
        ],
      },
    ],
    related: ["team-calendar", "player-attendance", "sports-team-management", "volleyball-team-management", "team-expenses"],
  },
  {
    slug: "floorball-team-management",
    kind: "sport",
    title: L(
      "1Equal – Florbola komandas vadība",
      "1Equal – Floorball team management",
      "1Equal – Управление флорбольной командой",
    ),
    description: L(
      "Florbola komandas vadība: vakara halle, vairākas komandas klubā, sastāvs, dalība un halles izmaksas vienā panelī.",
      "Floorball team management: an evening hall, more than one team in the club, the roster, attendance and hall costs in one panel.",
      "Управление флорбольной командой: вечерний зал, несколько команд в клубе, состав, явка и расходы на зал в одной панели.",
    ),
    h1: L("Florbola komandas vadība", "Floorball team management", "Управление флорбольной командой"),
    lead: L(
      "Florbola komandas bieži trenējas vakaros vienā hallē, un klubā mēdz būt vairāk nekā viena komanda. 1Equal atdala šos kalendārus un tur halles maksu pie notikuma.",
      "Floorball teams often train in the evening in one hall, and a club may have more than one team. 1Equal separates those calendars and keeps the hall fee on the event.",
      "Флорбольные команды часто тренируются вечером в одном зале, и в клубе бывает больше одной команды. 1Equal разделяет эти календари и держит оплату зала у события.",
    ),
    sections: [
      {
        heading: L("Halle, nevis atsevišķa lietotne", "A hall, not a separate app", "Зал, а не отдельное приложение"),
        paragraphs: [
          L(
            "Halli saglabā kā laukumu ar cenu un liek vakara treniņu vai spēli šajā vietā. Spēlētāji atbild, vai būs, no telefona. Tas der amatieru komandai, kurai nav atsevišķa sekretāra un kura nevēlas vēl vienu lietotni.",
            "The hall is saved as a venue with a price, and the evening session or game is placed there. Players reply whether they are coming from a phone. That fits an amateur team with no separate secretary and no wish for another app.",
            "Зал сохраняют как площадку с ценой и ставят туда вечернюю тренировку или игру. Игроки отвечают, будут ли они, с телефона. Это подходит любительской команде без отдельного секретаря и без желания ставить ещё одно приложение.",
          ),
        ],
      },
      {
        heading: L("Vairākas komandas vienā klubā", "More than one team in the club", "Несколько команд в одном клубе"),
        paragraphs: [
          L(
            "Apakškomandas tur savus notikumus. Vīriešu un sieviešu komanda vai divas meistarības grupas nepārjauc viena otras dalību un maksu. Hokeja komanda tajā pašā klubā var lietot to pašu paneli ar ledu kā vietu, nevis ar halli.",
            "Sub-teams keep their own events. A men's and a women's team, or two skill groups, do not mix each other's attendance and fees. A hockey team in the same club can use the same panel with ice as the venue instead of a hall.",
            "Подкоманды держат свои события. Мужская и женская команды или две группы по уровню не смешивают явку и взносы. Хоккейная команда в том же клубе может пользоваться той же панелью, где место - лёд, а не зал.",
          ),
        ],
      },
    ],
    related: ["training-management", "team-expenses", "sports-team-management", "hockey-team-management", "volleyball-team-management"],
  },
  {
    slug: "volleyball-team-management",
    kind: "sport",
    title: L(
      "1Equal – Volejbola komandas vadība",
      "1Equal – Volleyball team management",
      "1Equal – Управление волейбольной командой",
    ),
    description: L(
      "Volejbola komandas vadība: zāles treniņi, līgas vakars, turnīra diena, rotējošs sastāvs un dalības uzskaite.",
      "Volleyball team management: hall training, a league night, a tournament day, a rotating group and attendance tracking.",
      "Управление волейбольной командой: тренировки в зале, вечер лиги, день турнира, меняющийся состав и учёт явки.",
    ),
    h1: L("Volejbola komandas vadība", "Volleyball team management", "Управление волейбольной командой"),
    lead: L(
      "Volejbolā vienā nedēļā mēdz būt treniņš zālē, līgas spēle un brīvdienās turnīrs. Kurš var braukt, nosaka, kā saliek komandu.",
      "Volleyball weeks often mix a hall session, a league match and a weekend tournament. Who can travel decides how the team is put together.",
      "В волейбольной неделе часто смешаны тренировка в зале, матч лиги и турнир на выходных. От того, кто может поехать, зависит, как собирают команду.",
    ),
    sections: [
      {
        heading: L("Līgas vakars un turnīrs", "League night and a tournament", "Вечер лиги и турнир"),
        paragraphs: [
          L(
            "Līgas spēli liek kā spēli ar zāli un laiku. Turnīra dienu liek kā atsevišķu notikumu, arī tad, ja tā ir izbraukumā. Abiem var būt atšķirīga maksa, jo zāle mājās un ceļš uz turnīru nav viena un tā pati izmaksu pozīcija.",
            "A league match is added as a game with a hall and a time. A tournament day is a separate event, including when it is away. They can have different fees, because the home hall and the trip to a tournament are not the same cost.",
            "Матч лиги ставят как игру с залом и временем. День турнира ставят отдельным событием, в том числе на выезде. Взнос может отличаться: домашний зал и поездка на турнир - не одна и та же статья расхода.",
          ),
        ],
      },
      {
        heading: L("Kurš var spēlēt", "Who can play", "Кто может играть"),
        paragraphs: [
          L(
            "Sastāvs rotē. Spēlētājs atzīmē pieejamību no e-pasta vai paneļa, un treneris redz sarakstu pirms liek, kurš būs uz laukuma. Viesis uz treniņu bez trenera var saņemt saiti bez jauna konta.",
            "The group rotates. A player marks availability from the email or the panel, and the coach sees the list before deciding who is on the court. A guest for a training session without a coach can receive a link without a new account.",
            "Состав меняется. Игрок отмечает доступность из письма или панели, и тренер видит список до того, как решает, кто будет на площадке. Гость на тренировку без тренера может получить ссылку без нового аккаунта.",
          ),
        ],
      },
    ],
    related: ["player-attendance", "team-calendar", "sports-team-management", "basketball-team-management", "training-management"],
  },
];

const allowed = new Set<string>([...FEATURE_SLUGS, ...SPORT_SLUGS]);
const present = new Set(SEO_PAGES.map((page) => page.slug));
for (const slug of allowed) {
  if (!present.has(slug)) throw new Error(`Missing SEO landing page: ${slug}`);
}
for (const page of SEO_PAGES) {
  if (!allowed.has(page.slug)) throw new Error(`SEO landing page is not in the public slug list: ${page.slug}`);
  for (const related of page.related) {
    if (!allowed.has(related) || related === page.slug) throw new Error(`Bad related link on ${page.slug}: ${related}`);
  }
}

const pagesBySlug = new Map(SEO_PAGES.map((page) => [page.slug, page]));

export function getSeoLanding(slug: string): SeoLandingPage | null {
  return pagesBySlug.get(slug) ?? null;
}

export const SEO_CHROME = {
  related: L("Saistītās lapas", "Related pages", "Связанные страницы"),
  home: L("sporta komandas vadība", "sports team management", "управление спортивной командой"),
  signup: L("Izveidot sporta komandas kontu", "Create a sports team account", "Создать аккаунт спортивной команды"),
  demo: L("Atvērt demo paneli", "Open the demo panel", "Открыть демо-панель"),
};
