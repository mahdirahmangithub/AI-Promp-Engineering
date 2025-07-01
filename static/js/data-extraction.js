/**
 * Organic Dot Grid Animation
 * Features unique cubic bezier curves and random transition times for each dot
 * Optimized to pause calculations when elements are not in viewport
 */

class DotGridAnimation {
  constructor(config = {}) {
    // Default configuration options
    this.config = {
      // Dot appearance
      dotSize: config.dotSize || 6, // Size of each dot in pixels
      spacing: config.spacing || 6, // Spacing between dots in pixels

      // Opacity distribution
      lowOpacityPercentage: config.lowOpacityPercentage || 0.1, // Percentage of dots with opacity 0.1
      zeroOpacityPercentage: config.zeroOpacityPercentage || 0.8, // Percentage of dots with opacity 0
      maxBrightPercentage: config.maxBrightPercentage || 0.1, // Max percentage of dots with opacity > 0.6

      // Animation timing
      cycleInterval: config.cycleInterval || 700, // Time between animation cycles in ms
      minDuration: config.minDuration || 400, // Minimum transition duration in ms
      maxDuration: config.maxDuration || 2200, // Maximum transition duration in ms
      maxInitialDelay: config.maxInitialDelay || 300, // Maximum random delay before transition starts

      // Appearance
      baseColorVar: config.baseColorVar || "--color-text-primary", // CSS variable for color
      fallbackColor: config.fallbackColor || "#95A0B1", // Fallback if CSS var not found

      // Advanced animation behavior
      useGaussianDistribution: config.useGaussianDistribution !== undefined ? config.useGaussianDistribution : true, // Use bell curve for opacity
      dynamicBezierCurves: config.dynamicBezierCurves !== undefined ? config.dynamicBezierCurves : true, // Change easing curves occasionally
      bezierChangeFrequency: config.bezierChangeFrequency || 0.3, // Chance to change bezier curve

      // Responsiveness
      resizeDebounceTime: config.resizeDebounceTime || 250, // Debounce time for resize events in ms
      extraCoverageBuffer: config.extraCoverageBuffer || 1, // Extra columns/rows to ensure coverage

      // Visibility checking
      visibilityCheckInterval: config.visibilityCheckInterval || 300, // How often to check element visibility (ms)
      intersectionThreshold: config.intersectionThreshold || 0.1, // Threshold for IntersectionObserver
    };

    this.elements = [];
    this.isAnimating = false;
    this.animationFrameId = null; // Store animation frame ID for better cleanup
    this.lastVisibilityCheck = 0; // Timestamp of last visibility check
    this.intersectionObserver = null; // Will store the IntersectionObserver
    this.init();
  }

  // Check if element size has changed
  checkElementSize(element) {
    const { canvas, container } = element;

    // Get current container size
    const rect = container.getBoundingClientRect();
    const dpr = this.getDevicePixelRatio(); // Use a consistent method for DPR
    const currentWidth = Math.round(rect.width * dpr);
    const currentHeight = Math.round(rect.height * dpr);

    // Check if size has changed
    if (canvas.width !== currentWidth || canvas.height !== currentHeight) {
      // Resize canvas
      canvas.width = currentWidth;
      canvas.height = currentHeight;

      // Regenerate dots
      this.createDots(canvas);
    }
  }

  // Helper method to get device pixel ratio consistently
  getDevicePixelRatio() {
    return window.devicePixelRatio || 1;
  }

