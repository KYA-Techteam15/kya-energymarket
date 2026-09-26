import type { SeedPage } from './pages.ts';

/** Pages de la marketplace (spec 004, FR-010), reprises de `design/v5`. */
type Locale = 'fr' | 'en';
type Content = SeedPage['fr'];
const tr = (locale: Locale) => (fr: string, en: string) => (locale === 'fr' ? fr : en);

export function help(locale: Locale): Content {
  const t = tr(locale);
  const faq = (title: string, anchor: string, items: [string, string, string, string][]) => ({
    type: 'faq',
    data: { title, anchor, items: items.map(([qf, qe, af, ae]) => ({ question: t(qf, qe), answer: t(af, ae) })) },
  });
  return {
    title: t('Aide', 'Help'),
    description: t('Compte, paiement, factures et licences.', 'Account, payment, invoices and licences.'),
    blocks: [
      {
        type: 'pageHeader',
        data: {
          title: t('Aide.', 'Help.'),
          intro: t(
            'Compte, paiement, factures et licences. Pour l’usage d’un logiciel, voyez son propre support, par exemple celui de KYA-SolDesign.',
            'Account, payment, invoices and licences. For using a piece of software, see its own support, for example KYA-SolDesign’s.',
          ),
          searchPlaceholder: t('Rechercher dans l’aide', 'Search help'),
          shortcuts: [
            { link: { label: t('Compte', 'Account'), href: '#compte' } },
            { link: { label: t('Paiement', 'Payment'), href: '#paiement' } },
            { link: { label: t('Factures', 'Invoices'), href: '#factures' } },
            { link: { label: t('Licences', 'Licences'), href: '#licences' } },
            {
              link: {
                label: t('Support KYA-SolDesign', 'KYA-SolDesign support'),
                href: '/logiciels/kya-soldesign/support',
              },
            },
          ],
        },
      },
      faq(t('Compte', 'Account'), 'compte', [
        [
          'Faut-il un compte pour essayer ?',
          'Do I need an account to try?',
          "Oui. L'essai est rattaché à votre compte, ce qui permet de l'activer une seule fois et de le retrouver dans votre espace.",
          'Yes. The trial is tied to your account, so it is activated once and found again in your space.',
        ],
        [
          'Je travaille pour une organisation. Qui crée le compte ?',
          'I work for an organisation. Who creates the account?',
          'Une personne crée son compte, puis l’organisation depuis son espace, et achète les licences. Elle invite ensuite ses collègues, qui utilisent chacun leur propre compte.',
          'One person creates their account, then the organisation from their space, and buys the licences. They then invite colleagues, who each use their own account.',
        ],
        [
          'J’ai oublié mon mot de passe.',
          'I forgot my password.',
          'Sur la page de connexion, choisissez « Mot de passe oublié ? » : un lien valable une heure vous est envoyé.',
          'On the sign-in page, choose “Forgot your password?”: a link valid for one hour is sent to you.',
        ],
      ]),
      faq(t('Paiement', 'Payment'), 'paiement', [
        [
          'Quels moyens de paiement acceptez-vous ?',
          'Which payment methods do you accept?',
          'Mobile Money et carte bancaire, via Semoa. Les institutions peuvent aussi payer par virement sur devis.',
          'Mobile Money and bank card, via Semoa. Institutions can also pay by bank transfer on a quote.',
        ],
        [
          "Mon paiement Mobile Money n'aboutit pas.",
          'My Mobile Money payment does not go through.',
          "Vérifiez que vous avez confirmé la demande sur votre téléphone dans le délai affiché. Si le montant a été débité sans confirmation de notre part, écrivez au support avec la référence de l'opération.",
          'Check that you confirmed the request on your phone within the time shown. If the amount was debited without confirmation from us, write to support with the transaction reference.',
        ],
        [
          'Les prix incluent-ils la TVA ?',
          'Do prices include VAT?',
          'Les tarifs sont affichés hors taxes. La TVA de votre pays est calculée sur la page d’achat, avant le paiement.',
          'Prices are shown excluding tax. Your country’s VAT is calculated on the purchase page, before payment.',
        ],
      ]),
      faq(t('Factures', 'Invoices'), 'factures', [
        [
          "Où trouver ma facture d'achat ?",
          'Where is my purchase invoice?',
          "Elle arrive par courriel juste après le paiement et reste dans votre espace, rubrique Factures d'achat.",
          'It arrives by email right after payment and stays in your space, under Purchase invoices.',
        ],
        [
          'Puis-je avoir un devis avant de payer ?',
          'Can I get a quote before paying?',
          'Oui, depuis la page [Contact](/contact?sujet=devis), sujet « Devis ». Nous l’établissons au nom de votre organisation.',
          'Yes, from the [Contact](/contact?sujet=devis) page, subject “Quote”. We issue it in your organisation’s name.',
        ],
        [
          'Le devis de KYA-SolDesign, c’est quoi ?',
          'What is the KYA-SolDesign quote?',
          "C'est un document que vous produisez avec KYA-SolDesign pour votre client final : le prix de son installation solaire. Il n'a rien à voir avec la facture d'achat de votre licence.",
          'It is a document you produce with KYA-SolDesign for your end customer: the price of their solar installation. It has nothing to do with your licence’s purchase invoice.',
        ],
      ]),
      faq(t('Licences', 'Licences'), 'licences', [
        [
          "Qu'est-ce qu'un poste ?",
          'What is a seat?',
          'Un ordinateur sur lequel le logiciel est activé. Une licence de trois postes permet trois ordinateurs en même temps.',
          'A computer on which the software is activated. A three-seat licence allows three computers at the same time.',
        ],
        [
          "Que devient mon travail à l'échéance ?",
          'What happens to my work when the licence ends?',
          "Rien n'est effacé. Après un délai de grâce, le logiciel passe en lecture seule : vos projets s'ouvrent et s'impriment. Renouvelez pour les modifier à nouveau.",
          'Nothing is erased. After a grace period, the software becomes read-only: your projects open and print. Renew to edit them again.',
        ],
        [
          "Puis-je passer d'une édition à une autre ?",
          'Can I switch editions?',
          "Oui, en achetant la nouvelle édition. Vos projets restent compatibles d'une édition à l'autre.",
          'Yes, by buying the new edition. Your projects stay compatible across editions.',
        ],
      ]),
      {
        type: 'noteBand',
        data: {
          items: [
            {
              title: t('Pas trouvé ?', 'Not found?'),
              text: t(
                'Écrivez-nous, nous répondons sous un jour ouvré.',
                'Write to us, we answer within one working day.',
              ),
              link: { label: t('Nous écrire', 'Write to us'), href: '/contact' },
            },
            {
              title: t('Utiliser KYA-SolDesign', 'Using KYA-SolDesign'),
              text: t('Démarrer, questions fréquentes et guide.', 'Getting started, FAQ and guide.'),
              link: { label: t('Voir le support', 'See support'), href: '/logiciels/kya-soldesign/support' },
            },
          ],
        },
      },
    ],
  };
}

