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
  timeRange: '09:30 – 16:35',
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
  contactEmail: 'microbiomeconferenceisrael@gmail.com', // TODO replace with the real address
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
   * Name, affiliation and an optional link. Talk titles go up once the
   * speakers have confirmed them — add a `talk: '...'` line to any speaker
   * and it will appear under their name.                                    */
  speakers: [
    {
      name: 'Inga Peter',
      affiliation: 'Icahn School of Medicine at Mount Sinai',
      image: '/img/speaker-peter.jpg',
      talk: 'Transmission to Intervention: Maternal Microbiome, Early-Life Colonization, and Disease Risk',
      links: [],
    },
    {
      name: 'Tal Korem',
      affiliation: 'Columbia University',
      image: '/img/speaker-korem.jpg',
      talk: 'Are there tumor-specific microbial signatures? Machine learning approaches to separate signal from bias',
      links: [{ label: 'koremlab.science', href: 'https://www.koremlab.science/' }],
    },
    {
      name: 'Jotham Suez',
      affiliation: 'Johns Hopkins University',
      image: '/img/speaker-suez.jpg',
      talk: 'Microbiome-mediated mechanisms underlying personalized responses to non-nutritive sweeteners',
      links: [{ label: 'suezlab.org', href: 'https://www.suezlab.org/' }],
    },
  ],

  speakersNote: 'The full program is below.',

  /* --- program ----------------------------------------------------------
   * Taken from the Schedule sheet of "Microbiome Day 2026.xlsx".
   *
   *   kind: 'session'  a grey session header; use `chairs` not `time`
   *         'keynote'  highlighted
   *         'talk'     a regular talk
   *         'break'    gathering, coffee, lunch
   *         'admin'    opening remarks and similar
   *
   * `title` is the talk title, `who` the speaker, `where` the affiliation. */
  programNote: 'Session chairs in grey. Times are Israel Time.',
  program: [
    { time: '09:30', title: 'Gathering', kind: 'break' },

    { kind: 'session', title: 'Session 1' },
    { time: '10:00', title: 'Opening remarks', kind: 'admin',
      who: 'Omry Koren, Naama Geva-Zatorsky, David Zeevi, Moran Yassour' },
    { time: '10:10', kind: 'keynote',
      title: 'Transmission to Intervention: Maternal Microbiome, Early-Life Colonization, and Disease Risk',
      who: 'Inga Peter', where: 'Icahn School of Medicine at Mount Sinai' },

    { kind: 'session', title: 'Session 2', chairs: 'Amir Erez, Amir Bashan' },
    { time: '10:35', kind: 'talk',
      title: 'The bully phage: A Shiga toxin-encoding prophage interferes with the induction of co-hosted prophages',
      who: 'Yael Litvak', where: 'The Hebrew University' },
    { time: '10:50', kind: 'talk',
      title: 'Tracking strains within a family, from birth to adulthood — an 18-year longitudinal study',
      who: 'Hagay Enav', where: 'Max Planck Institute for Biology Tübingen' },
    { time: '11:05', kind: 'talk',
      title: 'Metatranscriptomics resolves activity states of human gut phages',
      who: 'Yishay Pinto', where: 'Bar-Ilan University' },
    { time: '11:20', kind: 'talk',
      title: 'Multi-omic longitudinal profiling of companion dogs reveals cross-omic coordination and structured aging trajectories',
      who: 'Tal Bamberger', where: 'Tel Aviv University' },
    { time: '11:30', title: 'Coffee break', kind: 'break' },

    { kind: 'session', title: 'Session 3', chairs: 'Erez Mills, Maxim Rubin-Blum' },
    { time: '12:00', kind: 'talk',
      title: 'Gut microbiome plasticity facilitates host resistance to environmental challenges',
      who: 'Michael (Micha) Shapira', where: 'University of California Berkeley' },
    { time: '12:15', kind: 'talk',
      title: 'Elucidating the outcomes of wastewater–soil coalescence',
      who: 'Eddie Cytryn', where: 'Volcani Institute' },
    { time: '12:30', kind: 'talk',
      title: 'DGR-ATLAS: Mapping protein hyperdiversity across AllTheBacteria',
      who: 'Nadav Ben-Assa', where: 'Institut Pasteur' },
    { time: '12:45', kind: 'talk',
      title: 'Insights into lithic microbiomes in extreme environments',
      who: 'Irit Nir', where: 'Ben-Gurion University' },
    { time: '12:55', title: 'Lunch and poster session', kind: 'break' },

    { kind: 'session', title: 'Session 4', chairs: 'Yael Haberman, Eran Tauber' },
    { time: '14:25', kind: 'talk',
      title: 'Microbiome-mediated mechanisms underlying personalized responses to non-nutritive sweeteners',
      who: 'Jotham Suez', where: 'Johns Hopkins University' },
    { time: '14:40', kind: 'talk',
      title: 'Objective diet profiling as a tool for studying diet–microbiome interactions',
      who: 'Shaked Uzi-Gavrilov', where: 'North Carolina State University' },
    { time: '14:55', kind: 'talk',
      title: 'Diet–microbiome associations in 10,068 individuals from the Human Phenotype Project to guide personalized nutrition',
      who: 'Tomer Segev', where: 'Weizmann Institute of Science' },
    { time: '15:05', kind: 'talk',
      title: 'Mathematical modelling of bacterial DNA inversion dynamics uncovers an organized multi-locus response to phage predation in Bacteroides fragilis',
      who: 'Avigail Belansky', where: 'Technion' },
    { time: '15:15', title: 'Coffee break', kind: 'break' },

    { kind: 'session', title: 'Session 5', chairs: 'Yuval Dorfan, Shiri Navon-Venezia' },
    { time: '15:45', kind: 'talk',
      title: 'The microbiome in CAR-T: clinical observations and emerging data',
      who: 'Roni Shouval', where: 'Memorial Sloan Kettering Cancer Center' },
    { time: '16:00', kind: 'talk',
      title: 'Oral microbiome composition is associated with depressive symptoms during pregnancy',
      who: 'Oryan Agranyoni', where: 'Ariel University' },
    { time: '16:10', kind: 'keynote',
      title: 'Are there tumor-specific microbial signatures? Machine learning approaches to separate signal from bias',
      who: 'Tal Korem', where: 'Columbia University' },
    { time: '16:35', title: 'Close', kind: 'admin' },
  ],

  /* --- key dates --------------------------------------------------------- */
  keyDates: [
    { label: 'Registration opens', value: 'August 3, 2026', state: 'done' },
    { label: 'Abstract deadline', value: 'September 6, 2026', state: 'done' },
    { label: 'Decisions sent', value: 'September 20, 2026', state: 'done' },
    { label: 'Registration closes', value: 'October 11, 2026', state: 'open' },
    { label: 'Conference', value: 'October 25, 2026', state: 'future' },
  ],

  /* --- attending --------------------------------------------------------- */
  attendingNote:
    'Free to attend, but registration is required so we can plan catering and name badges. Registration closes October 11, 2026.',

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
