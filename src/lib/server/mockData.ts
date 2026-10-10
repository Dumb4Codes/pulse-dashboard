import type { Category } from '../types';

/**
 * Seed content for the deterministic mock provider.
 * Everything here is fictional or generic (no real people/companies are quoted), except the
 * movie list, which uses real, accurately described films.
 */

export interface NewsSeed { title: string; description: string }
export interface MovieSeed { title: string; description: string; category: Category; year: number }
export interface SocialSeed { author: string; handle: string; text: string; category: Category }

export const NEWS_SOURCES: string[] = [
  'The Daily Ledger',
  'Meridian Wire',
  'Northlight News',
  'The Courier Post',
  'Atlas Report',
  'Harborview Times',
  'Signal & Noise',
  'The Continental',
  'Open Press Network',
  'Brightwater Gazette',
];

export const NEWS_SEEDS: Record<Category, NewsSeed[]> = {
  technology: [
    {
      title: 'Open-source language model matches proprietary rivals on reasoning benchmarks',
      description: 'A community-trained model with 70 billion parameters landed within two points of the leading closed systems on a new multi-step reasoning suite, reviving the debate over how much of the frontier will stay open.',
    },
    {
      title: 'Regulators finalize rules requiring plain-language labels on AI-generated content',
      description: 'Publishers and platforms will have twelve months to add visible disclosures to synthetic images, audio and text, with fines scaled to audience size for repeat violations.',
    },
    {
      title: 'Solid-state battery prototype clears 1,000 charge cycles with minimal capacity loss',
      description: 'Engineers say the pouch cell kept 92 percent of its original capacity after a year of accelerated testing, a durability milestone that has stalled earlier designs.',
    },
    {
      title: 'Browser makers agree to retire third-party tracking identifiers by next spring',
      description: 'A joint announcement commits the three largest browsers to a shared privacy-preserving measurement API, giving advertisers a migration window while blocking cross-site profiles.',
    },
    {
      title: 'Chipmakers race to put on-device AI accelerators into mid-range laptops',
      description: 'New processors promise to run translation, transcription and image editing locally, cutting battery drain and keeping personal data off remote servers.',
    },
    {
      title: 'Quantum error correction reaches a practical threshold in lab demonstration',
      description: 'A university team kept a logical qubit alive for ten minutes, longer than any of its physical components, and says scaling the design is now an engineering problem rather than a physics one.',
    },
    {
      title: 'Passkeys overtake passwords as the default sign-in on major consumer platforms',
      description: 'Usage data from three large identity providers shows more than half of new sign-ins now use device-bound credentials, and account-takeover reports have fallen sharply.',
    },
    {
      title: 'Satellite broadband operator doubles rural download speeds with a software update',
      description: 'Improved beam-forming and smarter congestion control lifted median speeds in remote areas from 90 to 185 Mbps without launching any new hardware.',
    },
    {
      title: 'Developers report 30 percent faster builds after adopting an incremental compiler',
      description: 'The open-source toolchain caches fine-grained dependency graphs between runs, and early adopters say large monorepos now rebuild in seconds after a small change.',
    },
  ],
  sports: [
    {
      title: 'Late penalty completes comeback as Northgate edge city rivals 3-2',
      description: 'Trailing by two at the interval, the hosts levelled through a pair of set pieces before an 89th-minute spot-kick sent the derby crowd into raptures.',
    },
    {
      title: 'Teenage sprinter lowers national 60m record at indoor championships',
      description: 'The 18-year-old crossed the line in 6.52 seconds, shaving 0.04 off a mark that had stood for eleven years, and booked her place on the world indoor team.',
    },
    {
      title: 'Coach rotates the entire starting eleven and the reserves deliver a 4-0 win',
      description: 'Facing a congested fixture list, the manager made ten changes, and four different players got on the scoresheet in a commanding cup performance.',
    },
    {
      title: 'Marathon organisers add cooling stations after record heat disrupted last year\'s race',
      description: 'Misting tents, ice towels and extra medical teams will line the course, and the start has been moved forward by 90 minutes to avoid the warmest part of the day.',
    },
    {
      title: 'Veteran point guard agrees to five-year extension, citing the club\'s youth pipeline',
      description: 'The 31-year-old, who averaged 18 points and nine assists last season, said the franchise\'s development program convinced him to stay put rather than test free agency.',
    },
    {
      title: 'Spin duo skittle visitors for 142 on a turning first-day pitch',
      description: 'Five wickets for the left-arm spinner and three for his partner left the touring side struggling, and the openers had an 81-run lead by stumps.',
    },
    {
      title: 'Cycling federation unveils women\'s stage-race calendar with equal prize money',
      description: 'Eight multi-day events across three continents will carry the same prize pool as their men\'s equivalents from next season, and broadcasters have committed to full live coverage.',
    },
    {
      title: 'Rookie quarterback throws for 380 yards in first road start',
      description: 'Playing in a hostile stadium, the 22-year-old completed 31 of 40 passes and led a late 75-yard drive to secure the franchise\'s third win in a row.',
    },
    {
      title: 'Swimmers break two relay records on the opening night of national trials',
      description: 'The women\'s medley and men\'s freestyle quartets both went under the existing marks, and coaches said the depth on display bodes well for the summer\'s global meet.',
    },
  ],
  finance: [
    {
      title: 'Central bank holds rates steady but signals a cut could come before year-end',
      description: 'Policymakers voted 7-2 to keep the benchmark rate unchanged, noting that cooling wage growth and softer demand give them room to ease if the trend continues.',
    },
    {
      title: 'Inflation cools to 2.6 percent as energy and used-car prices ease',
      description: 'Core services prices remain sticky, but the headline reading came in below economists\' expectations and strengthened the case for lower borrowing costs.',
    },
    {
      title: 'Retail investors pile into short-dated bond funds as yields stay elevated',
      description: 'Fund-flow data shows record weekly inflows into ultra-short bond products, with savers favouring predictable income over the volatility of equity markets.',
    },
    {
      title: 'Mortgage applications climb for a third straight week as rates drift lower',
      description: 'Refinancing demand jumped 11 percent from a week earlier, and lenders report more first-time buyers returning to the market after a long pause.',
    },
    {
      title: 'Emerging-market currencies steady after the dollar\'s sharpest weekly drop this year',
      description: 'A softer dollar and improving trade balances helped several regional currencies recover ground, though analysts warn the rally could fade if U.S. yields rise again.',
    },
    {
      title: 'Regulators propose stricter liquidity rules for money-market funds',
      description: 'Draft requirements would raise the share of assets that must be convertible to cash within a week, aiming to prevent the runs seen during past periods of stress.',
    },
    {
      title: 'Pension funds shift billions toward infrastructure as bond returns normalise',
      description: 'Trustees say long-dated, inflation-linked cash flows from toll roads, grids and ports suit their liabilities better than the low-yielding bonds of the last decade.',
    },
    {
      title: 'Tax-advantaged savings accounts log record contributions in the first half',
      description: 'Providers attribute the surge to automatic enrolment, higher interest rates and a wave of younger savers opening accounts through mobile apps.',
    },
    {
      title: 'Bank earnings beat forecasts as trading revenue offsets slower lending growth',
      description: 'Fixed-income desks posted their strongest quarter in two years, while loan books grew just 1.4 percent as businesses held back on borrowing.',
    },
  ],
  entertainment: [
    {
      title: 'Indie sci-fi drama sweeps the festival\'s top prizes as distributors rush to bid',
      description: 'Shot on a shoestring budget in just 24 days, the quiet film about a lighthouse keeper and a stranded AI took best picture, best screenplay and the audience award.',
    },
    {
      title: 'Streaming service greenlights second season of acclaimed limited series',
      description: 'The decision surprised fans who thought the story had concluded, though the showrunner promised a fresh cast and a new mystery set a decade later.',
    },
    {
      title: 'Veteran composer to score an upcoming fantasy trilogy',
      description: 'The three-time Oscar nominee will write a recurring leitmotif for each kingdom and record with a full orchestra and choir over the next eighteen months.',
    },
    {
      title: 'Theatre revival of a 1970s musical extends its run after selling out nightly',
      description: 'The stripped-back staging, with the band visible on stage throughout, has drawn rave reviews and a surge of first-time theatregoers in their twenties.',
    },
    {
      title: 'Box office: animated sequel opens at number one with the strongest family debut of the year',
      description: 'The film took in an estimated 94 million dollars over the weekend, and exit polls gave it an A grade from parents and children alike.',
    },
    {
      title: 'Touring music festival adds three cities as ticket demand outstrips capacity',
      description: 'Organisers said pre-sale registrations tripled this year, and the new dates will keep the same line-up of more than forty acts across four stages.',
    },
    {
      title: 'Documentary about the last analogue film lab wins audience award',
      description: 'Filmed over three years, the portrait follows a family-run lab in Rotterdam as young directors return to celluloid and demand outpaces its ageing machines.',
    },
    {
      title: 'Video game adaptation finds critical acclaim ahead of weekend release',
      description: 'Early reviews praise the series for respecting the source material\'s tone, with one critic calling it the first adaptation that understands why players loved the world.',
    },
    {
      title: 'Late-night host announces final season after eleven years on air',
      description: 'The veteran presenter thanked viewers and crew in an emotional monologue, promising a year of reunion guests and the return of fan-favourite segments.',
    },
  ],
  science: [
    {
      title: 'Telescope captures the sharpest image yet of a planet-forming disc around a young star',
      description: 'Concentric dark gaps in the dust, spaced like grooves on a record, match the orbits predicted for newborn gas giants and offer a rare look at how planetary systems begin.',
    },
    {
      title: 'Researchers show how octopuses edit their own RNA to adapt to cold water',
      description: 'By rewriting messenger RNA on the fly, the animals tune key nerve proteins to temperature, a trick that may explain how soft-bodied cephalopods thrive in extreme habitats.',
    },
    {
      title: 'Antarctic ice core reaches its deepest layers, promising a million-year climate record',
      description: 'The final metres of drilling brought up ice older than any previously recovered, trapping air bubbles that will reveal how greenhouse gases tracked ancient temperatures.',
    },
    {
      title: 'Sample-return capsule lands with fragments of a carbon-rich asteroid',
      description: 'After a six-year journey, the sealed canister touched down in the desert, and curators have begun a careful, contamination-free study of the dark, crumbly grains.',
    },
    {
      title: 'Engineered enzyme breaks down PET plastic at room temperature in under a day',
      description: 'The protein, redesigned with machine-learning tools, digested shredded bottles into their original building blocks, which can be remade into food-grade plastic.',
    },
    {
      title: 'Deep-sea survey catalogues 30 previously unknown species near hydrothermal vents',
      description: 'Remotely operated vehicles recorded translucent worms, pale crabs and an iridescent snail living on chemical energy two kilometres below the surface.',
    },
    {
      title: 'Physicists measure the neutron lifetime with record precision, narrowing a decades-old gap',
      description: 'A magnetic trap that holds ultracold neutrons without walls produced a value that sits closer to the beam experiments, hinting that the discrepancy may be experimental rather than new physics.',
    },
    {
      title: 'Coral restoration trial shows 80 percent survival of heat-tolerant fragments',
      description: 'Divers transplanted selectively bred coral onto damaged reefs, and most pieces survived a marine heat wave that bleached their wild neighbours.',
    },
    {
      title: 'Volunteers help astronomers flag 1,200 new variable stars in archival survey data',
      description: 'More than 40,000 citizen scientists examined light curves online, and their classifications have been confirmed by professional follow-up observations.',
    },
  ],
  health: [
    {
      title: 'Large study finds consistent bedtimes matter as much as total sleep time',
      description: 'Tracking 60,000 adults with wearable devices, researchers saw the lowest cardiovascular risk among those whose sleep schedule varied by less than 30 minutes.',
    },
    {
      title: 'Health panel recommends routine blood-pressure checks starting at age 30',
      description: 'The updated guideline argues that earlier screening can catch silent hypertension, and suggests home monitors for anyone with a family history of heart disease.',
    },
    {
      title: 'Pooled analysis links roughly 7,000 daily steps with sharply lower mortality',
      description: 'The review of fifteen cohorts found most of the benefit arrives well before the popular 10,000-step target, and even modest increases helped sedentary adults.',
    },
    {
      title: 'Hospitals pilot AI scribes that cut clinicians\' paperwork time by a third',
      description: 'Doctors in the trial spent less time typing notes and more with patients, though administrators stress that every summary is still reviewed before it enters the record.',
    },
    {
      title: 'Vaccination drive reaches 90 percent coverage in pilot districts after mobile clinics launch',
      description: 'Vans offering evening and weekend appointments brought immunisation to rural villages and shift workers, and health officials plan to expand the model nationwide.',
    },
    {
      title: 'Study: twice-weekly strength training improves bone density in postmenopausal women',
      description: 'After twelve months, participants following a supervised resistance program showed measurable gains at the hip and spine compared with a stretching-only group.',
    },
    {
      title: 'Mental-health apps face new transparency rules on data sharing',
      description: 'Developers must now tell users, in plain language, which partners receive their information, and may not use therapy-session data for advertising.',
    },
    {
      title: 'Early trial of a multi-cancer blood test shows promising specificity',
      description: 'The test correctly ruled out cancer in more than 99 percent of healthy volunteers, but researchers caution that larger studies are needed to prove it saves lives.',
    },
    {
      title: 'Heat-wave advisories issued as hospital admissions for dehydration climb',
      description: 'Officials urge residents to check on elderly neighbours, avoid strenuous activity at midday, and visit the city\'s air-conditioned cooling centres.',
    },
  ],
  business: [
    {
      title: 'Logistics group to open 12 automated fulfilment centres by 2028',
      description: 'The 1.4 billion-dollar expansion will add robotic picking and same-day delivery capacity, and the company expects to create 6,000 jobs in new facility regions.',
    },
    {
      title: 'Four-day work-week trial: firms report steady output and lower attrition',
      description: 'Of the 38 companies in the six-month pilot, 35 plan to continue, citing improved morale, fewer sick days and an easier time recruiting senior staff.',
    },
    {
      title: 'Supermarket chain expands private-label range as shoppers trade down',
      description: 'Own-brand products now account for nearly half of unit sales, and the retailer plans to add 800 lines, from olive oil to household cleaners.',
    },
    {
      title: 'Startup raises 60 million dollars in Series B to digitise small-business invoicing',
      description: 'The funding will go toward expanding the platform\'s automated payment reminders and integrations with popular accounting software across Europe.',
    },
    {
      title: 'Automaker delays electric pickup launch to retool its battery plant',
      description: 'The company said the extra six months will allow a new cell chemistry to enter production, and reiterated its full-year delivery guidance for the rest of its lineup.',
    },
    {
      title: 'Remote-first software firm reverses course with hub offices in five cities',
      description: 'Leaders say in-person weeks improve onboarding and cross-team collaboration, while employees outside the hubs will keep the option of working from home.',
    },
    {
      title: 'Coffee roaster\'s employee buyout completes, giving 400 workers a stake',
      description: 'The founders sold their shares to a trust that distributes ownership by tenure, ensuring the company stays independent and rooted in its community.',
    },
    {
      title: 'Shipping lines reroute vessels as canal congestion stretches delivery times',
      description: 'Transit waits of up to nine days are adding roughly a week to Asia-Europe routes, and freight forwarders are warning of higher surcharges ahead of the holiday season.',
    },
    {
      title: 'Two regional airlines announce merger to create a 90-aircraft carrier',
      description: 'The combined business will keep both brands for now, consolidate maintenance operations, and expects savings of 120 million dollars a year by the third year.',
    },
  ],
};