export function about(locale: Locale): Content {
  const t = tr(locale);
  return {
    title: t('À propos', 'About'),
    description: t(
      'KYA-Energy Group conçoit, installe et étudie des systèmes énergétiques en Afrique de l’Ouest.',
      'KYA-Energy Group designs, installs and studies energy systems in West Africa.',
    ),
    blocks: [
      {
        type: 'pageHeader',
        data: {
          title: t('Des logiciels nés sur le terrain.', 'Software born in the field.'),
          intro: t(
            "KYA-Energy Group conçoit, installe et étudie des systèmes énergétiques en Afrique de l'Ouest. Ses logiciels viennent de ce travail.",
            'KYA-Energy Group designs, installs and studies energy systems in West Africa. Its software comes from that work.',
          ),
        },
      },
      {
        type: 'proof',
        data: {
          title: t('Ce que nous vendons, nous l’utilisons d’abord.', 'What we sell, we use first.'),
          image: '/images/terrain.jpg',
          numbers: [
            { value: '500+', label: t('installations à la base de nos méthodes', 'installations behind our methods') },
            { value: 'ISO', label: '9001:2015' },
            { value: '2020', label: t('premiers utilisateurs de KYA-SolDesign', 'first KYA-SolDesign users') },
            {
              value: '4',
              label: t('logiciels, dont KYA-SolDesign disponible', 'software products, KYA-SolDesign available'),
            },
          ],
          quotes: [],
        },
      },
      {
        type: 'markdown',
        data: {
          body: t(
            "KYA-SolDesign est né d'un besoin interne : dimensionner juste, vite, et pouvoir le prouver au client. La méthode qu'il applique s'est construite sur plus de 500 installations.\n\nKYA-EnergyMarket réunit ces outils, et ceux qui suivront, dans un même endroit : un compte, des licences claires, une facture d'achat, un support qui connaît le terrain.\n\n*Texte de présentation à compléter par KYA-Energy Group.*",
            'KYA-SolDesign was born from an internal need: size right, fast, and be able to prove it to the customer. The method it applies was built on more than 500 installations.\n\nKYA-EnergyMarket brings these tools, and those to come, together in one place: one account, clear licences, a purchase invoice, support that knows the field.\n\n*Presentation text to be completed by KYA-Energy Group.*',
          ),
          toc: false,
        },
      },
      {
        type: 'closing',
        data: {
          title: t('Travaillons\nensemble.', 'Let’s work\ntogether.'),
          quote: t(
            'Une question, une formation, un partenariat : écrivez-nous.',
            'A question, training, a partnership: write to us.',
          ),
          primary: { label: t('Nous écrire', 'Write to us'), href: '/contact' },
        },
      },
    ],
  };
}

