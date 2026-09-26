import type { Lang } from "@/app/lib/messages";

export type LegalId = "privacy" | "terms" | "cookies";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
  rows?: { name: string; purpose: string; duration: string }[];
};

export type LegalDocument = {
  intro: string;
  sections: LegalSection[];
};

const documents: Record<LegalId, Record<Lang, LegalDocument>> = {
  privacy: {
    lv: {
      intro:
        "Šajā politikā ir aprakstīts, kādus datus 1equal apstrādā, kad tu lieto komandas paneli: kalendāru, sastāvu, dalību un laukumu maksu. Konts tiek saglabāts. Panelī redzamais sastāvs pagaidām ir paraugs.",
      sections: [
        {
          heading: "Kas mēs esam",
          paragraphs: [
            "1equal ir panelis komandas sezonai. Šajā demo versijā nav norādīts atsevišķs datu pārzinis, reģistrācijas numurs vai adrese, jo konts un komandas dati netiek glabāti pie mums.",
            "Kad pakalpojums būs pilnā versijā, šeit būs pārzinis un saziņas adrese. Līdz tam šo lapu var izmantot, lai saprastu, kas šobrīd notiek ar datiem pārlūkā.",
          ],
        },
        {
          heading: "Kādus datus apstrādājam",
          paragraphs: [
            "Reģistrējoties saglabājam vārdu un e-pastu. Paroli glabā autentifikācijas sistēma, nevis atklātā tekstā mūsu tabulā. Aizmirsušās paroles saiti nosūtām uz e-pastu.",
            "Panelī redzamie dalībnieki, spēles, treniņi un summas ir parauga dati. Izmaiņas ir tikai atvērtajā lapā un pazūd, kad to aizver vai pārlādē.",
            "Valoda saglabājas šajā pārlūkā (atslēga 1equal-lang). Sīkdatņu izvēle saglabājas sīkdatnē 1equal-consent.",
            "Serveris, kas izsniedz lapu, var īslaicīgi redzēt tehniskos pieprasījuma datus, piemēram, IP adresi un pārlūka veidu. Tos neizmantojam profilēšanai.",
          ],
        },
        {
          heading: "Kāpēc",
          paragraphs: [
            "Lai parādītu paneli, atcerētos valodu un tavu sīkdatņu izvēli.",
            "Obligātā sīkdatne ir vajadzīga, lai izvēli atcerētos. Preferenču, statistikas un mārketinga kategorijas ieslēdzam tikai pēc piekrišanas. Umami statistikas skripts ielādējas tikai tad, ja administrators to ieslēdz un tu atļauj statistiku. Mārketinga rīki nav pieslēgti.",
          ],
        },
        {
          heading: "Cik ilgi",
          paragraphs: [
            "Sīkdatņu izvēle glabājas 12 mēnešus.",
            "Valoda glabājas, līdz to nomaini vai iztīri pārlūka datus šai vietnei.",
            "Formu lauki un izmaiņas panelī netiek glabāti.",
          ],
        },
        {
          heading: "Kam datus nododam",
          paragraphs: [
            "Datus nepārdodam un nenododam reklāmas tīkliem. Umami saņem anonīmu lapas skatījumu tikai ar statistikas piekrišanu un ieslēgtu integrāciju. Mārketinga rīki nav pieslēgti.",
            "Ja tādu rīku pievienosim, tas darbosies tikai ar tavu piekrišanu, un šo politiku atjaunināsim.",
          ],
        },
        {
          heading: "Tavas tiesības",
          paragraphs: [
            "Ja dati par tevi tiktu glabāti, tev būtu tiesības tiem piekļūt, tos labot, dzēst, ierobežot apstrādi, iebilst un saņemt kopiju, kā arī atsaukt piekrišanu.",
            "Šajā demo to, ko lapa pati saglabā, vari dzēst, iztīrot šīs vietnes datus pārlūkā. Sīkdatņu izvēli vari mainīt iestatījumos.",
            "Sūdzību vari iesniegt Datu valsts inspekcijā (dvi.gov.lv).",
          ],
        },
        {
          heading: "Bērni",
          paragraphs: ["Panelis nav paredzēts bērniem, kas jaunāki par 16 gadiem. Lūdzam neievadīt bērnu personas datus."],
        },
        {
          heading: "Izmaiņas",
          paragraphs: ["Politiku varam precizēt. Jaunā redakcija būs šajā lapā ar jaunu datumu."],
        },
      ],
    },
    en: {
      intro:
        "This policy describes what data 1equal processes when you use the team panel: the calendar, roster, attendance and rink fees. The account is stored. The roster shown in the panel is still a sample.",
      sections: [
        {
          heading: "Who we are",
          paragraphs: [
            "1equal is a panel for a team season. This demo does not name a separate controller, registration number or address, because the account and team data are not stored with us.",
            "When the service is a full product, this section will name the controller and a contact address. Until then, this page explains what the browser keeps.",
          ],
        },
        {
          heading: "What data we process",
          paragraphs: [
            "When you sign up we store your name and email. The password is kept by the authentication system, not as plain text in our table. The forgot-password link is sent by email.",
            "Members, games, practices and amounts in the panel are sample data. Changes exist only on the open page and disappear when you close or reload it.",
            "Language is saved in this browser (key 1equal-lang). The cookie choice is saved in the cookie 1equal-consent.",
            "The server that delivers the page may briefly see technical request data, such as an IP address and browser type. We do not use that for profiling.",
          ],
        },
        {
          heading: "Why",
          paragraphs: [
            "To show the panel and remember the language and your cookie choice.",
            "The necessary cookie is required to remember that choice. Preference, analytics and marketing categories are enabled only after consent. The Umami analytics script loads only when an administrator turns it on and you allow analytics. Marketing tools are not connected.",
          ],
        },
        {
          heading: "How long",
          paragraphs: [
            "The cookie choice is kept for 12 months.",
            "The language stays until you change it or clear this site's data in the browser.",
            "Form fields and changes in the panel are not stored.",
          ],
        },
        {
          heading: "Who we share data with",
          paragraphs: [
            "We do not sell data and we do not pass it to advertising networks. Umami receives an anonymous page view only with analytics consent and the integration turned on. Marketing tools are not connected.",
            "If we add such a tool, it will run only with your consent, and we will update this policy.",
          ],
        },
        {
          heading: "Your rights",
          paragraphs: [
            "If data about you were stored, you would have the right to access it, correct it, delete it, restrict processing, object, receive a copy, and withdraw consent.",
            "In this demo you can remove what the page stores by clearing this site's data in the browser. You can change the cookie choice in the settings.",
            "You can lodge a complaint with the Data State Inspectorate of Latvia (dvi.gov.lv).",
          ],
        },
        {
          heading: "Children",
          paragraphs: ["The panel is not meant for children under 16. Please do not enter children's personal data."],
        },
        {
          heading: "Changes",
          paragraphs: ["We may update this policy. The new version will be on this page with a new date."],
        },
      ],
    },
    ru: {
      intro:
        "В этой политике описано, какие данные обрабатывает 1equal, когда ты пользуешься панелью команды: календарём, составом, явкой и оплатой катка. Аккаунт сохраняется. Состав в панели пока показан как образец.",
      sections: [
        {
          heading: "Кто мы",
          paragraphs: [
            "1equal - панель сезона команды. В этой демо-версии не указаны отдельный оператор, регистрационный номер или адрес, потому что аккаунт и данные команды у нас не хранятся.",
            "Когда сервис станет полной версией, здесь будут оператор и адрес для связи. До тех пор эта страница объясняет, что остаётся в браузере.",
          ],
        },
        {
          heading: "Какие данные мы обрабатываем",
          paragraphs: [
            "При регистрации сохраняем имя и e-mail. Пароль хранит система аутентификации, а не открытый текст в нашей таблице. Ссылку для забытого пароля отправляем на e-mail.",
            "Участники, игры, тренировки и суммы в панели - образец. Изменения есть только на открытой странице и пропадают, когда её закрываешь или обновляешь.",
            "Язык сохраняется в этом браузере (ключ 1equal-lang). Выбор cookie сохраняется в cookie 1equal-consent.",
            "Сервер, который отдаёт страницу, может кратко видеть технические данные запроса, например IP-адрес и тип браузера. Для профилирования мы их не используем.",
          ],
        },
        {
          heading: "Зачем",
          paragraphs: [
            "Чтобы показать панель и запомнить язык и твой выбор cookie.",
            "Обязательная cookie нужна, чтобы запомнить этот выбор. Категории предпочтений, аналитики и маркетинга включаются только после согласия. Скрипт аналитики Umami загружается, только если администратор его включил и ты разрешил аналитику. Маркетинговые инструменты не подключены.",
          ],
        },
        {
          heading: "Как долго",
          paragraphs: [
            "Выбор cookie хранится 12 месяцев.",
            "Язык остаётся, пока ты его не сменишь или не очистишь данные этого сайта в браузере.",
            "Поля форм и изменения в панели не сохраняются.",
          ],
        },
        {
          heading: "Кому передаём данные",
          paragraphs: [
            "Данные не продаём и не передаём рекламным сетям. Umami получает анонимный просмотр страницы только при согласии на аналитику и включённой интеграции. Маркетинговые инструменты не подключены.",
            "Если такой инструмент появится, он будет работать только с твоего согласия, и мы обновим эту политику.",
          ],
        },
        {
          heading: "Твои права",
          paragraphs: [
            "Если данные о тебе хранились бы, у тебя было бы право на доступ, исправление, удаление, ограничение обработки, возражение, копию и отзыв согласия.",
            "В этом демо то, что страница сохраняет сама, можно удалить, очистив данные этого сайта в браузере. Выбор cookie можно изменить в настройках.",
            "Жалобу можно подать в Государственную инспекцию данных Латвии (dvi.gov.lv).",
          ],
        },
        {
          heading: "Дети",
          paragraphs: ["Панель не предназначена для детей младше 16 лет. Не вводи персональные данные детей."],
        },
        {
          heading: "Изменения",
          paragraphs: ["Политику можем уточнять. Новая редакция будет на этой странице с новой датой."],
        },
      ],
    },
  },
  terms: {
    lv: {
      intro: "Šie noteikumi attiecas uz 1equal izmantošanu: komandas kalendāru, sastāvu, dalību un laukumu maksu.",
      sections: [
        {
          heading: "Demo pakalpojums",
          paragraphs: [
            "Reģistrācija izveido kontu, un ienākšana pārbauda paroli. Pirmais reģistrētais lietotājs ir administrators.",
            "Panelī redzamie cilvēki, spēles, treniņi un summas ir paraugs. Tie nav īstas komandas ieraksti.",
          ],
        },
        {
          heading: "Ko drīksti darīt",
          paragraphs: [
            "Apskatīt paneli, pārslēgt valodu un izmēģināt sastāvu, kalendāru un dalību.",
            "Neievadi citu cilvēku īstus personas datus. Parauga datiem pietiek.",
          ],
        },
        {
          heading: "Ko nedrīksti darīt",
          paragraphs: [
            "Netraucē lapas darbību, nemēģini iegūt piekļuvi, kas tev nav dota, un neizmanto paneli, lai kaitētu citiem.",
          ],
        },
        {
          heading: "Maksa",
          paragraphs: ["Demo ir bez maksas. Summas panelī ir paraugs, nevis rēķins un nevis maksājuma pieprasījums."],
        },
        {
          heading: "Atbildība",
          paragraphs: [
            "Paneli rādām tādu, kāds tas ir. Negarantējam, ka demo būs pieejams bez pārtraukuma vai ka parauga dati derēs īstai komandai.",
          ],
        },
        {
          heading: "Izmaiņas",
          paragraphs: ["Demo varam mainīt vai apturēt. Noteikumus varam atjaunināt šajā lapā. Turpini lietot paneli, ja piekrīti jaunajai redakcijai."],
        },
        {
          heading: "Tiesības",
          paragraphs: [
            "Uz šiem noteikumiem attiecas Latvijas Republikas tiesības. Ja esi patērētājs, paliek spēkā tiesības, no kurām likums neļauj atteikties.",
          ],
        },
      ],
    },
    en: {
      intro: "These terms cover use of 1equal: the team calendar, roster, attendance and rink fees.",
      sections: [
        {
          heading: "Demo service",
          paragraphs: [
            "Sign up creates an account, and log in checks the password. The first registered user is the administrator.",
            "People, games, practices and amounts in the panel are a sample. They are not a real team's records.",
          ],
        },
        {
          heading: "What you may do",
          paragraphs: [
            "Look through the panel, switch language and try the roster, calendar and attendance.",
            "Do not enter other people's real personal data. The sample data is enough.",
          ],
        },
        {
          heading: "What you may not do",
          paragraphs: ["Do not disrupt the page, try to gain access you were not given, or use the panel to harm others."],
        },
        {
          heading: "Fees",
          paragraphs: ["The demo is free. Amounts in the panel are a sample, not an invoice and not a request for payment."],
        },
        {
          heading: "Liability",
          paragraphs: ["The panel is shown as it is. We do not guarantee that the demo will be available without interruption, or that the sample data will fit a real team."],
        },
        {
          heading: "Changes",
          paragraphs: ["We may change or stop the demo. We may update these terms on this page. Keep using the panel if you accept the new version."],
        },
        {
          heading: "Law",
          paragraphs: ["These terms follow the laws of the Republic of Latvia. If you are a consumer, rights you cannot waive by law still apply."],
        },
      ],
    },
    ru: {
      intro: "Эти условия относятся к использованию 1equal: календарю команды, составу, явке и оплате катка.",
      sections: [
        {
          heading: "Демо-сервис",
          paragraphs: [
            "Регистрация создаёт аккаунт, а вход проверяет пароль. Первый зарегистрированный пользователь - администратор.",
            "Люди, игры, тренировки и суммы в панели - образец. Это не записи настоящей команды.",
          ],
        },
        {
          heading: "Что можно",
          paragraphs: [
            "Смотреть панель, переключать язык и пробовать состав, календарь и явку.",
            "Не вводи настоящие персональные данные других людей. Образца достаточно.",
          ],
        },
        {
          heading: "Что нельзя",
          paragraphs: ["Не мешай работе страницы, не пытайся получить доступ, которого тебе не дали, и не используй панель, чтобы навредить другим."],
        },
        {
          heading: "Оплата",
          paragraphs: ["Демо бесплатное. Суммы в панели - образец, а не счёт и не требование оплаты."],
        },
        {
          heading: "Ответственность",
          paragraphs: ["Панель показывается как есть. Мы не гарантируем, что демо будет доступно без перерывов или что образец подойдёт настоящей команде."],
        },
        {
          heading: "Изменения",
          paragraphs: ["Демо можем изменить или остановить. Условия можем обновить на этой странице. Продолжай пользоваться панелью, если согласен с новой редакцией."],
        },
        {
          heading: "Право",
          paragraphs: ["К этим условиям применяется право Латвийской Республики. Если ты потребитель, остаются права, от которых закон не позволяет отказаться."],
        },
      ],
    },
  },
  cookies: {
    lv: {
      intro: "Šeit ir aprakstīts, kādas sīkdatnes un līdzīgas tehnoloģijas 1equal izmanto un kā izvēli mainīt.",
      sections: [
        {
          heading: "Kas ir sīkdatne",
          paragraphs: [
            "Sīkdatne ir mazs teksts, ko pārlūks saglabā pēc lapas lūguma. Dažas izvēles glabājam pārlūka krātuvē, nevis sīkdatnē.",
          ],
        },
        {
          heading: "Kategorijas",
          paragraphs: [
            "Obligātās sīkdatnes ir vajadzīgas, lai atcerētos tavu izvēli. Preferenču, statistikas un mārketinga sīkdatnes lietojam tikai tad, ja tās atļauj.",
          ],
        },
        {
          heading: "Ko lietojam tagad",
          paragraphs: ["Valoda (1equal-lang) ir pārlūka krātuvē, nevis sīkdatnē. Tā saglabājas, kad izvēlies valodu, arī ja preferenču kategorija ir izslēgta. Vēlāk šo sasiesim ar slēdzi."],
          rows: [
            {
              name: "1equal-consent",
              purpose: "Saglabā, kurām neobligātajām kategorijām piekriti un kad izvēle veikta.",
              duration: "12 mēneši",
            },
            {
              name: "1equal-player-hint",
              purpose: "Atceras, kurām komandām spēlētāja saites paziņojums ir aizvērts.",
              duration: "12 mēneši",
            },
            {
              name: "1equal-remember-session",
              purpose: "Atceras, ka ienākot tika atzīmēts Atcerēties mani.",
              duration: "30 dienas",
            },
            {
              name: "sb-…-auth-token",
              purpose: "Uztur pieslēgšanās sesiju.",
              duration: "30 dienas, ja atzīmēts Atcerēties mani. Citādi līdz pārlūka aizvēršanai.",
            },
          ],
        },
        {
          heading: "Ko vēl nelietojam",
          paragraphs: [
            "Mārketinga sīkdatnes netiek iestatītas. Umami skripts ielādējas tikai tad, ja administrators integrāciju ieslēdz un tu atļauj statistiku.",
          ],
        },
        {
          heading: "Kā mainīt izvēli",
          paragraphs: [
            "Pirmajā apmeklējumā rādām joslu ar darbībām Pielāgot, Atteikt neobligātās un Piekrist visām.",
            "Vēlāk izvēli vari mainīt ar Sīkdatņu iestatījumi kājenē vai lietotāja izvēlnē panelī. Pārlūkā vari arī dzēst sīkdatnes pašam.",
          ],
        },
      ],
    },
    en: {
      intro: "This page describes which cookies and similar technologies 1equal uses, and how to change the choice.",
      sections: [
        {
          heading: "What a cookie is",
          paragraphs: ["A cookie is a small piece of text the browser stores when a page asks for it. Some choices are kept in browser storage, not in a cookie."],
        },
        {
          heading: "Categories",
          paragraphs: [
            "Necessary cookies are required to remember your choice. Preference, analytics and marketing cookies are used only if you allow them.",
          ],
        },
        {
          heading: "What we use now",
          paragraphs: [
            "Language (1equal-lang) is browser storage, not a cookie. It is saved when you pick a language, even if the preference category is off. We will tie that to the switch later.",
          ],
          rows: [
            {
              name: "1equal-consent",
              purpose: "Stores which optional categories you allowed and when the choice was made.",
              duration: "12 months",
            },
            {
              name: "1equal-player-hint",
              purpose: "Remembers for which teams the player-link notice was closed.",
              duration: "12 months",
            },
            {
              name: "1equal-remember-session",
              purpose: "Remembers that Remember me was checked at login.",
              duration: "30 days",
            },
            {
              name: "sb-…-auth-token",
              purpose: "Keeps the sign-in session.",
              duration: "30 days when Remember me is checked. Otherwise until the browser closes.",
            },
          ],
        },
        {
          heading: "What we do not use yet",
          paragraphs: [
            "Marketing cookies are not set. The Umami script loads only when an administrator turns the integration on and you allow analytics.",
          ],
        },
        {
          heading: "How to change the choice",
          paragraphs: [
            "On the first visit we show a bar with Customize, Reject optional and Accept all.",
            "Later you can change the choice with Cookie settings in the footer or in the user menu in the panel. You can also delete cookies in the browser.",
          ],
        },
      ],
    },
    ru: {
      intro: "Здесь описано, какие cookie и похожие технологии использует 1equal и как изменить выбор.",
      sections: [
        {
          heading: "Что такое cookie",
          paragraphs: ["Cookie - небольшой текст, который браузер сохраняет по просьбе страницы. Некоторые выборы хранятся в хранилище браузера, а не в cookie."],
        },
        {
          heading: "Категории",
          paragraphs: ["Обязательные cookie нужны, чтобы запомнить твой выбор. Cookie предпочтений, аналитики и маркетинга используются, только если ты их разрешил."],
        },
        {
          heading: "Что используем сейчас",
          paragraphs: [
            "Язык (1equal-lang) хранится в браузере, а не в cookie. Он сохраняется, когда выбираешь язык, даже если категория предпочтений выключена. Позже свяжем это с переключателем.",
          ],
          rows: [
            {
              name: "1equal-consent",
              purpose: "Хранит, какие необязательные категории ты разрешил и когда сделан выбор.",
              duration: "12 месяцев",
            },
            {
              name: "1equal-player-hint",
              purpose: "Помнит, для каких команд закрыто уведомление о ссылке игрока.",
              duration: "12 месяцев",
            },
            {
              name: "1equal-remember-session",
              purpose: "Помнит, что при входе было отмечено Запомнить меня.",
              duration: "30 дней",
            },
            {
              name: "sb-…-auth-token",
              purpose: "Держит сессию входа.",
              duration: "30 дней, если отмечено Запомнить меня. Иначе до закрытия браузера.",
            },
          ],
        },
        {
          heading: "Чего ещё нет",
          paragraphs: ["Маркетинговые cookie не ставятся. Скрипт Umami загружается, только если администратор включил интеграцию и ты разрешил аналитику."],
        },
        {
          heading: "Как изменить выбор",
          paragraphs: [
            "При первом визите показываем полосу с действиями Настроить, Отклонить необязательные и Принять все.",
            "Позже выбор можно изменить через Настройки cookie в подвале или в меню пользователя в панели. Cookie можно удалить и в самом браузере.",
          ],
        },
      ],
    },
  },
};

export function getLegalDocument(id: LegalId, lang: Lang): LegalDocument {
  return documents[id][lang];
}
