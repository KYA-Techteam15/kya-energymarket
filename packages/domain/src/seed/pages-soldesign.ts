import type { SeedPage } from './pages.ts';

/**
 * Pages de KYA-SolDesign (spec 004, FR-010), reprises de `design/v5/kya-soldesign`. Une fonction par
 * page, qui produit la même structure en français et en anglais.
 */
type Locale = 'fr' | 'en';
const tr = (locale: Locale) => (fr: string, en: string) => (locale === 'fr' ? fr : en);
const P = '/logiciels/kya-soldesign';

export function presentation(locale: Locale): SeedPage['fr'] {
  const t = tr(locale);
  return {
    title: 'KYA-SolDesign',
    description: t(
      'KYA-SolDesign conçoit des systèmes solaires autonomes fiables et économiquement accessibles.',
      'KYA-SolDesign designs off-grid solar systems that are reliable and economically affordable.',
    ),
    blocks: [
      {
        type: 'hero',
        data: {
          title: t(
            'Concevez des systèmes solaires fiables et économiquement accessibles.',
            'Design solar systems that are reliable and economically affordable.',
          ),
          text: t(
            'KYA-SolDesign dimensionne votre installation solaire autonome et vous dit, avant de construire, si elle tiendra et combien coûtera son kWh.',
            'KYA-SolDesign sizes your off-grid solar installation and tells you, before you build, whether it will hold and what its kWh will cost.',
          ),
          image: '/images/hero.jpg',
          flip: true,
          primary: { label: t('Essayer gratuitement', 'Try for free'), href: '/essai' },
          secondary: { label: t('Voir les tarifs', 'See pricing'), href: `${P}/tarifs` },
        },
      },
      {
        type: 'facts',
        data: {
          items: [
            { value: '2020', label: t('utilisé sur le terrain depuis', 'used in the field since') },
            { value: '500+', label: t('installations à la base de la méthode', 'installations behind the method') },
            { value: '5', label: t("pays d'Afrique de l'Ouest", 'West African countries'), example: true },
            { value: 'ISO 9001', label: t('KYA-Energy Group, certifié 2015', 'KYA-Energy Group, certified 2015') },
          ],
        },
      },
      {
        type: 'screenshot',
        data: {
          title: t(
            'Du site au schéma. Dans un seul logiciel.',
            'From the site to the diagram. In one piece of software.',
          ),
          intro: t(
            'Météo réelle du site, besoins heure par heure, matériel de votre catalogue, protections, chiffrage et documents. Sur Windows, même sans connexion.',
            'Real site weather, hour-by-hour needs, equipment from your catalogue, protections, costing and documents. On Windows, even offline.',
          ),
          image: '/images/predim.webp',
          windowTitle: t(
            'KYA-SolDesign 1.2.1 — Prédimensionnement · Centre de santé de Bombouaka (exemple)',
            'KYA-SolDesign 1.2.1 — Pre-sizing · Bombouaka health centre (example)',
          ),
          caption: t(
            "Capture réelle du logiciel, projet exemple livré avec l'installation",
            'Real screenshot, example project shipped with the installer',
          ),
          captionRight: t('Windows 10 et 11 · hors ligne', 'Windows 10 and 11 · offline'),
        },
      },
      {
        type: 'twoColumns',
        data: {
          title: t("Le prix de l'erreur.", 'The cost of getting it wrong.'),
          intro: t(
            "Un système solaire mal dimensionné se paie deux fois : à l'achat, ou pendant des années. Il n'y a pas de petite erreur.",
            'A badly sized solar system is paid for twice: at purchase, or for years. There is no small mistake.',
          ),
          columns: [
            {
              title: t('Trop grand.', 'Too big.'),
              text: t(
                'Vous payez des panneaux et des batteries qui ne serviront jamais.',
                'You pay for panels and batteries that will never be used.',
              ),
              points: [
                t('Budget gonflé, projet refusé par le client', 'Inflated budget, project turned down by the customer'),
                t('Argent immobilisé dans du matériel inutile', 'Money tied up in useless equipment'),
              ],
            },
            {
              title: t('Trop petit.', 'Too small.'),
              text: t(
                "Le système coupe au moment où l'on en a le plus besoin.",
                'The system cuts out exactly when it is needed most.',
              ),
              points: [
                t('Coupures le soir et en saison des pluies', 'Outages in the evening and in the rainy season'),
                t('Batteries usées avant l’heure, réputation en jeu', 'Batteries worn out early, reputation at stake'),
              ],
            },
          ],
          scale: [t('Trop petit', 'Too small'), t('Le point juste', 'The sweet spot'), t('Trop grand', 'Too big')],
        },
      },
      {
        type: 'interactiveExample',
        data: {
          title: t('Deux indicateurs pour décider.', 'Two indicators to decide.'),
          intro: t(
            'Chaque étude se résume en deux nombres entre 0 et 1. Ils se lisent sans être ingénieur.',
            'Every study comes down to two numbers between 0 and 1. You can read them without being an engineer.',
          ),
          gauges: [
            {
              value: 0.903,
              kind: 'tech',
              title: t('Fiabilité technique · SRI', 'Technical reliability · SRI'),
              text: t(
                'Le système couvrira-t-il les besoins, sans coupure ? Plus il est proche de 1, plus la réponse est oui.',
                'Will the system cover the needs without outages? The closer to 1, the more the answer is yes.',
              ),
            },
            {
              value: 0.84,
              kind: 'eco',
              title: t('Accessibilité économique · SVI', 'Economic affordability · SVI'),
              text: t(
                "L'énergie sera-t-elle moins chère que le réseau ? En dessous de 1, oui.",
                'Will the energy be cheaper than the grid? Below 1, yes.',
              ),
            },
          ],
          brand: 'KYA-SolDesign',
          projectName: t('Centre de santé de Bombouaka.', 'Bombouaka health centre.'),
          period: t("Sur l'année", 'Over the year'),
          note: t(
            'Projet exemple livré avec le logiciel. Répartition par mois indicative.',
            'Example project shipped with the software. Monthly breakdown is indicative.',
          ),
          views: [
            {
              tab: t('Fiabilité', 'Reliability'),
              icon: 'shield',
              label: t('Fiabilité technique (SRI)', 'Technical reliability (SRI)'),
              big: t('0,90', '0.90'),
              unit: t('sur 1', 'out of 1'),
              gauge: 0.903,
              gaugeKind: 'tech',
              label2: t('Énergie non servie', 'Unserved energy'),
              mid: t('4,1', '4.1'),
              unit2: '%',
              say: t(
                '**Proche de 1** : le système couvre les besoins presque toute l’année, sans coupure.',
                '**Close to 1**: the system covers the needs almost all year round, without outages.',
              ),
              legend: t('Part des besoins couverte, mois par mois', 'Share of needs covered, month by month'),
              legendRight: t('échelle 80–100 %', 'scale 80–100 %'),
              chart: 'bars',
              months: t('J F M A M J J A S O N D', 'J F M A M J J A S O N D').split(' '),
              values: [99, 99, 99, 98, 96, 93, 91, 88, 92, 97, 99, 99],
              low: 80,
              high: 100,
              highlight: 8,
              rows: [
                {
                  title: t('Mois le plus faible', 'Weakest month'),
                  note: t('Août, saison des pluies', 'August, rainy season'),
                  value: '88',
                  unit: '%',
                },
                {
                  title: t('Heures de manque', 'Shortage hours'),
                  note: t('Sur les 8 760 heures de l’année', 'Out of the 8,760 hours of the year'),
                  value: '508',
                  unit: 'h',
                },
              ],
            },
            {
              tab: t('Accessibilité', 'Affordability'),
              icon: 'coins',
              label: t('Accessibilité économique (SVI)', 'Economic affordability (SVI)'),
              big: t('0,84', '0.84'),
              unit: t('sur 1', 'out of 1'),
              gauge: 0.84,
              gaugeKind: 'eco',
              label2: t('Coût du kWh produit', 'Cost of a produced kWh'),
              mid: t('100,6', '100.6'),
              unit2: 'FCFA/kWh',
              say: t(
                '**Sous 1** : chaque kWh produit coûte moins cher que celui du réseau.',
                '**Below 1**: every kWh produced costs less than a grid kWh.',
              ),
              legend: t('Coût d’un kWh', 'Cost of a kWh'),
              legendRight: t('0,84 = 100,6 ÷ 120', '0.84 = 100.6 ÷ 120'),
              chart: 'compare',
              compare: [
                { name: t('Votre installation', 'Your installation'), value: 100.6, highlight: true },
                { name: t('Réseau électrique', 'Power grid'), value: 120, highlight: false },
              ],
              rows: [
                {
                  title: t('Tarif du réseau retenu', 'Grid tariff used'),
                  note: t('Saisi dans le projet', 'Entered in the project'),
                  value: '120',
                  unit: 'FCFA/kWh',
                },
                {
                  title: t('Écart par kWh', 'Difference per kWh'),
                  note: t('En faveur de l’installation', 'In favour of the installation'),
                  value: t('19,4', '19.4'),
                  unit: 'FCFA',
                },
              ],
            },
            {
              tab: t('Production', 'Production'),
              icon: 'sun',
              label: t('Production sur l’année', 'Production over the year'),
              big: t('5 118', '5,118'),
              unit: 'kWh',
              gaugeKind: 'tech',
              label2: t('Besoin', 'Need'),
              mid: t('10,08', '10.08'),
              unit2: t('kWh/jour', 'kWh/day'),
              say: t(
                'De juin à septembre, le soleil manque : **c’est là que se joue la fiabilité**.',
                'From June to September, the sun is scarce: **that is where reliability is decided**.',
              ),
              legend: t('Production par mois, kWh', 'Production per month, kWh'),
              legendRight: t('pointillé : besoin moyen', 'dotted: average need'),
              chart: 'bars',
              months: t('J F M A M J J A S O N D', 'J F M A M J J A S O N D').split(' '),
              values: [478, 457, 488, 467, 435, 382, 350, 340, 372, 425, 457, 467],
              low: 0,
              high: 488,
              highlight: 8,
              reference: 307,
              referenceLabel: t('Besoin 307 kWh', 'Need 307 kWh'),
              rows: [
                {
                  title: t('Puissance crête', 'Peak power'),
                  note: t('7 modules de 410 Wc', '7 modules of 410 Wp'),
                  value: t('2,85', '2.85'),
                  unit: t('kWc', 'kWp'),
                },
                {
                  title: t('Stockage', 'Storage'),
                  note: t('Batterie 48 V', '48 V battery'),
                  value: t('6,26', '6.26'),
                  unit: 'kWh',
                },
              ],
            },
          ],
        },
      },
      {
        type: 'fitChart',
        data: {
          title: t('Le point juste.', 'The sweet spot.'),
          text: t(
            'Plus de fiabilité coûte plus cher. KYA-SolDesign cherche la fiabilité que vous visez, au coût le plus bas. Faites glisser pour voir.',
            'More reliability costs more. KYA-SolDesign finds the reliability you aim for, at the lowest cost. Slide to see.',
          ),
          sliderLabel: t('Fiabilité visée (SRI)', 'Target reliability (SRI)'),
          costLabel: t("coût d'un kWh produit", 'cost of a produced kWh'),
          ratioLabel: t('accessibilité (SVI)', 'affordability (SVI)'),
          currency: 'FCFA',
          axisLabel: 'FCFA/kWh',
          gridLabel: t('Réseau · 120 FCFA/kWh', 'Grid · 120 FCFA/kWh'),
          start: 0.903,
          gridPrice: 120,
          base: 62,
          factor: 5.97,
          exponent: 0.8,
          reliableFrom: 0.88,
          low: t(
            'Trop juste : l’énergie manquera trop souvent. Les coupures coûtent plus cher que les panneaux économisés.',
            'Too tight: energy will run short too often. Outages cost more than the panels saved.',
          ),
          over: t(
            'Trop grand : chaque point de fiabilité en plus fait passer le kWh au-dessus du prix du réseau.',
            'Too big: every extra point of reliability pushes the kWh above the grid price.',
          ),
          good: t(
            'Le point juste : fiable, et moins cher que le réseau. C’est ce que KYA-SolDesign cherche pour vous.',
            'The sweet spot: reliable, and cheaper than the grid. That is what KYA-SolDesign finds for you.',
          ),
          note: t(
            'Courbe illustrative, calée sur le projet exemple (0,90 → 100,6 FCFA/kWh). Zone verte : fiable et moins cher que le réseau.',
            'Illustrative curve, fitted to the example project (0.90 → 100.6 FCFA/kWh). Green zone: reliable and cheaper than the grid.',
          ),
        },
      },
      {
        type: 'steps',
        data: {
          title: t('Une étude en trois temps.', 'A study in three stages.'),
          items: [
            {
              title: t('Comprendre le besoin', 'Understand the need'),
              lead: t("Ce qu'il faut alimenter, quand, et où.", 'What must be powered, when, and where.'),
              points: [
                t('Identification du projet et du client', 'Project and customer identification'),
                t('Site et météo réelle, heure par heure', 'Site and real weather, hour by hour'),
                t(
                  'Bilan des consommations : journée type, année composée ou importée',
                  'Load assessment: typical day, composed or imported year',
                ),
              ],
              tag: t('Identification · Site · Besoins', 'Identification · Site · Needs'),
              image: '/images/besoins.webp',
            },
            {
              title: t('Dimensionner', 'Size'),
              lead: t(
                'Le système minimal fiable, puis votre vrai matériel.',
                'The minimal reliable system, then your real equipment.',
              ),
              points: [
                t(
                  'Prédimensionnement : puissance crête, stockage, onduleur',
                  'Pre-sizing: peak power, storage, inverter',
                ),
                t('Dimensionnement avec votre catalogue de matériel', 'Sizing with your equipment catalogue'),
                t("Protections et câbles selon l'IEC 60364-5-52", 'Protections and cables per IEC 60364-5-52'),
              ],
              tag: t('Prédimensionnement · Matériel · Protections', 'Pre-sizing · Equipment · Protections'),
              image: '/images/materiel.webp',
            },
            {
              title: t('Évaluer et chiffrer', 'Assess and cost'),
              lead: t(
                'Ce que coûte le système, et à quel prix le vendre.',
                'What the system costs, and at what price to sell it.',
              ),
              points: [
                t('Coût du kWh sur la durée de vie, comparé au réseau', 'Lifetime kWh cost, compared with the grid'),
                t('Prix de vente et marges par poste', 'Selling price and margins per item'),
                t('Devis, schéma unifilaire, rapport', 'Quote, single-line diagram, report'),
              ],
              tag: t('Évaluation financière · Documents', 'Financial assessment · Documents'),
              image: '/images/chiffrage.webp',
            },
          ],
        },
      },
      {
        type: 'deliverables',
        data: {
          title: t('Ce que vous obtenez.', 'What you get.'),
          intro: t(
            'Chaque document va à la bonne personne : le prix pour votre client, la technique pour ceux qui installent.',
            'Each document goes to the right person: the price for your customer, the technical side for those who install.',
          ),
          items: [
            {
              who: t('Pour votre client final', 'For your end customer'),
              icon: 'users',
              title: t('Le devis.', 'The quote.'),
              text: t(
                "Le prix de l'installation, à votre nom et avec vos marges. Votre client sait ce qu'il paie.",
                'The price of the installation, in your name and with your margins. Your customer knows what they pay.',
              ),
              points: [
                t('Prix par poste, marges comprises', 'Price per item, margins included'),
                t('TVA selon le pays', 'VAT by country'),
                t('PDF et Word', 'PDF and Word'),
              ],
              quoteTitle: t('Devis', 'Quote'),
              quoteRef: t('Centre de santé de Bombouaka · EXEMPLE-001', 'Bombouaka health centre · EXAMPLE-001'),
              quoteDate: t('25/09/2026', '09/25/2026'),
              quoteRows: [
                { label: t('Modules · 7', 'Modules · 7'), amount: t('764 750', '764,750') },
                { label: t('Batteries · 1', 'Batteries · 1'), amount: t('1 322 500', '1,322,500') },
                { label: t('Onduleur · 1', 'Inverter · 1'), amount: t('1 610 000', '1,610,000') },
              ],
              quoteTotalLabel: t('Total hors taxes', 'Total excluding tax'),
              quoteTotal: t('3 697 250 FCFA', '3,697,250 FCFA'),
            },
            {
              who: t('Pour vos techniciens', 'For your technicians'),
              icon: 'file',
              title: t('Le schéma et les documents techniques.', 'The diagram and technical documents.'),
              text: t(
                'Ce qu’il faut pour installer juste, sans refaire les calculs sur le chantier.',
                'What it takes to install right, without redoing the calculations on site.',
              ),
              points: [
                t('Schéma unifilaire, A4 ou A3 paysage', 'Single-line diagram, A4 or A3 landscape'),
                t('Rapport de dimensionnement paginé', 'Paginated sizing report'),
                t('Protections et sections de câbles', 'Protections and cable sections'),
              ],
              image: '/images/unifilaire.webp',
            },
          ],
        },
      },
      {
        type: 'audiences',
        data: {
          title: t('Pour qui ?', 'Who is it for?'),
          items: [
            {
              title: t("Bureaux d'études et installateurs", 'Engineering firms and installers'),
              text: t(
                'Dimensionnez, chiffrez et remettez un dossier complet à chaque client.',
                'Size, cost and hand every customer a complete file.',
              ),
              edition: t('Édition Commerciale', 'Commercial edition'),
              link: { label: t("Voir l'offre", 'See the offer'), href: `${P}/tarifs?edition=commercial#acheter` },
            },
            {
              title: t('Institutions', 'Institutions'),
              text: t(
                'Vérifiez les projets que vous financez ou exploitez, sur des critères communs. Devis possible avant paiement.',
                'Check the projects you fund or operate, on shared criteria. Quote available before payment.',
              ),
              edition: t('Édition Commerciale', 'Commercial edition'),
              link: { label: t('Demander un devis', 'Request a quote'), href: '/contact?sujet=devis' },
            },
            {
              title: t('Enseignement', 'Education'),
              text: t(
                'Écoles et universités : enseignez le dimensionnement sur un logiciel de terrain.',
                'Schools and universities: teach sizing on field-proven software.',
              ),
              edition: t('Édition Académique', 'Academic edition'),
              link: { label: t("Voir l'offre", 'See the offer'), href: `${P}/tarifs?edition=academic#acheter` },
            },
            {
              title: t('Étudiants', 'Students'),
              text: t(
                'Apprenez et préparez vos projets, pour un jour ou pour un mois.',
                'Learn and prepare your projects, for a day or for a month.',
              ),
              edition: t('Édition Étudiant', 'Student edition'),
              link: { label: t("Voir l'offre", 'See the offer'), href: `${P}/tarifs?edition=student#acheter` },
            },
          ],
        },
      },
      {
        type: 'proof',
        data: {
          title: t('La preuve.', 'The proof.'),
          image: '/images/terrain.jpg',
          numbers: [
            { value: '500+', label: t('installations à la base de la méthode', 'installations behind the method') },
            { value: '5', label: t('pays', 'countries'), example: true },
            { value: '12', label: t("établissements d'enseignement", 'educational institutions'), example: true },
            { value: 'ISO', label: t('9001:2015, KYA-Energy Group', '9001:2015, KYA-Energy Group') },
          ],
          quotes: [
            {
              text: t(
                '« Nous remettons maintenant le dossier le jour de la visite. Le client voit tout de suite si le système tiendra, et ce qu’il va payer. »',
                '“We now hand over the file on the day of the visit. The customer sees straight away whether the system will hold, and what they will pay.”',
              ),
              author: t("Responsable technique, bureau d'études, Lomé", 'Technical lead, engineering firm, Lomé'),
              initials: 'BE',
              example: true,
            },
            {
              text: t(
                '« Mes étudiants comprennent enfin pourquoi on ne dimensionne pas sur le jour moyen. Le SRI parle tout seul. »',
                '“My students finally understand why you don’t size on the average day. The SRI speaks for itself.”',
              ),
              author: t("Enseignant, école d'ingénieurs", 'Lecturer, engineering school'),
              initials: 'EN',
              example: true,
            },
            {
              text: t(
                '« Nous comparons les offres de nos prestataires sur les mêmes deux indicateurs. Les discussions sont plus courtes. »',
                '“We compare our contractors’ offers on the same two indicators. Discussions are shorter.”',
              ),
              author: t('Chargé de projets énergie, institution', 'Energy project officer, institution'),
              initials: 'IN',
              example: true,
            },
          ],
        },
      },
      {
        type: 'closing',
        data: {
          title: t('Calculez avant\nde construire.', 'Calculate before\nyou build.'),
          quote: t(
            '« Lequel de vous, s’il veut bâtir une tour, ne s’assied d’abord pour calculer la dépense ? »',
            '“Which of you, intending to build a tower, does not first sit down and count the cost?”',
          ),
          source: t('Luc 14:28', 'Luke 14:28'),
          primary: { label: t('Essayer gratuitement', 'Try for free'), href: '/essai' },
          buy: { label: t('Acheter', 'Buy'), href: `${P}/tarifs#acheter` },
        },
      },
    ],
  };
}

