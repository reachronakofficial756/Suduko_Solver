// Theme Management
(function () {
    'use strict';

    let listenersAttached = false;

    // Get saved theme or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';

    // Apply theme immediately to prevent flash
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Theme switching function
    function setTheme(theme) {
        console.log('Setting theme to:', theme);
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        // Update active button states
        updateThemeButtons(theme);
    }

    // Update theme button states
    function updateThemeButtons(theme) {
        const lightBtn = document.getElementById('lightThemeBtn');
        const darkBtn = document.getElementById('darkThemeBtn');

        console.log('Updating theme buttons. Light:', lightBtn, 'Dark:', darkBtn, 'Theme:', theme);

        if (lightBtn && darkBtn) {
            if (theme === 'light') {
                lightBtn.classList.add('active');
                darkBtn.classList.remove('active');
            } else {
                darkBtn.classList.add('active');
                lightBtn.classList.remove('active');
            }
        }
    }

    // Attach event listeners to theme buttons
    function attachListeners() {
        if (listenersAttached) {
            console.log('Listeners already attached, skipping');
            return;
        }

        const lightBtn = document.getElementById('lightThemeBtn');
        const darkBtn = document.getElementById('darkThemeBtn');

        if (lightBtn) {
            console.log('Light button found, adding listener');
            lightBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Light theme clicked');
                setTheme('light');
            });
        } else {
            console.warn('Light theme button not found');
        }

        if (darkBtn) {
            console.log('Dark button found, adding listener');
            darkBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Dark theme clicked');
                setTheme('dark');
            });
        } else {
            console.warn('Dark theme button not found');
        }

        if (lightBtn && darkBtn) {
            listenersAttached = true;
        }
    }

    // Initialize theme on page load
    function initTheme() {
        const theme = localStorage.getItem('theme') || 'dark';
        console.log('Initializing theme:', theme);

        // Set initial theme
        document.documentElement.setAttribute('data-theme', theme);

        // Wait a bit for DOM to be fully ready
        setTimeout(() => {
            updateThemeButtons(theme);
            attachListeners();
        }, 100);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    // Export for use in other scripts
    window.themeManager = {
        setTheme,
        getTheme: () => localStorage.getItem('theme') || 'dark',
        init: initTheme,
        updateButtons: updateThemeButtons
    };
})();
