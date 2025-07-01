// Make functions available globally
window.themeToggler = {
  // Theme sequence to rotate through
  themes: ["default", "inverted", "blueprint"],

  // Initialize theme based on saved preference
  initTheme: function () {
    const savedTheme = localStorage.getItem("theme") || "default";

    // Reset all theme classes first
    document.documentElement.classList.remove(...this.themes);

    // Add the saved theme class if it's not the default
    if (savedTheme !== "default") {
      document.documentElement.classList.add(savedTheme);
    }

    // Update meta theme color based on current theme
    this.updateMetaThemeColor(savedTheme);

    // Add meta theme color tag if it doesn't exist
    this.createMetaThemeColorIfNeeded();
  },

  // Get current theme
  getCurrentTheme: function () {
    // Check which theme class is currently applied
    for (const theme of this.themes) {
      if (theme === "default") continue; // Default has no class
      if (document.documentElement.classList.contains(theme)) {
        return theme;
      }
    }
    return "default"; // If no theme class found, it's default
  },

  // Toggle theme function that can be called directly from HTML
  toggleTheme: function () {
    // Get current theme
    const currentTheme = this.getCurrentTheme();

    // Find current index and calculate next index (cycling through the themes array)
    const currentIndex = this.themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % this.themes.length;
    const nextTheme = this.themes[nextIndex];

    // Remove all theme classes
    document.documentElement.classList.remove(...this.themes);

    // Add next theme class if it's not default
    if (nextTheme !== "default") {
      document.documentElement.classList.add(nextTheme);
    }

    // Save the preference
    localStorage.setItem("theme", nextTheme);

    // Update meta theme color for mobile browsers
    this.updateMetaThemeColor(nextTheme);

    // Force Safari to repaint by triggering layout
    this.forceSafariRepaint();
  },

  // Helper function to create meta theme-color tag if needed
  createMetaThemeColorIfNeeded: function () {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.name = "theme-color";
      metaThemeColor.content = "#ffffff"; // Default light color
      document.head.appendChild(metaThemeColor);
    }
  },

  // Helper function to update meta theme color
  updateMetaThemeColor: function (theme) {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      // Set color based on theme
      let color = "#ffffff"; // default theme color
      if (theme === "inverted") {
        color = "#222222"; // dark theme color
      } else if (theme === "blueprint") {
        color = "#1a365d"; // blueprint theme color (adjust as needed)
      }
      metaThemeColor.content = color;
    }
  },

  // Helper function to force Safari to repaint without using the safari-fix class
  forceSafariRepaint: function () {
    // Force a repaint by manipulating the DOM temporarily
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.top = "-9999px";
    tempDiv.style.left = "-9999px";
    document.body.appendChild(tempDiv);

    // Force layout calculation
    document.body.offsetHeight;

    // Add content to force a style recalculation
    tempDiv.textContent = "Safari repaint trigger";

    // Force another layout calculation
    document.body.offsetHeight;

    // Remove the temporary element
    document.body.removeChild(tempDiv);

    // Another approach is to temporarily add a class to the html element
    document.documentElement.classList.add("theme-switching");
    setTimeout(() => {
      document.documentElement.classList.remove("theme-switching");
    }, 50);
  },
};

// Initialize theme on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    window.themeToggler.initTheme();
  });
} else {
  // DOM already loaded, initialize immediately
  window.themeToggler.initTheme();
}

// Apply theme immediately to prevent flash of wrong theme
(function () {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme && savedTheme !== "default") {
    // Remove any existing theme classes
    for (const theme of window.themeToggler.themes) {
      if (theme !== "default") {
        document.documentElement.classList.remove(theme);
      }
    }
    // Add the saved theme class
    document.documentElement.classList.add(savedTheme);
  }
})();