  init() {
    // Find all elements with the data-extraction attribute
    const extractionElements = document.querySelectorAll("[data-extraction]");

    extractionElements.forEach((el) => {
      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";

      // Clear the element's contents and append the canvas
      el.innerHTML = "";
      el.appendChild(canvas);

      // Create context
      const context = canvas.getContext("2d", { alpha: true }); // Explicitly set alpha for Safari

      // Get color from CSS var
      const color = this.getColorFromCSSVar(this.config.baseColorVar, this.config.fallbackColor);

      // Store element info
      this.elements.push({
        container: el,
        canvas,
        context,
        dots: [],
        color,
        lastAnimationTime: 0,
        isVisible: false, // Track visibility state
        needsInitialRender: true, // Flag to ensure initial render happens
      });

      // Set initial size
      this.resizeCanvas(canvas, el);

      // Generate dots for this element
      this.createDots(canvas);
    });

    // Setup IntersectionObserver if supported
    this.setupVisibilityTracking();

    // Start animation
    if (this.elements.length > 0 && !this.isAnimating) {
      this.isAnimating = true;
      this.animate();

      // Better resize handling with debounce
      let resizeTimeout;
      window.addEventListener("resize", () => {
        // Clear previous timeout to debounce resize events
        clearTimeout(resizeTimeout);

        // Set new timeout
        resizeTimeout = setTimeout(() => {
          this.elements.forEach((element) => {
            this.resizeCanvas(element.canvas, element.container);
            this.createDots(element.canvas);
          });
        }, this.config.resizeDebounceTime);
      });

      // Handle theme changes
      if (window.MutationObserver) {
        const observer = new MutationObserver(() => {
          this.elements.forEach((element) => {
            element.color = this.getColorFromCSSVar(this.config.baseColorVar, this.config.fallbackColor);
          });
        });

        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["style", "class"],
        });
      }
    }
  }

  // Setup visibility tracking with IntersectionObserver (preferred) or fallback
  setupVisibilityTracking() {
    // Use IntersectionObserver if available (more efficient)
    if ("IntersectionObserver" in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // Find the corresponding element in our elements array
            const element = this.elements.find((el) => el.container === entry.target);
            if (element) {
              const wasVisible = element.isVisible;
              element.isVisible = entry.isIntersecting;

              // If element just became visible, perform an initial render
              if (!wasVisible && element.isVisible && element.needsInitialRender) {
                this.renderDots(element);
                element.needsInitialRender = false;
              }
            }
          });
        },
        {
          threshold: this.config.intersectionThreshold,
        }
      );

      // Observe all our elements
      this.elements.forEach((element) => {
        this.intersectionObserver.observe(element.container);
      });
    } else {
      // Fallback for browsers without IntersectionObserver
      // Will be handled in the animate loop
      console.log("IntersectionObserver not supported, using fallback visibility checking");
    }
  }

  // Check if an element is in viewport (fallback method)
  isElementInViewport(element) {
    const rect = element.container.getBoundingClientRect();
    return rect.bottom >= 0 && rect.right >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight) && rect.left <= (window.innerWidth || document.documentElement.clientWidth);
  }

  // Update visibility status for all elements (fallback method)
  checkElementsVisibility(timestamp) {
    // Throttle visibility checks to avoid performance issues
    if (timestamp - this.lastVisibilityCheck < this.config.visibilityCheckInterval) {
      return;
    }

    this.lastVisibilityCheck = timestamp;

    // Only run if we don't have IntersectionObserver
    if (!this.intersectionObserver) {
      this.elements.forEach((element) => {
        const wasVisible = element.isVisible;
        element.isVisible = this.isElementInViewport(element);

        // If element just became visible, perform an initial render
        if (!wasVisible && element.isVisible && element.needsInitialRender) {
          this.renderDots(element);
          element.needsInitialRender = false;
        }
      });
    }
  }

  getColorFromCSSVar(varName, fallback) {
    // Safari sometimes doesn't include the space in getPropertyValue result
    let color = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

    // If empty, try without the trim
    if (!color) {
      color = getComputedStyle(document.documentElement).getPropertyValue(varName);
    }

    return color || fallback;
  }

  resizeCanvas(canvas, container) {
    const rect = container.getBoundingClientRect();
    const dpr = this.getDevicePixelRatio();

    // Round to avoid half-pixel issues that can occur in Safari
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    // Set CSS size explicitly for Safari
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
  }

  createDots(canvas) {
    const dotSize = this.config.dotSize;
    const spacing = this.config.spacing;
    const totalSize = dotSize + spacing;

    // Calculate grid dimensions with ceiling to ensure coverage of edges
    // Using Math.ceil ensures we have dots that may extend slightly beyond the canvas
    // rather than leaving empty space at the edges
    const cols = Math.ceil(canvas.width / totalSize) + this.config.extraCoverageBuffer;
    const rows = Math.ceil(canvas.height / totalSize) + this.config.extraCoverageBuffer;

    // Create dots
    const dots = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Generate unique bezier control points for each dot
        const bezier = this.generateRandomBezier();

        dots.push({
          x: col * totalSize,
          y: row * totalSize,
          width: dotSize,
          height: dotSize,
          opacity: 0.1,
          targetOpacity: 0.1,
          startOpacity: 0.1,
          // Generate a unique duration for each dot
          baseDuration: this.getRandomDuration(this.config.minDuration, this.config.maxDuration),
          transitionStartTime: 0,
          transitionActive: false,
          group: "low", // 'zero', 'low', or 'animated'
          // Store unique bezier curve for this dot
          bezier: bezier,
        });
      }
    }

    // Assign initial groups randomly based on original distribution
    this.assignGroups(dots);

    // Find the element that owns this canvas
    const element = this.elements.find((el) => el.canvas === canvas);
    if (element) {
      element.dots = dots;
    }
  }

  // Generate unique bezier curve parameters
  generateRandomBezier() {
    // Control points between 0 and 1
    // Format: [x1, y1, x2, y2]

    // Choose from several pleasing curve types
    const curveTypes = [
      // Smooth ease-in-out variations
      () => [0.25 + Math.random() * 0.1, 0.1 + Math.random() * 0.1, 0.25 + Math.random() * 0.1, 1.0 - Math.random() * 0.1],

      // Slight bounce at the end
      () => [0.34 + Math.random() * 0.1, 1.56 + Math.random() * 0.2, 0.64 + Math.random() * 0.1, 1.0 - Math.random() * 0.05],

      // Quick start, slow finish
      () => [0.22 + Math.random() * 0.1, 0.03 + Math.random() * 0.05, 0.39 + Math.random() * 0.1, 0.98 - Math.random() * 0.05],

      // Slow start, quick finish
      () => [0.55 + Math.random() * 0.1, 0.05 + Math.random() * 0.05, 0.23 + Math.random() * 0.1, 0.94 - Math.random() * 0.05],
    ];

    // Randomly select a curve type
    const selectedCurveType = curveTypes[Math.floor(Math.random() * curveTypes.length)];
    return selectedCurveType();
  }

  // Get a random duration for transitions
  getRandomDuration(min, max) {
    // Safari has known issues with some mathematical operations
    // Using a more robust approach to generate random durations
    if (this.config.useGaussianDistribution) {
      try {
        // Approximating gaussian distribution using average of multiple random values
        // This is more consistent across browsers than Box-Muller
        let sum = 0;
        const samples = 6; // Number of samples to average (more = more gaussian-like)

        for (let i = 0; i < samples; i++) {
          sum += Math.random();
        }

        // Average will be around 0.5
        const avg = sum / samples;

        // Map from [0,1] to [min,max]
        const duration = Math.round(min + (max - min) * avg);

        return Math.max(min, Math.min(max, duration));
      } catch (e) {
        console.warn("Error in random calculation, using simple distribution");
        return Math.round(min + Math.random() * (max - min));
      }
    } else {
      // Simple distribution: min + randomFraction * range
      return Math.round(min + Math.random() * (max - min));
    }
  }

  // Fisher-Yates shuffle - more consistent across browsers than sort-based shuffle
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  assignGroups(dots) {
    const totalDots = dots.length;
    const zeroOpacityCount = Math.floor(totalDots * this.config.zeroOpacityPercentage);
    const lowOpacityCount = Math.floor(totalDots * this.config.lowOpacityPercentage);

    // Use Fisher-Yates shuffle for more consistent randomization across browsers
    // This is more reliable than the sort method which can behave differently in Safari
    const shuffledDots = this.shuffleArray(dots);

    // Assign groups
    shuffledDots.slice(0, zeroOpacityCount).forEach((dot) => {
      dot.group = "zero";
      dot.targetOpacity = 0;
    });

    shuffledDots.slice(zeroOpacityCount, zeroOpacityCount + lowOpacityCount).forEach((dot) => {
      dot.group = "low";
      dot.targetOpacity = 0.1;
    });

    // Animated group with more consistent distribution
    shuffledDots.slice(zeroOpacityCount + lowOpacityCount).forEach((dot) => {
      dot.group = "animated";

      // Use triangular distribution for more consistent results across browsers
      const r1 = Math.random();
      const r2 = Math.random();
      // Average of two random values creates a triangular distribution
      const triangular = (r1 + r2) / 2;

      // Map to desired range 0.1 to 0.5 with peak at 0.3
      dot.targetOpacity = 0.1 + triangular * 0.4;
    });

    // Set initial opacities to match targets (for the first time only)
    dots.forEach((dot) => {
      dot.opacity = dot.targetOpacity;
    });
  }

  // Helper function to assign groups to dots after shuffling
  assignGroupsToShuffledDots(shuffledDots, zeroCount, lowCount, maxBrightCount) {
    let brightCount = 0;

    // Zero opacity group
    shuffledDots.slice(0, zeroCount).forEach((dot) => {
      dot.group = "zero";
      dot.targetOpacity = 0;
    });

    // Low opacity group
    shuffledDots.slice(zeroCount, zeroCount + lowCount).forEach((dot) => {
      dot.group = "low";
      dot.targetOpacity = 0.1;
    });

    // Animated group with controlled brightness and organic variance
    shuffledDots.slice(zeroCount + lowCount).forEach((dot) => {
      dot.group = "animated";

      let randomOpacity;

      // Use more consistent distribution method across browsers
      if (this.config.useGaussianDistribution) {
        try {
          // More consistent method using average of multiple random values
          // This approximates a gaussian distribution more reliably across browsers
          let sum = 0;
          const samples = 6;

          for (let i = 0; i < samples; i++) {
            sum += Math.random();
          }

          // Average will be around 0.5, transform to center around 0.3
          const normalizedValue = (sum / samples - 0.5) * 2; // Scale to roughly [-1, 1]
          randomOpacity = 0.3 + normalizedValue * 0.15; // Center at 0.3 with 0.15 spread
        } catch (e) {
          console.warn("Error in distribution calculation, using simple method");
          // Fallback to triangular distribution (still better than uniform)
          const r1 = Math.random();
          const r2 = Math.random();
          randomOpacity = 0.1 + (r1 + r2) * 0.25; // 0.1 to 0.6, peaked at 0.35
        }
      } else {
        // Create a slightly peaked distribution even in uniform mode
        // (Average of two random values creates a triangular distribution)
        const r1 = Math.random();
        const r2 = Math.random();
        randomOpacity = 0.1 + (r1 + r2) * 0.25; // 0.1 to 0.6, peaked at 0.35
      }

      // Control bright dot count
      if (brightCount < maxBrightCount && randomOpacity > 0.6) {
        brightCount++;
      } else if (randomOpacity > 0.6) {
        // Fold back values that are too bright
        randomOpacity = 0.6 - (randomOpacity - 0.6);
      }

      // Ensure within valid range
      randomOpacity = Math.max(0.05, Math.min(0.7, randomOpacity));

      dot.targetOpacity = randomOpacity;
    });
  }

  // Note: updateAnimationStates is now handled directly in the animate method

  getRandomDelay(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  // Note: updateTransitions is now handled directly in the animate method

  // Simplified cubic bezier implementation for better cross-browser compatibility
  cubicBezier(x1, y1, x2, y2, t) {
    // Direct approximation method that's more consistent across browsers
    // Using De Casteljau's algorithm which is numerically more stable
    // This avoids the Newton-Raphson iterations which can behave differently

    // For t=0 and t=1, return exact values to avoid floating point issues
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    // Calculate points on the Bezier curve using De Casteljau's algorithm
    // P0 is (0,0) and P3 is (1,1) for cubic bezier
    const p1x = x1;
    const p1y = y1;
    const p2x = x2;
    const p2y = y2;

    // First level of interpolation
    const a0x = t * p1x;
    const a0y = t * p1y;
    const a1x = p1x + t * (p2x - p1x);
    const a1y = p1y + t * (p2y - p1y);
    const a2x = p2x + t * (1 - p2x);
    const a2y = p2y + t * (1 - p2y);

    // Second level
    const b0x = a0x + t * (a1x - a0x);
    const b0y = a0y + t * (a1y - a0y);
    const b1x = a1x + t * (a2x - a1x);
    const b1y = a1y + t * (a2y - a1y);

    // Final point gives us our value
    const cx = b0x + t * (b1x - b0x);
    const cy = b0y + t * (b1y - b0y);

    return cy;
  }

  animate(timestamp) {
    if (!this.isAnimating) return;

    if (!timestamp) timestamp = performance.now();

    // Check element visibility
    this.checkElementsVisibility(timestamp);

    // Update animation states and timing for all elements to maintain synchronization
    // This ensures animations stay in sync even when elements move in and out of view
    this.elements.forEach((element) => {
      // Always update timings and transition states for all elements
      // This ensures proper animation synchronization when elements return to view
      if (timestamp - element.lastAnimationTime >= this.config.cycleInterval) {
        element.lastAnimationTime = timestamp;

        // For dots, only update if visible to save performance
        if (element.isVisible) {
          const { dots } = element;
          const totalDots = dots.length;
          const maxBrightCount = Math.floor(totalDots * this.config.maxBrightPercentage);
          let brightCount = 0;

          // Save current opacity as start opacity for the transition
          dots.forEach((dot) => {
            dot.startOpacity = dot.opacity;
            dot.transitionStartTime = timestamp + this.getRandomDelay(0, this.config.maxInitialDelay);
            dot.transitionActive = true;

            // Regenerate bezier curves occasionally for variety
            if (this.config.dynamicBezierCurves && Math.random() < this.config.bezierChangeFrequency) {
              dot.bezier = this.generateRandomBezier();
            }

            // Adjust transition duration slightly for variety
            dot.transitionDuration = dot.baseDuration * (0.9 + Math.random() * 0.2);
          });

          // Reassign groups using the more consistent Fisher-Yates shuffle
          const shuffledDots = this.shuffleArray(dots);
          const zeroCount = Math.floor(totalDots * this.config.zeroOpacityPercentage);
          const lowCount = Math.floor(totalDots * this.config.lowOpacityPercentage);

          // Assign dot groups and opacities
          this.assignGroupsToShuffledDots(shuffledDots, zeroCount, lowCount, maxBrightCount);
        }
      }
    });

    // Update transitions only for visible elements
    this.elements.forEach((element) => {
      if (element.isVisible) {
        // First, check if the element size has changed and regenerate dots if needed
        this.checkElementSize(element);

        element.dots.forEach((dot) => {
          if (dot.transitionActive) {
            // Don't start transition until after the random delay
            if (timestamp < dot.transitionStartTime) {
              return;
            }

            // Calculate progress based on elapsed time
            const elapsed = timestamp - dot.transitionStartTime;
            const duration = dot.transitionDuration || dot.baseDuration;
            const progress = Math.min(1, elapsed / duration);

            // Apply the dot's unique cubic bezier easing
            const eased = this.cubicBezier(dot.bezier[0], dot.bezier[1], dot.bezier[2], dot.bezier[3], progress);

            // Update opacity based on eased progress
            dot.opacity = dot.startOpacity + (dot.targetOpacity - dot.startOpacity) * eased;

            // Check if transition is complete
            if (progress >= 1) {
              dot.transitionActive = false;
              dot.opacity = dot.targetOpacity; // Ensure exact target
            }
          }
        });
      }
    });

    // Render only visible elements
    this.elements.forEach((element) => {
      if (element.isVisible || element.needsInitialRender) {
        this.renderDots(element);
        if (element.needsInitialRender) {
          element.needsInitialRender = false;
        }
      }
    });

    // Continue animation loop - store ID for cleanup
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  renderDots(element) {
    const { context, canvas, dots, color } = element;

    // Clear canvas with better performance
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Parse color
    let r = 149,
      g = 160,
      b = 177; // Default: #95A0B1

    try {
      if (color.startsWith("#")) {
        const hex = color.substring(1);
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      } else if (color.startsWith("rgb")) {
        const rgbValues = color.match(/\d+/g);
        if (rgbValues && rgbValues.length >= 3) {
          [r, g, b] = rgbValues.map(Number);
        }
      }
    } catch (e) {
      console.warn("Error parsing color, using fallback");
    }

    // Save the context state once
    context.save();

    // Batch similar opacity dots together for better performance
    const opacityGroups = {};

    // Group dots by opacity (rounded to 2 decimal places)
    dots.forEach((dot) => {
      if (dot.opacity <= 0) return;

      const roundedOpacity = Math.round(dot.opacity * 100) / 100;
      if (!opacityGroups[roundedOpacity]) {
        opacityGroups[roundedOpacity] = [];
      }
      opacityGroups[roundedOpacity].push(dot);
    });

    // Render each opacity group with a single fill style change
    Object.keys(opacityGroups).forEach((opacity) => {
      context.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;

      const dotsInGroup = opacityGroups[opacity];
      dotsInGroup.forEach((dot) => {
        context.fillRect(dot.x, dot.y, dot.width, dot.height);
      });
    });

    // Restore the context
    context.restore();
  }

  // Clean up resources
  destroy() {
    this.isAnimating = false;

    // Cancel animation frame if it exists
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Disconnect the IntersectionObserver if it exists
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // Remove canvases
    this.elements.forEach((element) => {
      if (element.container && element.canvas) {
        element.container.removeChild(element.canvas);
      }
    });

    this.elements = [];
  }
}

// Initialize animation
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.dotGridAnimation = new DotGridAnimation();
  });
} else {
  // DOM already loaded, initialize immediately
  window.dotGridAnimation = new DotGridAnimation();
}
