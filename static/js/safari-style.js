function applySafariStyles() {
  // Check if the browser is Safari (and not Chrome, which also has "Safari" in its user agent)
  const isSafari = navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome");

  if (!isSafari) return; // Exit if not Safari

  // Find all elements with a data-safari attribute
  const elements = document.querySelectorAll("[data-safari]");

  elements.forEach((element) => {
    // Get the styles from the data-safari attribute
    const safariStyles = element.getAttribute("data-safari");
    if (!safariStyles) return;

    // Split the styles into individual rules (e.g., "background-color: green; color: yellow")
    const styleRules = safariStyles
      .split(";")
      .map((rule) => rule.trim())
      .filter((rule) => rule);

    // Apply each style to the element
    styleRules.forEach((rule) => {
      const [property, value] = rule.split(":").map((part) => part.trim());
      if (property && value) {
        element.style[property] = value;
      }
    });
  });
}

// Run the function when the page loads
window.addEventListener("load", applySafariStyles);
