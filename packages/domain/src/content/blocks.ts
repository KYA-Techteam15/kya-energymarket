import { z } from 'zod';
import { f, zodForFields, type FieldLabel, type Fields } from './fields.ts';

/**
 * Types de blocs des pages composées (spec 004, FR-003), issus de `design/v5`. Chaque type : un nom,
 * une description pour l'éditeur et le MCP, ses champs. Les blocs « liés » (tarifs, comparatif) ne
 * portent aucune donnée du catalogue : la page les lit au rendu.
 */
export interface BlockDefinition {
  readonly type: string;
  readonly label: FieldLabel;
  readonly description: FieldLabel;
  readonly fields: Fields;
  /** Données du catalogue que le rendu doit charger. */
  readonly linked?: 'catalog';
}

const ICONS = [
  'users',
  'file',
  'mail',
  'chat',
  'shield',
  'whatsapp',
  'phone',
  'book',
  'download',
  'sun',
  'coins',
  'lock',
];
const iconField = f.select(
  'Icône',
  'Icon',
  ICONS.map((value) => ({ value, label: f.label(value, value) })),
);
const example = f.flag('Valeur d’exemple (affiche « exemple »)', 'Example value (shows “example”)');
const title = f.text('Titre', 'Title', { max: 140 });
const intro = f.longText('Introduction', 'Introduction', { optional: true });

const define = (
  type: string,
  label: [string, string],
  description: [string, string],
  fields: Fields,
  linked?: 'catalog',
): BlockDefinition => ({
  type,
  label: f.label(...label),
  description: f.label(...description),
  fields,
  ...(linked ? { linked } : {}),
});