export function contact(locale: Locale): Content {
  const t = tr(locale);
  return {
    title: t('Contact', 'Contact'),
    description: t('Écrire à l’équipe KYA-EnergyMarket.', 'Write to the KYA-EnergyMarket team.'),
    blocks: [
      {
        type: 'pageHeader',
        data: {
          title: t('Nous écrire.', 'Write to us.'),
          intro: t(
            'Devis, formation, support ou partenariat. Réponse sous un jour ouvré.',
            'Quote, training, support or partnership. Answer within one working day.',
          ),
        },
      },
      {
        type: 'contactWays',
        data: {
          title: t('Choisissez votre canal.', 'Choose your channel.'),
          intro: t(
            'Le formulaire de contact suivi dans votre espace arrive avec le support (spécification 009). D’ici là :',
            'The contact form tracked in your space comes with support (specification 009). Until then:',
          ),
          items: [
            {
              icon: 'mail',
              title: t('Courriel', 'Email'),
              text: 'website@kya-energy.com',
              link: { label: t('Écrire un courriel', 'Send an email'), href: 'mailto:website@kya-energy.com' },
            },
            {
              icon: 'whatsapp',
              title: 'WhatsApp',
              text: t('Numéro à fournir.', 'Number to come.'),
              example: true,
              link: { label: t('Voir l’aide', 'See help'), href: '/aide' },
            },
          ],
        },
      },
    ],
  };
}

const pending = (locale: Locale, kind: 'essai' | 'achat'): Content => {
  const t = tr(locale);
  const isTrial = kind === 'essai';
  return {
    title: isTrial ? t('Essai gratuit', 'Free trial') : t('Achat', 'Purchase'),
    description: isTrial
      ? t('L’essai gratuit de KYA-SolDesign ouvre bientôt.', 'The KYA-SolDesign free trial opens soon.')
      : t('L’achat en ligne ouvre bientôt.', 'Online purchase opens soon.'),
    blocks: [
      {
        type: 'pageHeader',
        data: {
          title: isTrial
            ? t('L’essai gratuit ouvre bientôt.', 'The free trial opens soon.')
            : t('L’achat en ligne ouvre bientôt.', 'Online purchase opens soon.'),
          intro: isTrial
            ? t(
                'Un essai par compte, activé depuis votre espace. Créez votre compte dès maintenant : vous serez prêt le jour de l’ouverture.',
                'One trial per account, activated from your space. Create your account now: you will be ready on opening day.',
              )
            : t(
                'Mobile Money et carte bancaire via Semoa, facture d’achat immédiate. En attendant, nous établissons un devis au nom de votre organisation.',
                'Mobile Money and bank card via Semoa, instant purchase invoice. Meanwhile, we issue a quote in your organisation’s name.',
              ),
        },
      },
      {
        type: 'noteBand',
        data: {
          items: [
            isTrial
              ? {
                  title: t('Créer mon compte', 'Create my account'),
                  text: t('Une minute, sans carte bancaire.', 'One minute, no bank card.'),
                  link: { label: t('Créer mon compte', 'Create my account'), href: '/connexion?onglet=creer' },
                }
              : {
                  title: t('Demander un devis', 'Request a quote'),
                  text: t('Réponse sous un jour ouvré.', 'Answer within one working day.'),
                  link: { label: t('Demander un devis', 'Request a quote'), href: '/contact?sujet=devis' },
                },
            {
              title: t('Voir les tarifs', 'See pricing'),
              text: t('Éditions, durées et prix par poste.', 'Editions, durations and price per seat.'),
              link: { label: t('Voir les tarifs', 'See pricing'), href: '/logiciels/kya-soldesign/tarifs' },
            },
          ],
        },
      },
    ],
  };
};
export const trial = (locale: Locale) => pending(locale, 'essai');
export const purchase = (locale: Locale) => pending(locale, 'achat');

const legal = (locale: Locale, title: [string, string], body: [string, string]): Content => {
  const t = tr(locale);
  return {
    title: t(...title),
    description: t(...title),
    blocks: [
      {
        type: 'pageHeader',
        data: {
          title: `${t(...title)}.`,
          intro: t(
            'Version provisoire du 25 septembre 2026, à valider par KYA-Energy Group avant publication.',
            'Provisional version of 25 September 2026, to be validated by KYA-Energy Group before publication.',
          ),
        },
      },
      { type: 'markdown', data: { body: t(...body), toc: true } },
    ],
  };
};

