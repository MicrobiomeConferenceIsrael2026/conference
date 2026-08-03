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

  /* --- registration via Google Forms -------------------------------------
   * The static site (GitHub Pages) has no server, so registration is handled
   * by a Google Form. Create it with tools/create-google-form.gs, then paste
   * the two URLs Google gives you here.
   *
   *   formUrl   the "Send → link" address, e.g.
   *             https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform
   *   embedUrl  the src from "Send → < >" (same address + ?embedded=true)
   *
   * Leave them empty and the site still builds — the register page shows a
   * "registration opens shortly" notice instead of a broken form.            */
  googleForm: {
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfmH4Hn4ol1QlTMOpgbiXvUO11_Ts2n2BMv-qQiTosBUCdRCg/viewform',   // TODO paste your Google Form link
    embedUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfmH4Hn4ol1QlTMOpgbiXvUO11_Ts2n2BMv-qQiTosBUCdRCg/viewform?embedded=true',  // TODO paste the embed src
    embedHeight: 1400,
  },

  /* --- registration ------------------------------------------------------ */
  fee: 'Free',
  feeNote: 'Free to attend. Coffee, lunch and the poster reception included.',
  registrationDeadline: 'October 11, 2026',
  abstractDeadline: 'September 6, 2026',
  notificationDate: 'September 20, 2026',

  /* --- contact ----------------------------------------------------------- */
  contactName: 'Conference Secretariat', // TODO
  contactEmail: 'mmicrobiomeconferenceisrael@gmail.com', // TODO replace with the real address
  contactNote: 'Questions about the program, abstracts, access or travel:',

  /* --- about (keep this to ~50 words) ------------------------------------ */
  about:
    'Host-associated microbial communities are studied at the bench and on the laptop, and neither gets far alone. This meeting puts both in one room: culturing, gnotobiotic models and human trials alongside strain-level inference, statistical modeling and prediction — and the loop that runs between them.',

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
      image: '/img/speaker-korem.jpg',
      talk: 'Computational models of the microbiome in pregnancy and preterm birth',
      blurb:
'Methods that pull mechanism rather than correlation out of microbiome data — growth rates from coverage, strain-level structural variants, microbe-to-metabolite models — applied to predicting preterm birth.',
      links: [{ label: 'koremlab.science', href: 'https://www.koremlab.science/' }],
      provisional: true,
    },
    {
      name: 'Jotham Suez',
      affiliation: 'Johns Hopkins',
      image: '/img/speaker-suez.jpg',
      talk: 'Personalized responses to probiotics, sweeteners and antibiotics',
      blurb:
'Why interventions assumed to be inert are not: sweeteners shift the gut microbiome and glycemic response in some people but not others, and probiotic colonization after antibiotics can delay recovery.',
      links: [{ label: 'suezlab.org', href: 'https://www.suezlab.org/' }],
      provisional: true,
    },
    {
      name: 'Inga Peter',
      affiliation: 'Icahn School of Medicine at Mount Sinai',
      image: '/img/speaker-peter.jpg',
      talk: 'Host genetics, the early-life microbiome and IBD',
      blurb:
'How host genotype, the maternal environment and the infant gut community jointly shape IBD risk, including the MECONIUM cohort following colonization and immune priming in infants of mothers with IBD.',
      links: [],
      provisional: true,
    },
  ],

  speakersNote: 'More to be announced. Two short-talk slots go to submitted abstracts.',

  /* --- program --------------------------------------------------------- */
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
      title: 'Personalized responses to probiotics, sweeteners and antibiotics',
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

  /* --- organizing committee ---------------------------------------------- */
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
