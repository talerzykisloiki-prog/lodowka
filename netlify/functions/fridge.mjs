import { getStore } from "@netlify/blobs";

// Wersja otwarta: bez hasła. Każdy, kto ma link, może zmieniać dane.

const CATS = ["meat", "main", "dish", "soup", "sauce", "fruit"]; // main = danie (np. pierogi), dish = dodatki i wege
const MAG = 7; // półka 7 = Magazyn (poza lodówką)
// Trzy zamrażarki po 7 półek: zamrażarka 1 = 11–17, zamrażarka 2 = 21–27, zamrażarka 3 = 31–37
const validShelf = (n) => Number.isInteger(n) && ((n >= 0 && n <= MAG) || (n >= 11 && n <= 37 && n % 10 >= 1 && n % 10 <= 7));
const SEED_DATE = "02.11.2026";
// [id, nazwa, ilość, półka (0 = brak), kategoria, flagi: t = rozmraża się, n = bez daty]
const SEED = [
  ["filet", "Filet grillowany", "3 sztuki", 3, "meat", ""],
  ["papki", "Papki z kurczaka", "1,5 porcji", 3, "meat", ""],
  ["rosol", "Mięso do rosołu", "1 porcja", 2, "meat", ""],
  ["golabki", "Gołąbki odwrócone", "1 bemar", 2, "meat", ""],
  ["kotlety", "Kotlety mielone", "1 porcja", 2, "meat", ""],
  ["gulasz", "Gulasz węgierski", "1 sztuka", 5, "meat", "t"],
  ["wege", "Wege kalafiorowe", "2 porcje", 2, "dish", ""],
  ["penne", "Makaron penne", "1 worek", 3, "dish", ""],
  ["mak-rosol", "Makaron do rosołu", "1 worek", 3, "dish", ""],
  ["mak-zwykly", "Makaron zwykły", "1 pudełko", 2, "dish", ""],
  ["gryczana", "Kasza gryczana", "1 pudełko", 2, "dish", ""],
  ["bulgur", "Kasza bułgur", "1 pudełko", 2, "dish", ""],
  ["ryz", "Ryż", "1 pudełko", 2, "dish", ""],
  ["kuskus", "Kuskus", "1 pudełko", 2, "dish", ""],
  ["ciecierka", "Zupa ciecierkowa", "1 wiaderko", 4, "soup", ""],
  ["baklazan", "Zupa bakłażanowa", "1/3 wiaderka", 4, "soup", ""],
  ["krem-pom", "Krem pomidorowy", "ilość nieznana", 4, "soup", ""],
  ["dynia", "Zupa dyniowa", "duże wiaderko", 5, "soup", "t"],
  ["grzybowy", "Sos grzybowy", "pół wiaderka", 2, "sauce", ""],
  ["pieczeniowy", "Sos pieczeniowy", "1 wiaderko", 2, "sauce", ""],
  ["sos-pom", "Sos pomidorowy", "1 duże wiaderko", 2, "sauce", ""],
  ["bolognese", "Bolognese", "1 wiaderko", 0, "sauce", "t"],
  ["kompot", "Owoce do kompotu", "1 wiaderko", 2, "fruit", ""],
  ["pesto", "Pesto", "", 2, "sauce", "n"],
  ["zurawina", "Sos żurawinowy", "", 2, "sauce", "n"],
  ["z-kompotu", "Owoce z kompotu", "", 2, "fruit", "n"],
  ["burger", "Sos do burgerów", "", 2, "sauce", "n"],
].map((r, i) => ({
  id: r[0], name: r[1], qty: r[2], shelf: r[3], cat: r[4],
  thaw: r[5].includes("t"), nodate: r[5].includes("n"), cart: false, today: false, ord: i + 1,
}));

