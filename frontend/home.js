(function(){
  const themeToggle = document.getElementById('themeToggle');
  const modeBtn = document.getElementById('modeBtn');
  const modeLabel = document.getElementById('modeLabel');

  const modes = ['Easy','Medium','Hard','Expert'];
  let idx = 1; // default Medium

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) document.body.setAttribute('data-theme', savedTheme);

  themeToggle?.addEventListener('click', () => {
    const cur = document.body.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  modeBtn?.addEventListener('click', () => {
    idx = (idx + 1) % modes.length;
    modeLabel.textContent = modes[idx];
    localStorage.setItem('difficulty', modes[idx].toLowerCase());
  });

  // Initialize stored difficulty
  const stored = localStorage.getItem('difficulty');
  if (stored) {
    const cap = stored.charAt(0).toUpperCase() + stored.slice(1);
    modeLabel.textContent = cap;
    idx = Math.max(0, modes.findIndex(m => m.toLowerCase() === stored));
  } else {
    localStorage.setItem('difficulty', 'medium');
  }
})();


