"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, CircleHelp, Flame, LockKeyhole, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Puzzle = {
  answer: string;
  aliases?: string[];
  category: string;
  clues: [string, string, string, string, string];
  fact: string;
};

type Attempt = { value: string; clue: number; skipped?: boolean };
type SavedGame = {
  clueIndex: number;
  attempts: Attempt[];
  status: "playing" | "won" | "lost";
};
type Stats = {
  played: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayed: string;
};

const PUZZLES: Puzzle[] = [
  {
    answer: "Eiffel Tower",
    aliases: ["the eiffel tower"],
    category: "Landmark",
    clues: [
      "I share my name with an engineer whose company designed me.",
      "I was completed for a world fair in 1889.",
      "For decades, I was the tallest human-made structure on Earth.",
      "I am an iron landmark beside the River Seine.",
      "I am the famous tower that defines the Paris skyline.",
    ],
    fact: "The Eiffel Tower was intended to stand for only 20 years, but its usefulness for radio communication helped save it.",
  },
  {
    answer: "Antarctica",
    category: "Geography",
    clues: [
      "I contain most of the world's fresh water in frozen form.",
      "I am technically the world's largest desert.",
      "No country owns all of me, and I have no permanent citizens.",
      "Penguins live here, but polar bears do not.",
      "I am the icy continent surrounding the South Pole.",
    ],
    fact: "Antarctica is classed as a desert because it receives very little precipitation.",
  },
  {
    answer: "Wolfgang Amadeus Mozart",
    aliases: ["mozart", "wolfgang mozart"],
    category: "Music",
    clues: [
      "My catalogue is traditionally identified with the letter K.",
      "I toured European royal courts as a child prodigy.",
      "I was born in Salzburg in 1756.",
      "I composed The Magic Flute and Eine kleine Nachtmusik.",
      "My surname is Mozart.",
    ],
    fact: "Mozart began composing as a child and produced more than 600 works during his short life.",
  },
  {
    answer: "Pacific Ocean",
    aliases: ["the pacific", "pacific"],
    category: "Geography",
    clues: [
      "My name was given by Ferdinand Magellan after calm sailing conditions.",
      "I contain the Mariana Trench.",
      "The International Date Line largely runs through me.",
      "I separate Asia and Australia from the Americas.",
      "I am the largest ocean on Earth.",
    ],
    fact: "The Pacific Ocean covers more area than all of Earth's land combined.",
  },
  {
    answer: "Mount Everest",
    aliases: ["everest", "mt everest"],
    category: "Nature",
    clues: [
      "In Tibetan, I am known as Chomolungma.",
      "Edmund Hillary and Tenzing Norgay reached my summit in 1953.",
      "I sit on the border between Nepal and China.",
      "I am part of the Himalayas.",
      "I am Earth's highest mountain above sea level.",
    ],
    fact: "Mount Everest continues to rise by a few millimetres each year as tectonic plates push together.",
  },
  {
    answer: "Mars",
    aliases: ["the planet mars"],
    category: "Space",
    clues: [
      "My moons are named Phobos and Deimos.",
      "Olympus Mons, the Solar System's largest volcano, is on me.",
      "Robotic rovers including Curiosity and Perseverance explore me.",
      "Iron minerals give my surface its distinctive colour.",
      "I am known as the Red Planet.",
    ],
    fact: "A day on Mars is only about 40 minutes longer than a day on Earth.",
  },
  {
    answer: "Leonardo da Vinci",
    aliases: ["da vinci", "leonardo"],
    category: "History",
    clues: [
      "My notebooks contain mirror writing and designs for flying machines.",
      "I was born near Vinci in Tuscany in 1452.",
      "I studied anatomy as well as art and engineering.",
      "I painted The Last Supper.",
      "I painted the Mona Lisa.",
    ],
    fact: "Leonardo filled thousands of notebook pages with observations, sketches and inventions.",
  },
  {
    answer: "New Zealand",
    aliases: ["aotearoa", "nz", "aotearoa new zealand"],
    category: "Countries",
    clues: [
      "I was the first self-governing country to give women the parliamentary vote.",
      "My indigenous language is te reo Māori.",
      "My largest city is Auckland, but it is not my capital.",
      "My national rugby team is the All Blacks.",
      "I am the Pacific nation also called Aotearoa.",
    ],
    fact: "New Zealand introduced women's suffrage in 1893.",
  },
  {
    answer: "Great Wall of China",
    aliases: ["the great wall", "great wall", "the great wall of china"],
    category: "Landmark",
    clues: [
      "I am a network of structures built by several dynasties, not one continuous wall.",
      "Large surviving sections were constructed during the Ming dynasty.",
      "Watchtowers and signal stations are part of my defences.",
      "I stretch across northern China.",
      "I am China's most famous wall.",
    ],
    fact: "The Great Wall is made up of many walls, trenches and natural barriers built across centuries.",
  },
  {
    answer: "Nile River",
    aliases: ["the nile", "nile", "river nile"],
    category: "Geography",
    clues: [
      "My two major tributaries are called the White and Blue.",
      "My annual flooding helped sustain an ancient civilisation.",
      "I flow northward before reaching a large delta.",
      "I pass through Egypt and enter the Mediterranean Sea.",
      "I am the famous African river associated with the pharaohs.",
    ],
    fact: "The Blue Nile and White Nile meet at Khartoum in Sudan.",
  },
  {
    answer: "William Shakespeare",
    aliases: ["shakespeare"],
    category: "Literature",
    clues: [
      "A collection of my works was published as the First Folio in 1623.",
      "I was a shareholder in the Lord Chamberlain's Men.",
      "I was born in Stratford-upon-Avon.",
      "I wrote Macbeth, Hamlet and A Midsummer Night's Dream.",
      "I am often called the Bard of Avon.",
    ],
    fact: "The First Folio preserved 36 of Shakespeare's plays, including many that might otherwise have been lost.",
  },
  {
    answer: "Honey",
    category: "Food",
    clues: [
      "My low moisture and acidity make it difficult for microbes to grow in me.",
      "My flavour changes depending on the flowers used to make me.",
      "I can naturally crystallise without spoiling.",
      "Bees store me in wax cells.",
      "I am the golden sweetener made from nectar.",
    ],
    fact: "Properly sealed honey can remain edible for an extraordinarily long time.",
  },
  {
    answer: "Saturn",
    category: "Space",
    clues: [
      "My moon Titan has a thick atmosphere and lakes of liquid hydrocarbons.",
      "I am less dense overall than water.",
      "I am the sixth planet from the Sun.",
      "I am a gas giant named for a Roman god.",
      "I am famous for my spectacular rings.",
    ],
    fact: "Saturn's rings are made mainly of countless pieces of ice and rock.",
  },
  {
    answer: "Tokyo",
    category: "Cities",
    clues: [
      "I was known as Edo until 1868.",
      "My rail network includes the busy Yamanote loop line.",
      "I hosted the Summer Olympics twice.",
      "I sit on the island of Honshu.",
      "I am the capital of Japan.",
    ],
    fact: "Tokyo became Japan's imperial capital when Edo was renamed in 1868.",
  },
  {
    answer: "Albert Einstein",
    aliases: ["einstein"],
    category: "Science",
    clues: [
      "I received a Nobel Prize for explaining the photoelectric effect.",
      "I worked in a Swiss patent office early in my career.",
      "My 1905 papers transformed modern physics.",
      "I developed the theories of relativity.",
      "The equation E = mc² is associated with me.",
    ],
    fact: "Einstein's Nobel Prize recognised the photoelectric effect, not relativity.",
  },
  {
    answer: "Great Barrier Reef",
    aliases: ["the great barrier reef"],
    category: "Nature",
    clues: [
      "I am made up of thousands of individual reefs and hundreds of islands.",
      "I can be found in the Coral Sea.",
      "Coral bleaching is one of my major environmental threats.",
      "I run along the coast of Queensland.",
      "I am the world's largest coral reef system.",
    ],
    fact: "The Great Barrier Reef stretches for more than 2,000 kilometres.",
  },
  {
    answer: "Chess",
    category: "Games",
    clues: [
      "My modern form developed from earlier games including chaturanga.",
      "A special move allows a king and rook to move together.",
      "Each player begins with sixteen pieces.",
      "My goal is to checkmate the opposing king.",
      "I am played on a board of 64 alternating squares.",
    ],
    fact: "The number of possible chess games is vastly greater than the estimated number of atoms in the observable universe.",
  },
  {
    answer: "Amazon River",
    aliases: ["the amazon", "amazon", "river amazon"],
    category: "Geography",
    clues: [
      "My mouth forms a vast estuary on the Atlantic coast.",
      "I discharge more water than any other river.",
      "Pink river dolphins live in my basin.",
      "I flow through the world's largest tropical rainforest.",
      "I am South America's mightiest river.",
    ],
    fact: "The Amazon carries more water than the next several largest rivers combined.",
  },
  {
    answer: "Moon",
    aliases: ["the moon", "earths moon", "earth's moon"],
    category: "Space",
    clues: [
      "I am tidally locked, so one side continually faces my partner.",
      "My gravity helps drive ocean tides.",
      "Humans first walked on me in 1969.",
      "I orbit Earth about once every 27 days.",
      "I am Earth's only natural satellite.",
    ],
    fact: "The Moon is slowly moving away from Earth by a few centimetres each year.",
  },
  {
    answer: "Olympic Games",
    aliases: ["olympics", "the olympics", "the olympic games"],
    category: "Sport",
    clues: [
      "My modern revival began in Athens in 1896.",
      "My motto includes the Latin words Citius, Altius, Fortius.",
      "Five interlocking rings are my symbol.",
      "I have separate summer and winter editions.",
      "I am the world's best-known international multi-sport event.",
    ],
    fact: "The five Olympic rings first appeared publicly in the early twentieth century.",
  },
  {
    answer: "Penguin",
    aliases: ["penguins"],
    category: "Animals",
    clues: [
      "All of my wild species live naturally in the Southern Hemisphere.",
      "My bones are denser than those of many flying birds.",
      "I use my wings as flippers underwater.",
      "The emperor is my largest living species.",
      "I am the black-and-white bird that cannot fly.",
    ],
    fact: "Penguins are excellent swimmers and effectively 'fly' through water.",
  },
  {
    answer: "Piano",
    category: "Music",
    clues: [
      "My early name meant soft and loud in Italian.",
      "Felt-covered hammers strike my strings.",
      "A standard modern version of me has 88 keys.",
      "I can be grand or upright.",
      "I am a keyboard instrument used in classical music and jazz.",
    ],
    fact: "The piano's full early name, pianoforte, refers to its ability to play both softly and loudly.",
  },
  {
    answer: "Sahara Desert",
    aliases: ["sahara", "the sahara", "the sahara desert"],
    category: "Geography",
    clues: [
      "My landscape includes far more gravel plains than many people imagine.",
      "I periodically shift between greener and drier conditions over thousands of years.",
      "I stretch across much of North Africa.",
      "I am the largest hot desert in the world.",
      "My name is Sahara.",
    ],
    fact: "Only a portion of the Sahara is covered by the towering sand dunes seen in films.",
  },
  {
    answer: "Internet",
    aliases: ["the internet"],
    category: "Technology",
    clues: [
      "TCP/IP became my standard networking protocol suite in 1983.",
      "I grew from networks including ARPANET.",
      "The World Wide Web is one service that runs on me.",
      "I connect billions of devices around the globe.",
      "You are using me to play this online game.",
    ],
    fact: "The internet and the World Wide Web are not the same thing: the web is one system that uses the internet.",
  },
  {
    answer: "Rome",
    category: "Cities",
    clues: [
      "A small independent country lies entirely within my boundaries.",
      "Tradition says I was founded by twins raised by a wolf.",
      "The Colosseum and Pantheon stand here.",
      "The River Tiber runs through me.",
      "I am the capital of Italy.",
    ],
    fact: "Vatican City, the world's smallest independent state, sits within Rome.",
  },
  {
    answer: "Blue Whale",
    aliases: ["the blue whale"],
    category: "Animals",
    clues: [
      "My calls can travel enormous distances underwater.",
      "Despite my size, I feed mainly on tiny krill.",
      "My heart is among the largest of any animal.",
      "I am a marine mammal with a blowhole.",
      "I am the largest animal known to have lived.",
    ],
    fact: "A blue whale can be longer than a basketball court.",
  },
  {
    answer: "Maple Syrup",
    category: "Food",
    clues: [
      "I am produced by concentrating sap collected during cool seasonal weather.",
      "Indigenous peoples of northeastern North America made me long before European arrival.",
      "My grades often describe colour and flavour strength.",
      "Canada is especially famous for producing me.",
      "I am a sweet topping commonly poured over pancakes.",
    ],
    fact: "It takes a large quantity of maple sap to produce a much smaller amount of syrup.",
  },
  {
    answer: "Kiwi",
    aliases: ["kiwi bird", "the kiwi", "a kiwi"],
    category: "Animals",
    clues: [
      "My nostrils sit near the end of my long bill.",
      "I have one of the largest eggs relative to body size among birds.",
      "I am nocturnal and cannot fly.",
      "I am native to Aotearoa New Zealand.",
      "I share my name with a fruit and a nickname for New Zealanders.",
    ],
    fact: "Unlike most birds, kiwi rely strongly on smell while searching for food.",
  },
  {
    answer: "Niagara Falls",
    aliases: ["niagara", "the niagara falls"],
    category: "Landmark",
    clues: [
      "I consist of three separate waterfalls.",
      "Large volumes of my water are diverted for hydroelectric power.",
      "I sit between Ontario and New York State.",
      "The Horseshoe is my largest section.",
      "I am the famous waterfall on the Canada–United States border.",
    ],
    fact: "Niagara Falls is a group of three waterfalls rather than a single fall.",
  },
  {
    answer: "Compass",
    category: "Inventions",
    clues: [
      "My earliest forms were developed in ancient China.",
      "I work because a magnet aligns with Earth's magnetic field.",
      "Nearby metal or magnets can make me inaccurate.",
      "Travellers used me for navigation long before GPS.",
      "My needle points toward magnetic north.",
    ],
    fact: "Magnetic north and geographic north are not in exactly the same place.",
  },
  {
    answer: "Grand Canyon",
    aliases: ["the grand canyon"],
    category: "Nature",
    clues: [
      "My exposed rock layers preserve a vast span of geological history.",
      "The Colorado River carved through my landscape.",
      "I lie mainly within a national park in Arizona.",
      "My rims offer dramatically different viewpoints and climates.",
      "I am America's most famous enormous canyon.",
    ],
    fact: "The Grand Canyon is about 446 kilometres long.",
  },
  {
    answer: "Queen",
    aliases: ["queen band", "the band queen"],
    category: "Music",
    clues: [
      "My guitarist built his own instrument with his father.",
      "I performed a celebrated set at Live Aid in 1985.",
      "My members included Freddie Mercury and Brian May.",
      "I recorded We Will Rock You and Another One Bites the Dust.",
      "I am the band behind Bohemian Rhapsody.",
    ],
    fact: "Brian May's famous Red Special guitar was handmade with his father.",
  },
  {
    answer: "Statue of Liberty",
    aliases: ["the statue of liberty", "lady liberty"],
    category: "Landmark",
    clues: [
      "My copper exterior has naturally formed a green patina.",
      "France presented me to the United States.",
      "A broken chain lies near my feet.",
      "I stand on an island in New York Harbor.",
      "I hold a torch above my head.",
    ],
    fact: "The Statue of Liberty's outer copper skin was originally a brownish copper colour.",
  },
  {
    answer: "Volcano",
    aliases: ["a volcano", "volcanoes"],
    category: "Nature",
    clues: [
      "I am commonly found where tectonic plates meet, but I can also form above hotspots.",
      "I may be described as active, dormant or extinct.",
      "Magma becomes lava after it reaches the surface.",
      "I can release ash, rock and gases during an eruption.",
      "I am a mountain or opening that erupts molten rock.",
    ],
    fact: "Many volcanoes lie beneath the ocean, hidden from everyday view.",
  },
  {
    answer: "Mona Lisa",
    aliases: ["the mona lisa", "la gioconda"],
    category: "Art",
    clues: [
      "I am also known in Italian as La Gioconda.",
      "I was stolen from a Paris museum in 1911 and recovered two years later.",
      "I am painted on a poplar wood panel.",
      "Leonardo da Vinci created me.",
      "I am the Louvre's portrait with the mysterious smile.",
    ],
    fact: "The Mona Lisa's theft in 1911 helped make the painting even more famous worldwide.",
  },
  {
    answer: "Kangaroo",
    aliases: ["a kangaroo", "kangaroos"],
    category: "Animals",
    clues: [
      "My efficient hopping stores and releases energy in large tendons.",
      "I belong to a group of mammals called marsupials.",
      "My baby is known as a joey.",
      "I use a powerful tail for balance.",
      "I am the iconic hopping animal of Australia.",
    ],
    fact: "A kangaroo's tail acts almost like an extra leg when it moves slowly.",
  },
  {
    answer: "Pyramids of Giza",
    aliases: ["giza pyramids", "the pyramids", "great pyramids", "pyramids"],
    category: "History",
    clues: [
      "The largest of me was built for a pharaoh named Khufu.",
      "I am the only surviving wonder of the ancient world's traditional seven.",
      "I was constructed from millions of stone blocks.",
      "I stand beside the Great Sphinx in Egypt.",
      "I am the famous group of ancient triangular tombs near Cairo.",
    ],
    fact: "The Great Pyramid remained the world's tallest human-made structure for thousands of years.",
  },
  {
    answer: "Rugby Union",
    aliases: ["rugby", "union", "rugby union football"],
    category: "Sport",
    clues: [
      "My scoring methods include tries, conversions and drop goals.",
      "A scrum restarts play after certain minor infringements.",
      "Each team normally starts with fifteen players.",
      "The ball may be kicked forward but not thrown forward.",
      "The All Blacks are one of my most famous national teams.",
    ],
    fact: "Rugby union and rugby league have different rules and numbers of players.",
  },
  {
    answer: "Rainbow",
    aliases: ["a rainbow", "rainbows"],
    category: "Science",
    clues: [
      "I am actually a full circle, though the ground usually hides part of me.",
      "Refraction, reflection and dispersion all help create me.",
      "A secondary version of me reverses the usual colour order.",
      "I appear when sunlight meets water droplets.",
      "I am the coloured arc often seen after rain.",
    ],
    fact: "From the right viewpoint, such as an aircraft, a rainbow can appear as a complete circle.",
  },
  {
    answer: "Chocolate",
    category: "Food",
    clues: [
      "My source tree's scientific name begins Theobroma, meaning food of the gods.",
      "Mesoamerican cultures consumed early forms of me as a drink.",
      "Tempering helps give me a glossy finish and clean snap.",
      "I am made using beans found inside cacao pods.",
      "I come in dark, milk and white varieties.",
    ],
    fact: "Cacao beans grow inside large pods attached to the trunk and branches of the tree.",
  },
  {
    answer: "Venice",
    category: "Cities",
    clues: [
      "I was once the centre of a powerful maritime republic.",
      "My buildings stand on islands supported by timber foundations.",
      "St Mark's Square is one of my best-known public spaces.",
      "Gondolas travel along my canals.",
      "I am Italy's famous floating city.",
    ],
    fact: "Venice is built across more than 100 small islands in a lagoon.",
  },
  {
    answer: "Octopus",
    aliases: ["an octopus", "octopuses"],
    category: "Animals",
    clues: [
      "Most of my neurons are found outside my central brain.",
      "I have three hearts and blue blood.",
      "I can squeeze through gaps much smaller than my body.",
      "I can release ink to confuse a predator.",
      "I am a sea animal with eight arms.",
    ],
    fact: "An octopus can taste and sense its surroundings using its suckers.",
  },
  {
    answer: "Human Heart",
    aliases: ["heart", "the heart", "a human heart"],
    category: "Science",
    clues: [
      "My electrical rhythm is normally started by the sinoatrial node.",
      "I have four chambers and four main valves.",
      "My right side sends blood to the lungs.",
      "I pump blood through the circulatory system.",
      "I am the organ that beats in your chest.",
    ],
    fact: "The heart's natural pacemaker is a small group of specialised cells called the sinoatrial node.",
  },
  {
    answer: "Polar Bear",
    aliases: ["a polar bear", "polar bears"],
    category: "Animals",
    clues: [
      "My skin is dark beneath fur that appears white.",
      "I am classified as a marine mammal.",
      "Sea ice is essential to my hunting life.",
      "I mainly hunt seals in the Arctic.",
      "I am the large white bear of the far north.",
    ],
    fact: "Polar bear fur is transparent and hollow; it appears white because it scatters light.",
  },
  {
    answer: "Bamboo",
    category: "Nature",
    clues: [
      "Some of my species flower only after many decades.",
      "Botanically, I am a type of grass.",
      "Some varieties can grow extraordinarily quickly.",
      "I am used for construction, food and textiles.",
      "Giant pandas famously eat me.",
    ],
    fact: "Bamboo is a grass rather than a tree, even though some species grow very tall.",
  },
  {
    answer: "International Space Station",
    aliases: ["iss", "the iss", "space station", "the international space station"],
    category: "Space",
    clues: [
      "My first module entered orbit in 1998.",
      "I circle Earth roughly every hour and a half.",
      "Crews from many countries have lived and worked aboard me.",
      "I am a large research laboratory in low Earth orbit.",
      "My initials are ISS.",
    ],
    fact: "People aboard the ISS can experience about sixteen sunrises and sunsets each day.",
  },
  {
    answer: "Popcorn",
    category: "Food",
    clues: [
      "My kernel has a strong outer shell that traps steam.",
      "Pressure builds inside me until my starch rapidly expands.",
      "Only certain varieties of maize reliably make me.",
      "I am closely associated with cinemas.",
      "I am the fluffy snack made when corn kernels burst.",
    ],
    fact: "A popcorn kernel pops when heated water inside it turns to steam and pressure breaks the shell.",
  },
  {
    answer: "Paper",
    category: "Inventions",
    clues: [
      "An early form of me is traditionally linked to Cai Lun in ancient China.",
      "I am commonly made by pressing and drying wet plant fibres.",
      "My standard international sizes include A4 and A3.",
      "Books, newspapers and notebooks are usually made from me.",
      "You can write, draw, fold or print on me.",
    ],
    fact: "Paper can be recycled several times, though its fibres become shorter with each cycle.",
  },
  {
    answer: "Solar Eclipse",
    aliases: ["an eclipse", "eclipse", "a solar eclipse"],
    category: "Space",
    clues: [
      "I can only occur around the new-moon phase.",
      "Totality is visible only from a relatively narrow path.",
      "The corona becomes visible during my total form.",
      "I happen when the Moon passes between Earth and the Sun.",
      "I briefly block daylight in the middle of the day.",
    ],
    fact: "The Sun and Moon appear nearly the same size in our sky, making total solar eclipses possible.",
  },
  {
    answer: "Printing Press",
    aliases: ["the printing press", "gutenberg press"],
    category: "Inventions",
    clues: [
      "Movable type existed in East Asia before my European development.",
      "Johannes Gutenberg's version transformed fifteenth-century Europe.",
      "I helped books and ideas spread much more quickly.",
      "I reproduce pages using inked type.",
      "I am the machine associated with the mass production of books.",
    ],
    fact: "Gutenberg combined movable metal type with an efficient press and suitable inks.",
  },
  {
    answer: "Sydney Opera House",
    aliases: ["the sydney opera house", "opera house"],
    category: "Landmark",
    clues: [
      "Jørn Utzon won the competition to design me.",
      "My roof forms were derived from sections of a sphere.",
      "I opened in 1973.",
      "I stand beside a famous harbour bridge.",
      "I am Australia's sail-like performing arts landmark.",
    ],
    fact: "The Sydney Opera House roof is covered with more than a million tiles.",
  },
  {
    answer: "Nelson Mandela",
    aliases: ["mandela"],
    category: "History",
    clues: [
      "My clan name, Madiba, became a respectful way to refer to me.",
      "I spent 27 years imprisoned under apartheid.",
      "I shared the 1993 Nobel Peace Prize with F. W. de Klerk.",
      "In 1994, I became president of South Africa.",
      "I am a global symbol of resistance to apartheid.",
    ],
    fact: "Mandela became South Africa's first Black president after the country's first fully representative democratic election.",
  },
  {
    answer: "Taj Mahal",
    aliases: ["the taj mahal"],
    category: "Landmark",
    clues: [
      "Shah Jahan commissioned me in memory of Mumtaz Mahal.",
      "My complex includes gardens, a mosque and a guest house.",
      "I was built mainly from white marble.",
      "I stand beside the Yamuna River in Agra.",
      "I am India's most famous domed mausoleum.",
    ],
    fact: "The Taj Mahal's marble changes appearance with the light throughout the day.",
  },
  {
    answer: "DNA",
    aliases: ["deoxyribonucleic acid"],
    category: "Science",
    clues: [
      "My four chemical bases are commonly abbreviated A, T, C and G.",
      "I replicate before a cell divides.",
      "My structure is described as a double helix.",
      "I carry hereditary instructions in living organisms.",
      "My name is usually shortened to three letters.",
    ],
    fact: "If stretched out, the DNA in a single human cell would be roughly two metres long.",
  },
  {
    answer: "Aurora",
    aliases: ["the aurora", "northern lights", "southern lights", "aurora borealis", "aurora australis"],
    category: "Nature",
    clues: [
      "I result from charged particles interacting with gases high in an atmosphere.",
      "My colours depend partly on which gases are excited.",
      "I am most often seen near a planet's magnetic poles.",
      "On Earth, my northern and southern forms have different Latin names.",
      "I am the shimmering sky display called the northern or southern lights.",
    ],
    fact: "Auroras also occur on other planets with atmospheres and magnetic fields.",
  },
  {
    answer: "Marie Curie",
    aliases: ["curie"],
    category: "Science",
    clues: [
      "I am the only person awarded Nobel Prizes in two different scientific fields.",
      "I helped develop mobile X-ray units during the First World War.",
      "I discovered polonium and radium with my husband Pierre.",
      "My research pioneered the study of radioactivity.",
      "I was the first woman to win a Nobel Prize.",
    ],
    fact: "Marie Curie won Nobel Prizes in Physics and Chemistry.",
  },
  {
    answer: "Banana",
    aliases: ["a banana", "bananas"],
    category: "Food",
    clues: [
      "Botanically, I am a berry, while strawberries are not true berries.",
      "The plants that produce me are giant herbs rather than trees.",
      "Commercial varieties are usually seedless.",
      "I grow in curved bunches in tropical regions.",
      "I am the long yellow fruit peeled before eating.",
    ],
    fact: "Banana plants are giant herbs with a false trunk made from tightly packed leaf bases.",
  },
  {
    answer: "Big Ben",
    category: "Landmark",
    clues: [
      "Strictly speaking, my famous name belongs to a great bell.",
      "The tower around me was renamed Elizabeth Tower in 2012.",
      "I began keeping time in the nineteenth century.",
      "I stand beside the Palace of Westminster.",
      "I am London's famous clock landmark.",
    ],
    fact: "Big Ben is the nickname of the largest bell, though people often use it for the whole clock tower.",
  },
  {
    answer: "Ada Lovelace",
    aliases: ["lovelace"],
    category: "Technology",
    clues: [
      "I wrote notes about Charles Babbage's proposed Analytical Engine.",
      "My published method described how a machine could calculate Bernoulli numbers.",
      "I imagined computers working with more than just numbers.",
      "I was the daughter of poet Lord Byron.",
      "I am often called the first computer programmer.",
    ],
    fact: "Ada Lovelace recognised that a general-purpose computing machine could manipulate symbols as well as numbers.",
  },
  {
    answer: "Canterbury",
    aliases: ["canterbury region", "the canterbury region"],
    category: "New Zealand",
    clues: [
      "A braided river and a large agricultural plain are characteristic of me.",
      "Aoraki Mount Cook lies within my regional boundaries.",
      "My colours are traditionally red and black.",
      "Christchurch is my largest city.",
      "I am the New Zealand region stretching from the Southern Alps to the Pacific.",
    ],
    fact: "The Canterbury Plains were formed from sediment carried east from the Southern Alps by rivers.",
  },
  {
    answer: "Black Hole",
    aliases: ["a black hole", "black holes"],
    category: "Space",
    clues: [
      "My boundary of no return is called an event horizon.",
      "I can form when a sufficiently massive star collapses.",
      "I am detected by my effects on nearby matter and light.",
      "My gravity is so strong that light cannot escape from within my boundary.",
      "I am the dark cosmic object at the centre of many galaxies.",
    ],
    fact: "A black hole does not act like a cosmic vacuum cleaner; from far away, its gravity behaves like that of any object with the same mass.",
  },
  {
    answer: "Beethoven",
    aliases: ["ludwig van beethoven", "ludwig beethoven"],
    category: "Music",
    clues: [
      "A theme from my Ninth Symphony became the melody of the European anthem.",
      "I was born in Bonn and built my career in Vienna.",
      "I continued composing as my hearing deteriorated.",
      "My Fifth Symphony opens with a famous four-note motif.",
      "My surname is Beethoven.",
    ],
    fact: "Beethoven was profoundly deaf by the time some of his greatest late works were performed.",
  },
  {
    answer: "Earthquake",
    aliases: ["an earthquake", "earthquakes"],
    category: "Science",
    clues: [
      "My starting point underground is called a hypocentre or focus.",
      "Primary and secondary waves help scientists study me.",
      "I commonly occur when stress is released along a fault.",
      "A seismometer records my ground motion.",
      "I am the natural event that makes the ground shake.",
    ],
    fact: "The point on Earth's surface directly above an earthquake's focus is called the epicentre.",
  },
  {
    answer: "Wellington",
    category: "New Zealand",
    clues: [
      "I sit beside a harbour shaped partly by geological faults.",
      "My cable car climbs from Lambton Quay toward Kelburn.",
      "New Zealand's parliament and the Beehive are located here.",
      "I lie at the southern end of the North Island.",
      "I am the capital city of New Zealand.",
    ],
    fact: "Wellington became New Zealand's capital in 1865.",
  },
];

