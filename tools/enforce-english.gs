/**
 * Makes every free-text answer on an EXISTING form reject Hebrew and Arabic,
 * so registrations and abstracts come in readable to the whole committee.
 *
 * HOW TO RUN IT
 *   1. Open your form's EDIT url, copy it from the address bar
 *   2. Paste it into EDIT_URL below
 *   3. https://script.google.com → New project → paste this file in → Run
 *   4. Check the execution log: it lists every question it changed
 *
 * Safe to run more than once. It reads each question's title to decide what to
 * do, so it does not clobber the email validation or the 300-word cap.
 *
 * WHAT IT ACTUALLY DOES
 *   Blocks the Hebrew (U+0590–05FF) and Arabic (U+0600–06FF) blocks. Google
 *   refuses to accept the answer and shows your message.
 *
 *   Deliberately NOT blocked:
 *     · Greek — α-diversity, β-glucan, μg are normal in abstracts
 *     · accented Latin — José, Müller, Ångström are normal in names
 *
 *   This is a script check, not a language check. Someone can still write
 *   French, or transliterate Hebrew into Latin letters. It catches the realistic
 *   case — somebody typing שלום into the name field — and nothing more.
 */

// ⚠️ paste your form's edit URL here (the one ending in /edit)
var EDIT_URL = 'https://docs.google.com/forms/d/YOUR_FORM_ID/edit';

// Hebrew + Arabic. Add Ѐ-ӿ for Cyrillic if you ever need it.
var BLOCKED = '֐-׿؀-ۿ';

var MESSAGE = 'Please answer in English — this field cannot contain Hebrew or Arabic.';

// Same cap the abstract box already has: ~300 words.
var ABSTRACT_MAX_CHARS = 2200;

function enforceEnglish() {
  if (EDIT_URL.indexOf('YOUR_FORM_ID') !== -1) {
    throw new Error('Set EDIT_URL at the top of this script to your form\'s /edit URL first.');
  }

  var form = FormApp.openByUrl(EDIT_URL);
  var items = form.getItems();
  var changed = [];
  var skipped = [];

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var type = item.getType();
    var title = item.getTitle();

    // The email question already has email validation, which implies ASCII.
    // Replacing it would be a downgrade.
    if (/e-?mail/i.test(title)) {
      skipped.push(title + ' (keeps its email validation)');
      continue;
    }

    try {
      if (type === FormApp.ItemType.TEXT) {
        var text = item.asTextItem();
        text.setValidation(
          FormApp.createTextValidation()
            .setHelpText(MESSAGE)
            .requireTextDoesNotMatchPattern('[' + BLOCKED + ']')
            .build()
        );
        changed.push(title);

      } else if (type === FormApp.ItemType.PARAGRAPH_TEXT) {
        var para = item.asParagraphTextItem();

        if (/abstract text/i.test(title)) {
          // One rule has to do both jobs — a question can only hold a single
          // validation, and RE2 (Google's regex engine) has no lookahead, so
          // "no Hebrew AND under N characters" has to be expressed as a
          // negated character class with a length bound.
          para.setValidation(
            FormApp.createParagraphTextValidation()
              .setHelpText(MESSAGE + ' Maximum 300 words.')
              .requireTextMatchesPattern('^[^' + BLOCKED + ']{0,' + ABSTRACT_MAX_CHARS + '}$')
              .build()
          );
        } else {
          para.setValidation(
            FormApp.createParagraphTextValidation()
              .setHelpText(MESSAGE)
              .requireTextDoesNotMatchPattern('[' + BLOCKED + ']')
              .build()
          );
        }
        changed.push(title);

      } else {
        // Multiple choice, dropdowns, page breaks — no free text to police.
        skipped.push(title + ' (' + type + ')');
      }
    } catch (err) {
      Logger.log('!! could not update "' + title + '": ' + err.message);
    }
  }

  // Say it in the form itself too, so people know before they start typing.
  var note = 'Please complete this form in English.';
  var description = form.getDescription() || '';
  if (description.indexOf(note) === -1) {
    form.setDescription((description ? description + '\n\n' : '') + note);
  }

  Logger.log('');
  Logger.log('=========================================================');
  Logger.log('  English-only validation added to ' + changed.length + ' question(s):');
  for (var c = 0; c < changed.length; c++) Logger.log('    · ' + changed[c]);
  Logger.log('');
  Logger.log('  Left alone:');
  for (var s = 0; s < skipped.length; s++) Logger.log('    · ' + skipped[s]);
  Logger.log('=========================================================');
  Logger.log('');
  Logger.log('  Test it: open the form, type a Hebrew word in Full name,');
  Logger.log('  and check that it refuses to submit.');
  Logger.log('');

  return { changed: changed, skipped: skipped };
}