export function pricing(locale: Locale): SeedPage['fr'] {
  const t = tr(locale);
  return {
    title: t('Tarifs de KYA-SolDesign', 'KYA-SolDesign pricing'),
    description: t(
      'Éditions Commerciale, Académique et Étudiant : durées, prix par poste et comparatif.',
      'Commercial, Academic and Student editions: durations, price per seat and comparison.',
    ),
    blocks: [
      {
        type: 'pageHeader',
        data: {
          title: t('Choisissez votre licence.', 'Choose your licence.'),
          intro: t(
            "Une licence par poste, payée en une fois par Mobile Money ou carte. Vous recevez aussitôt votre clé et votre facture d'achat.",
            'One licence per seat, paid once by Mobile Money or card. You get your key and purchase invoice straight away.',
          ),
        },
      },
      {
        type: 'pricing',
        data: {
          callout: t(
            "**Vos projets restent à vous.** À l'échéance, KYA-SolDesign passe en lecture seule après un délai de grâce : vous ouvrez et imprimez vos projets, rien n'est effacé.",
            '**Your projects stay yours.** When the licence ends, KYA-SolDesign becomes read-only after a grace period: you open and print your projects, nothing is erased.',
          ),
          taxNote: t(
            'TVA selon votre pays, calculée à l’étape suivante.',
            'VAT for your country, calculated at the next step.',
          ),
          buy: { label: t('Acheter', 'Buy'), href: '/achat' },
          trial: { label: t('Essayez gratuitement', 'Try for free'), href: '/essai' },
          payments: ['Mobile Money', t('Carte bancaire', 'Bank card'), t('via Semoa', 'via Semoa')],
        },
      },
      {
        type: 'comparison',
        data: {
          title: t('Comparer les éditions.', 'Compare the editions.'),
          intro: t(
            'Les trois éditions calculent de la même façon. Elles diffèrent par ce que vous pouvez remettre et par le nombre de projets.',
            'All three editions calculate the same way. They differ in what you can hand over and in the number of projects.',
          ),
          note: t(
            "Le contenu des éditions est réglé dans l'administration et arrive dans la licence : le changer ne demande pas de nouvelle version du logiciel.",
            'Edition contents are set in the administration and delivered in the licence: changing them needs no new software version.',
          ),
        },
      },
      {
        type: 'noteBand',
        data: {
          items: [
            {
              title: t("Besoin d'un devis avant de payer ?", 'Need a quote before paying?'),
              text: t(
                'Institutions et établissements : nous établissons un devis au nom de votre organisation. Vous payez ensuite en ligne ou par virement.',
                'Institutions: we issue a quote in your organisation’s name. You then pay online or by bank transfer.',
              ),
              link: { label: t('Demander un devis', 'Request a quote'), href: '/contact?sujet=devis' },
            },
            {
              title: t("Essayez d'abord.", 'Try first.'),
              text: t(
                'Un essai gratuit par compte, activé depuis votre espace. Toutes les fonctions, sur le projet exemple et les vôtres.',
                'One free trial per account, activated from your space. Every feature, on the example project and yours.',
              ),
              link: { label: t('Activer mon essai', 'Activate my trial'), href: '/essai' },
            },
            {
              title: t('Plusieurs postes ?', 'Several seats?'),
              text: t(
                'Achetez le nombre de postes voulu, puis attribuez-les à vos collègues depuis votre espace. Un poste libéré se réattribue.',
                'Buy the number of seats you need, then assign them to colleagues from your space. A released seat can be reassigned.',
              ),
              link: { label: t('Voir mon espace', 'Go to my space'), href: '/espace' },
            },
          ],
        },
      },
      {
        type: 'faq',
        data: {
          title: t('Questions sur les licences.', 'Questions about licences.'),
          items: [
            {
              question: t("Que se passe-t-il à l'échéance ?", 'What happens when the licence ends?'),
              answer: t(
                "Vous êtes prévenu avant. À l'échéance commence un délai de grâce (7 jours en Commerciale, 3 en Académique), puis KYA-SolDesign passe en lecture seule : vos projets s'ouvrent et s'impriment, mais ne se modifient plus. Renouvelez depuis votre espace pour tout retrouver.",
                'You are warned beforehand. A grace period then starts (7 days for Commercial, 3 for Academic), after which KYA-SolDesign becomes read-only: your projects open and print but can no longer be edited. Renew from your space to get everything back.',
              ),
            },
            {
              question: t("Puis-je changer d'ordinateur ?", 'Can I change computers?'),
              answer: t(
                'Oui. Libérez le poste depuis votre espace, puis activez KYA-SolDesign sur le nouvel ordinateur avec votre compte ou votre clé.',
                'Yes. Release the seat from your space, then activate KYA-SolDesign on the new computer with your account or key.',
              ),
            },
            {
              question: t('Faut-il une connexion Internet ?', 'Do I need an Internet connection?'),
              answer: t(
                "Pour l'activation et pour télécharger la météo d'un nouveau site. Le reste fonctionne hors ligne ; la licence se vérifie à la prochaine connexion.",
                'For activation and to download the weather of a new site. Everything else works offline; the licence is checked at the next connection.',
              ),
            },
            {
              question: t('Quelle facture vais-je recevoir ?', 'Which invoice will I receive?'),
              answer: t(
                "Une facture d'achat au nom indiqué lors du paiement, envoyée par courriel et disponible dans votre espace, rubrique Factures d'achat.",
                'A purchase invoice in the name given at payment, sent by email and available in your space, under Purchase invoices.',
              ),
            },
          ],
        },
      },
    ],
  };
}