export const terms = (locale: Locale) =>
  legal(
    locale,
    ['Conditions générales de vente', 'Terms of sale'],
    [
      `## Objet

Les présentes conditions régissent la vente, sur KYA-EnergyMarket, de licences d'utilisation des logiciels de KYA-Energy Group.

## Compte

Un compte est nécessaire pour essayer, acheter et télécharger. Le titulaire du compte est responsable des accès qu'il accorde aux membres de son organisation.

## Licences, éditions et postes

Une licence donne le droit d'utiliser un logiciel, dans une édition, pour une durée et un nombre de postes. Un poste correspond à un ordinateur ; il peut être libéré et réattribué depuis l'espace client.

## Essai gratuit

Un essai par compte et par logiciel. Sa durée et son contenu sont indiqués sur la page d'essai au moment de l'activation.

## Prix et paiement

Les prix sont affichés hors taxes en francs CFA ; la TVA du pays de facturation est ajoutée avant le paiement. Le paiement se fait par Mobile Money ou carte bancaire via Semoa, ou par virement sur devis.

## Facture d'achat

Une facture d'achat est émise à chaque paiement, au nom indiqué lors de l'achat, envoyée par courriel et disponible dans l'espace client.

## Échéance et lecture seule

À l'échéance, après un délai de grâce propre à l'édition, le logiciel passe en lecture seule. Les projets de l'utilisateur ne sont jamais effacés.

## Droit applicable

À compléter par le service juridique de KYA-Energy Group.`,
      `## Purpose

These terms govern the sale, on KYA-EnergyMarket, of licences to use KYA-Energy Group software.

## Account

An account is required to try, buy and download. The account holder is responsible for the access they grant to members of their organisation.

## Licences, editions and seats

A licence grants the right to use a piece of software, in an edition, for a duration and a number of seats. A seat is one computer; it can be released and reassigned from the customer space.

## Free trial

One trial per account and per software product. Its duration and contents are shown on the trial page at activation.

## Prices and payment

Prices are shown excluding tax in CFA francs; the billing country's VAT is added before payment. Payment is by Mobile Money or bank card via Semoa, or by bank transfer on a quote.

## Purchase invoice

A purchase invoice is issued for every payment, in the name given at purchase, sent by email and available in the customer space.

## Expiry and read-only mode

At expiry, after a grace period specific to the edition, the software becomes read-only. The user's projects are never erased.

## Governing law

To be completed by KYA-Energy Group's legal department.`,
    ],
  );

export const privacy = (locale: Locale) =>
  legal(
    locale,
    ['Politique de confidentialité', 'Privacy policy'],
    [
      `## Données collectées

Données de compte (nom, courriel, organisation), de facturation, et d'utilisation des licences (postes, activations).

## Usage anonyme des logiciels

Les logiciels n'envoient des statistiques d'usage anonymes qu'avec votre accord, modifiable à tout moment dans leurs réglages.

## Paiement

Les données de paiement sont traitées par Semoa. KYA-EnergyMarket n'y a pas accès.

## Vos projets

Les projets créés dans les logiciels restent sur votre ordinateur. Ils ne sont pas envoyés à KYA-EnergyMarket.

## Vos droits

Accès, rectification, suppression : à compléter par le service juridique de KYA-Energy Group.`,
      `## Data collected

Account data (name, email, organisation), billing data, and licence usage data (seats, activations).

## Anonymous software usage

The software only sends anonymous usage statistics with your consent, which you can change at any time in its settings.

## Payment

Payment data is processed by Semoa. KYA-EnergyMarket has no access to it.

## Your projects

Projects created in the software stay on your computer. They are not sent to KYA-EnergyMarket.

## Your rights

Access, rectification, deletion: to be completed by KYA-Energy Group's legal department.`,
    ],
  );

export const legalNotice = (locale: Locale) =>
  legal(
    locale,
    ['Mentions légales', 'Legal notice'],
    [
      `## Éditeur

KYA-Energy Group, Lomé, Togo. Forme, capital, immatriculation et directeur de la publication : à compléter.

## Hébergement

À compléter selon l'hébergeur retenu.

## Propriété intellectuelle

Les logiciels, marques et contenus de KYA-EnergyMarket appartiennent à KYA-Energy Group.`,
      `## Publisher

KYA-Energy Group, Lomé, Togo. Legal form, capital, registration and publication director: to be completed.

## Hosting

To be completed according to the chosen host.

## Intellectual property

The software, trademarks and content of KYA-EnergyMarket belong to KYA-Energy Group.`,
    ],
  );