// Jednorazowe dopiski: każda paczka wykonuje się raz (po deployu), potem już nie wraca.
const BATCHES = [
  {
    id: "2026-11-03-magazyn",
    date: "03.11.2026",
    items: [
      ["ogorkowa-kurczak", "Ogórkowa na kurczaku", "soup"],
      ["rosol-drobiowy", "Rosół drobiowy", "soup"],
      ["zupa-grzybowa", "Grzybowa", "soup"],
      ["krem-pom-mozzarella", "Krem pom. z mozzarellą", "soup"],
      ["krem-dyniowy-kokos", "Krem dyniowy kokos-imbir", "soup"],
      ["pulpeciki-pomidorowy", "Pulpeciki w sosie pom.", "meat"],
      ["kotlety-wege-warzywne", "Kotlety wege warzywne", "dish"],
    ],
  },
  {
    // Skróty nazw. Zmienia tylko pozycje, których nazwa nie była jeszcze edytowana ręcznie.
    id: "2026-11-03-skroty",
    renames: [
      ["ogorkowa-kurczak", "Zupa ogórkowa na kurczaku", "Ogórkowa na kurczaku"],
      ["rosol-drobiowy", "Rosół na wywarze drobiowym", "Rosół drobiowy"],
      ["zupa-grzybowa", "Zupa grzybowa", "Grzybowa"],
      ["krem-pom-mozzarella", "Krem pomidorowy z kulkami mozzarelli", "Krem pom. z mozzarellą"],
      ["krem-dyniowy-kokos", "Krem dyniowy na mleku kokosowym z nutą imbiru", "Krem dyniowy kokos-imbir"],
      ["pulpeciki-pomidorowy", "Pulpeciki wieprzowe w sosie pomidorowym", "Pulpeciki w sosie pom."],
      ["kotlety-wege-warzywne", "Kotlety wege z groszku, brokuła i kalafiora", "Kotlety wege warzywne"],
    ],
  },
  {
    // Nowa lista z 05.11.2026 (PDF): zastępuje wszystkie pozycje. Magazyn pusty.
    id: "2026-11-05-lista",
    date: "05.11.2026",
    replace: [
      ["sos-winegry", "Sos winegry", "1 wiaderko", 2, "sauce", 0],
      ["grzybowy-stary", "Sos grzybowy, stary", "1 małe wiaderko", 2, "sauce", 1],
      ["grzybowy-nowy", "Sos grzybowy, nowy", "1 wiaderko", 2, "sauce", 0],
      ["pieczeniowy", "Sos pieczeniowy", "pół wiaderka", 2, "sauce", 0],
      ["koperkowy", "Sos koperkowy", "1 wiaderko", 2, "sauce", 0],
      ["sos-pom", "Sos pomidorowy", "pół wiaderka", 2, "sauce", 0],
      ["jogurtowy", "Sos jogurtowy", "ilość nieznana", 2, "sauce", 0],
      ["pesto", "Pesto", "1 wiaderko", 2, "sauce", 1],
      ["gulasz-stary", "Gulasz węgierski, stary", "", 2, "meat", 1],
      ["bulgur", "Kasza bułgur", "2 porcje", 2, "dish", 0],
      ["gryczana", "Kasza gryczana", "1 porcja", 2, "dish", 0],
      ["ryz", "Ryż", "dużo", 2, "dish", 0],
      ["kurczak-wege", "Kurczak wege", "1 małe wiaderko", 2, "dish", 0],
      ["cheddar", "Ser cheddar", "1 pudełko", 2, "dish", 0],
      ["parmezan", "Parmezan", "1 pudełko", 2, "dish", 0],
      ["kotlety-mielone", "Kotlety mielone", "2 porcje", 2, "meat", 0],
      ["watrobka", "Wątróbka", "2 porcje", 2, "meat", 0],
      ["jajka", "Wyparzane jajka", "ilość nieznana", 2, "dish", 0],
      ["bitka-karkowka", "Bitka z karkówki", "1 porcja", 2, "meat", 0],
      ["zoladki", "Żołądki, stare", "", 3, "meat", 1],
      ["zupa-grzybowa", "Zupa grzybowa", "", 3, "soup", 1],
      ["pulpety", "Pulpety wieprzowe", "1 porcja", 3, "meat", 1],
      ["kotlety-wege-stare", "Kotlety wege, stare", "", 3, "dish", 1],
      ["palki", "Pieczone pałki", "", 3, "meat", 1],
      ["krupnik", "Krupnik", "1 wiadro", 3, "soup", 1],
      ["risotto", "Risotto", "1 porcja", 3, "dish", 1],
      ["nalesniki-wege", "Naleśniki wege", "4 porcje", 3, "dish", 0],
      ["jeczmienna", "Kasza jęczmienna", "1 porcja", 3, "dish", 1],
      ["meksykanska", "Zupa meksykańska", "pół wiaderka", 4, "soup", 0],
      ["meksykanska-wege", "Zupa meksykańska wege", "1 wiaderko", 4, "soup", 0],
      ["chili-jagniecina", "Chili con carne z jagnięciny", "1 wiaderko", 4, "meat", 0],
      ["chili-karkowka", "Chili con carne z karkówki", "1 duże wiaderko", 4, "meat", 0],
      ["filet", "Filet grillowany", "8 porcji", 4, "meat", 0],
      ["kotlety-wege-nowe", "Kotlety wege, nowe", "6–7 porcji", 4, "dish", 0],
      ["ziemniaki", "Ziemniaki", "4 porcje", 4, "dish", 0],
      ["klopsiki", "Klopsiki", "3 porcje", 4, "meat", 1],
      ["bolognese", "Bolognese, rozmrożone", "", 5, "sauce", 1],
      ["pire-szpinak", "Pire szpinakowe", "", 5, "dish", 1],
    ],
  },
  {
    // Nowy tydzień: lista z 09.11.2026 (dyktowana), zastępuje wszystkie pozycje.
    id: "2026-11-09-lista",
    date: "09.11.2026",
    replace: [
      ["sos-winegry", "Sos winegry", "1 wiaderko", 2, "sauce", 0, 0],
      ["pierogi-ruskie", "Pierogi ruskie", "", 2, "dish", 0, 0],
      ["krokiety", "Krokiety", "", 2, "dish", 0, 0],
      ["potrawka-kurczak", "Potrawka z kurczaka", "1 wiaderko", 2, "meat", 0, 0],
      ["sos-piecz-zurawina", "Sos pieczeniowo-żurawinowy", "1 małe wiaderko", 2, "sauce", 1, 0],
      ["bulgur", "Kasza bułgur", "1 pudełko", 2, "dish", 0, 0],
      ["bitka", "Bitka", "2 porcje", 2, "meat", 0, 0],
      ["filet", "Filet grillowany", "2 porcje", 2, "meat", 0, 0],
      ["losos", "Łosoś", "", 2, "meat", 1, 0],
      ["nalesniki", "Naleśniki", "6 porcji", 2, "dish", 0, 0],
      ["makaron", "Makaron", "2 porcje", 3, "dish", 0, 0],
      ["makaron-ryzowy", "Makaron ryżowy", "1 pudełko", 3, "dish", 0, 0],
      ["sos-pom", "Sos pomidorowy", "1 wiaderko", 3, "sauce", 0, 0],
      ["pieczeniowy", "Sos pieczeniowy", "pół dużego wiaderka", 3, "sauce", 0, 0],
      ["jogurtowy", "Sos jogurtowy", "1/3 wiaderka", 3, "sauce", 0, 0],
      ["krem-soczewica", "Krem z czerwonej soczewicy", "pół wiaderka", 4, "soup", 0, 0],
      ["wywar-bitka", "Wywar z bitki z karkówki", "1 wiaderko", 4, "soup", 0, 0],
      ["ryz", "Ryż", "1 wiaderko + 1 mały pojemnik", 4, "dish", 0, 0],
      ["sos-grzybowy", "Sos grzybowy", "pół małego wiaderka", 4, "sauce", 1, 0],
      ["kompot", "Owoce do kompotu", "1 wiaderko", 4, "fruit", 0, 0],
      ["bolognese", "Bolognese", "1 duże wiaderko", 5, "sauce", 0, 1],
      ["kapusniak", "Zupa kapuśniak", "pół dużego wiaderka", 5, "soup", 0, 0],
    ],
  },
  {
    // Dopiski do listy z 09.11 (nie zmieniają reszty).
    id: "2026-11-09-dodatki-1",
    adds: [
      ["kopytka", "Kopytka", "1 wiadro", 3, "dish", 0, 0],
      ["pulpety-wolowe", "Pulpety wołowe", "1 małe wiaderko", 5, "meat", 0, 0],
      ["kaczka", "Kaczka", "1 porcja", 3, "meat", 0, 0],
    ],
  },
  {
    // Dopiski z 10.11 (dyktowane) + przeniesienie owoców do kompotu na półkę 2.
    id: "2026-11-10-dodatki-2",
    adds: [
      ["golabki", "Gołąbki", "2 pudełka", 3, "meat", 0, 0],
      ["kotlety-mielone", "Kotlety mielone", "2 pudełka", 3, "meat", 0, 0],
      ["gryczana", "Kasza gryczana", "1 pudełko", 3, "dish", 0, 0],
      ["gulasz", "Gulasz węgierski", "1 wiaderko", 4, "meat", 0, 0],
      ["kotlety-wege", "Kotlety wege", "2 porcje", 4, "dish", 0, 0],
      ["klopsiki", "Klopsiki", "1 wiadro (6 porcji)", 5, "meat", 0, 0],
      ["zupa-pomidorowa", "Zupa pomidorowa", "1 wiadro", 5, "soup", 0, 0],
      ["krem-dyniowy", "Krem dyniowy", "1 wiadro", 5, "soup", 0, 0],
      ["potrawka-ragu", "Potrawka ragu", "pół wiaderka", 5, "meat", 0, 0],
      ["wodorosty", "Wodorosty", "2 porcje", 2, "dish", 0, 0],
      ["sos-pom-2", "Sos pomidorowy", "2 porcje", 2, "sauce", 0, 0],
      ["pieczeniowy-2", "Sos pieczeniowy", "2 porcje", 2, "sauce", 0, 0],
      ["majonez", "Majonez", "", 2, "sauce", 0, 0],
    ],
    moves: [["kompot", 2]],
  },
  {
    // Typy: pierogi, krokiety, naleśniki i kotlety wege to dania (nie dodatki).
    id: "2026-11-12-typy",
    cats: [
      ["pierogi-ruskie", "main"],
      ["krokiety", "main"],
      ["nalesniki", "main"],
      ["kotlety-wege", "main"],
    ],
  },
  {
    // Nowy tydzień: lista z 13.11.2026 (dyktowana), zastępuje wszystkie pozycje.
    // Ósme pole = lodówka cateringowa (Magazyn, specjalny kolor i podpis).
    id: "2026-11-13-lista",
    date: "13.11.2026",
    replace: [
      ["golabki-leniwe", "Gołąbki leniwe", "1 pudełko", 1, "meat", 0, 0, 0],
      ["kotlety-mielone", "Kotlety mielone", "7 porcji", 2, "meat", 1, 0, 0],
      ["golabki-odwrocone", "Gołąbki odwrócone", "1 pudełko", 2, "meat", 1, 0, 0],
      ["ryz", "Ryż", "1 pudełko", 2, "dish", 1, 0, 0],
      ["filet", "Filet grillowany", "2 porcje", 2, "meat", 0, 0, 0],
      ["sos-koperkowy", "Sos koperkowy", "4 porcje", 2, "sauce", 0, 0, 0],
      ["sos-koperkowy-2", "Sos koperkowy", "pół wiaderka", 2, "sauce", 0, 0, 0],
      ["marchewka-groszek", "Marchewka z groszkiem", "3 porcje", 2, "dish", 0, 0, 0],
      ["watrobka", "Wątróbka", "4 porcje", 2, "meat", 0, 0, 0],
      ["palki", "Pieczone pałki", "", 2, "meat", 0, 0, 0],
      ["nogi", "Pieczone nogi", "3 sztuki", 2, "meat", 0, 0, 0],
      ["owoce-kompot", "Owoce do kompotu", "", 2, "fruit", 0, 0, 0],
      ["wywar-bitka", "Wywar z bitki", "1 wiaderko", 3, "soup", 0, 0, 0],
      ["grana-padano", "Ser grana padano", "", 3, "dish", 0, 0, 0],
      ["makaron", "Makaron", "", 3, "dish", 1, 0, 0],
      ["lasagna", "Lasagna", "4 porcje", 3, "main", 1, 0, 0],
      ["lasagna-wege", "Lasagna wege", "1 pudełko", 3, "main", 1, 0, 0],
      ["bulgur", "Kasza bułgur", "1 pudełko", 3, "dish", 1, 0, 0],
      ["szpinak", "Szpinak", "1 wiaderko", 3, "dish", 0, 0, 0],
      ["gulasz-2", "Gulasz węgierski", "1/3 wiaderka", 4, "meat", 1, 0, 0],
      ["zoladki-drobiowe", "Żołądki drobiowe", "3 porcje", 4, "meat", 1, 0, 0],
      ["sos-pieczeniowy", "Sos pieczeniowy", "pół dużego wiaderka", 4, "sauce", 0, 0, 0],
      ["placki-ziemniaczane", "Placki ziemniaczane", "3–4 porcje", 4, "main", 0, 0, 0],
      ["gryczana", "Kasza gryczana", "1 pudełko", 4, "dish", 0, 0, 0],
      ["krem-dyniowy", "Krem dyniowy", "1 porcja", 4, "soup", 0, 0, 0],
      ["klopsiki", "Klopsiki drobiowo-cukiniowe", "4 porcje", 5, "meat", 1, 0, 0],
      ["bolognese", "Bolognese", "1 wiaderko", 5, "sauce", 1, 0, 0],
      ["gulasz", "Gulasz węgierski", "1 wiaderko", 5, "meat", 1, 0, 0],
      ["wywar-bitka-2", "Wywar z bitki", "", 5, "soup", 1, 0, 0],
      ["zurek", "Żurek", "1 wiaderko", 5, "soup", 0, 0, 0],
      ["krem-soczewica", "Krem z czerwonej soczewicy", "1/3 wiaderka", 5, "soup", 0, 0, 0],
      ["sos-grzybowy", "Sos grzybowy", "1/4 wiaderka", 5, "sauce", 0, 0, 0],
      ["ryba-sum", "Ryba sum", "1 pudełko, dużo porcji", 5, "meat", 0, 0, 0],
      ["bitki-catering", "Bitki", "8 porcji", 7, "meat", 0, 0, 1],
      ["zoladki-kacze", "Żołądki kacze", "5–6 porcji", 7, "meat", 0, 0, 1],
    ],
  },
  {
    id: "2026-11-16-lista",
    date: "16.11.2026",
    replace: [
      ["wodorosty", "Wodorosty", "1 wiaderko", 2, "dish", 1, 0, 0],
      ["sos-bialy", "Sos biały", "1 wiaderko", 2, "sauce", 1, 0, 0],
      ["szpinak", "Szpinak (z soboty)", "1 wiaderko", 2, "dish", 1, 0, 0],
      ["makaron-2", "Makaron", "2 porcje", 2, "dish", 0, 0, 0],
      ["sos-pieczeniowy", "Sos pieczeniowy (stary)", "małe wiaderko", 2, "sauce", 1, 0, 0],
      ["sos-koperkowy", "Sos koperkowy (stary)", "małe wiaderko", 2, "sauce", 1, 0, 0],
      ["bulgur", "Kasza bułgur", "2 porcje", 2, "dish", 0, 0, 0],
      ["sos-curry", "Sos curry", "", 2, "sauce", 0, 0, 0],
      ["sos-grzybowy", "Sos grzybowy", "2 porcje", 2, "sauce", 0, 0, 0],
      ["gryczana", "Kasza gryczana", "1 pudełko (mało)", 3, "dish", 0, 0, 0],
      ["makaron-3", "Makaron", "1 pudełko", 3, "dish", 0, 0, 0],
      ["kotlety-wege", "Kotlety wege", "4 porcje", 3, "main", 0, 0, 0],
      ["golabki", "Gołąbki", "3 porcje", 3, "meat", 0, 0, 0],
      ["bitki", "Bitki", "4 porcje", 3, "meat", 0, 0, 0],
      ["wywar-1", "Wywar", "", 4, "soup", 1, 0, 0],
      ["wywar-2", "Wywar", "", 4, "soup", 1, 0, 0],
      ["ryz", "Ryż", "mało", 4, "dish", 0, 0, 0],
      ["bolognese", "Bolognese", "1 wiaderko", 5, "sauce", 0, 0, 0],
      ["krem-dyniowy", "Krem dyniowy", "2 wiadra", 5, "soup", 0, 0, 0],
      ["smalec", "Smalec", "1 wiaderko", 5, "sauce", 0, 0, 0],
      ["zupa-pomidorowa", "Zupa pomidorowa", "duże wiadro", 5, "soup", 0, 0, 0],
    ],
  },
  {
    id: "2026-11-16-makarony",
    adds: [
      ["makaron-carbonara", "Makaron carbonara", "1 porcja", 3, "main", 0, 0, 0],
      ["makaron-do-zupy", "Makaron do zupy pomidorowej", "4 porcje", 3, "dish", 0, 0, 0],
    ],
  },
  {
    id: "2026-11-16-poprawki",
    sets: [["bulgur", { qty: "1 pudełko (7–8 porcji)", shelf: 3, today: false }]],
    adds: [
      ["golabki-2", "Gołąbki", "1 porcja", 3, "meat", 0, 0, 0],
      ["zupa-chinska", "Zupa chińska", "", 2, "soup", 1, 1, 0],
    ],
  },
  {
    id: "2026-11-18-lista",
    date: "18.11.2026",
    replace: [
      ["sos-winegret", "Sos winegret", "małe wiaderko", 2, "sauce", 0, 0, 0],
      ["sos-grzybowy", "Sos grzybowy", "2 wiaderka", 2, "sauce", 0, 0, 0],
      ["sos-pieczeniowy", "Sos pieczeniowy", "1 wiaderko", 2, "sauce", 0, 0, 0],
      ["gulasz", "Gulasz węgierski", "1 porcja", 2, "meat", 0, 0, 0],
      ["golabki", "Gołąbki", "2 pudełka (dużo)", 2, "meat", 0, 0, 0],
      ["sos-pomidorowy", "Sos pomidorowy", "1 wiaderko", 2, "sauce", 0, 0, 0],
      ["sos-koperkowy", "Sos koperkowy", "pół dużego wiaderka", 2, "sauce", 0, 0, 0],
      ["nalesniki", "Naleśniki", "dużo", 2, "main", 0, 0, 0],
      ["owoce-kompot", "Owoce do kompotu", "", 2, "fruit", 0, 0, 0],
      ["filet", "Filet grillowany", "1 pudełko", 3, "meat", 0, 0, 0],
      ["pulpeciki", "Pulpeciki w sosie pomidorowym", "1 pudełko", 3, "meat", 0, 0, 0],
      ["kotlety-wege-ziemn", "Kotlety wege ziemniaczane", "5 porcji", 3, "main", 0, 0, 0],
      ["bulgur", "Kasza bułgur", "1 pudełko", 3, "dish", 0, 0, 0],
      ["swiderki", "Makaron świderki", "1 pudełko", 3, "dish", 0, 0, 0],
      ["gryczana", "Kasza gryczana", "pół pudełka", 3, "dish", 0, 0, 0],
      ["ryz", "Ryż", "1 pudełko", 3, "dish", 0, 0, 0],
      ["bitki", "Bitki z karkówki", "4 porcje", 4, "meat", 0, 0, 0],
      ["zupa-jarzynowa", "Zupa jarzynowa", "1 duże wiaderko", 4, "soup", 0, 0, 0],
      ["krem-kalafior", "Krem z kalafiora (ostry)", "pół wiaderka", 4, "soup", 0, 0, 0],
      ["bolognese", "Bolognese", "1 duże wiadro", 4, "sauce", 0, 0, 0],
      ["bolognese-2", "Bolognese", "1 małe wiaderko", 4, "sauce", 0, 0, 0],
      ["klopsiki", "Klopsiki", "5 porcji", 5, "meat", 0, 0, 0],
      ["kotlety-wege-stare", "Kotlety wege (starsze)", "2 porcje", 5, "main", 1, 0, 0],
      ["ryba", "Ryba", "", 5, "meat", 1, 0, 0],
      ["ryz-2", "Ryż", "1 pudełko", 5, "dish", 0, 0, 0],
    ],
  },
  {
    id: "2026-11-19-lista",
    date: "19.11.2026",
    replace: [
      ["sos-pieczeniowy", "Sos pieczeniowy", "małe wiaderko", 2, "sauce", 0, 0, 0],
      ["sos-koperkowy", "Sos koperkowy", "małe wiaderko", 2, "sauce", 0, 0, 0],
      ["sos-winegret", "Sos winegret", "małe wiaderko", 2, "sauce", 0, 0, 0],
      ["sos-pomidorowy", "Sos pomidorowy", "duże wiaderko", 2, "sauce", 0, 0, 0],
      ["sos-grzybowy", "Sos grzybowy", "małe wiaderko", 2, "sauce", 0, 0, 0],
      ["sos-indyjski", "Sos indyjski", "pół wiaderka", 2, "sauce", 0, 0, 0],
      ["butter-chicken", "Butter chicken", "", 2, "meat", 0, 0, 0],
      ["kurczak-wege", "Wegetariański kurczak", "1 pudełko", 2, "dish", 0, 0, 0],
      ["ciecierzyca", "Pieczona ciecierzyca do zupy", "1 pojemnik", 2, "dish", 0, 0, 0],
      ["kotlety-mielone", "Kotlety mielone", "4 porcje", 2, "meat", 0, 0, 0],
      ["bitki-2", "Bitki", "2 porcje", 2, "meat", 0, 0, 0],
      ["owoce-kompot", "Owoce do kompotu", "", 3, "fruit", 0, 0, 0],
      ["pierogi-ruskie", "Pierogi ruskie", "1 pudełko", 3, "main", 0, 0, 0],
      ["pierogi-mieso", "Pierogi mięsne", "1 pudełko", 3, "main", 0, 0, 0],
      ["pierogi-kaczka", "Pierogi z kaczki", "1 pudełko", 3, "main", 0, 0, 0],
      ["bitki-1", "Bitki", "1 porcja", 3, "meat", 0, 0, 0],
      ["golabki", "Gołąbki", "2 pudełka (duże + mniejsze)", 3, "meat", 0, 0, 0],
      ["ryz", "Ryż", "2 pudełka", 3, "dish", 0, 0, 0],
      ["kalafior", "Kalafior do zupy", "1 pudełko", 3, "dish", 0, 0, 0],
      ["barszcz-1", "Barszcz", "duże wiadro", 4, "soup", 0, 0, 0],
      ["barszcz-2", "Barszcz", "mniejsze wiaderko", 4, "soup", 0, 0, 0],
      ["zupa-wege-ind", "Zupa wege indyjska", "1 wiadro", 4, "soup", 0, 0, 0],
      ["zupa-mieso-ind", "Zupa mięsna indyjska", "1 wiadro", 4, "soup", 0, 0, 0],
      ["bulgur", "Kasza bułgur", "3 porcje", 4, "dish", 0, 0, 0],
      ["bitki-4", "Bitki", "dużo", 4, "meat", 0, 0, 0],
      ["krem-dyniowy", "Krem dyniowy", "2 wiaderka", 5, "soup", 0, 0, 0],
      ["zupa-jarzynowa", "Zupa jarzynowa (dla dziewczyn)", "1 wiadro, nie ruszać", 5, "soup", 0, 0, 0],
      ["ryz-wiadro", "Ryż", "wiadro", 5, "dish", 0, 0, 0],
      ["pulpety-pom", "Pulpety w sosie pomidorowym", "", 5, "meat", 1, 0, 0],
      ["kotlety-wege", "Kotlety wege", "3 porcje", 5, "main", 1, 0, 0],
    ],
  },
  {
    id: "2026-11-23-lista",
    date: "23.11.2026",
    replace: [
      ["ryz-bemar", "Ryż", "1 bemar", 1, "dish", 0, 0, 0],
      ["sos-jogurtowy", "Sos jogurtowy", "", 1, "sauce", 0, 0, 0],
      ["sos-pomidorowy", "Sos pomidorowy", "duże wiaderko", 2, "sauce", 0, 0, 0],
      ["sos-koperkowy", "Sos koperkowy", "pół wiaderka", 2, "sauce", 0, 0, 0],
      ["ravioli", "Ravioli", "1 porcja", 2, "main", 0, 0, 0],
      ["sos-pieczeniowy", "Sos pieczeniowy", "1 duże wiaderko", 2, "sauce", 0, 0, 0],
      ["sos-winegret", "Sos winegret (stary z 12.11)", "pół wiaderka", 2, "sauce", 0, 0, 0],
      ["sos-winegret-2", "Sos winegret", "malutkie pudełeczko", 2, "sauce", 0, 0, 0],
      ["mielone", "Mielone", "6 porcji", 2, "meat", 1, 1, 0],
      ["filet-2", "Filet grillowany", "1 mała porcja", 2, "meat", 0, 0, 0],
      ["gryczana-2", "Kasza gryczana", "malutkie pudełko (prawie 1 porcja)", 2, "dish", 0, 0, 0],
      ["czosnek", "Czosnek", "", 2, "dish", 0, 0, 0],
      ["gryczana", "Kasza gryczana", "", 3, "dish", 1, 1, 0],
      ["golabki", "Gołąbki", "1 pudełko", 3, "meat", 0, 0, 0],
      ["filet", "Filet grillowany", "5 porcji", 3, "meat", 0, 0, 0],
      ["ryz", "Ryż", "1 pudełko", 3, "dish", 0, 0, 0],
      ["cebulka", "Smażona cebulka", "1 wiaderko", 3, "dish", 0, 0, 0],
      ["makaron", "Makaron", "1 porcja", 3, "dish", 0, 0, 0],
      ["sos-serowy", "Sos serowy", "1 porcja", 3, "sauce", 0, 0, 0],
      ["bulgur", "Kasza bułgur", "1 porcja", 3, "dish", 0, 0, 0],
      ["ziemniaki", "Ziemniaki", "", 3, "dish", 0, 0, 0],
      ["golabki-prozn", "Gołąbki (próżnia)", "5 porcji", 4, "meat", 0, 0, 0],
      ["klopsiki-1", "Klopsiki (do sprawdzenia)", "wiaderko", 4, "meat", 0, 0, 0],
      ["klopsiki-2", "Klopsiki (do sprawdzenia)", "wiaderko", 4, "meat", 0, 0, 0],
      ["gulasz", "Gulasz węgierski", "", 4, "meat", 1, 1, 0],
      ["wywar-4", "Wywar", "duże wiadro", 4, "soup", 0, 0, 0],
      ["bolognese", "Bolognese", "2 porcje", 4, "sauce", 0, 1, 0],
      ["wywar-5", "Wywar", "duże wiadro", 5, "soup", 0, 0, 0],
      ["zupa-brokulowa", "Zupa brokułowa", "1 wiadro", 5, "soup", 0, 0, 0],
      ["makaron-wiaderko", "Makaron z wiaderka", "1 pojemnik", 5, "dish", 0, 0, 0],
      ["krem-ziemn-por", "Krem ziemniaczano-porowy", "4 porcje", 5, "soup", 0, 0, 0],
    ],
  },
];