export const BLOCKS: readonly BlockDefinition[] = [
  define(
    'pageHeader',
    ['En-tête de page', 'Page header'],
    ['Grand titre et introduction.', 'Big title and introduction.'],
    {
      title,
      intro,
      searchPlaceholder: f.text('Recherche (texte d’invite)', 'Search (placeholder)', {
        optional: true,
        help: f.label(
          'Affiche un champ qui filtre les questions de la page.',
          'Shows a field that filters the questions on the page.',
        ),
      }),
      shortcuts: f.list('Raccourcis', 'Shortcuts', { link: f.link('Lien', 'Link') }, { optional: true, max: 8 }),
    },
  ),
  define(
    'hero',
    ['Héros', 'Hero'],
    ['Photo pleine largeur, promesse, deux actions.', 'Full-width photo, promise, two actions.'],
    {
      title: f.text('Promesse', 'Promise', { max: 160 }),
      text: f.longText('Texte', 'Text', { max: 400 }),
      image: f.media('Photo', 'Photo'),
      flip: f.flag('Retourner la photo (sujet à droite)', 'Flip the photo (subject on the right)'),
      primary: f.link('Action principale', 'Primary action'),
      secondary: f.link('Action secondaire', 'Secondary action', { optional: true }),
    },
  ),
  define('facts', ['Repères', 'Key facts'], ['2 à 4 chiffres avec légende.', '2 to 4 figures with a caption.'], {
    items: f.list(
      'Repères',
      'Facts',
      { value: f.text('Valeur', 'Value', { max: 20 }), label: f.text('Légende', 'Caption'), example },
      { min: 2, max: 4, titleField: 'value' },
    ),
  }),
  define(
    'screenshot',
    ['Capture', 'Screenshot'],
    ['Capture réelle du logiciel, dans sa fenêtre.', 'Real software screenshot in its window.'],
    {
      title,
      intro,
      image: f.media('Capture', 'Screenshot'),
      windowTitle: f.text('Barre de la fenêtre', 'Window bar', { optional: true }),
      caption: f.text('Légende', 'Caption', { optional: true }),
      captionRight: f.text('Légende (droite)', 'Caption (right)', { optional: true }),
    },
  ),
  define(
    'twoColumns',
    ['Texte en deux colonnes', 'Two columns'],
    ['Deux cas opposés, avec une réglette.', 'Two opposite cases, with a scale.'],
    {
      title,
      intro,
      columns: f.list(
        'Colonnes',
        'Columns',
        { title: f.text('Titre', 'Title'), text: f.longText('Texte', 'Text'), points: f.points('Points', 'Points') },
        { min: 2, max: 2, titleField: 'title' },
      ),
      scale: f.points('Réglette (trois mots)', 'Scale (three words)', { optional: true, max: 3 }),
    },
  ),
  define(
    'interactiveExample',
    ['Exemple interactif', 'Interactive example'],
    [
      'Deux jauges, puis un projet exemple à explorer par onglets.',
      'Two gauges, then an example project explored by tabs.',
    ],
    {
      title,
      intro,
      gauges: f.list(
        'Jauges',
        'Gauges',
        {
          value: f.number('Valeur (0 à 1)', 'Value (0 to 1)', { min: 0, max: 1 }),
          kind: f.select('Couleur', 'Colour', [
            { value: 'tech', label: f.label('Fiabilité (vert)', 'Reliability (green)') },
            { value: 'eco', label: f.label('Économie (jaune)', 'Economics (yellow)') },
          ]),
          title: f.text('Titre', 'Title'),
          text: f.longText('Texte', 'Text'),
        },
        { max: 2, titleField: 'title' },
      ),
      brand: f.text('Nom du logiciel', 'Software name'),
      projectName: f.text('Projet exemple', 'Example project'),
      period: f.text('Période', 'Period'),
      note: f.text('Note', 'Note'),
      views: f.list(
        'Onglets',
        'Tabs',
        {
          tab: f.text('Onglet', 'Tab', { max: 30 }),
          icon: iconField,
          label: f.text('Indicateur', 'Indicator'),
          big: f.text('Grand nombre', 'Big number', { max: 12 }),
          unit: f.text('Unité', 'Unit', { max: 20 }),
          gauge: f.number('Jauge (0 à 1, facultative)', 'Gauge (0 to 1, optional)', { min: 0, max: 1, optional: true }),
          gaugeKind: f.select('Couleur de la jauge', 'Gauge colour', [
            { value: 'tech', label: f.label('Fiabilité', 'Reliability') },
            { value: 'eco', label: f.label('Économie', 'Economics') },
          ]),
          label2: f.text('Second indicateur', 'Second indicator'),
          mid: f.text('Valeur', 'Value', { max: 12 }),
          unit2: f.text('Unité', 'Unit', { max: 20 }),
          say: f.markdown('Phrase de lecture', 'Reading sentence', { max: 300 }),
          legend: f.text('Légende du graphique', 'Chart legend'),
          legendRight: f.text('Légende (droite)', 'Legend (right)'),
          chart: f.select('Graphique', 'Chart', [
            { value: 'bars', label: f.label('Barres par mois', 'Monthly bars') },
            { value: 'compare', label: f.label('Comparaison', 'Comparison') },
          ]),
          months: f.points('Mois (12 lettres)', 'Months (12 letters)', { optional: true, max: 12 }),
          values: f.numbers('Valeurs par mois', 'Monthly values', { optional: true, max: 12 }),
          low: f.number('Bas de l’échelle', 'Scale low', { optional: true }),
          high: f.number('Haut de l’échelle', 'Scale high', { optional: true }),
          highlight: f.number('Mois mis en avant (1 à 12)', 'Highlighted month (1 to 12)', {
            optional: true,
            min: 1,
            max: 12,
            integer: true,
          }),
          reference: f.number('Ligne de référence', 'Reference line', { optional: true }),
          referenceLabel: f.text('Libellé de la référence', 'Reference label', { optional: true }),
          compare: f.list(
            'Comparaison',
            'Comparison',
            {
              name: f.text('Nom', 'Name'),
              value: f.number('Valeur', 'Value'),
              highlight: f.flag('Mise en avant', 'Highlighted'),
            },
            { optional: true, max: 4, titleField: 'name' },
          ),
          rows: f.list(
            'Lignes',
            'Rows',
            {
              title: f.text('Titre', 'Title'),
              note: f.text('Précision', 'Detail'),
              value: f.text('Valeur', 'Value', { max: 20 }),
              unit: f.text('Unité', 'Unit', { optional: true, max: 20 }),
            },
            { max: 4, titleField: 'title' },
          ),
        },
        { min: 1, max: 4, titleField: 'tab' },
      ),
    },
  ),
  define(
    'fitChart',
    ['Graphique réglable', 'Adjustable chart'],
    [
      'Le « point juste » : coût du kWh selon la fiabilité visée.',
      'The “sweet spot”: kWh cost against target reliability.',
    ],
    {
      title,
      text: f.longText('Texte', 'Text'),
      sliderLabel: f.text('Libellé du curseur', 'Slider label'),
      costLabel: f.text('Légende du coût', 'Cost caption'),
      ratioLabel: f.text('Légende du rapport', 'Ratio caption'),
      currency: f.text('Unité monétaire', 'Currency', { max: 10 }),
      axisLabel: f.text('Titre de l’axe', 'Axis title', { max: 20 }),
      gridLabel: f.text('Libellé du réseau', 'Grid label'),
      start: f.number('Fiabilité de départ', 'Starting reliability', { min: 0.8, max: 0.99 }),
      gridPrice: f.number('Prix du réseau', 'Grid price', { min: 1 }),
      base: f.number('Courbe : coût de base', 'Curve: base cost', { min: 0 }),
      factor: f.number('Courbe : facteur', 'Curve: factor', { min: 0 }),
      exponent: f.number('Courbe : exposant', 'Curve: exponent', { min: 0.1, max: 3 }),
      reliableFrom: f.number('Fiable à partir de', 'Reliable from', { min: 0.8, max: 0.99 }),
      low: f.longText('Verdict : trop juste', 'Verdict: too small'),
      over: f.longText('Verdict : trop grand', 'Verdict: too big'),
      good: f.longText('Verdict : point juste', 'Verdict: sweet spot'),
      note: f.longText('Note', 'Note'),
    },
  ),
  define(
    'steps',
    ['Étapes', 'Steps'],
    ['Accordéon ; chaque étape change la capture.', 'Accordion; each step changes the screenshot.'],
    {
      title,
      items: f.list(
        'Étapes',
        'Steps',
        {
          title: f.text('Titre', 'Title'),
          lead: f.text('Chapeau', 'Lead'),
          points: f.points('Points', 'Points'),
          tag: f.text('Écrans', 'Screens', { optional: true }),
          image: f.media('Capture', 'Screenshot'),
        },
        { min: 1, max: 6, titleField: 'title' },
      ),
    },
  ),
  define(
    'deliverables',
    ['Livrables', 'Deliverables'],
    [
      'Deux colonnes : pour le client final, pour les techniciens.',
      'Two columns: for the end customer, for technicians.',
    ],
    {
      title,
      intro,
      items: f.list(
        'Livrables',
        'Deliverables',
        {
          who: f.text('Pour qui', 'For whom'),
          icon: iconField,
          title: f.text('Titre', 'Title'),
          text: f.longText('Texte', 'Text'),
          points: f.points('Points', 'Points'),
          image: f.media('Image', 'Image', { optional: true }),
          quoteTitle: f.text('Devis : titre', 'Quote: title', { optional: true }),
          quoteRef: f.text('Devis : référence', 'Quote: reference', { optional: true }),
          quoteDate: f.text('Devis : date', 'Quote: date', { optional: true }),
          quoteRows: f.list(
            'Devis : lignes',
            'Quote: rows',
            { label: f.text('Ligne', 'Row'), amount: f.text('Montant', 'Amount', { max: 20 }) },
            { optional: true, max: 6, titleField: 'label' },
          ),
          quoteTotalLabel: f.text('Devis : libellé du total', 'Quote: total label', { optional: true }),
          quoteTotal: f.text('Devis : total', 'Quote: total', { optional: true }),
        },
        { min: 1, max: 2, titleField: 'title' },
      ),
    },
  ),
  define(
    'audiences',
    ['Pour qui', 'Who it is for'],
    ['Profils et édition conseillée.', 'Profiles and recommended edition.'],
    {
      title,
      items: f.list(
        'Profils',
        'Profiles',
        {
          title: f.text('Profil', 'Profile'),
          text: f.longText('Texte', 'Text'),
          edition: f.text('Édition', 'Edition'),
          link: f.link('Lien', 'Link'),
        },
        { min: 1, max: 6, titleField: 'title' },
      ),
    },
  ),
  define('proof', ['Preuve', 'Proof'], ['Photo, chiffres et témoignages.', 'Photo, figures and testimonials.'], {
    title,
    image: f.media('Photo', 'Photo'),
    numbers: f.list(
      'Chiffres',
      'Figures',
      { value: f.text('Valeur', 'Value', { max: 12 }), label: f.text('Légende', 'Caption'), example },
      { max: 4, titleField: 'value' },
    ),
    quotes: f.list(
      'Témoignages',
      'Testimonials',
      {
        text: f.longText('Citation', 'Quote'),
        author: f.text('Auteur', 'Author'),
        initials: f.text('Initiales', 'Initials', { max: 3 }),
        example,
      },
      { max: 6, titleField: 'author' },
    ),
  }),
  define('closing', ['Clôture', 'Closing'], ['Très grand titre, citation, actions.', 'Giant title, quote, actions.'], {
    title: f.longText('Grand titre (retours à la ligne permis)', 'Giant title (line breaks allowed)', { max: 120 }),
    quote: f.longText('Citation', 'Quote', { optional: true }),
    source: f.text('Source', 'Source', { optional: true }),
    primary: f.link('Action principale', 'Primary action'),
    buy: f.link('Acheter', 'Buy', { optional: true }),
  }),
  define(
    'pricing',
    ['Tarifs', 'Pricing'],
    [
      'Choix de l’édition, de la durée et des postes ; prix lus dans le catalogue.',
      'Choose edition, duration and seats; prices read from the catalogue.',
    ],
    {
      callout: f.markdown('Encadré', 'Callout', { optional: true, max: 600 }),
      taxNote: f.text('Note sur la TVA', 'Tax note'),
      buy: f.link('Acheter', 'Buy'),
      trial: f.link('Essayer', 'Try'),
      payments: f.points('Moyens de paiement', 'Payment methods', { max: 4 }),
    },
    'catalog',
  ),
  define(
    'comparison',
    ['Comparatif', 'Comparison'],
    [
      'Fonctions et limites des éditions, lues dans le catalogue.',
      'Edition features and limits, read from the catalogue.',
    ],
    { title, intro, note: f.longText('Note', 'Note', { optional: true }) },
    'catalog',
  ),
  define(
    'noteBand',
    ['Encarts', 'Callouts'],
    ['Deux ou trois encarts avec un lien.', 'Two or three callouts with a link.'],
    {
      items: f.list(
        'Encarts',
        'Callouts',
        { title: f.text('Titre', 'Title'), text: f.longText('Texte', 'Text'), link: f.link('Lien', 'Link') },
        { min: 2, max: 3, titleField: 'title' },
      ),
    },
  ),
  define('faq', ['Questions', 'Questions'], ['Questions et réponses en Markdown.', 'Questions and Markdown answers.'], {
    title,
    anchor: f.text('Ancre (#…)', 'Anchor (#…)', {
      optional: true,
      max: 40,
      help: f.label(
        'Permet un lien direct vers ce groupe de questions.',
        'Allows a direct link to this group of questions.',
      ),
    }),
    items: f.list(
      'Questions',
      'Questions',
      {
        question: f.text('Question', 'Question', { max: 200 }),
        answer: f.markdown('Réponse', 'Answer', { max: 4000 }),
      },
      { min: 1, max: 40, titleField: 'question' },
    ),
  }),
  define(
    'markdown',
    ['Texte Markdown', 'Markdown text'],
    ['Texte libre (guide, pages légales), avec sommaire.', 'Free text (guide, legal pages), with contents.'],
    {
      body: f.markdown('Texte', 'Text'),
      toc: f.flag('Afficher le sommaire', 'Show table of contents'),
    },
  ),
  define(
    'resources',
    ['Ressources', 'Resources'],
    ['Cartes : guide, vidéos, projet exemple, formations.', 'Cards: guide, videos, example project, training.'],
    {
      items: f.list(
        'Ressources',
        'Resources',
        {
          kind: f.text('Nature', 'Kind'),
          title: f.text('Titre', 'Title'),
          text: f.longText('Texte', 'Text'),
          image: f.media('Image', 'Image', { optional: true }),
          link: f.link('Lien', 'Link'),
          duration: f.text('Durée (vidéo)', 'Duration (video)', { optional: true, max: 8 }),
          example,
        },
        { min: 1, max: 12, titleField: 'title' },
      ),
    },
  ),
  define('releases', ['Versions', 'Releases'], ['Nouveautés de chaque version.', 'What’s new in each version.'], {
    title,
    intro,
    items: f.list(
      'Versions',
      'Releases',
      {
        version: f.text('Version', 'Version', { max: 20 }),
        date: f.text('Date (AAAA-MM-JJ)', 'Date (YYYY-MM-DD)', { max: 10 }),
        title: f.text('Titre', 'Title'),
        text: f.longText('Texte', 'Text'),
        download: f.link('Téléchargement', 'Download', { optional: true }),
      },
      { max: 20, titleField: 'version' },
    ),
  }),
  define(
    'startGuide',
    ['Démarrer', 'Get started'],
    ['Étapes de démarrage et configuration requise.', 'Getting-started steps and requirements.'],
    {
      title,
      steps: f.list(
        'Étapes',
        'Steps',
        { title: f.text('Titre', 'Title'), text: f.longText('Texte', 'Text') },
        { min: 1, max: 5, titleField: 'title' },
      ),
      action: f.link('Action', 'Action', { optional: true }),
      requirementsTitle: f.text('Titre de la configuration requise', 'Requirements title', { optional: true }),
      requirements: f.list(
        'Configuration requise',
        'Requirements',
        { label: f.text('Élément', 'Item'), value: f.text('Valeur', 'Value') },
        { optional: true, max: 8, titleField: 'label' },
      ),
    },
  ),
  define('contactWays', ['Contacts', 'Contact options'], ['Moyens de joindre l’équipe.', 'Ways to reach the team.'], {
    title,
    intro,
    items: f.list(
      'Moyens',
      'Options',
      {
        icon: iconField,
        title: f.text('Titre', 'Title'),
        text: f.longText('Texte', 'Text'),
        example,
        link: f.link('Lien', 'Link'),
      },
      { min: 1, max: 6, titleField: 'title' },
    ),
  }),
];

export const BLOCK_TYPES = BLOCKS.map((block) => block.type);
export const blockDefinition = (type: string) => BLOCKS.find((block) => block.type === type);

/** Schéma d'un bloc enregistré : identifiant, type connu, champs valides pour ce type. */
export const blockSchema = z
  .object({ id: z.string().min(1).max(64), type: z.string(), data: z.record(z.string(), z.unknown()) })
  .superRefine((block, context) => {
    const definition = blockDefinition(block.type);
    if (!definition) {
      context.addIssue({ code: 'custom', path: ['type'], message: `type de bloc inconnu : ${block.type}` });
      return;
    }
    const parsed = zodForFields(definition.fields).safeParse(block.data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        context.addIssue({ code: 'custom', path: ['data', ...issue.path.map(String)], message: issue.message });
      }
    }
  });

export const blocksSchema = z.array(blockSchema).max(40);
export type Block = z.infer<typeof blockSchema>;
