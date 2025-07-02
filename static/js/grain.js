class NoiseOverlay {
  constructor(options = {}) {
    // Default configuration
    this.config = {
      grainSize: 1, // Size of noise grains (in pixels)
      density: 0.2, // Density of noise (0 to 1, where 1 is fully noisy)
      opacity: 0.3, // Overall opacity of the overlay (0 to 1)
      speed: 60, // Animation speed in frames per second (higher = faster)
      color: "grayscale", // 'grayscale' or 'custom' (for custom RGBA in future)
      grainColor: [128, 128, 128, 128], // [R, G, B, A] for custom color (if color is 'custom')
    };

    // Override defaults with provided options
    Object.assign(this.config, options);

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.setupCanvas();
    this.start();
  }

  setupCanvas() {
    // Set canvas to cover entire viewport
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100vw";
    this.canvas.style.height = "100vh";
    this.canvas.style.pointerEvents = "none"; // Allows clicks to pass through
    this.canvas.style.opacity = this.config.opacity; // Use configured opacity

    // Find highest z-index and set ours higher
    const highestZ = this.getHighestZIndex();
    this.canvas.style.zIndex = highestZ + 1;

    // Set initial dimensions
    this.resize();

    // Add to document
    document.body.appendChild(this.canvas);

    // Handle window resize
    window.addEventListener("resize", () => this.resize());
  }

  getHighestZIndex() {
    const elements = document.getElementsByTagName("*");
    let highest = 0;

    for (let element of elements) {
      const zIndex = window.getComputedStyle(element).zIndex;
      if (zIndex !== "auto" && !isNaN(zIndex)) {
        highest = Math.max(highest, parseInt(zIndex));
      }
    }
    return highest || 9999; // Default to 9999 if no z-index found
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  generateNoise() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const imageData = this.ctx.createImageData(width, height);
    const data = imageData.data;

    // Adjust grain size by sampling fewer pixels
    const grainStep = Math.max(1, this.config.grainSize); // Ensure at least 1 pixel step

    for (let y = 0; y < height; y += grainStep) {
      for (let x = 0; x < width; x += grainStep) {
        if (Math.random() < this.config.density) {
          const offset = (y * width + x) * 4;
          if (this.config.color === "grayscale") {
            const gray = Math.floor(Math.random() * 256);
            data[offset] = gray; // Red
            data[offset + 1] = gray; // Green
            data[offset + 2] = gray; // Blue
            data[offset + 3] = 128; // Alpha (semi-transparent, adjustable)
          } else {
            // Custom color support (using grainColor config)
            data[offset] = this.config.grainColor[0]; // Red
            data[offset + 1] = this.config.grainColor[1]; // Green
            data[offset + 2] = this.config.grainColor[2]; // Blue
            data[offset + 3] = this.config.grainColor[3]; // Alpha
          }
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  animate(timestamp) {
    this.generateNoise();
    // Control animation speed using setTimeout for frame rate
    const frameTime = 1000 / this.config.speed; // Convert FPS to milliseconds
    setTimeout(() => requestAnimationFrame((ts) => this.animate(ts)), frameTime);
  }

  start() {
    requestAnimationFrame((timestamp) => this.animate(timestamp));
  }
}

// Usage example with custom configurations
window.addEventListener("load", () => {
  // Example 1: Smaller grains, higher density, slower speed
  new NoiseOverlay({
    grainSize: 2, // Larger grains (2x2 pixel blocks)
    density: 0.8, // More noise (40% of pixels)
    opacity: 0.2, // Even more transparent
    speed: 40, // Slower animation (30 FPS)
    color: "grayscale", // Use grayscale noise
  });

  // Example 2: Custom color noise
  /* new NoiseOverlay({
      grainSize: 1,         // Smallest grains (1x1 pixel)
      density: 0.15,        // Sparse noise (15% of pixels)
      opacity: 0.3,         // Very transparent
      speed: 45,            // Medium speed (45 FPS)
      color: 'custom',      // Use custom color
      grainColor: [255, 0, 0, 128] // Red noise with 50% opacity
  }); */
});
