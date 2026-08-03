/**
 * Creates the Microbiome 2026 registration form, wired up the same way the old
 * two-step flow was: page one asks whether you are submitting an abstract, and
 * only people who answer "Yes" are shown the abstract questions.
 *
 * HOW TO RUN IT
 *   1. Go to  https://script.google.com  and click  New project
 *   2. Delete whatever is in the editor, paste this whole file in
 *   3. Click  Run  (the ▷ button). Choose  createRegistrationForm  if asked.
 *   4. Google will ask for permission to create forms and spreadsheets in your
 *      own Drive. That prompt is expected — it is your account, your data.
 *   5. When it finishes, open  View → Logs  (or the Execution log). It prints
 *      the two URLs you need to paste into lib/content.js.
 *
 * Everything it creates lives in your Google Drive and belongs to you.
 */

function createRegistrationForm() {
  var TITLE = 'Microbiome 2026 — Registration';

  var form = FormApp.create(TITLE);
  form.setTitle(TITLE);
  form.setDescription(
    'Sunday, October 25, 2026 · Azrieli Faculty of Medicine, Bar-Ilan University, Safed\n' +
      'Free to attend. Abstract deadline: September 6, 2026.'
  );
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage(
    'Thank you — you are registered.\n\n' +
      'Keep the copy of your response that Google emails you. If you submitted an ' +
      'abstract, decisions go out by September 20, 2026.\n\n' +
      'Questions: microbiome2026@example.ac.il'
  );

  // Collect the responder's email so Google can send them a receipt.
  // The API for this changed; try the new call, fall back to the old one, and
  // if neither exists just carry on — the form still has its own email field.
  try {
    form.setEmailCollectionType(FormApp.EmailCollectionType.RESPONDER_INPUT);
  } catch (e) {
    try {
      form.setCollectEmail(true);
    } catch (e2) {
      Logger.log('Could not enable email collection automatically — see step 3 below.');
    }
  }

  /* ---------------- page 1: participant ---------------- */

  form.addTextItem()
    .setTitle('Full name')
    .setHelpText('As it should appear on your badge')
    .setRequired(true);

  var email = form.addTextItem()
    .setTitle('Email address')
    .setHelpText('Where your confirmation is sent')
    .setRequired(true);
  email.setValidation(
    FormApp.createTextValidation()
      .requireTextIsEmail()
      .setHelpText('Please enter a valid email address')
      .build()
  );

  form.addTextItem().setTitle('Affiliation').setHelpText('University or company').setRequired(true);

  form.addListItem()
    .setTitle('Role')
    .setChoiceValues([
      'Faculty member / PI',
      'Postdoctoral researcher',
      'PhD student',
      'MSc student',
      'Research staff / technician',
      'Clinician',
      'Industry researcher',
      'Other',
    ])
    .setRequired(true);

  form.addTextItem().setTitle('Country').setRequired(false);

  form.addTextItem()
    .setTitle('Dietary or access needs')
    .setHelpText('Vegetarian, step-free access, anything else we should arrange')
    .setRequired(false);

  /* ---------------- the branch ---------------- */

  // Sections have to exist before we can point at them.
  var abstractPage = form.addPageBreakItem().setTitle('Your abstract');
  var endPage = form.addPageBreakItem().setTitle('Almost done');

  // Move the branching question above both sections.
  var branch = form.addMultipleChoiceItem();
  form.moveItem(form.getItems().length - 1, 6);

  branch
    .setTitle('Would you like to submit an abstract?')
    .setHelpText('Short talks and posters. Deadline September 6, 2026.')
    .setRequired(true)
    .setChoices([
      branch.createChoice('Yes', abstractPage),
      branch.createChoice('No, attending only', endPage),
    ]);

  /* ---------------- abstract section ---------------- */

  form.addMultipleChoiceItem()
    .setTitle('Preferred format')
    .setChoiceValues(['Poster', 'Short talk'])
    .setHelpText('Talk slots are limited; the committee may offer a poster instead.')
    .setRequired(true);

  form.addTextItem().setTitle('Abstract title').setRequired(true);

  form.addTextItem()
    .setTitle('Authors')
    .setHelpText('Presenting author first, comma separated. No affiliations needed.')
    .setRequired(true);

  var body = form.addParagraphTextItem()
    .setTitle('Abstract text')
    .setHelpText('Plain text, up to 300 words. No figures or references.')
    .setRequired(true);
  body.setValidation(
    FormApp.createParagraphTextValidation()
      .requireTextLengthLessThanOrEqualTo(2200)
      .setHelpText('That is longer than 300 words — please shorten it.')
      .build()
  );

  abstractPage.setGoToPage(endPage);

  /* ---------------- final section ---------------- */

  form.addParagraphTextItem().setTitle('Anything else we should know?').setRequired(false);

  form.addCheckboxItem()
    .setTitle('Mailing list')
    .setChoiceValues(['Email me about this meeting and future editions'])
    .setRequired(false);

  /* ---------------- responses spreadsheet ---------------- */

  var sheet = SpreadsheetApp.create('Microbiome 2026 — Registrations');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  /* ---------------- what to do next ---------------- */

  var publicUrl = form.getPublishedUrl();
  var embedUrl = publicUrl.indexOf('?') === -1
    ? publicUrl + '?embedded=true'
    : publicUrl + '&embedded=true';

  Logger.log('');
  Logger.log('=========================================================');
  Logger.log('  Paste these into lib/content.js -> googleForm');
  Logger.log('');
  Logger.log('    formUrl:  ' + publicUrl);
  Logger.log('    embedUrl: ' + embedUrl);
  Logger.log('');
  Logger.log('  Edit the form:   ' + form.getEditUrl());
  Logger.log('  Responses sheet: ' + sheet.getUrl());
  Logger.log('=========================================================');
  Logger.log('');
  Logger.log('  Then, in the form editor (Settings tab):');
  Logger.log('   1. Responses -> Collect email addresses -> Responder input');
  Logger.log('   2. Responses -> Send responders a copy of their response -> Always');
  Logger.log('      (this is the confirmation email)');
  Logger.log('   3. Responses -> Restrict to users in your organisation -> OFF');
  Logger.log('      (otherwise only Bar-Ilan accounts can register)');
  Logger.log('   4. Optional: Responses -> Get email notifications for new responses');
  Logger.log('');

  return { formUrl: publicUrl, embedUrl: embedUrl, sheetUrl: sheet.getUrl() };
}