export function resources(locale: Locale): SeedPage['fr'] {
  const t = tr(locale);
  return {
    title: t('Ressources KYA-SolDesign', 'KYA-SolDesign resources'),
    description: t(
      'Le guide, des vidéos courtes, le projet exemple et les nouveautés de chaque version.',
      'The guide, short videos, the example project and what’s new in each version.',
    ),
    blocks: [
      {
        type: 'pageHeader',
        data: {
          title: t('Apprendre, pratiquer, suivre.', 'Learn, practise, keep up.'),
          intro: t(
            'Le guide, des vidéos courtes, le projet exemple et les nouveautés de chaque version.',
            'The guide, short videos, the example project and what’s new in each version.',
          ),
        },
      },
      {
        type: 'resources',
        data: {
          items: [
            {
              kind: t("Guide d'utilisation", 'User guide'),
              title: t('Le guide, étape par étape.', 'The guide, step by step.'),
              text: t(
                'Du site au schéma unifilaire : chaque écran expliqué, avec ses règles de calcul.',
                'From the site to the single-line diagram: every screen explained, with its calculation rules.',
              ),
              image: '/images/besoins.webp',
              link: { label: t('Lire le guide', 'Read the guide'), href: `${P}/guide` },
            },
            {
              kind: t('Tutoriel vidéo', 'Video tutorial'),
              title: t('Votre premier projet en 20 minutes.', 'Your first project in 20 minutes.'),
              text: t(
                'Un centre de santé, de la saisie des besoins au devis.',
                'A health centre, from entering the needs to the quote.',
              ),
              image: '/images/predim.webp',
              duration: '18:40',
              example: true,
              link: { label: t('Voir la vidéo', 'Watch the video'), href: `${P}/support` },
            },
            {
              kind: t('Tutoriel vidéo', 'Video tutorial'),
              title: t("Lire la fiabilité et l'accessibilité.", 'Reading reliability and affordability.'),
              text: t(
                'Ce que disent SRI et SVI, et comment les expliquer à votre client.',
                'What SRI and SVI say, and how to explain them to your customer.',
              ),
              image: '/images/chiffrage.webp',
              duration: '06:15',
              example: true,
              link: { label: t('Voir la vidéo', 'Watch the video'), href: `${P}/support` },
            },
            {
              kind: t('Projet exemple', 'Example project'),
              title: t('Centre de santé de Bombouaka.', 'Bombouaka health centre.'),
              text: t(
                'Le projet livré avec le logiciel, à ouvrir pour tout essayer sans rien saisir.',
                'The project shipped with the software, to try everything without typing anything.',
              ),
              image: '/images/materiel.webp',
              link: { label: t('Voir le projet', 'See the project'), href: `${P}/guide` },
            },
            {
              kind: t('La méthode', 'The method'),
              title: t('Pourquoi deux indicateurs.', 'Why two indicators.'),
              text: t(
                "La méthode de dimensionnement éprouvée sur plus de 500 installations en Afrique de l'Ouest.",
                'The sizing method proven on more than 500 installations in West Africa.',
              ),
              image: '/images/unifilaire.webp',
              link: { label: t('Lire la méthode', 'Read the method'), href: `${P}/guide#la-methode` },
            },
            {
              kind: t('Formations', 'Training'),
              title: t('Sessions en groupe ou sur site.', 'Group or on-site sessions.'),
              text: t(
                'Pour vos équipes ou vos étudiants. Calendrier et programme à venir.',
                'For your teams or your students. Schedule and programme coming soon.',
              ),
              example: true,
              link: { label: t('Nous écrire', 'Write to us'), href: '/contact?sujet=formation' },
            },
          ],
        },
      },
      {
        type: 'releases',
        data: {
          title: t('Nouveautés.', 'What’s new.'),
          intro: t(
            'Chaque version est signée et arrive seule sur votre poste. Les notes complètes s’affichent dans le logiciel à la mise à jour.',
            'Every version is signed and arrives on its own on your computer. Full notes show in the software when it updates.',
          ),
          items: [
            {
              version: '1.2.1',
              date: '2026-09-25',
              title: t('Mises à jour vérifiées à chaque démarrage.', 'Updates checked at every start.'),
              text: t(
                'KYA-SolDesign cherche une nouvelle version à chaque lancement, dès qu’il est en ligne.',
                'KYA-SolDesign looks for a new version at every launch, as soon as it is online.',
              ),
              download: { label: t('Télécharger', 'Download'), href: '/espace' },
            },
            {
              version: '1.2.0',
              date: '2026-09-25',
              title: t('Licences, rapport paginé, schéma paysage.', 'Licences, paginated report, landscape diagram.'),
              text: t(
                'Éditions Commerciale, Académique et Étudiant ; rapport A4 paginé ; schéma unifilaire en paysage ; mises à jour automatiques ; avis et signalements depuis le logiciel.',
                'Commercial, Academic and Student editions; paginated A4 report; landscape single-line diagram; automatic updates; feedback and reports from the software.',
              ),
            },
            {
              version: '1.1.0',
              date: '2026-09-24',
              title: t('Une expérience repensée de bout en bout.', 'An experience redesigned end to end.'),
              text: t(
                'Sources de consommation, optimisation sur vos références simulée sur l’année, émission et révisions du dossier, projet exemple de Bombouaka.',
                'Load sources, optimisation on your references simulated over the year, issuing and revising the file, Bombouaka example project.',
              ),
            },
            {
              version: '1.0.0',
              date: '2026-09-24',
              title: t('Le logiciel de bureau.', 'The desktop software.'),
              text: t(
                'Première version Windows de KYA-SolDesign, installateur signé, fonctionnement hors ligne.',
                'First Windows version of KYA-SolDesign, signed installer, works offline.',
              ),
            },
          ],
        },
      },
    ],
  };
}

