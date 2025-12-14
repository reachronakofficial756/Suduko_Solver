(function () {
  const themeToggle = document.getElementById('themeToggle');
  const difficultySelect = document.getElementById('difficultySelect');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeModal = document.getElementById('closeModal');
  const soundToggle = document.getElementById('soundToggle');
  const aboutUsBtn = document.getElementById('aboutUsBtn');
  const aboutUsContent = document.getElementById('aboutUsContent');
  const playGameBtn = document.getElementById('playGameBtn');
  const howToPlayBtn = document.getElementById('howToPlayBtn');
  const howToPlayModal = document.getElementById('howToPlayModal');
  const closeHowToPlayModal = document.getElementById('closeHowToPlayModal');
  const backgroundMusic = document.getElementById('backgroundMusic');

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) document.body.setAttribute('data-theme', savedTheme);

  themeToggle?.addEventListener('click', () => {
    const cur = document.body.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  // Difficulty Dropdown Functionality
  difficultySelect?.addEventListener('change', (e) => {
    const selectedDifficulty = e.target.value;
    localStorage.setItem('difficulty', selectedDifficulty);
  });

  // Initialize stored difficulty
  const stored = localStorage.getItem('difficulty');
  if (stored && difficultySelect) {
    difficultySelect.value = stored;
  } else {
    localStorage.setItem('difficulty', 'medium');
    if (difficultySelect) difficultySelect.value = 'medium';
  }

  // Settings Modal Functionality
  settingsBtn?.addEventListener('click', () => {
    settingsModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  });

  closeModal?.addEventListener('click', () => {
    settingsModal.classList.remove('show');
    document.body.style.overflow = '';
  });

  // Close modal when clicking outside
  settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove('show');
      document.body.style.overflow = '';
    }
  });

  // Sound Toggle Functionality
  const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  if (soundEnabled && soundToggle) {
    soundToggle.classList.add('active');
  }

  soundToggle?.addEventListener('click', () => {
    const isActive = soundToggle.classList.contains('active');
    if (isActive) {
      soundToggle.classList.remove('active');
      backgroundMusic.pause();
      localStorage.setItem('soundEnabled', 'false');
    } else {
      soundToggle.classList.add('active');
      backgroundMusic.play().catch(err => {
        console.log('Autoplay prevented:', err);
      });
      localStorage.setItem('soundEnabled', 'true');
    }
  });

  // Initialize background music - start on any page interaction
  if (backgroundMusic) {
    backgroundMusic.volume = 0.3; // Set volume to 30%

    // Start music on first user interaction (anywhere on page, not just settings button)
    let musicStarted = false;
    const startMusicOnInteraction = () => {
      if (!musicStarted && soundEnabled) {
        backgroundMusic.play().then(() => {
          musicStarted = true;
        }).catch(err => {
          console.log('Music start error:', err);
        });
      }
    };

    // Try to start on multiple events (using once: true ensures it only fires once)
    document.addEventListener('click', startMusicOnInteraction, { once: true });
    document.addEventListener('touchstart', startMusicOnInteraction, { once: true });
    document.addEventListener('keydown', startMusicOnInteraction, { once: true });

    // Also try on window load (might work in some browsers)
    if (document.readyState === 'complete') {
      startMusicOnInteraction();
    } else {
      window.addEventListener('load', startMusicOnInteraction, { once: true });
    }
  }

  // About Us Button Functionality
  aboutUsBtn?.addEventListener('click', () => {
    const isHidden = aboutUsContent.classList.contains('hidden');
    if (isHidden) {
      aboutUsContent.classList.remove('hidden');
    } else {
      aboutUsContent.classList.add('hidden');
    }
  });

  // Play Game Button - Direct redirect to play.html
  playGameBtn?.addEventListener('click', () => {
    window.location.href = './play.html';
  });

  // How to Play Modal Functionality
  howToPlayBtn?.addEventListener('click', () => {
    howToPlayModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  });

  closeHowToPlayModal?.addEventListener('click', () => {
    howToPlayModal.classList.remove('show');
    document.body.style.overflow = '';
  });

  // Close How to Play modal when clicking outside
  howToPlayModal?.addEventListener('click', (e) => {
    if (e.target === howToPlayModal) {
      howToPlayModal.classList.remove('show');
      document.body.style.overflow = '';
    }
  });
})();


