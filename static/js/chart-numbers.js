function renderNumberChart(fontSize = null) {
  // Get all elements with the chart-data attribute
  const chartElements = document.querySelectorAll("[chart-data]");

  chartElements.forEach((element) => {
    // Create a canvas element if it doesn't exist
    let canvas = element.querySelector("canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      element.appendChild(canvas);
    }

    // Get the element's dimensions
    const width = element.offsetWidth;
    const height = element.offsetHeight;

    // Handle high-DPI screens for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr); // Scale context for high-DPI

    // Get the base colors from CSS variables
    const baseColor = getComputedStyle(document.documentElement).getPropertyValue("--color-text-primary").trim();
    const highlightColor = getComputedStyle(document.documentElement).getPropertyValue("--color-element-highlight").trim();

    // Function to convert CSS color to RGB for opacity manipulation
    function parseColor(color) {
      const temp = document.createElement("div");
      temp.style.color = color;
      document.body.appendChild(temp);
      const computedColor = getComputedStyle(temp).color;
      document.body.removeChild(temp);
      const match = computedColor.match(/rgb\((\d+), (\d+), (\d+)\)/);
      return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0]; // Default to black if parsing fails
    }

    const [baseR, baseG, baseB] = parseColor(baseColor);
    const [highlightR, highlightG, highlightB] = parseColor(highlightColor);

    // Determine font size (use provided fontSize or calculate dynamically)
    const effectiveFontSize = fontSize ? fontSize : Math.min(width, height) / 20; // Default dynamic size based on container

    // Set font and text alignment (use a specific sharp monospace font)
    ctx.font = `${effectiveFontSize}px 'Courier New', Consolas, monospace`; // Use sharper monospace fonts
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Calculate grid size with fixed 2px padding on each side of numbers
    const numberWidth = ctx.measureText("00").width; // Measure width of two-digit number
    const totalSpacing = 4; // 2px on each side = 4px total spacing between numbers
    const gridSize = numberWidth + totalSpacing; // Total grid cell size includes number width + 4px spacing

    const cols = Math.floor(width / gridSize);
    const rows = Math.floor(height / gridSize);

    // Store number data for animation, including highlight state
    const numbers = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        numbers.push({
          value: Math.floor(Math.random() * 100), // Random two-digit number (00–99)
          col: col,
          row: row,
          baseOpacity: Math.random() * 0.4 + 0.3, // Base opacity for a subtle effect (0.3–0.7)
          isHighlighted: false, // Track highlight state
          highlightProgress: 0, // Progress of highlight animation (0–1)
          highlightDirection: 1, // Direction of highlight (1 for highlight, -1 for return)
        });
      }
    }

    // Animation variables
    let animationFrameId = null;
    let lastTime = null;
    let lastHighlightTime = null; // Track last highlight time separately for reliability

    // Easing function (cubic ease-in-out)
    function easeInOutCubic(t) {
      return t * t * (3 - 2 * t); // Cubic easing for smooth start and end
    }

    // Function to randomly highlight/unhighlight up to 8 numbers (more frequent, 1–3 seconds)
    function updateHighlights(timestamp) {
      if (!lastHighlightTime || timestamp - lastHighlightTime > 1000 + Math.random() * 2000) {
        // Random interval between 1–3 seconds
        console.log("Attempting to highlight numbers at", timestamp); // Debug log
        const currentlyHighlighted = numbers.filter((n) => n.isHighlighted && n.highlightProgress > 0 && n.highlightProgress < 1).length;
        const maxHighlights = 8;
        const availableSlots = maxHighlights - currentlyHighlighted;

        if (availableSlots > 0) {
          const availableNumbers = numbers.filter((n) => !n.isHighlighted || n.highlightProgress >= 1 || n.highlightProgress <= 0);
          const numbersToHighlight = Math.min(availableSlots, Math.floor(Math.random() * 3) + 1); // Randomly highlight 1–3 numbers

          console.log(`Currently highlighted: ${currentlyHighlighted}, Available slots: ${availableSlots}, Numbers to highlight: ${numbersToHighlight}`);

          for (let i = 0; i < numbersToHighlight && availableNumbers.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableNumbers.length);
            const randomNumber = availableNumbers[randomIndex];
            randomNumber.isHighlighted = true;
            randomNumber.highlightProgress = 0;
            randomNumber.highlightDirection = 1; // Start highlighting
            console.log("Highlighted number at col:", randomNumber.col, "row:", randomNumber.row);
            availableNumbers.splice(randomIndex, 1); // Remove the highlighted number to avoid duplicates
          }
          lastHighlightTime = timestamp; // Update last highlight time
        } else {
          console.log("No available slots for highlights (max 8 reached)");
        }
      }
    }

    // Function to interpolate between colors
    function interpolateColor(color1, color2, progress) {
      return [Math.round(color1[0] + (color2[0] - color1[0]) * progress), Math.round(color1[1] + (color2[1] - color1[1]) * progress), Math.round(color1[2] + (color2[2] - color1[2]) * progress)];
    }

    // Function to render the grid with smooth horizontal pulse wave and number highlights at 60 FPS
    function animate(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const deltaTime = (timestamp - lastTime) / 1000; // Time difference in seconds
      lastTime = timestamp;

      // Calculate progress with easing over 6 seconds for wave
      const cycleDuration = 6000; // 6 seconds per loop
      let rawProgress = (timestamp % cycleDuration) / cycleDuration; // 0 to 1 over 6 seconds
      const easedProgress = easeInOutCubic(rawProgress); // Apply easing for smoother wave motion

      // Update highlights
      updateHighlights(timestamp);

      // Clear the canvas
      ctx.clearRect(0, 0, width, height);

      // Render each number with animated opacity and potential highlight
      numbers.forEach((numberData) => {
        const x = numberData.col * gridSize + gridSize / 2;
        const y = numberData.row * gridSize + gridSize / 2;

        // Calculate wave position based on column (horizontal wave)
        const wavePosition = numberData.col / cols; // 0 to 1 across columns

        // Create a smooth sinusoidal wave for opacity (peak = high opacity, trough = low opacity)
        const wave = Math.sin((wavePosition + easedProgress) * Math.PI * 2);
        let opacity = Math.max(0.1, numberData.baseOpacity + wave * 0.5); // Increase amplitude for visibility
        let finalOpacity = Math.min(Math.max(1.0 - (1.0 - opacity) * 0.8, 0.1), 1.0); // Adjust to make peak brighter (1.0) and trough dimmer (0.1)

        // Handle highlight animation (1-second transition, 1000ms)
        let color = [baseR, baseG, baseB];
        if (numberData.isHighlighted) {
          numberData.highlightProgress += deltaTime / 1; // 1-second transition
          if (numberData.highlightProgress >= 1) {
            numberData.highlightProgress = 1;
            numberData.highlightDirection = -1; // Start returning after reaching full highlight
          }
        } else if (numberData.highlightProgress > 0) {
          numberData.highlightProgress -= deltaTime / 1; // 1-second return transition
          if (numberData.highlightProgress <= 0) {
            numberData.highlightProgress = 0;
            numberData.isHighlighted = false;
          }
        }

        const easedHighlightProgress = easeInOutCubic(Math.min(Math.max(numberData.highlightProgress, 0), 1));
        if (numberData.highlightProgress > 0) {
          color = interpolateColor([baseR, baseG, baseB], [highlightR, highlightG, highlightB], easedHighlightProgress);
          finalOpacity = 1.0; // Full opacity during highlight
        }

        // Set fill style with dynamic color and opacity
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${finalOpacity})`;
        ctx.fillText(numberData.value.toString().padStart(2, "0"), x, y);
      });

      // Request next frame (aiming for 60 FPS)
      animationFrameId = requestAnimationFrame(animate);
    }

    // Start the animation
    animationFrameId = requestAnimationFrame(animate);

    // Clean up animation on element removal
    const observer = new MutationObserver(() => {
      if (!document.body.contains(element)) {
        cancelAnimationFrame(animationFrameId);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

// Call the function when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  renderNumberChart(8); // Use a specific font size for testing
});