export function support(locale: Locale): SeedPage['fr'] {
  const t = tr(locale);
  return {
    title: t('Support KYA-SolDesign', 'KYA-SolDesign support'),
    description: t(
      'Démarrer, questions fréquentes et moyens de joindre l’équipe KYA.',
      'Getting started, frequently asked questions and ways to reach the KYA team.',
    ),
    blocks: [
      {
        type: 'pageHeader',
        data: {
          title: t('Comment pouvons-nous aider ?', 'How can we help?'),
          searchPlaceholder: t(
            'Rechercher : activer, poste, facture, météo…',
            'Search: activate, seat, invoice, weather…',
          ),
          shortcuts: [
            { link: { label: t('Démarrer', 'Get started'), href: '#demarrer' } },
            { link: { label: t('Questions fréquentes', 'FAQ'), href: '#questions' } },
            { link: { label: t('Contacter le support', 'Contact support'), href: '#contacter' } },
          ],
        },
      },
      {
        type: 'startGuide',
        data: {
          title: t('Démarrer en trois gestes', 'Get started in three steps'),
          steps: [
            {
              title: t('Télécharger', 'Download'),
              text: t(
                "L'installateur est dans votre espace, rubrique Téléchargements.",
                'The installer is in your space, under Downloads.',
              ),
            },
            {
              title: t('Installer', 'Install'),
              text: t(
                "Double-cliquez, suivez l'assistant. Aucune connexion n'est nécessaire.",
                'Double-click and follow the wizard. No connection is needed.',
              ),
            },
            {
              title: t("Activer l'essai ou la licence", 'Activate the trial or licence'),
              text: t(
                'Au premier lancement, connectez-vous avec votre compte ou collez votre clé.',
                'At first launch, sign in with your account or paste your key.',
              ),
            },
          ],
          action: { label: t('Télécharger KYA-SolDesign', 'Download KYA-SolDesign'), href: '/espace' },
          requirementsTitle: t('Configuration requise', 'System requirements'),
          requirements: [
            { label: t('Système', 'System'), value: t('Windows 10 ou 11, 64 bits', 'Windows 10 or 11, 64-bit') },
            {
              label: t('Composants', 'Components'),
              value: t("WebView2, fourni par l'installateur", 'WebView2, provided by the installer'),
            },
            {
              label: 'Internet',
              value: t(
                "Pour activer la licence, la météo d'un nouveau site et les mises à jour",
                'To activate the licence, fetch a new site’s weather and update',
              ),
            },
            { label: t('Langues', 'Languages'), value: t('Français, anglais', 'French, English') },
          ],
        },
      },
      {
        type: 'faq',
        data: {
          title: t('Questions fréquentes.', 'Frequently asked questions.'),
          anchor: 'questions',
          items: [
            {
              question: t('Comment activer mon essai ?', 'How do I activate my trial?'),
              answer: t(
                "Depuis la page Essai, connectez-vous puis cliquez sur « Activer mon essai ». L'essai s'active une fois par compte. Ouvrez ensuite KYA-SolDesign et connectez-vous, ou collez la clé d'essai affichée.",
                'From the Trial page, sign in and click “Activate my trial”. The trial activates once per account. Then open KYA-SolDesign and sign in, or paste the trial key shown.',
              ),
            },
            {
              question: t("Comment changer d'ordinateur ?", 'How do I change computers?'),
              answer: t(
                "Dans votre espace, Licences : libérez le poste de l'ancien ordinateur. Activez ensuite KYA-SolDesign sur le nouveau avec votre compte.",
                'In your space, Licences: release the seat of the old computer. Then activate KYA-SolDesign on the new one with your account.',
              ),
            },
            {
              question: t('La météo du site ne se télécharge pas.', 'The site weather does not download.'),
              answer: t(
                "La météo vient de PVGIS et demande une connexion. Vérifiez la connexion, puis relancez depuis l'étape Choix du site. Une météo déjà téléchargée reste disponible hors ligne.",
                'Weather comes from PVGIS and needs a connection. Check the connection, then retry from the Site selection step. Weather already downloaded stays available offline.',
              ),
            },
            {
              question: t('Où trouver mes projets ?', 'Where are my projects?'),
              answer: t(
                'Sur votre ordinateur, dans le dossier `Documents\\KYA-SolDesign`. Ils vous appartiennent et restent lisibles même après l’échéance de la licence.',
                'On your computer, in the `Documents\\KYA-SolDesign` folder. They belong to you and stay readable even after the licence ends.',
              ),
            },
            {
              question: t('Comment attribuer un poste à un collègue ?', 'How do I assign a seat to a colleague?'),
              answer: t(
                'Espace client, Licences, « Attribuer un poste » : saisissez son courriel. Il reçoit une invitation et active KYA-SolDesign avec son propre compte.',
                'Customer space, Licences, “Assign a seat”: enter their email. They get an invitation and activate KYA-SolDesign with their own account.',
              ),
            },
          ],
        },
      },
      {
        type: 'contactWays',
        data: {
          title: t("Parler à l'équipe.", 'Talk to the team.'),
          intro: t(
            'Du lundi au vendredi, de 8 h à 17 h (GMT). Réponse sous un jour ouvré.',
            'Monday to Friday, 8 am to 5 pm (GMT). Answer within one working day.',
          ),
          items: [
            {
              icon: 'whatsapp',
              title: 'WhatsApp',
              text: t('Numéro à fournir.', 'Number to come.'),
              example: true,
              link: { label: t('Écrire sur WhatsApp', 'Write on WhatsApp'), href: '/contact?sujet=support' },
            },
            {
              icon: 'mail',
              title: t('Formulaire', 'Form'),
              text: t(
                'Votre demande est suivie dans votre espace, avec nos réponses.',
                'Your request is tracked in your space, with our answers.',
              ),
              link: { label: t('Écrire au support', 'Write to support'), href: '/contact?sujet=support' },
            },
            {
              icon: 'chat',
              title: t('Mes demandes', 'My requests'),
              text: t(
                'Retrouvez vos échanges et leur état. Connexion requise.',
                'Find your conversations and their status. Sign-in required.',
              ),
              link: { label: t('Voir mes demandes', 'See my requests'), href: '/espace' },
            },
            {
              icon: 'shield',
              title: t('Signaler un problème', 'Report a problem'),
              text: t(
                'Depuis le logiciel : Aide → Signaler un problème. Le diagnostic est joint si vous l’acceptez.',
                'From the software: Help → Report a problem. The diagnostics are attached if you agree.',
              ),
              link: { label: t('Signaler ici', 'Report here'), href: '/contact?sujet=probleme' },
            },
          ],
        },
      },
    ],
  };
}