function applyBatches(s) {
  if (!Array.isArray(s.applied)) s.applied = [];
  let changed = false;
  for (const b of BATCHES) {
    if (s.applied.includes(b.id)) continue;
    if (b.replace) {
      s.items = b.replace.map((r, i) => ({
        id: r[0], name: r[1], qty: r[2], shelf: r[3], cat: r[4],
        thaw: r[6] === 1, nodate: false, cart: false, today: r[5] === 1, catering: r[7] === 1, ord: i + 1,
      }));
    }
    for (const [id, cat] of b.cats || []) {
      const it = s.items.find((x) => x.id === id);
      if (it) it.cat = cat;
    }
    for (const [id, shelf] of b.moves || []) {
      const it = s.items.find((x) => x.id === id);
      if (it) it.shelf = shelf;
    }
    for (const r of b.adds || []) {
      if (s.items.some((x) => x.id === r[0])) continue;
      const ord = Math.max(0, ...s.items.map((x) => x.ord || 0)) + 1;
      s.items.push({ id: r[0], name: r[1], qty: r[2], shelf: r[3], cat: r[4], thaw: r[6] === 1, nodate: false, cart: false, today: r[5] === 1, ord });
    }
    for (const [id, name, cat] of b.items || []) {
      if (s.items.some((x) => x.id === id)) continue;
      const ord = Math.max(0, ...s.items.map((x) => x.ord || 0)) + 1;
      s.items.push({ id, name, qty: "", shelf: MAG, cat, thaw: false, nodate: false, cart: false, today: false, ord });
    }
    for (const [id, from, to] of b.renames || []) {
      const it = s.items.find((x) => x.id === id);
      if (it && it.name === from) it.name = to;
    }
    for (const [id, patch] of b.sets || []) {
      const it = s.items.find((x) => x.id === id);
      if (it) Object.assign(it, patch);
    }
    if (b.date) s.date = b.date;
    s.applied.push(b.id);
    changed = true;
  }
  return changed;
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

function roleOf() {
  return "admin";
}

function slug(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "pozycja";
}

function clean(raw, i) {
  if (!raw || typeof raw !== "object" || typeof raw.name !== "string" || !raw.name.trim()) return null;
  const shelf = validShelf(raw.shelf) ? raw.shelf : 0;
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? slug(raw.id) : slug(raw.name),
    name: raw.name.trim().slice(0, 80),
    qty: typeof raw.qty === "string" ? raw.qty.trim().slice(0, 80) : "",
    shelf,
    cat: CATS.includes(raw.cat) ? raw.cat : "dish",
    thaw: raw.thaw === true,
    nodate: raw.nodate === true,
    cart: false,
    today: raw.today === true,
    ord: i + 1,
  };
}

