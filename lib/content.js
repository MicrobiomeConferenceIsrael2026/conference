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
  eyebrow: 'Part of Mind-IL 2026', // TODO remove this line's text if not a Mind-IL event
  title: 'The Microbiome, Experimentally and Computationally',
  subtitle:
    'A one-day meeting on how we measure, model and manipulate host-associated microbial communities.',
  shortTitle: 'Microbiome 2026',

  /* --- when & where ------------------------------------------------------ */
  date: 'Sunday, October 25, 2026',
  dateISO: '2026-10-25',
  timeRange: '09:00 – 17:45 (Israel Time)',
  venue: 'Azrieli Faculty of Medicine, Bar-Ilan University',
  venueCity: 'Safed, Israel',
  venueNote:
    'Henrietta Szold St 8, Safed. The faculty is a 10-minute drive from central Safed; parking is available on campus.',
  mapQuery: 'Azrieli Faculty of Medicine, Bar-Ilan University, Safed, Israel',

  /* --- registration ------------------------------------------------------ */
  fee: 'Free of charge',
  feeNote: 'Registration is free. Coffee, lunch and the poster reception are included.',
  registrationDeadline: 'Sunday, October 11, 2026',
  abstractDeadline: 'Sunday, September 6, 2026',
  notificationDate: 'Sunday, September 20, 2026',

  /* --- contact ----------------------------------------------------------- */
  contactName: 'Conference Secretariat', // TODO
  contactEmail: 'microbiome2026@example.ac.il', // TODO replace with the real address
  contactNote:
    'For questions about the programme, abstracts, accessibility or travel, please write to us.',

  /* --- about ------------------------------------------------------------- */
  about: [
    'The human microbiome is now routinely implicated in metabolism, immunity, drug response and disease risk. Turning those associations into mechanism, and mechanism into intervention, is a problem that neither the bench nor the laptop can solve alone.',
    'This meeting is built around that pairing. On the experimental side we will hear about gnotobiotic and humanised mouse models, anaerobic culturing and culturomics of previously uncultivated taxa, controlled human dietary and probiotic trials, metabolomics and mucosal sampling, and spatial imaging of communities in situ. On the computational side: strain-level metagenomic inference, structural variants and growth-rate estimation from shotgun data, statistical models built for compositional and zero-inflated data, causal inference from observational cohorts, genome-scale metabolic modelling of microbial consortia, and machine-learning models that predict host phenotype from community composition.',
    'The through-line is the loop between them: the computational analysis that generates a testable hypothesis, the experiment that falsifies it, and the measurement design that makes the next analysis tractable. We have kept the programme deliberately small and the discussion slots deliberately long.',
  ],

  audience: [
    'Principal investigators and postdocs in microbiome, immunology, metabolism and infectious disease',
    'Computational biologists, statisticians and ML researchers working with sequencing data',
    'PhD and MSc students (poster session and short-talk slots reserved for trainees)',
    'Clinicians and industry scientists developing microbiome-based diagnostics or therapeutics',
  ],

  /* --- confirmed speakers ------------------------------------------------
   * Talk titles and abstracts below are DRAFTS based on each speaker's
   * published research area. Confirm with the speakers before publishing.  */
  speakers: [
    {
      name: 'Tal Korem',
      affiliation: 'Columbia University, New York',
      role: 'Systems Biology & Obstetrics/Gynecology; Program for Mathematical Genomics',
      image: '/img/speaker-korem.jpg',
      talk: 'Computational models of the microbiome in pregnancy and preterm birth',
      blurb:
        'The Korem lab builds computational methods that pull mechanism, not just correlation, out of microbiome data: inference of microbial growth rates from coverage patterns, detection of strain-level structural variants, and models linking microbial genes to metabolites. This talk covers how those methods are applied to the vaginal microbiome to predict and interpret spontaneous preterm birth, and what it takes to make such models robust to the contamination, sparsity and compositionality that microbiome data are prone to.',
      links: [{ label: 'koremlab.science', href: 'https://www.koremlab.science/' }],
      provisional: true,
    },
    {
      name: 'Jotham Suez',
      affiliation: 'Johns Hopkins Bloomberg School of Public Health',
      role: 'Molecular Microbiology & Immunology',
      image: '/img/speaker-suez.jpg',
      talk: 'Personalised responses to probiotics, sweeteners and antibiotic perturbation',
      blurb:
        'Interventions that are assumed to be inert or uniformly beneficial often are not. Work from the Suez lab has shown that non-nutritive sweeteners can alter the gut microbiome and impair glycaemic response in some people but not others, that probiotic colonisation after antibiotics is person-specific and can delay rather than assist recovery of the native community, and that autologous faecal transplantation restores it faster. The talk focuses on what determines individual response, and on the mouse and human experimental designs needed to detect it.',
      links: [{ label: 'suezlab.org', href: 'https://www.suezlab.org/' }],
      provisional: true,
    },
    {
      name: 'Inga Peter',
      affiliation: 'Icahn School of Medicine at Mount Sinai, New York',
      role: 'Genetics & Genomic Sciences',
      image: '/img/speaker-peter.jpg',
      talk: 'Host genetics, the early-life microbiome and inflammatory bowel disease',
      blurb:
        'A genetic-epidemiology view of the microbiome: how host genotype, the maternal environment and the infant gut community jointly shape risk of IBD, and the unexpected genetic and clinical links between IBD and Parkinson’s disease. The talk will cover the MECONIUM cohort, which follows initial bacterial colonisation and immune priming in infants born to mothers with IBD, and an ongoing dietary-intervention trial testing whether that trajectory can be shifted during pregnancy.',
      links: [],
      provisional: true,
    },
  ],

  speakersNote:
    'Further speakers will be announced. Two short-talk slots are reserved for submitted abstracts.',

  /* --- programme --------------------------------------------------------- */
  programNote:
    'Draft programme, subject to change. Selected short talks are drawn from submitted abstracts.',
  program: [
    { time: '08:45', title: 'Registration, coffee and poster mounting', kind: 'break' },
    { time: '09:20', title: 'Welcome and opening remarks', kind: 'admin', who: 'Organising committee' },
    {
      time: '09:30',
      title: 'Keynote — Computational models of the microbiome in pregnancy and preterm birth',
      who: 'Tal Korem, Columbia University',
      kind: 'keynote',
    },
    { time: '10:15', title: 'Session I — Measuring communities: sequencing, culturomics and metabolomics', kind: 'session' },
    { time: '10:15', title: 'Invited talk', who: 'To be announced', kind: 'talk' },
    { time: '10:45', title: 'Short talk from submitted abstract', who: 'Selected abstract', kind: 'short' },
    { time: '11:00', title: 'Coffee', kind: 'break' },
    {
      time: '11:30',
      title: 'Keynote — Personalised responses to probiotics, sweeteners and antibiotic perturbation',
      who: 'Jotham Suez, Johns Hopkins',
      kind: 'keynote',
    },
    { time: '12:15', title: 'Lunch and poster session I', kind: 'break' },
    {
      time: '13:45',
      title: 'Keynote — Host genetics, the early-life microbiome and inflammatory bowel disease',
      who: 'Inga Peter, Icahn School of Medicine at Mount Sinai',
      kind: 'keynote',
    },
    { time: '14:30', title: 'Session II — From association to mechanism: models, causality and intervention', kind: 'session' },
    { time: '14:30', title: 'Invited talk', who: 'To be announced', kind: 'talk' },
    { time: '15:00', title: 'Short talk from submitted abstract', who: 'Selected abstract', kind: 'short' },
    { time: '15:15', title: 'Coffee and poster session II', kind: 'break' },
    {
      time: '16:00',
      title: 'Panel — What would actually move the field forward?',
      who: 'Speakers and organising committee',
      kind: 'panel',
    },
    { time: '16:45', title: 'Flash poster pitches (2 minutes each)', kind: 'talk' },
    { time: '17:15', title: 'Closing remarks and reception', kind: 'admin' },
  ],

  /* --- key dates --------------------------------------------------------- */
  keyDates: [
    { label: 'Registration opens', value: 'Monday, August 3, 2026', state: 'done' },
    { label: 'Abstract submission deadline', value: 'Sunday, September 6, 2026', state: 'open' },
    { label: 'Notification of acceptance', value: 'Sunday, September 20, 2026', state: 'future' },
    { label: 'Registration closes', value: 'Sunday, October 11, 2026', state: 'future' },
    { label: 'Conference', value: 'Sunday, October 25, 2026', state: 'future' },
  ],

  /* --- abstracts --------------------------------------------------------- */
  abstractInfo: [
    'Abstracts are invited for short talks and posters on any aspect of experimental or computational microbiome research, including methods, negative results and work in progress.',
    'Submit the abstract as part of registration: choose "Yes" on the first step of the registration form and the abstract fields will appear on the next step.',
  ],
  abstractRules: [
    'Maximum 300 words, plain text, English.',
    'No figures or references; a title and author list are entered separately.',
    'Indicate your preference for a talk or a poster — the committee may offer the alternative.',
    'Work already presented or published elsewhere is welcome. There are no proceedings, so presenting here does not affect publication.',
    'The presenting author must be a registered participant.',
  ],

  /* --- organising committee ---------------------------------------------- */
  committee: [
    { name: 'Omry Koren', affiliation: 'Azrieli Faculty of Medicine, Bar-Ilan University' },
    { name: 'Naama Geva-Zatorsky', affiliation: 'Technion — Israel Institute of Technology' },
    { name: 'Moran Yassour', affiliation: 'The Hebrew University of Jerusalem' },
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
    'The venue is wheelchair accessible. Tell us about any accessibility or dietary requirement in the registration form and we will arrange it.',
};