export const MOVIE_SEEDS: MovieSeed[] = [
  // technology
  { title: 'Ex Machina', category: 'technology', year: 2014, description: 'A young programmer is chosen to evaluate the human-like qualities of an advanced AI housed in the remote estate of her reclusive creator.' },
  { title: 'Her', category: 'technology', year: 2013, description: 'A lonely writer in near-future Los Angeles falls in love with an intelligent operating system designed to meet his every need.' },
  { title: 'WarGames', category: 'technology', year: 1983, description: 'A teenage hacker unwittingly connects to a military supercomputer and nearly triggers a nuclear standoff by treating a launch simulation as a game.' },
  { title: 'The Social Network', category: 'technology', year: 2010, description: 'The origins of a social-media giant unfold through the lawsuits and fractured friendships that followed its rapid rise from a college dorm room.' },
  { title: 'The Matrix', category: 'technology', year: 1999, description: 'A hacker learns that everyday reality is a simulation built by machines, and joins a band of rebels fighting to free humanity.' },
  { title: 'Blade Runner 2049', category: 'technology', year: 2017, description: 'A new replicant hunter uncovers a long-buried secret that could plunge what remains of society into chaos and sends him searching for a missing legend.' },
  { title: 'Minority Report', category: 'technology', year: 2002, description: 'In a future where murders are predicted before they happen, a police precrime chief becomes the system\'s next suspect and goes on the run.' },
  // sports
  { title: 'Rocky', category: 'sports', year: 1976, description: 'A small-time Philadelphia boxer gets a shot at the heavyweight title in this underdog classic about heart and self-respect.' },
  { title: 'Moneyball', category: 'sports', year: 2011, description: 'The general manager of a cash-strapped baseball team turns to statistics to build a competitive roster, upending the sport\'s old assumptions.' },
  { title: 'Remember the Titans', category: 'sports', year: 2000, description: 'A newly integrated high-school football team in 1971 Virginia learns to play as one under the guidance of its new head coach.' },
  { title: 'Rush', category: 'sports', year: 2013, description: 'The intense 1970s Formula One rivalry between daredevil James Hunt and meticulous Niki Lauda plays out over a dramatic season.' },
  { title: 'Hoop Dreams', category: 'sports', year: 1994, description: 'This landmark documentary follows two Chicago teenagers over five years as they chase basketball scholarships and professional ambitions.' },
  { title: 'Chariots of Fire', category: 'sports', year: 1981, description: 'Two British sprinters, one driven by faith and the other by prejudice, race for glory at the 1924 Paris Olympics.' },
  { title: 'Senna', category: 'sports', year: 2010, description: 'Assembled entirely from archive footage, this documentary traces the life, rivalries and untimely death of Brazilian racing champion Ayrton Senna.' },
  // finance
  { title: 'Wall Street', category: 'finance', year: 1987, description: 'An ambitious young broker is drawn into the world of a ruthless corporate raider and learns that greed has consequences.' },
  { title: 'The Big Short', category: 'finance', year: 2015, description: 'A handful of outsiders foresee the housing-market collapse and bet against the banks, with irreverent explanations of how the crash happened.' },
  { title: 'Margin Call', category: 'finance', year: 2011, description: 'Over one tense night at an investment bank, executives discover the firm is on the brink of ruin and decide who will bear the loss.' },
  { title: 'Inside Job', category: 'finance', year: 2010, description: 'This Oscar-winning documentary examines the systemic corruption and policy failures behind the 2008 global financial crisis.' },
  { title: 'Trading Places', category: 'finance', year: 1983, description: 'A snobbish commodities broker and a street hustler unwittingly swap lives in a bet between two wealthy brothers, with comic results.' },
  { title: 'Boiler Room', category: 'finance', year: 2000, description: 'A college dropout takes a job at a Long Island brokerage and finds that its soaring commissions rely on a shady pump-and-dump scheme.' },
  { title: 'The Wolf of Wall Street', category: 'finance', year: 2013, description: 'Based on a true story, a stockbroker\'s meteoric rise and excess end in fraud charges and a federal investigation.' },
  // entertainment
  { title: 'La La Land', category: 'entertainment', year: 2016, description: 'A jazz pianist and an aspiring actress fall in love in Los Angeles while chasing dreams that begin to pull them apart.' },
  { title: 'Singin\' in the Rain', category: 'entertainment', year: 1952, description: 'As Hollywood moves from silent films to talkies, a screen star and a young singer navigate studio politics in this joyous musical.' },
  { title: 'The Grand Budapest Hotel', category: 'entertainment', year: 2014, description: 'A legendary concierge and his young lobby boy become caught up in the theft of a priceless painting and the fight over a family fortune.' },
  { title: 'Whiplash', category: 'entertainment', year: 2014, description: 'A promising young drummer enrolls at a top music conservatory where an abusive instructor pushes him to the brink of greatness.' },
  { title: 'Once Upon a Time in Hollywood', category: 'entertainment', year: 2019, description: 'A fading television actor and his stunt double navigate the changing film industry in 1969 Los Angeles.' },
  { title: 'Everything Everywhere All at Once', category: 'entertainment', year: 2022, description: 'An overwhelmed laundromat owner is thrust into a multiverse adventure where she alone can save every version of reality.' },
  { title: 'Knives Out', category: 'entertainment', year: 2019, description: 'A detective investigates the death of a wealthy crime novelist, and every member of his dysfunctional family has a motive.' },
  // science
  { title: 'Interstellar', category: 'science', year: 2014, description: 'With Earth\'s crops failing, a former pilot leads a mission through a wormhole in search of a new home for humanity.' },
  { title: 'Arrival', category: 'science', year: 2016, description: 'A linguist is recruited to communicate with extraterrestrial visitors before global tensions boil over into war.' },
  { title: 'Contact', category: 'science', year: 1997, description: 'A scientist who has spent her life listening for alien radio signals finally detects a message and must fight to interpret it.' },
  { title: 'The Martian', category: 'science', year: 2015, description: 'Stranded alone on Mars, an astronaut uses his botany and engineering skills to survive until a rescue mission can reach him.' },
  { title: 'Hidden Figures', category: 'science', year: 2016, description: 'Three brilliant Black women mathematicians play a crucial role in launching astronaut John Glenn into orbit.' },
  { title: 'Apollo 13', category: 'science', year: 1995, description: 'When an explosion cripples their spacecraft on the way to the Moon, three astronauts and Mission Control work to bring them home alive.' },
  { title: 'Gravity', category: 'science', year: 2013, description: 'Two astronauts struggle to survive after debris destroys their shuttle and leaves them drifting in Earth orbit.' },
  // health
  { title: 'Contagion', category: 'health', year: 2011, description: 'As a deadly virus spreads worldwide, doctors, scientists and public-health officials race to find a cure and contain the panic.' },
  { title: '50/50', category: 'health', year: 2011, description: 'A 27-year-old is diagnosed with a rare cancer and, with the help of his irreverent best friend, faces his treatment with humour and honesty.' },
  { title: 'Still Alice', category: 'health', year: 2014, description: 'A linguistics professor is diagnosed with early-onset Alzheimer\'s disease and fights to hold on to her identity as her memory fades.' },
  { title: 'Awakenings', category: 'health', year: 1990, description: 'A shy doctor discovers that a new drug can briefly revive patients who have been catatonic for decades, with moving consequences.' },
  { title: 'Philadelphia', category: 'health', year: 1993, description: 'A lawyer fired for having AIDS sues his former firm, aided by a homophobic attorney who gradually changes his mind.' },
  { title: 'Dallas Buyers Club', category: 'health', year: 2013, description: 'Diagnosed with HIV in 1985, an electrician smuggles unapproved drugs into Texas and forms a buyers club for others who are sick.' },
  { title: 'The Diving Bell and the Butterfly', category: 'health', year: 2007, description: 'A magazine editor paralysed by a stroke communicates by blinking one eyelid and dictates a memoir of his experience.' },
  // business
  { title: 'The Founder', category: 'business', year: 2016, description: 'A struggling salesman discovers a revolutionary burger stand and builds it into a fast-food empire, with a ruthless eye for opportunity.' },
  { title: 'Jerry Maguire', category: 'business', year: 1996, description: 'A sports agent has a crisis of conscience, loses his job and tries to rebuild his career with his only remaining client.' },
  { title: 'Glengarry Glen Ross', category: 'business', year: 1992, description: 'Four desperate real-estate salesmen compete for leads in a high-pressure office where only the top sellers keep their jobs.' },
  { title: 'Steve Jobs', category: 'business', year: 2015, description: 'Three backstage product launches reveal the visionary, difficult personality at the heart of a technology revolution.' },
  { title: 'Up in the Air', category: 'business', year: 2009, description: 'A corporate downsizer who loves his travel-filled life faces a rethink when a young colleague threatens to move his work online.' },
  { title: 'The Pursuit of Happyness', category: 'business', year: 2006, description: 'A struggling salesman becomes homeless with his young son while competing for an unpaid internship at a brokerage firm.' },
  { title: 'Erin Brockovich', category: 'business', year: 2000, description: 'A single mother with no legal training helps build a case against a powerful utility company for contaminating a town\'s water.' },
];

