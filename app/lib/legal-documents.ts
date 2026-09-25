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
        "Šajā politikā ir aprakstīts, kādus datus 1equal apstrādā, kad tu lieto komandas paneli: kalendāru, sastāvu, dalību un laukumu maksu. Pašreizējā versija ir demo. Ievadītie dati netiek saglabāti serverī.",
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
            "Vārds, e-pasts un parole ienākšanas un reģistrācijas laukos paliek šajā pārlūkā. Tie netiek nosūtīti un netiek saglabāti. Aizmirsušās paroles forma e-pastu nenosūta.",
            "Panelī redzamie dalībnieki, spēles, treniņi un summas ir parauga dati. Izmaiņas ir tikai atvērtajā lapā un pazūd, kad to aizver vai pārlādē.",
            "Valoda saglabājas šajā pārlūkā (atslēga 1equal-lang). Sīkdatņu izvēle saglabājas sīkdatnē 1equal-consent.",
            "Serveris, kas izsniedz lapu, var īslaicīgi redzēt tehniskos pieprasījuma datus, piemēram, IP adresi un pārlūka veidu. Tos neizmantojam profilēšanai.",
          ],
        },
        {
          heading: "Kāpēc",
          paragraphs: [
            "Lai parādītu paneli, atcerētos valodu un tavu sīkdatņu izvēli.",
            "Obligātā sīkdatne ir vajadzīga, lai izvēli atcerētos. Preferenču, statistikas un mārketinga kategorijas ieslēdzam tikai pēc piekrišanas. Pašlaik statistikas un mārketinga rīki nav pieslēgti.",
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
            "Datus nepārdodam un nenododam reklāmas tīkliem. Statistikas un mārketinga rīki šobrīd nav pieslēgti.",
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
        "This policy describes what data 1equal processes when you use the team panel: the calendar, roster, attendance and rink fees. The current version is a demo. What you type is not stored on a server.",
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
            "Name, email and password in the log-in and sign-up fields stay in this browser. They are not sent and not stored. The forgot-password form does not send email.",
            "Members, games, practices and amounts in the panel are sample data. Changes exist only on the open page and disappear when you close or reload it.",
            "Language is saved in this browser (key 1equal-lang). The cookie choice is saved in the cookie 1equal-consent.",
            "The server that delivers the page may briefly see technical request data, such as an IP address and browser type. We do not use that for profiling.",
          ],
        },
        {
          heading: "Why",
          paragraphs: [
            "To show the panel and remember the language and your cookie choice.",
            "The necessary cookie is required to remember that choice. Preference, analytics and marketing categories are enabled only after consent. Analytics and marketing tools are not connected yet.",
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
            "We do not sell data and we do not pass it to advertising networks. Analytics and marketing tools are not connected.",
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
  },
  terms: {
    lv: {
      intro: "Šie noteikumi attiecas uz 1equal izmantošanu: komandas kalendāru, sastāvu, dalību un laukumu maksu.",
      sections: [
        {
          heading: "Demo pakalpojums",
          paragraphs: [
            "Šī ir demo versija. Ienākšana un reģistrācija neatver īstu kontu. Parole netiek pārbaudīta, un e-pasts netiek nosūtīts.",
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
            "This is a demo. Log in and sign up do not open a real account. The password is not checked, and no email is sent.",
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
          ],
        },
        {
          heading: "Ko vēl nelietojam",
          paragraphs: [
            "Statistikas un mārketinga sīkdatnes šobrīd netiek iestatītas, arī ja kategoriju atļauj. Kad rīks tiks pievienots, tas darbosies tikai ar attiecīgo piekrišanu, un šo sarakstu papildināsim.",
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
          ],
        },
        {
          heading: "What we do not use yet",
          paragraphs: [
            "Analytics and marketing cookies are not set right now, even if you allow the category. When a tool is added, it will run only with that consent, and we will extend this list.",
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
  },
};

export function getLegalDocument(id: LegalId, lang: Lang): LegalDocument {
  return documents[id][lang];
}