export function guide(locale: Locale): SeedPage['fr'] {
  const t = tr(locale);
  const body =
    locale === 'fr'
      ? `## Installer et activer

Téléchargez l'installateur depuis votre espace, rubrique **Téléchargements**, puis lancez-le. Il fonctionne sur Windows 10 et 11 (64 bits) et n'a pas besoin d'Internet pour s'installer.

Au premier lancement, connectez-vous avec votre compte KYA-EnergyMarket, ou collez votre clé de licence ou d'essai :

- **Compte** : la licence attribuée à votre compte s'active seule ;
- **Clé** : utile sur un poste sans navigateur, ou pour une clé reçue par courriel.

Une connexion est utile pour activer la licence et télécharger la météo d'un nouveau site. Tout le reste fonctionne hors ligne.

## Les huit étapes

Un dossier suit toujours le même ordre. Chaque étape nourrit la suivante, et le panneau de droite montre en permanence la fiabilité et l'accessibilité du projet.

1. Identification du projet
2. Choix du site et météo
3. Bilan des consommations
4. Prédimensionnement
5. Dimensionnement
6. Protections et câblerie
7. Évaluation financière
8. Vue synoptique et rapports

## La méthode

Deux indicateurs résument une étude. Le premier dit si le système tiendra, le second s'il sera moins cher que le réseau.

### Fiabilité technique : SRI

**SRI = (1 − LPSP) × (1 − LOLP)**. LPSP est la part d'énergie non servie sur l'année, LOLP la part des heures où il en manque. Sur le projet exemple : (1 − 0,041) × (1 − 0,058) = 0,90.

### Accessibilité économique : SVI

**SVI = coût du kWh produit ÷ prix du kWh du réseau**. Sur le projet exemple : 100,6 ÷ 120 = 0,84. En dessous de 1, l'énergie produite coûte moins cher que celle du réseau.

## Les documents

À l'étape 8, KYA-SolDesign prépare deux familles de documents :

- pour votre client final : le **devis** ;
- pour vos techniciens : le **schéma unifilaire**, le **rapport de dimensionnement** et la **liste des protections**.

Tous s'impriment en PDF et, selon l'édition, s'exportent en Word.`
      : `## Install and activate

Download the installer from your space, under **Downloads**, then run it. It works on Windows 10 and 11 (64-bit) and needs no Internet to install.

At first launch, sign in with your KYA-EnergyMarket account, or paste your licence or trial key:

- **Account**: the licence assigned to your account activates on its own;
- **Key**: useful on a computer without a browser, or for a key received by email.

A connection is useful to activate the licence and download the weather of a new site. Everything else works offline.

## The eight steps

A file always follows the same order. Each step feeds the next, and the right-hand panel always shows the project's reliability and affordability.

1. Project identification
2. Site selection and weather
3. Load assessment
4. Pre-sizing
5. Sizing
6. Protections and cabling
7. Financial assessment
8. Overview and reports

## The method

Two indicators sum up a study. The first says whether the system will hold, the second whether it will be cheaper than the grid.

### Technical reliability: SRI

**SRI = (1 − LPSP) × (1 − LOLP)**. LPSP is the share of energy not served over the year, LOLP the share of hours with a shortage. On the example project: (1 − 0.041) × (1 − 0.058) = 0.90.

### Economic affordability: SVI

**SVI = cost of a produced kWh ÷ grid kWh price**. On the example project: 100.6 ÷ 120 = 0.84. Below 1, the energy produced costs less than grid energy.

## The documents

At step 8, KYA-SolDesign prepares two families of documents:

- for your end customer: the **quote**;
- for your technicians: the **single-line diagram**, the **sizing report** and the **list of protections**.

All print to PDF and, depending on the edition, export to Word.`;
  return {
    title: t("Guide d'utilisation", 'User guide'),
    description: t(
      'KYA-SolDesign 1.2 · de l’installation au dossier remis.',
      'KYA-SolDesign 1.2 · from installation to the delivered file.',
    ),
    blocks: [
      {
        type: 'pageHeader',
        data: {
          title: t("Guide d'utilisation.", 'User guide.'),
          intro: t(
            'KYA-SolDesign 1.2 · de l’installation au dossier remis.',
            'KYA-SolDesign 1.2 · from installation to the delivered file.',
          ),
        },
      },
      { type: 'markdown', data: { body, toc: true } },
    ],
  };
}