export const SOCIAL_SEEDS: SocialSeed[] = [
  // technology
  { author: 'Maya Chen', handle: 'mayabuilds', category: 'technology', text: 'Shipped our offline-first sync engine today. Three months of CRDT headaches, worth it. If your app still shows a spinner on the subway, you are leaving users behind. #tech #opensource' },
  { author: 'Dev Patel', handle: 'devpatel_codes', category: 'technology', text: 'Hot take: the best developer tool of the year is still a fast test runner. Sub-second feedback beats any autocomplete. #tech #devtools' },
  { author: 'Liv Andersson', handle: 'livcodes', category: 'technology', text: 'Moved our CI to incremental builds and cut the average pipeline from 14 minutes to 5. Boring infra work is the most underrated productivity win. #tech #devex' },
  { author: 'Omar Haddad', handle: 'omar_ships', category: 'technology', text: 'Reminder to set up passkeys for your parents\' accounts this weekend. Takes five minutes and prevents a year of phishing headaches. #tech #security' },
  { author: 'Priya Nair', handle: 'priya_ml', category: 'technology', text: 'Fine-tuned a 3B model on our support tickets and it now beats the 70B generalist on our own evals. Domain data over parameter count, again. #ai #tech' },
  { author: 'Jonas Weber', handle: 'jonasweb', category: 'technology', text: 'CSS container queries finally made our design system components truly portable. No more media-query spaghetti. #tech #design #css' },
  { author: 'Tessa Brooks', handle: 'tessabrooks', category: 'technology', text: 'Hardware nerds: the new RISC-V dev board boots Linux in under four seconds and costs less than lunch. The ecosystem is moving fast. #tech #hardware' },
  // sports
  { author: 'Marcus Reid', handle: 'marcusontheball', category: 'sports', text: 'That second-half press from Northgate was a masterclass. Compact shape, smart triggers on the touchline and zero panic when they went behind. #football #tactics' },
  { author: 'Aisha Karim', handle: 'aishaoutruns', category: 'sports', text: 'Week 11 of the marathon block: 32 miles, and the legs finally feel springy. Easy runs really are meant to feel easy. #running #marathon' },
  { author: 'Diego Fuentes', handle: 'diegohoops', category: 'sports', text: 'Pick-and-roll defence is the whole game now. Watch how the big drops, the guard goes under, and the help rotates early. Chess at full speed. #basketball #nba' },
  { author: 'Hannah Doyle', handle: 'hdoyleswims', category: 'sports', text: 'Hit a 100m freestyle personal best at the club meet this morning. Two years of stroke work for a tenth of a second, and I am delighted. #swimming #pb' },
  { author: 'Sam O\'Connor', handle: 'samtestcricket', category: 'sports', text: 'Nothing beats a day-one turner when the spinners find their rhythm. Test cricket is still the best format we have. #cricket #testcricket' },
  { author: 'Lena Fischer', handle: 'lenacycles', category: 'sports', text: 'Gravel race recap: 120 km, 1,800 m of climbing and one very wet descent. Would do it again. Tyre pressure is everything. #cycling #gravel' },
  { author: 'Tomas Rivera', handle: 'tomasfitlife', category: 'sports', text: 'Trying a deload week for the first time. It feels wrong, but my lifts are stronger afterwards. Recovery is training. #fitness #strength' },
  // finance
  { author: 'Nadia Rahman', handle: 'nadiainvests', category: 'finance', text: 'Boring but true: automating a monthly index fund contribution beat every stock pick I ever made. #investing #markets' },
  { author: 'Greg Alvarez', handle: 'gregonmacro', category: 'finance', text: 'The yield curve is steepening again. Watch how the long end reacts to the next auction before you call the cycle. #markets #bonds' },
  { author: 'Chloe Park', handle: 'chloeplansmoney', category: 'finance', text: 'Emergency fund first, then invest. Six months of expenses in a high-yield account is not a missed opportunity, it is insurance. #personalfinance #savings' },
  { author: 'Ravi Menon', handle: 'ravi_numbers', category: 'finance', text: 'Earnings season thread: margins are holding up better than expected, but guidance is cautious. Read the footnotes. #markets #earnings' },
  { author: 'Isabelle Moreau', handle: 'isamoney', category: 'finance', text: 'Currency hedging costs more than most retail investors realise. Always check a fund\'s expense ratio including the hedge. #investing #etf' },
  { author: 'Kwame Boateng', handle: 'kwamebudgets', category: 'finance', text: 'Tracked every expense for 90 days. The subscriptions I had forgotten about were costing me 140 a month. Cancel ruthlessly. #personalfinance #budget' },
  { author: 'Elena Petrova', handle: 'elenaoncredit', category: 'finance', text: 'Small business owners: separate your accounts from day one. Future you, and your accountant, will thank you. #smallbiz #finance' },
  // entertainment
  { author: 'Jules Navarro', handle: 'julesatthemovies', category: 'entertainment', text: 'Caught a 35mm screening of a seventies thriller last night. The grain, the silence, the pacing. Modern films rarely trust the audience like that. #movies #cinema' },
  { author: 'Rina Okafor', handle: 'rinaplaysrecords', category: 'entertainment', text: 'That new album rewards good headphones. Every listen reveals another layer in the bridge. Album of the year contender. #music #newmusic' },
  { author: 'Ben Whitaker', handle: 'benbingewatches', category: 'entertainment', text: 'Finished the limited series in one weekend. The finale stuck the landing, which almost never happens. No spoilers, I promise. #streaming #tv' },
  { author: 'Sofia Marchetti', handle: 'sofiaonstage', category: 'entertainment', text: 'Opening night of the revival was electric. The staging is spare and the performances do all the work. Go and see it live. #theatre #arts' },
  { author: 'Caleb Nguyen', handle: 'calebgamesdaily', category: 'entertainment', text: 'Twenty hours into the new adventure game and I am still finding secrets. Level design this thoughtful deserves the awards chatter. #gaming #indiegames' },
  { author: 'Zoe Abbott', handle: 'zoereads', category: 'entertainment', text: 'Anyone else rewatch comfort shows during deadlines? Familiar dialogue is the best background noise. #tv #comfortwatch' },
  { author: 'Hugo Lindqvist', handle: 'hugodirects', category: 'entertainment', text: 'Film school lesson that stuck: if a scene still works with the sound off, the staging is right. #filmmaking #cinema' },
  // science
  { author: 'Dr. Amara Singh', handle: 'amaraastro', category: 'science', text: 'A fresh image of a protoplanetary disc just dropped, and the gaps are exactly where theory said forming planets would carve them. Gorgeous. #science #astronomy' },
  { author: 'Felix Hartmann', handle: 'felixgeo', category: 'science', text: 'Field season recap: three weeks, nine ice cores, one broken generator. The data looks fantastic. #science #climate' },
  { author: 'Noor Aziz', handle: 'noorbiolab', category: 'science', text: 'Octopus RNA editing keeps surprising us. An animal that rewrites its own instructions to cope with the cold. Evolution is wild. #science #biology' },
  { author: 'Marcus Lee', handle: 'marcusphysics', category: 'science', text: 'Explainer thread: why neutron lifetime measurements disagree depending on the method, and why that gap matters. #physics #science' },
  { author: 'Ingrid Solheim', handle: 'ingridspace', category: 'science', text: 'Watching the sample capsule re-entry live. Nothing prepares you for that fireball across the sky. #space #science' },
  { author: 'Tariq Jamal', handle: 'tariqteachesstem', category: 'science', text: 'Tip for teaching physics: start with a question students can argue about, then bring in the equations. #science #education' },
  { author: 'Camila Duarte', handle: 'camilaoceans', category: 'science', text: 'New deep-sea footage: a bioluminescent jelly drifting past a hydrothermal vent, 2,400 m down. Humbling. #ocean #science' },
  // health
  { author: 'Dr. Priyanka Rao', handle: 'drpriyankarao', category: 'health', text: 'The sleep tip I give every patient: a consistent wake-up time matters more than a perfect bedtime. #health #sleep' },
  { author: 'Callum Murray', handle: 'callumlifts', category: 'health', text: 'Added two strength sessions a week at 45 and my back pain disappeared. Not a miracle, just muscle. #fitness #health' },
  { author: 'Amelia Grant', handle: 'ameliaeatswell', category: 'health', text: 'Meal prep Sunday: lentil stew, roasted veg and overnight oats. Ninety minutes for five days of easy lunches. #nutrition #wellness' },
  { author: 'Yusuf Demir', handle: 'yusufmindful', category: 'health', text: 'Ten minutes of breathing practice before work. I was sceptical, but my afternoon focus is noticeably better. #mentalhealth #mindfulness' },
  { author: 'Fatima Zahra', handle: 'fatimaruns', category: 'health', text: 'Couch to 5K graduate here! Week 9 was hard. Slow down, you are allowed to walk. #running #fitness' },
  { author: 'Joel Kim, RN', handle: 'joelonshift', category: 'health', text: 'Heat advisory reminder: drink water before you feel thirsty, check on elderly neighbours and avoid midday exertion. #health #summer' },
  { author: 'Dr. Helen Brooks', handle: 'drhelenbrooks', category: 'health', text: 'Your annual check-up is not optional maintenance. Catch it early, treat it easily. Book yours today. #health #prevention' },
  // business
  { author: 'Sara Lindgren', handle: 'saraleads', category: 'business', text: 'Best management advice I ever got: write down decisions and the reasoning behind them. Future you will be grateful in six months. #leadership #business' },
  { author: 'Anil Kapoor', handle: 'anilbuilds', category: 'business', text: 'We hit break-even this quarter with a team of nine. Slow growth, happy customers, no investor drama. #startups #bootstrapped' },
  { author: 'Maribel Torres', handle: 'maribelops', category: 'business', text: 'Supply chain lesson: dual-source your critical components before you need to. #operations #business' },
  { author: 'Oliver Grant', handle: 'olivergrowth', category: 'business', text: 'Cold email tip: one specific sentence about their business beats three paragraphs about yours. #sales #marketing' },
  { author: 'Yara Haddad', handle: 'yarafounder', category: 'business', text: 'Hiring our first designer changed the product more than any feature sprint. Taste compounds. #startups #design' },
  { author: 'Pete Sullivan', handle: 'petesellscoffee', category: 'business', text: 'Opened our second cafe today. Year-one lesson: your regulars are your marketing department. #smallbiz #entrepreneur' },
  { author: 'Nina Kowalski', handle: 'ninakpm', category: 'business', text: 'Roadmaps should be bets, not promises. Tell stakeholders what you will learn, not just what you will ship. #product #strategy' },
];
