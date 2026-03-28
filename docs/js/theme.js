// Theme toggle — manages light/dark mode with localStorage persistence
// and syncs utterances comment widget theme
(function () {
  const STORAGE_KEY = 'blog-theme';
  const sunIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  const moonIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';

  function getPreferred() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    syncUtterances(theme);
    updateToggleIcons(theme);
  }

  function syncUtterances(theme) {
    const iframe = document.querySelector('.utterances-frame');
    if (iframe) {
      iframe.contentWindow.postMessage(
        { type: 'set-theme', theme: theme === 'dark' ? 'github-dark' : 'github-light' },
        'https://utteranc.es'
      );
    }
  }

  function updateToggleIcons(theme) {
    var icon = theme === 'dark' ? sunIcon : moonIcon;
    document.querySelectorAll('.theme-toggle').forEach(function(btn) {
      btn.innerHTML = icon;
    });
    // Mobile toggle with label
    document.querySelectorAll('.mobile-theme-toggle').forEach(function(btn) {
      var label = theme === 'dark' ? 'Light mode' : 'Dark mode';
      btn.innerHTML = icon + ' ' + label;
    });
  }

  // Apply immediately (before paint)
  apply(getPreferred());

  // Set up toggle buttons once DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    updateToggleIcons(getPreferred());
    document.querySelectorAll('.theme-toggle, .mobile-theme-toggle').forEach(function(btn) {
      btn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme');
        apply(current === 'dark' ? 'light' : 'dark');
      });
    });
  });
})();

// Close mobile nav when clicking/tapping outside
['click', 'touchstart'].forEach(function(evt) {
  document.addEventListener(evt, function(e) {
    var nav = document.querySelector('.mobile-nav');
    var burger = document.querySelector('.burger-menu');
    if (nav && nav.classList.contains('open') && !nav.contains(e.target) && e.target !== burger && !burger.contains(e.target)) {
      nav.classList.remove('open');
    }
  }, { passive: true });
});

// Close mobile nav when screen widens past breakpoint
window.matchMedia('(min-width: 769px)').addEventListener('change', function(e) {
  if (e.matches) {
    var nav = document.querySelector('.mobile-nav');
    if (nav) nav.classList.remove('open');
  }
});

// Share dialog
function shareLink() {
  // Close mobile nav if open
  var mobileNav = document.querySelector('.mobile-nav');
  if (mobileNav) mobileNav.classList.remove('open');

  // Create overlay if it doesn't exist
  var overlay = document.getElementById('share-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'share-overlay';
    overlay.className = 'share-overlay';
    overlay.innerHTML = '<div class="share-dialog">' +
      '<div class="share-dialog-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></div>' +
      '<div class="share-dialog-title">Share this page</div>' +
      '<div class="share-dialog-url"><input type="text" id="share-url" readonly />' +
      '<button class="share-dialog-copy" id="share-copy">Copy</button></div>' +
      '<button class="share-dialog-close" id="share-close">Close</button>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });
    document.getElementById('share-close').addEventListener('click', function() {
      overlay.classList.remove('open');
    });
    document.getElementById('share-copy').addEventListener('click', function() {
      var input = document.getElementById('share-url');
      navigator.clipboard.writeText(input.value).then(function() {
        var btn = document.getElementById('share-copy');
        btn.textContent = 'Copied!';
        setTimeout(function() { btn.textContent = 'Copy'; }, 1500);
      });
    });
  }

  document.getElementById('share-url').value = window.location.href;
  overlay.classList.add('open');
}