const EMPTY_STATS: Stats = { played: 0, wins: 0, currentStreak: 0, bestStreak: 0, lastPlayed: "" };

function getDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function daysSinceLaunch(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(2026, 0, 1)) / 86400000);
}

function clean(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function isRight(guess: string, puzzle: Puzzle) {
  return [puzzle.answer, ...(puzzle.aliases ?? [])].some((answer) => clean(answer) === clean(guess));
}

function dayGap(earlier: string, later: string) {
  if (!earlier) return Infinity;
  const a = new Date(`${earlier}T12:00:00`);
  const b = new Date(`${later}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function shareGrid(game: SavedGame) {
  if (game.status === "lost") return "🟪🟪🟪🟪🟪";
  const used = game.clueIndex + 1;
  return `${"🟪".repeat(Math.max(0, used - 1))}🟩${"⬜".repeat(5 - used)}`;
}

export default function Home() {
  const dateKey = useMemo(() => getDateKey(), []);
  const puzzleNumber = daysSinceLaunch(dateKey) + 1;
  const puzzle = PUZZLES[((puzzleNumber - 1) % PUZZLES.length + PUZZLES.length) % PUZZLES.length];
  const [game, setGame] = useState<SavedGame>({ clueIndex: 0, attempts: [], status: "playing" });
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(`cluedrop-game-${dateKey}`);
        const savedStats = localStorage.getItem("cluedrop-stats");
        if (saved) setGame(JSON.parse(saved));
        if (savedStats) setStats({ ...EMPTY_STATS, ...JSON.parse(savedStats) });
      } catch {
        // The game still works when browser storage is unavailable.
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [dateKey]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(`cluedrop-game-${dateKey}`, JSON.stringify(game));
    } catch {
      // Ignore storage failures.
    }
  }, [dateKey, game, ready]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const total = Math.max(0, next.getTime() - now.getTime());
      const hours = Math.floor(total / 3600000);
      const mins = Math.floor((total % 3600000) / 60000);
      const secs = Math.floor((total % 60000) / 1000);
      setCountdown(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const finish = (won: boolean, nextGame: SavedGame) => {
    setGame(nextGame);
    if (stats.lastPlayed === dateKey) return;
    const nextStats: Stats = {
      played: stats.played + 1,
      wins: stats.wins + (won ? 1 : 0),
      currentStreak: won ? (dayGap(stats.lastPlayed, dateKey) === 1 ? stats.currentStreak + 1 : 1) : 0,
      bestStreak: stats.bestStreak,
      lastPlayed: dateKey,
    };
    nextStats.bestStreak = Math.max(nextStats.bestStreak, nextStats.currentStreak);
    setStats(nextStats);
    try {
      localStorage.setItem("cluedrop-stats", JSON.stringify(nextStats));
    } catch {
      // Ignore storage failures.
    }
  };

  const submitGuess = (event: React.FormEvent) => {
    event.preventDefault();
    const value = guess.trim();
    if (!value || game.status !== "playing") return;
    const nextAttempts = [...game.attempts, { value, clue: game.clueIndex }];
    if (isRight(value, puzzle)) {
      finish(true, { ...game, attempts: nextAttempts, status: "won" });
      setMessage(`Brilliant — ${5 - game.clueIndex} point${game.clueIndex === 4 ? "" : "s"}!`);
    } else if (game.clueIndex === 4) {
      finish(false, { clueIndex: 4, attempts: nextAttempts, status: "lost" });
      setMessage("That was the final clue.");
    } else {
      setGame({ clueIndex: game.clueIndex + 1, attempts: nextAttempts, status: "playing" });
      setMessage("Not quite — a new clue has dropped.");
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
    setGuess("");
  };

  const revealClue = () => {
    if (game.status !== "playing") return;
    const nextAttempts = [...game.attempts, { value: "Skipped", clue: game.clueIndex, skipped: true }];
    if (game.clueIndex === 4) {
      finish(false, { clueIndex: 4, attempts: nextAttempts, status: "lost" });
      setMessage("That was the final clue.");
    } else {
      setGame({ clueIndex: game.clueIndex + 1, attempts: nextAttempts, status: "playing" });
      setMessage("A new clue has dropped.");
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  };

  const share = async () => {
    const score = game.status === "won" ? `${5 - game.clueIndex}/5` : "X/5";
    const text = `ClueDrop Daily #${puzzleNumber} ${score}\n${shareGrid(game)}\nCan you solve it in fewer clues?`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "ClueDrop Daily", text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Cancelling the native share sheet should not show an error.
    }
  };

  const dateLabel = new Intl.DateTimeFormat("en-NZ", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

  if (!ready) return <main className="game-shell" aria-busy="true" />;

  return (
    <main className="game-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <div className="brand" aria-label="ClueDrop Daily"><span className="brand-mark"><span>C</span></span><span>ClueDrop</span></div>
        <nav className="header-actions" aria-label="Game information">
          <Dialog>
            <DialogTrigger asChild><Button variant="ghost" size="icon" className="icon-button" aria-label="How to play"><CircleHelp /></Button></DialogTrigger>
            <DialogContent className="modal-card">
              <DialogHeader><DialogTitle className="modal-title">How to play</DialogTitle><DialogDescription className="modal-subtitle">Name the mystery answer using as few clues as possible.</DialogDescription></DialogHeader>
              <ol className="how-list">
                <li><span>1</span><p>Start with one difficult clue and type your best guess.</p></li>
                <li><span>2</span><p>A wrong guess or skip reveals an easier clue.</p></li>
                <li><span>3</span><p>Solve on clue one for 5 points, down to 1 point on clue five.</p></li>
              </ol>
              <div className="share-example" aria-label="Example shared result"><strong>ClueDrop #42 · 3/5</strong><span>🟪🟪🟩⬜⬜</span><small>Your shared result never reveals the answer.</small></div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild><Button variant="ghost" size="icon" className="icon-button" aria-label="Your statistics"><BarChart3 /></Button></DialogTrigger>
            <DialogContent className="modal-card">
              <DialogHeader><DialogTitle className="modal-title">Your stats</DialogTitle><DialogDescription className="modal-subtitle">Saved privately on this device.</DialogDescription></DialogHeader>
              <div className="stats-grid large-stats"><div><strong>{stats.played}</strong><span>Played</span></div><div><strong>{winRate}%</strong><span>Win rate</span></div><div><strong>{stats.currentStreak}</strong><span>Streak</span></div><div><strong>{stats.bestStreak}</strong><span>Best</span></div></div>
            </DialogContent>
          </Dialog>
        </nav>
      </header>

      <section className="game-card" aria-labelledby="game-title">
        <div className="game-meta">
          <div><p className="eyebrow">Daily #{puzzleNumber}</p><h1 id="game-title">Name today&apos;s mystery.</h1><p className="date-line">{dateLabel} <span>•</span> {puzzle.category}</p></div>
          <div className="score-pill" aria-label={`${5 - game.clueIndex} points available`}><Sparkles /><strong>{5 - game.clueIndex}</strong><span>PTS</span></div>
        </div>

        <div className="progress-track" aria-label={`Clue ${game.clueIndex + 1} of 5`}>
          {[0, 1, 2, 3, 4].map((index) => <span key={index} className={index <= game.clueIndex ? "active" : ""} />)}
        </div>

        <section className="clue-stack" aria-label="Clues">
          {puzzle.clues.map((clue, index) => {
            const visible = index <= game.clueIndex;
            return (
              <article key={clue} className={`clue-card ${visible ? "revealed" : "locked"} ${index === game.clueIndex && game.status === "playing" ? "current" : ""}`} aria-hidden={!visible}>
                <span className="clue-number">{index + 1}</span>{visible ? <p>{clue}</p> : <><LockKeyhole /><p>Clue locked</p></>}
              </article>
            );
          })}
        </section>

        {game.status === "playing" ? (
          <div className="play-area">
            <p className="status-message" aria-live="polite">{message || "You get one guess for each clue."}</p>
            <form onSubmit={submitGuess} className="guess-form">
              <label htmlFor="guess" className="sr-only">Your answer</label>
              <input ref={inputRef} id="guess" value={guess} onChange={(event) => setGuess(event.target.value)} placeholder="Type your answer…" autoComplete="off" spellCheck="false" autoFocus />
              <Button type="submit" disabled={!guess.trim()} className="guess-button">Guess</Button>
            </form>
            <button type="button" className="skip-button" onClick={revealClue}>{game.clueIndex === 4 ? "I give up" : "Not sure — drop another clue"}</button>
          </div>
        ) : (
          <section className={`result-card ${game.status}`} aria-live="polite">
            <p className="result-kicker">{game.status === "won" ? message : "Today's answer was"}</p><h2>{puzzle.answer}</h2>
            <p className="fact"><strong>Good to know:</strong> {puzzle.fact}</p>
            <Button onClick={share} className="share-button"><Share2 /> {copied ? "Copied!" : "Share your result"}</Button>
            <div className="share-grid" aria-label="Your result">{shareGrid(game)}</div>
            <div className="tomorrow"><span>Next mystery in</span><strong>{countdown}</strong></div>
          </section>
        )}
      </section>

      <footer><div><Flame /> <strong>{stats.currentStreak}</strong> day streak</div><span>One mystery. Five clues. Every day.</span></footer>
    </main>
  );
}
