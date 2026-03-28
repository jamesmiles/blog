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

// Close mobile nav when screen widens past breakpoint
window.matchMedia('(min-width: 769px)').addEventListener('change', function(e) {
  if (e.matches) {
    var nav = document.querySelector('.mobile-nav');
    if (nav) nav.classList.remove('open');
  }
});

// Share — copy current page URL to clipboard
function shareLink(btn) {
  navigator.clipboard.writeText(window.location.href).then(function() {
    btn.classList.add('copied');
    setTimeout(function() { btn.classList.remove('copied'); }, 1500);
  });
}
