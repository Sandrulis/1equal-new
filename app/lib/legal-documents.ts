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
        "Šajā politikā ir aprakstīts, kādus personas datus 1equal apstrādā, kad tu lieto sākumlapu, kontu un komandas paneli. Publiskais demo /demo ir paraugs un neveido tavu komandas uzskaiti.",
      sections: [
        {
          heading: "Kas mēs esam",
          paragraphs: [
            "1equal ir komandas vadības panelis: kalendārs, sastāvs, dalība un komandas izdevumi. Personas datu pārzinis ir šīs vietnes uzturētājs.",
            "Reģistrācijas numurs un pasta adrese šajā lapā nav publicēti. Saziņai izmanto sākumlapas formu Sazinies ar mums. Ja uzturētājs ir norādījis kontakta e-pastu, atbilde nāk no tā.",
          ],
        },
        {
          heading: "Kādus datus apstrādājam",
          paragraphs: [
            "Kontam glabājam vārdu, uzvārdu un e-pastu. Ja tos pievieno, glabājam arī profila attēlu, valodas un datuma iestatījumus, izvēli par notikumu e-pastiem un aktīvo komandu. Paroli glabā autentifikācijas sistēma kā jaucējkodu, nevis atklātā tekstā.",
            "Komandai glabājam nosaukumu, sporta veidu, logotipu, dalībniekus (vārds, e-pasts, tālrunis, numurs, pozīcijas), apakškomandas, laukumus, notikumus, dalību, bilanci un rezervācijas. Ja pievieno Entuziastu saiti, no tās publiskās lapas varam nolasīt tur redzamo profilu un attēlu.",
            "Sākumlapas kontaktu forma nosūta vārdu, e-pastu, tematu un ziņu uzturētājam.",
            "Tehniski varam redzēt IP adresi, pārlūka veidu un pēdējo paneļa atvēršanas laiku. Administratoram rādām konta pēdējo IP adresi un valsti, kā arī IP adresi un valsti, no kuras izveidota komanda, lai zinātu, ar ko sazināties. Ja serveris valsti nepaziņo, IP adresi var nosūtīt ģeolokācijas pakalpojumam, lai noteiktu valsti. Tos izmantojam drošībai un darbības nodrošināšanai, nevis reklāmai.",
            "Publiskajā /demo redzamie cilvēki, spēles un summas ir paraugs. Tās izmaiņas netiek saglabātas kā tava komanda.",
          ],
        },
        {
          heading: "Kāpēc",
          paragraphs: [
            "Kontu un komandas datus apstrādājam, lai sniegtu paneli, ko tu pieprasi. Komandas vadītājs ir atbildīgs par to, ka dalībnieku datiem ir pamats. Mēs šos datus apstrādājam, lai vadītājam un dalībniekiem rādītu paneli.",
            "Sesiju, pieslēgšanās aizsardzību un kļūdu labošanu apstrādājam, lai pakalpojums būtu drošs un darbotos.",
            "Obligātās sīkdatnes ir vajadzīgas sesijai un tavam sīkdatņu lēmumam. Statistiku (Umami) ielādējam tikai tad, ja administrators to ieslēdz un tu atļauj statistiku. Mārketinga rīki nav pieslēgti.",
            "Ja administrators ieslēdz Cloudflare Turnstile, ienākšana, reģistrācija un paroles atjaunošana prasa botu pārbaudi. Ja ieslēgts Google, vari ienākt ar Google kontu. Ja ieslēgts Sentry, kļūdas ziņojums var aiziet pie Sentry ar maskētu lapas ierakstu. Ja ieslēgts Resend, sūtām reģistrācijas, paroles, e-pasta maiņas un notikumu vēstules.",
          ],
        },
        {
          heading: "Cik ilgi",
          paragraphs: [
            "Konta un komandas dati glabājas, kamēr konts vai komanda pastāv. Profilu vari labot, un no komandas vari izstāties.",
            "Sīkdatņu izvēle glabājas 12 mēnešus. Valoda glabājas šajā pārlūkā, līdz to nomaini vai iztīri vietnes datus.",
            "Ja atzīmē Atcerēties mani, sesija paliek 30 dienas. Citādi sesija beidzas, aizverot pārlūku. E-pasta maiņas saite der 24 stundas.",
          ],
        },
        {
          heading: "Kam datus nododam",
          paragraphs: [
            "Datus nepārdodam un nenododam reklāmas tīkliem.",
            "Datubāzi, autentifikāciju un attēlus glabā Supabase. E-pastus, ja integrācija ir ieslēgta, nosūta Resend. Botu pārbaudi, ja tā ir ieslēgta, veic Cloudflare. Google ienākšanu, ja tā ir ieslēgta, veic Google. Kļūdu ziņojumus, ja tie ir ieslēgti, saņem Sentry. Umami saņem anonīmu lapas skatījumu tikai ar statistikas piekrišanu.",
            "Šie pakalpojumi var apstrādāt datus ārpus Latvijas, saskaņā ar sava pakalpojuma noteikumiem.",
          ],
        },
        {
          heading: "Tavas tiesības",
          paragraphs: [
            "Tev ir tiesības piekļūt saviem datiem, tos labot, lūgt dzēst, ierobežot apstrādi, iebilst un saņemt kopiju, kā arī atsaukt piekrišanu statistikai.",
            "Profilu labo konta iestatījumos. Sīkdatņu izvēli maini kājenē. Konta dzēšanu vari lūgt caur sākumlapas kontaktu formu.",
            "Sūdzību vari iesniegt Datu valsts inspekcijā (dvi.gov.lv).",
          ],
        },
        {
          heading: "Bērni",
          paragraphs: [
            "Pakalpojums nav paredzēts, lai bērns pats veidotu kontu. Ja komandā ir nepilngadīgie, vadītājs drīkst ievadīt tikai tos datus, kas vajadzīgi komandas darbam, un viņam jābūt tam pamatam.",
          ],
        },
        {
          heading: "Izmaiņas",
          paragraphs: ["Politiku varam precizēt. Jaunā redakcija būs šajā lapā ar jaunu datumu."],
        },
      ],
    },
    en: {
      intro:
        "This policy describes the personal data 1equal processes when you use the landing page, an account and the team panel. The public demo at /demo is a sample and is not your team's records.",
      sections: [
        {
          heading: "Who we are",
          paragraphs: [
            "1equal is a team panel: calendar, roster, attendance and team expenses. The controller of personal data is the operator of this website.",
            "A registration number and postal address are not published on this page. Use the contact form on the landing page. If the operator has set a contact email, the reply comes from that address.",
          ],
        },
        {
          heading: "What data we process",
          paragraphs: [
            "For an account we store the first name, last name and email. If you add them, we also store a profile image, language and date settings, the choice about event emails, and the active team. The password is kept by the authentication system as a hash, not as plain text.",
            "For a team we store the name, sport, logo, members (name, email, phone, number, positions), sub-teams, venues, events, attendance, balance and reservations. If you add an Entuziasti link, we may read the public profile and image shown on that page.",
            "The contact form on the landing page sends the name, email, subject and message to the operator.",
            "Technically we may see an IP address, browser type and the last time the panel was opened. An administrator can see an account's last IP address and country, and the IP address and country from which a team was created, so they know who to contact. If the server does not provide a country, the IP address may be sent to a geolocation service to determine it. We use that for security and to run the service, not for advertising.",
            "People, games and amounts on the public /demo are a sample. Those changes are not saved as your team.",
          ],
        },
        {
          heading: "Why",
          paragraphs: [
            "We process the account and team data to provide the panel you ask for. The team leader is responsible for having a basis to use member data. We process that data so the leader and members can see the panel.",
            "We process the session, sign-in protection and error reports so the service stays secure and works.",
            "Necessary cookies are required for the session and your cookie choice. We load analytics (Umami) only when an administrator turns it on and you allow analytics. Marketing tools are not connected.",
            "If an administrator turns on Cloudflare Turnstile, sign-in, signup and password reset require a bot check. If Google is on, you can sign in with a Google account. If Sentry is on, an error report may go to Sentry with a masked recording of the page. If Resend is on, we send signup, password, email-change and event messages.",
          ],
        },
        {
          heading: "How long",
          paragraphs: [
            "Account and team data stay while the account or team exists. You can edit your profile and leave a team.",
            "The cookie choice is kept for 12 months. The language stays in this browser until you change it or clear this site's data.",
            "If you check Remember me, the session stays for 30 days. Otherwise it ends when you close the browser. An email-change link is valid for 24 hours.",
          ],
        },
        {
          heading: "Who we share data with",
          paragraphs: [
            "We do not sell data and we do not pass it to advertising networks.",
            "The database, authentication and images are stored by Supabase. Email, when that integration is on, is sent by Resend. The bot check, when it is on, is done by Cloudflare. Google sign-in, when it is on, is done by Google. Error reports, when they are on, are received by Sentry. Umami receives an anonymous page view only with analytics consent.",
            "These services may process data outside Latvia, under the terms of that service.",
          ],
        },
        {
          heading: "Your rights",
          paragraphs: [
            "You have the right to access your data, correct it, ask for deletion, restrict processing, object, receive a copy, and withdraw analytics consent.",
            "Edit your profile in account settings. Change the cookie choice in the footer. You can ask to delete the account through the contact form on the landing page.",
            "You can lodge a complaint with the Data State Inspectorate of Latvia (dvi.gov.lv).",
          ],
        },
        {
          heading: "Children",
          paragraphs: [
            "The service is not meant for a child to create an account. If a team includes minors, the leader may enter only the data needed to run the team, and must have a basis to do so.",
          ],
        },
        {
          heading: "Changes",
          paragraphs: ["We may update this policy. The new version will be on this page with a new date."],
        },
      ],
    },
    ru: {
      intro:
        "В этой политике описано, какие персональные данные обрабатывает 1equal, когда ты пользуешься главной страницей, аккаунтом и панелью команды. Публичное демо /demo - образец и не является учётом твоей команды.",
      sections: [
        {
          heading: "Кто мы",
          paragraphs: [
            "1equal - панель команды: календарь, состав, явка и расходы команды. Оператор персональных данных - тот, кто ведёт этот сайт.",
            "Регистрационный номер и почтовый адрес на этой странице не опубликованы. Для связи используй форму на главной странице. Если оператор указал контактный e-mail, ответ придёт с него.",
          ],
        },
        {
          heading: "Какие данные мы обрабатываем",
          paragraphs: [
            "Для аккаунта храним имя, фамилию и e-mail. Если ты их добавишь, храним также фото профиля, настройки языка и даты, выбор писем о событиях и активную команду. Пароль хранит система аутентификации как хеш, а не открытый текст.",
            "Для команды храним название, вид спорта, логотип, участников (имя, e-mail, телефон, номер, позиции), подкоманды, катки, события, явку, баланс и резервы. Если добавить ссылку Entuziasti, мы можем прочитать публичный профиль и фото с этой страницы.",
            "Форма на главной странице отправляет имя, e-mail, тему и сообщение оператору.",
            "Технически мы можем видеть IP-адрес, тип браузера и время последнего открытия панели. Администратор видит последний IP-адрес и страну аккаунта, а также IP-адрес и страну, откуда создана команда, чтобы знать, с кем связаться. Если сервер не сообщает страну, IP-адрес может быть отправлен в сервис геолокации, чтобы определить её. Это нужно для безопасности и работы сервиса, а не для рекламы.",
            "Люди, игры и суммы на публичном /demo - образец. Эти изменения не сохраняются как твоя команда.",
          ],
        },
        {
          heading: "Зачем",
          paragraphs: [
            "Аккаунт и данные команды обрабатываем, чтобы дать панель, которую ты просишь. Руководитель команды отвечает за то, что для данных участников есть основание. Мы обрабатываем эти данные, чтобы руководитель и участники видели панель.",
            "Сессию, защиту входа и сообщения об ошибках обрабатываем, чтобы сервис был безопасным и работал.",
            "Обязательные cookie нужны для сессии и твоего выбора cookie. Аналитику (Umami) загружаем, только если администратор её включил и ты разрешил аналитику. Маркетинговые инструменты не подключены.",
            "Если администратор включил Cloudflare Turnstile, вход, регистрация и сброс пароля требуют проверку на бота. Если включён Google, можно войти через аккаунт Google. Если включён Sentry, сообщение об ошибке может уйти в Sentry с замаскированной записью страницы. Если включён Resend, отправляем письма о регистрации, пароле, смене e-mail и событиях.",
          ],
        },
        {
          heading: "Как долго",
          paragraphs: [
            "Данные аккаунта и команды хранятся, пока существуют аккаунт или команда. Профиль можно исправить, из команды можно выйти.",
            "Выбор cookie хранится 12 месяцев. Язык остаётся в этом браузере, пока ты его не сменишь или не очистишь данные сайта.",
            "Если отметить Запомнить меня, сессия остаётся на 30 дней. Иначе она заканчивается при закрытии браузера. Ссылка смены e-mail действует 24 часа.",
          ],
        },
        {
          heading: "Кому передаём данные",
          paragraphs: [
            "Данные не продаём и не передаём рекламным сетям.",
            "Базу, аутентификацию и изображения хранит Supabase. Письма, если интеграция включена, отправляет Resend. Проверку на бота, если она включена, делает Cloudflare. Вход через Google, если он включён, делает Google. Сообщения об ошибках, если они включены, получает Sentry. Umami получает анонимный просмотр страницы только при согласии на аналитику.",
            "Эти сервисы могут обрабатывать данные за пределами Латвии по своим условиям.",
          ],
        },
        {
          heading: "Твои права",
          paragraphs: [
            "У тебя есть право на доступ, исправление, просьбу об удалении, ограничение обработки, возражение, копию и отзыв согласия на аналитику.",
            "Профиль правится в настройках аккаунта. Выбор cookie меняется в подвале. Удаление аккаунта можно запросить через форму на главной странице.",
            "Жалобу можно подать в Государственную инспекцию данных Латвии (dvi.gov.lv).",
          ],
        },
        {
          heading: "Дети",
          paragraphs: [
            "Сервис не предназначен для того, чтобы ребёнок сам создавал аккаунт. Если в команде есть несовершеннолетние, руководитель может ввести только данные, нужные для работы команды, и у него должно быть на это основание.",
          ],
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
      intro: "Šie noteikumi attiecas uz 1equal izmantošanu: kontu, komandas kalendāru, sastāvu, dalību un komandas izdevumiem.",
      sections: [
        {
          heading: "Pakalpojums",
          paragraphs: [
            "Reģistrācija izveido kontu. Ienākšana pārbauda paroli vai, ja tas ir ieslēgts, Google kontu. Pirmais reģistrētais lietotājs ir administrators.",
            "Komandas dati panelī /dashboard tiek saglabāti. Publiskais /demo ir paraugs un nav īstas komandas uzskaite.",
          ],
        },
        {
          heading: "Ko drīksti darīt",
          paragraphs: [
            "Veidot komandu, aicināt dalībniekus, plānot notikumus un kārtot dalību un izdevumus.",
            "Citu cilvēku datus drīksti ievadīt tikai tad, ja tev ir pamats tos lietot komandas darbam.",
          ],
        },
        {
          heading: "Ko nedrīksti darīt",
          paragraphs: [
            "Netraucē lapas darbību, nemēģini iegūt piekļuvi, kas tev nav dota, un neizmanto paneli, lai kaitētu citiem vai ievietotu prettiesisku saturu.",
          ],
        },
        {
          heading: "Demo",
          paragraphs: ["Publiskais demo neprasa kontu. Tur redzamie cilvēki un summas ir paraugs."],
        },
        {
          heading: "Maksa",
          paragraphs: ["Pakalpojums ir bez maksas. Summas panelī ir komandas iekšējā uzskaite, nevis rēķins un nevis maksājuma pieprasījums no 1equal."],
        },
        {
          heading: "Atbildība",
          paragraphs: [
            "Paneli rādām tādu, kāds tas ir. Negarantējam nepārtrauktu pieejamību. Komandas uzskaites pareizību nodrošina komanda pati.",
          ],
        },
        {
          heading: "Izmaiņas",
          paragraphs: ["Pakalpojumu varam mainīt vai apturēt. Noteikumus varam atjaunināt šajā lapā. Turpini lietot paneli, ja piekrīti jaunajai redakcijai."],
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
      intro: "These terms cover use of 1equal: the account, team calendar, roster, attendance and team expenses.",
      sections: [
        {
          heading: "The service",
          paragraphs: [
            "Sign up creates an account. Log in checks the password or, when it is turned on, a Google account. The first registered user is the administrator.",
            "Team data in the /dashboard panel is stored. The public /demo is a sample and is not a real team's records.",
          ],
        },
        {
          heading: "What you may do",
          paragraphs: [
            "Create a team, invite members, plan events and keep attendance and expenses.",
            "You may enter other people's data only when you have a basis to use it for the team.",
          ],
        },
        {
          heading: "What you may not do",
          paragraphs: ["Do not disrupt the page, try to gain access you were not given, or use the panel to harm others or post unlawful content."],
        },
        {
          heading: "Demo",
          paragraphs: ["The public demo does not need an account. The people and amounts shown there are a sample."],
        },
        {
          heading: "Fees",
          paragraphs: ["The service is free. Amounts in the panel are the team's own records, not an invoice and not a request for payment from 1equal."],
        },
        {
          heading: "Liability",
          paragraphs: ["The panel is shown as it is. We do not guarantee uninterrupted availability. The team is responsible for the accuracy of its own records."],
        },
        {
          heading: "Changes",
          paragraphs: ["We may change or stop the service. We may update these terms on this page. Keep using the panel if you accept the new version."],
        },
        {
          heading: "Law",
          paragraphs: ["These terms follow the laws of the Republic of Latvia. If you are a consumer, rights you cannot waive by law still apply."],
        },
      ],
    },
    ru: {
      intro: "Эти условия относятся к использованию 1equal: аккаунту, календарю команды, составу, явке и расходам команды.",
      sections: [
        {
          heading: "Сервис",
          paragraphs: [
            "Регистрация создаёт аккаунт. Вход проверяет пароль или, если это включено, аккаунт Google. Первый зарегистрированный пользователь - администратор.",
            "Данные команды в панели /dashboard сохраняются. Публичное /demo - образец и не является учётом настоящей команды.",
          ],
        },
        {
          heading: "Что можно",
          paragraphs: [
            "Создавать команду, приглашать участников, планировать события и вести явку и расходы.",
            "Данные других людей можно вводить, только если у тебя есть основание использовать их для команды.",
          ],
        },
        {
          heading: "Что нельзя",
          paragraphs: ["Не мешай работе страницы, не пытайся получить доступ, которого тебе не дали, и не используй панель, чтобы навредить другим или разместить незаконный контент."],
        },
        {
          heading: "Демо",
          paragraphs: ["Публичное демо не требует аккаунта. Люди и суммы там - образец."],
        },
        {
          heading: "Оплата",
          paragraphs: ["Сервис бесплатный. Суммы в панели - внутренний учёт команды, а не счёт и не требование оплаты от 1equal."],
        },
        {
          heading: "Ответственность",
          paragraphs: ["Панель показывается как есть. Мы не гарантируем непрерывную доступность. За правильность учёта отвечает сама команда."],
        },
        {
          heading: "Изменения",
          paragraphs: ["Сервис можем изменить или остановить. Условия можем обновить на этой странице. Продолжай пользоваться панелью, если согласен с новой редакцией."],
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
            "Obligātās sīkdatnes ir vajadzīgas sesijai, pieslēgšanās aizsardzībai un tavam sīkdatņu lēmumam. Statistiku lietojam tikai tad, ja to atļauj. Mārketinga sīkdatnes netiek iestatītas.",
          ],
        },
        {
          heading: "Ko lietojam tagad",
          paragraphs: [
            "Valoda (1equal-lang) ir pārlūka krātuvē, nevis sīkdatnē. Tā saglabājas, kad izvēlies valodu, arī ja preferenču kategorija ir izslēgta.",
            "Ja administrators ir ieslēdzis botu pārbaudi, Cloudflare Turnstile ienākšanā, reģistrācijā un paroles atjaunošanā var iestatīt savas sīkdatnes. Tās ir vajadzīgas pārbaudei, nevis reklāmai.",
          ],
          rows: [
            {
              name: "1equal-consent",
              purpose: "Saglabā, kurām neobligātajām kategorijām piekriti un kad izvēle veikta.",
              duration: "12 mēneši",
            },
            {
              name: "1equal-player-hint",
              purpose: "Atceras, kurām komandām spēlētāja saites paziņojums ir aizvērts, lai to nerādītu vēlreiz.",
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
            {
              name: "1equal-google-oauth",
              purpose: "Īslaicīgi tur Google ienākšanas soli, ja šī ienākšana ir ieslēgta.",
              duration: "10 minūtes",
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
            "Necessary cookies are required for the session, sign-in protection and your cookie choice. Analytics are used only if you allow them. Marketing cookies are not set.",
          ],
        },
        {
          heading: "What we use now",
          paragraphs: [
            "Language (1equal-lang) is browser storage, not a cookie. It is saved when you pick a language, even if the preference category is off.",
            "If an administrator has turned on the bot check, Cloudflare Turnstile may set its own cookies on sign-in, signup and password reset. They are needed for the check, not for advertising.",
          ],
          rows: [
            {
              name: "1equal-consent",
              purpose: "Stores which optional categories you allowed and when the choice was made.",
              duration: "12 months",
            },
            {
              name: "1equal-player-hint",
              purpose: "Remembers for which teams the player-link notice was closed, so it is not shown again.",
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
            {
              name: "1equal-google-oauth",
              purpose: "Briefly holds the Google sign-in step when that sign-in is turned on.",
              duration: "10 minutes",
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
          paragraphs: [
            "Обязательные cookie нужны для сессии, защиты входа и твоего выбора cookie. Аналитика используется, только если ты её разрешил. Маркетинговые cookie не ставятся.",
          ],
        },
        {
          heading: "Что используем сейчас",
          paragraphs: [
            "Язык (1equal-lang) хранится в браузере, а не в cookie. Он сохраняется, когда выбираешь язык, даже если категория предпочтений выключена.",
            "Если администратор включил проверку на бота, Cloudflare Turnstile при входе, регистрации и сбросе пароля может поставить свои cookie. Они нужны для проверки, а не для рекламы.",
          ],
          rows: [
            {
              name: "1equal-consent",
              purpose: "Хранит, какие необязательные категории ты разрешил и когда сделан выбор.",
              duration: "12 месяцев",
            },
            {
              name: "1equal-player-hint",
              purpose: "Помнит, для каких команд закрыто уведомление о ссылке игрока, чтобы не показывать его снова.",
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
            {
              name: "1equal-google-oauth",
              purpose: "Ненадолго держит шаг входа через Google, если этот вход включён.",
              duration: "10 минут",
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