async function load(store) {
  let s = await store.get("state", { type: "json", consistency: "strong" });
  let changed = false;
  if (!s) {
    s = { date: SEED_DATE, items: SEED.map((x) => ({ ...x })), applied: [] };
    changed = true;
  }
  if (applyBatches(s)) changed = true;
  if (changed) await store.setJSON("state", s);
  return s;
}

export default async (req) => {
  const role = roleOf(req);
  if (!role) return json({ error: "auth" }, 401);
  const store = getStore({ name: "fridge", consistency: "strong" });

  if (req.method === "GET") {
    const s = await load(store);
    return json({ role, date: s.date || "", items: s.items });
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let b;
  try { b = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const s = await load(store);

  if (b.action === "update") {
    const it = s.items.find((x) => x.id === b.id);
    if (!it) return json({ error: "missing" }, 404);
    const p = b.patch && typeof b.patch === "object" ? b.patch : {};
    if (typeof p.name === "string" && p.name.trim()) it.name = p.name.trim().slice(0, 80);
    if (typeof p.qty === "string") it.qty = p.qty.trim().slice(0, 80);
    if (CATS.includes(p.cat)) it.cat = p.cat;
    if (typeof p.catering === "boolean") it.catering = p.catering;
    if (validShelf(p.shelf)) it.shelf = p.shelf;
    if (typeof p.cart === "boolean") it.cart = p.cart;
    if (typeof p.today === "boolean") it.today = p.today;
    await store.setJSON("state", s);
    return json({ ok: true });
  }

  if (b.action === "add") {
    const name = typeof b.name === "string" ? b.name.trim().slice(0, 80) : "";
    if (!name) return json({ error: "bad_name" }, 400);
    let id = slug(name);
    while (s.items.some((x) => x.id === id)) id = slug(name) + "-" + Math.random().toString(36).slice(2, 6);
    const item = {
      id, name,
      qty: typeof b.qty === "string" ? b.qty.trim().slice(0, 80) : "",
      shelf: MAG,
      cat: CATS.includes(b.cat) ? b.cat : "dish",
      thaw: false, nodate: false, cart: false, today: false,
      ord: Math.max(0, ...s.items.map((x) => x.ord || 0)) + 1,
    };
    s.items.push(item);
    await store.setJSON("state", s);
    return json({ ok: true, item });
  }

  if (b.action === "purge") {
    const ids = Array.isArray(b.ids) ? b.ids.filter((x) => typeof x === "string") : [];
    const before = s.items.length;
    s.items = s.items.filter((x) => !(x.cart && ids.includes(x.id)));
    await store.setJSON("state", s);
    return json({ ok: true, removed: before - s.items.length });
  }

  if (role !== "admin") return json({ error: "forbidden" }, 403);

  if (b.action === "import") {
    if (!Array.isArray(b.items) || b.items.length > 300) return json({ error: "bad_items" }, 400);
    const incoming = b.items.map(clean);
    if (incoming.some((x) => x === null)) return json({ error: "bad_items" }, 400);
    if (b.mode === "replace") {
      s.items = incoming;
    } else {
      for (const n of incoming) {
        const k = s.items.findIndex((x) => x.id === n.id);
        if (k >= 0) s.items[k] = { ...n, ord: s.items[k].ord }; else s.items.push(n);
      }
      s.items.forEach((x, i) => { x.ord = i + 1; });
    }
    if (typeof b.date === "string") s.date = b.date.slice(0, 20);
    await store.setJSON("state", s);
    return json({ ok: true, count: s.items.length });
  }

  if (b.action === "clear") {
    // Odświeżenie czyści lodówkę i magazyn. Zamrażarka (półki 11–17) zostaje.
    s.items = s.items.filter((x) => x.shelf >= 11).map((x) => ({ ...x, cart: false, today: false }));
    s.date = "";
    await store.setJSON("state", s);
    return json({ ok: true });
  }

  return json({ error: "unknown_action" }, 400);
};

export const config = { path: "/api/fridge" };
