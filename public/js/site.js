/* Small progressive enhancements. The site works without any of this. */
(function () {
  'use strict';

  /* --- live word counter on the abstract box ---------------------------- */
  var box = document.getElementById('abstract_body');
  var counter = document.getElementById('wordCount');
  if (box && counter) {
    var max = parseInt(counter.getAttribute('data-max'), 10) || 300;
    var update = function () {
      var t = box.value.trim();
      var n = t ? t.split(/\s+/).length : 0;
      counter.textContent = n + ' / ' + max + ' words';
      counter.classList.toggle('is-over', n > max);
    };
    box.addEventListener('input', update);
    update();
  }

  /* --- keep the chosen radio card visually in sync on old browsers ------ */
  if (!CSS.supports || !CSS.supports('selector(:has(*))')) {
    var sync = function (group) {
      Array.prototype.forEach.call(
        document.querySelectorAll('input[name="' + group + '"]'),
        function (input) {
          var card = input.closest('.choice');
          if (card) card.style.borderColor = input.checked ? '#101c3d' : '';
        }
      );
    };
    Array.prototype.forEach.call(
      document.querySelectorAll('.choice input[type="radio"]'),
      function (input) {
        input.addEventListener('change', function () { sync(input.name); });
      }
    );
  }

  /* --- don't let people double-submit the registration ------------------ */
  Array.prototype.forEach.call(document.querySelectorAll('form[method="post"]'), function (form) {
    form.addEventListener('submit', function () {
      var btn = form.querySelector('button[type="submit"]');
      if (!btn) return;
      setTimeout(function () {
        btn.setAttribute('disabled', 'disabled');
        btn.textContent = 'Submitting…';
      }, 0);
    });
  });
})();
