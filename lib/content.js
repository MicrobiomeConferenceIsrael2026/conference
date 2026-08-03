'use strict';

/* =============================================================================
 *  EDIT THE CONFERENCE HERE.
 *  Everything the public site displays lives in this one file. Change a string,
 *  save, restart the server (npm start) and the site updates.
 *
 *  Items marked  // TODO  are placeholders you should confirm or replace.
 * ========================================================================== */

module.exports = {
  /* --- identity ---------------------------------------------------------- */
  title: 'Microbiome 2026',
  subtitle: 'Experimental and computational approaches to host-associated microbial communities.',
  shortTitle: 'Microbiome 2026',

  /* --- when & where ------------------------------------------------------ */
  date: 'Sunday, October 25, 2026',
  dateISO: '2026-10-25',
  timeRange: '09:00 – 17:45',
  venue: 'Azrieli Faculty of Medicine, Bar-Ilan University',
  venueCity: 'Safed, Israel',
  venueNote: 'Henrietta Szold St 8, Safed. Parking on campus.',
  mapQuery: 'Azrieli Faculty of Medicine, Bar-Ilan University, Safed, Israel',

  /* --- registration ------------------------------------------------------ */
  fee: 'Free',
  feeNote: 'Free to attend. Coffee, lunch and the poster reception included.',
  registrationDeadline: 'October 11, 2026',
  abstractDeadline: 'September 6, 2026',
  notificationDate: 'September 20, 2026',

  /* --- contact ----------------------------------------------------------- */
  contactName: 'Conference Secretariat', // TODO
  contactEmail: 'microbiome2026@example.ac.il', // TODO replace with the real address
  contactNote: 'Questions about the programme, abstracts, access or travel:',

  /* --- about (keep this to ~50 words) ------------------------------------ */
  about:
    'Host-associated microbial communities are studied at the bench and on the laptop, and neither gets far alone. This meeting puts both in one room: culturing, gnotobiotic models and human trials alongside strain-level inference, statistical modelling and prediction — and the loop that runs between them.',

  audience: [
    'PIs and postdocs in microbiome, immunology and metabolism',
    'Computational biologists and statisticians working with sequencing data',
    'Graduate students — poster and short-talk slots are reserved for trainees',
    'Clinicians and industry scientists',
  ],

  /* --- confirmed speakers ------------------------------------------------
   * Talk titles and blurbs are DRAFTS based on each speaker's published work.
   * Confirm with the speakers before publishing.                            */
  speakers: [
    {
      name: 'Tal Korem',
      affiliation: 'Columbia University',
      role: 'Systems Biology',
      image: '/img/speaker-korem.jpg',
      talk: 'Computational models of the microbiome in pregnancy and preterm birth',
      blurb:
        'Methods that pull mechanism rather than correlation out of microbiome data — microbial growth rates from coverage, strain-level structural variants, microbe-to-metabolite models — applied to predicting spontaneous preterm birth from the vaginal microbiome.',
      links: [{ label: 'koremlab.science', href: 'https://www.koremlab.science/' }],
      provisional: true,
    },
    {
      name: 'Jotham Suez',
      affiliation: 'Johns Hopkins',
      role: 'Molecular Microbiology & Immunology',
      image: '/img/speaker-suez.jpg',
      talk: 'Personalised responses to probiotics, sweeteners and antibiotics',
      blurb:
        'Why interventions assumed to be inert are not: non-nutritive sweeteners shift the gut microbiome and glycaemic response in some people but not others, and probiotic colonisation after antibiotics is person-specific — sometimes delaying recovery of the native community.',
      links: [{ label: 'suezlab.org', href: 'https://www.suezlab.org/' }],
      provisional: true,
    },
    {
      name: 'Inga Peter',
      affiliation: 'Icahn School of Medicine at Mount Sinai',
      role: 'Genetics & Genomic Sciences',
      image: '/img/speaker-peter.jpg',
      talk: 'Host genetics, the early-life microbiome and IBD',
      blurb:
        'How host genotype, the maternal environment and the infant gut community jointly shape IBD risk — including the MECONIUM cohort, which follows bacterial colonisation and immune priming in infants born to mothers with IBD.',
      links: [],
      provisional: true,
    },
  ],

  speakersNote: 'More to be announced. Two short-talk slots go to submitted abstracts.',

  /* --- programme --------------------------------------------------------- */
  programNote: 'Draft, subject to change.',
  program: [
    { time: '08:45', title: 'Registration and coffee', kind: 'break' },
    { time: '09:20', title: 'Welcome', kind: 'admin' },
    {
      time: '09:30',
      title: 'Computational models of the microbiome in pregnancy and preterm birth',
      who: 'Tal Korem',
      kind: 'keynote',
    },
    { time: '10:15', title: 'Measuring communities', kind: 'session' },
    { time: '10:15', title: 'Invited talk', who: 'To be announced', kind: 'talk' },
    { time: '10:45', title: 'Selected abstract', kind: 'short' },
    { time: '11:00', title: 'Coffee', kind: 'break' },
    {
      time: '11:30',
      title: 'Personalised responses to probiotics, sweeteners and antibiotics',
      who: 'Jotham Suez',
      kind: 'keynote',
    },
    { time: '12:15', title: 'Lunch and posters', kind: 'break' },
    {
      time: '13:45',
      title: 'Host genetics, the early-life microbiome and IBD',
      who: 'Inga Peter',
      kind: 'keynote',
    },
    { time: '14:30', title: 'From association to mechanism', kind: 'session' },
    { time: '14:30', title: 'Invited talk', who: 'To be announced', kind: 'talk' },
    { time: '15:00', title: 'Selected abstract', kind: 'short' },
    { time: '15:15', title: 'Coffee and posters', kind: 'break' },
    { time: '16:00', title: 'What would move the field forward?', who: 'All speakers', kind: 'panel' },
    { time: '16:45', title: 'Flash poster pitches', kind: 'talk' },
    { time: '17:15', title: 'Close and reception', kind: 'admin' },
  ],

  /* --- key dates --------------------------------------------------------- */
  keyDates: [
    { label: 'Registration opens', value: 'August 3, 2026', state: 'done' },
    { label: 'Abstract deadline', value: 'September 6, 2026', state: 'open' },
    { label: 'Decisions sent', value: 'September 20, 2026', state: 'future' },
    { label: 'Registration closes', value: 'October 11, 2026', state: 'future' },
    { label: 'Conference', value: 'October 25, 2026', state: 'future' },
  ],

  /* --- abstracts --------------------------------------------------------- */
  abstractInfo:
    'Short talks and posters, on any aspect of experimental or computational microbiome research. Methods, negative results and work in progress are all welcome.',
  abstractRules: [
    'Up to 300 words, plain text, English',
    'Talk or poster preference — we may offer the alternative',
    'No proceedings, so previously presented work is fine',
    'Presenting author must be registered',
    'Decisions by September 20, 2026',
  ],

  /* --- organising committee ---------------------------------------------- */
  committee: [
    { name: 'Omry Koren', affiliation: 'Bar-Ilan University' },
    { name: 'Naama Geva-Zatorsky', affiliation: 'Technion' },
    { name: 'Moran Yassour', affiliation: 'Hebrew University of Jerusalem' },
    { name: 'David Zeevi', affiliation: 'Weizmann Institute of Science' },
  ],

  /* --- misc -------------------------------------------------------------- */
  roles: [
    'Faculty member / PI',
    'Postdoctoral researcher',
    'PhD student',
    'MSc student',
    'Research staff / technician',
    'Clinician',
    'Industry researcher',
    'Other',
  ],

  accessibilityNote:
    'The venue is wheelchair accessible. Tell us about any access or dietary needs when you register.',
};
