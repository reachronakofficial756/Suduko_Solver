(function(){
  const themeToggle = document.getElementById('themeToggle');
  const difficultySelect = document.getElementById('difficultySelect');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeModal = document.getElementById('closeModal');
  const soundToggle = document.getElementById('soundToggle');
  const aboutUsBtn = document.getElementById('aboutUsBtn');
  const aboutUsContent = document.getElementById('aboutUsContent');
  const playGameBtn = document.getElementById('playGameBtn');
  const newGameModal = document.getElementById('newGameModal');
  const howToPlayBtn = document.getElementById('howToPlayBtn');
  const howToPlayModal = document.getElementById('howToPlayModal');
  const closeHowToPlayModal = document.getElementById('closeHowToPlayModal');
  const backgroundMusic = document.getElementById('backgroundMusic');
  const difficultyOptions = document.querySelectorAll('.difficulty-option');

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

  // New Game Modal Functionality (Bottom Sheet)
  playGameBtn?.addEventListener('click', () => {
    // Check if mobile - show bottom modal, else redirect directly
    if (window.innerWidth <= 768) {
      newGameModal.classList.add('show');
      document.body.style.overflow = 'hidden';
    } else {
      // Desktop: redirect with current difficulty
      const difficulty = difficultySelect?.value || 'medium';
      window.location.href = `./play.html?difficulty=${difficulty}`;
    }
  });

  // Close new game modal when clicking overlay
  const modalOverlay = newGameModal?.querySelector('.modal-overlay');
  modalOverlay?.addEventListener('click', () => {
    newGameModal.classList.remove('show');
    document.body.style.overflow = '';
  });

  // Difficulty option selection
  difficultyOptions.forEach(option => {
    option.addEventListener('click', () => {
      const difficulty = option.getAttribute('data-difficulty');
      localStorage.setItem('difficulty', difficulty);
      window.location.href = `./play.html?difficulty=${difficulty}`;
    });
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


const volumeSlider = document.getElementById("volumeSlider");
const backgroundMusic = document.getElementById("backgroundMusic");
const volumeIcon = document.getElementById("volumeIcon");

// Default
backgroundMusic.volume = 0.5;

// Restore saved volume
const savedVolume = localStorage.getItem("sudokuVolume");
if (savedVolume !== null) {
  backgroundMusic.volume = savedVolume;
  volumeSlider.value = savedVolume * 100;
}

updateVolumeUI(backgroundMusic.volume);

// Slider logic
volumeSlider.addEventListener("input", (e) => {
  let volume = e.target.value / 100;

  // Snap to mute
  if (volume < 0.02) volume = 0;

  backgroundMusic.volume = volume;

  if (volume === 0) {
    backgroundMusic.pause();
  } else {
    backgroundMusic.play();
  }

  localStorage.setItem("sudokuVolume", volume);
  updateVolumeUI(volume);
});

// UI feedback
function updateVolumeUI(volume) {
  volumeIcon.classList.remove("muted");

  if (volume === 0) {
    volumeIcon.textContent = "🔇";
    volumeIcon.classList.add("muted");
  } else if (volume < 0.4) {
    volumeIcon.textContent = "🔈";
  } else {
    volumeIcon.textContent = "🔊";
  }
}
