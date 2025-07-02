// Simple and robust WaveRenderer
class WaveRenderer {
  constructor(container) {
    // Setup base properties
    this.container = container;
    this.time = 0;
    this.transitionX = 0;
    this.targetTransitionX = 0;
    this.easing = 0.08;
    this.fillProgress = 0;
    this.isFilling = false;
    this.fillAnimationStart = null;
    this.fillDuration = 3200;
    this.isInteracting = false;

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.background = "transparent";
    this.canvas.style.cursor = "ew-resize";
    container.appendChild(this.canvas);

    // Get context - always use 2D for maximum compatibility
    this.ctx = this.canvas.getContext("2d");
    
    if (!this.ctx) {
      console.error("Canvas 2D context not supported");
      return;
    }

    // Waves configuration
    this.waves = [
      {
        baseAmplitude: 45,
        frequency: 0.004,
        speed: 0.09,
        phase: 0,
        opacity: 1,
        seed: 0,
        secondaryFreq: 0.002,
        secondaryAmp: 10,
        secondarySpeed: 0.13,
      },
      {
        baseAmplitude: 40,
        frequency: 0.009,
        speed: 0.075,
        phase: 2,
        opacity: 0.6,
        seed: 1,
        secondaryFreq: 0.003,
        secondaryAmp: 8,
        secondarySpeed: 0.11,
      },
      {
        baseAmplitude: 35,
        frequency: 0.01,
        speed: 0.09,
        phase: 4,
        opacity: 0.4,
        seed: 2,
        secondaryFreq: 0.0025,
        secondaryAmp: 7,
        secondarySpeed: 0.09,
      },
      {
        baseAmplitude: 30,
        frequency: 0.006,
        speed: 0.045,
        phase: 6,
        opacity: 0.2,
        seed: 3,
        secondaryFreq: 0.0035,
        secondaryAmp: 6,
        secondarySpeed: 0.07,
      },
      {
        baseAmplitude: 55,
        frequency: 0.002,
        speed: 0.085,
        phase: 6,
        opacity: 0.1,
        seed: 3,
        secondaryFreq: 0.0035,
        secondaryAmp: 6,
        secondarySpeed: 0.07,
      },
    ];

    // Get theme colors
    this.updateThemeColors();

    // Set up resize observer
    this.resizeObserver = new ResizeObserver(this.resize.bind(this));
    this.resizeObserver.observe(container);

    // Set up intersection observer
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.isFilling) {
            this.isFilling = true;
            this.fillAnimationStart = null;
          }
        });
      },
      { threshold: 0.1 }
    );
    this.intersectionObserver.observe(container);

    // Add event listeners
    this.addEventListeners();

    // Initialize
    this.resize();
    this.animate();
  }

  // Get theme colors
  updateThemeColors() {
    const root = document.documentElement;
    
    // Default colors in case we can't get theme colors
    this.themeColor = "rgba(247, 248, 248, 1)";
    this.highlightColor = "rgba(0, 150, 255, 1)";
    
    try {
      // Try to get theme color
      let color = getComputedStyle(root).getPropertyValue("--color-text-primary").trim() || "#f7f8f8";
      const tempDiv = document.createElement("div");
      tempDiv.style.color = color;
      document.body.appendChild(tempDiv);
      this.themeColor = window.getComputedStyle(tempDiv).color;
      document.body.removeChild(tempDiv);
      
      // Convert to rgba if needed
      if (this.themeColor.startsWith("rgb(")) {
        this.themeColor = this.themeColor.replace("rgb", "rgba").replace(")", ", 1)");
      }
      
      // Try to get highlight color
      color = getComputedStyle(root).getPropertyValue("--color-element-highlight").trim() || "#0096ff";
      tempDiv.style.color = color;
      document.body.appendChild(tempDiv);
      this.highlightColor = window.getComputedStyle(tempDiv).color;
      document.body.removeChild(tempDiv);
      
      // Convert to rgba if needed
      if (this.highlightColor.startsWith("rgb(")) {
        this.highlightColor = this.highlightColor.replace("rgb", "rgba").replace(")", ", 1)");
      }
    } catch (e) {
      console.warn("Error getting theme colors:", e);
      // Using default colors set above
    }
  }

  // Add all event listeners
  addEventListeners() {
    // Mouse events
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    
    this.canvas.addEventListener("mouseenter", this.handleMouseEnter);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave);
    
    // Touch events
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    
    this.canvas.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.handleTouchEnd, { passive: false });
    this.canvas.addEventListener("touchcancel", this.handleTouchEnd, { passive: false });
  }

  // Update fill animation
  updateFillAnimation(timestamp) {
    if (!this.isFilling) return;

    if (!this.fillAnimationStart) {
      this.fillAnimationStart = timestamp;
    }

    const elapsed = timestamp - this.fillAnimationStart;
    this.fillProgress = Math.min(elapsed / this.fillDuration, 1);

    if (this.fillProgress >= 1) {
      this.isFilling = false;
    }
  }

  // Resize canvas to container
  resize() {
    if (!this.canvas || !this.ctx) return;
    
    const width = this.container.clientWidth || 300;  // Default if clientWidth is 0
    const height = this.container.clientHeight || 200; // Default if clientHeight is 0
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    this.transitionX = width * 0.75;
    this.targetTransitionX = this.transitionX;
  }

  // Noise function for natural wave movement
  noise(t, seed = 0) {
    return Math.sin(t * 0.02 + seed) * 0.5 + 
           Math.sin(t * 0.04 + seed * 2) * 0.25 + 
           Math.sin(t * 0.06 + seed * 3) * 0.125;
  }

  // Smooth step function for transitions
  smoothStep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  // Get envelope for wave amplitude modulation
  getEnvelope(x, width) {
    const edgeMargin = 10;
    const leftFade = this.smoothStep(0, edgeMargin * 2, x);
    const rightFade = this.smoothStep(0, edgeMargin * 2, width - x);
    const fadeMultiplier = Math.pow(leftFade * rightFade, 1.5);
    
    // Ensure we don't divide by zero
    const denominator = width - 2 * edgeMargin;
    const centerProgression = denominator <= 0 ? 0.5 : 
      Math.max(0, Math.min(1, (x - edgeMargin) / denominator));
      
    const centerEnvelope = Math.sin(centerProgression * Math.PI);
    return centerEnvelope * fadeMultiplier;
  }

  // Calculate Y position for a wave point
  calculateY(x, wave, time, height) {
    const baseY = height / 2;
    const envelope = this.getEnvelope(x, this.canvas.width);
    
    const dynamicAmplitude = wave.baseAmplitude + this.noise(time * 1.5, wave.seed) * 8;
    const dynamicPhase = wave.phase + this.noise(time * 0.5, wave.seed + 10) * Math.PI * 0.5;
    
    let waveY = Math.sin(x * wave.frequency + time * wave.speed + dynamicPhase);
    waveY += Math.sin(x * wave.secondaryFreq + time * wave.secondarySpeed) * 
             (wave.secondaryAmp / wave.baseAmplitude);
    
    const positionNoise = this.noise(x * 0.01 + time * wave.speed, wave.seed + 20) * 5;
    
    return baseY + (waveY * dynamicAmplitude + positionNoise) * envelope;
  }

  // Mouse event handlers
  handleMouseEnter(e) {
    this.isInteracting = true;
  }

  handleMouseMove(e) {
    if (!this.isInteracting) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    this.targetTransitionX = Math.max(100, Math.min(this.canvas.width - 100, x));
  }

  handleMouseLeave() {
    this.isInteracting = false;
  }

  // Touch event handlers
  handleTouchStart(e) {
    this.isTouching = true;
    this.isScrolling = false;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.touchStartX = touch.clientX - rect.left;
    this.touchStartY = touch.clientY - rect.top;
  }

  handleTouchMove(e) {
    if (!this.isTouching) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;

    const deltaX = Math.abs(currentX - this.touchStartX);
    const deltaY = Math.abs(currentY - this.touchStartY);

    if (deltaY > deltaX) {
      this.isScrolling = true;
      return;
    }

    e.preventDefault();
    this.targetTransitionX = Math.max(100, Math.min(this.canvas.width - 100, currentX));
  }

  handleTouchEnd() {
    this.isTouching = false;
    this.isScrolling = false;
  }

  // Update transition position with easing
  updateTransitionPosition() {
    if (typeof this.targetTransitionX !== 'number' || typeof this.transitionX !== 'number') {
      this.transitionX = this.canvas.width * 0.75;
      this.targetTransitionX = this.transitionX;
      return;
    }
    
    const dx = this.targetTransitionX - this.transitionX;
    this.transitionX += dx * this.easing;
  }

  // Draw transition indicator line
  drawTransitionIndicator() {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.strokeStyle = this.themeColor.replace(/[^,]+(?=\))/, "0.4");
    ctx.lineWidth = 0.5;
    ctx.moveTo(this.transitionX, 0);
    ctx.lineTo(this.transitionX, this.canvas.height);
    ctx.stroke();
  }

  // Draw individual wave
  drawWave(wave) {
    if (!this.ctx || !this.canvas) return;
    
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Create stroke colors
    let beforeTransitionColor, afterTransitionColor;
    
    if (wave.opacity === 1) {
      // For main wave
      if (this.fillProgress > 0) {
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, this.highlightColor);
        gradient.addColorStop(this.fillProgress, this.highlightColor);
        gradient.addColorStop(Math.min(this.fillProgress + 0.01, 1), this.themeColor);
        gradient.addColorStop(1, this.themeColor);
        beforeTransitionColor = gradient;
        
        // After transition: continue with highlight color if within filled area
        afterTransitionColor = this.transitionX <= width * this.fillProgress ? 
          this.highlightColor.replace(/[^,]+(?=\))/, "0.3") :
          this.themeColor.replace(/[^,]+(?=\))/, "0.3");
      } else {
        beforeTransitionColor = this.themeColor;
        afterTransitionColor = this.themeColor.replace(/[^,]+(?=\))/, "0.3");
      }
    } else {
      // For secondary waves
      beforeTransitionColor = this.themeColor.replace(/[^,]+(?=\))/, wave.opacity.toString());
      afterTransitionColor = this.themeColor.replace(/[^,]+(?=\))/, (wave.opacity * 0.3).toString());
    }
    
    // Calculate wave points
    const points = [];
    const segments = Math.min(200, Math.max(50, width / 5)); // Adaptive segments based on width
    
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * width;
      const y = this.calculateY(x, wave, this.time, height);
      points.push({ x, y });
    }
    
    // Draw the active part of the wave (before transition)
    ctx.beginPath();
    if (points.length > 0) {
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        if (points[i].x > this.transitionX) {
          // Find intersection with transition line
          if (i > 0) {
            const prevPoint = points[i - 1];
            const currPoint = points[i];
            const t = (this.transitionX - prevPoint.x) / (currPoint.x - prevPoint.x);
            const intersectionY = prevPoint.y + t * (currPoint.y - prevPoint.y);
            ctx.lineTo(this.transitionX, intersectionY);
          }
          break;
        }
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    
    ctx.strokeStyle = beforeTransitionColor;
    ctx.lineWidth = wave.opacity === 1 ? 2 : 1.5;
    ctx.stroke();
    
    // Draw the inactive part of the wave (after transition)
    ctx.beginPath();
    
    const startIndex = points.findIndex(p => p.x >= this.transitionX);
    if (startIndex > 0 && startIndex < points.length) {
      // Find intersection with transition line
      const prevPoint = points[startIndex - 1];
      const currPoint = points[startIndex];
      const t = (this.transitionX - prevPoint.x) / (currPoint.x - prevPoint.x);
      const intersectionY = prevPoint.y + t * (currPoint.y - prevPoint.y);
      
      ctx.moveTo(this.transitionX, intersectionY);
      
      for (let i = startIndex; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      
      ctx.strokeStyle = afterTransitionColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Render the scene
  render() {
    if (!this.ctx || !this.canvas) return;
    
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw waves from back to front
    for (let i = this.waves.length - 1; i >= 0; i--) {
      this.drawWave(this.waves[i]);
    }
    
    // Draw transition indicator
    this.drawTransitionIndicator();
  }

  // Animation loop
  animate(timestamp) {
    try {
      this.updateFillAnimation(timestamp);
      this.updateTransitionPosition();
      this.render();
      
      this.time += 0.4;
      this.animationFrame = requestAnimationFrame(this.animate.bind(this));
    } catch (error) {
      console.error("Animation error:", error);
      // Try to recover
      setTimeout(() => {
        this.animationFrame = requestAnimationFrame(this.animate.bind(this));
      }, 1000);
    }
  }

  // Manually trigger fill animation
  triggerFillAnimation() {
    this.isFilling = true;
    this.fillAnimationStart = null;
    this.fillProgress = 0;
  }

  // Cleanup method to stop animation and remove observers
  destroy() {
    try {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
      }
      
      // Remove all event listeners
      this.canvas.removeEventListener("mouseenter", this.handleMouseEnter);
      this.canvas.removeEventListener("mousemove", this.handleMouseMove);
      this.canvas.removeEventListener("mouseleave", this.handleMouseLeave);
      this.canvas.removeEventListener("touchstart", this.handleTouchStart);
      this.canvas.removeEventListener("touchmove", this.handleTouchMove);
      this.canvas.removeEventListener("touchend", this.handleTouchEnd);
      this.canvas.removeEventListener("touchcancel", this.handleTouchEnd);
      
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.remove();
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}

// Global Wave Renderer Management
(function () {
  // Store wave renderer instances
  const waveRenderers = [];

  // Function to initialize wave renderers on page load
  function initWaveRenderers() {
    try {
      // Find all elements with eval-wave attribute
      const waveContainers = document.querySelectorAll("[eval-wave]");

      // Clear any existing renderers
      waveRenderers.forEach((renderer) => {
        try {
          renderer.destroy();
        } catch (e) {
          console.warn("Error destroying renderer:", e);
        }
      });
      waveRenderers.length = 0;

      // Create new renderers
      waveContainers.forEach((container) => {
        try {
          // Ensure container has relative positioning
          if (getComputedStyle(container).position === "static") {
            container.style.position = "relative";
          }
          container.style.overflow = "hidden";

          // Create and store wave renderer
          const waveRenderer = new WaveRenderer(container);
          waveRenderers.push(waveRenderer);
        } catch (e) {
          console.error("Error creating wave renderer:", e);
        }
      });

      // Expose global methods
      window.waveRenderers = {
        instances: waveRenderers,
        destroyAll: () => {
          waveRenderers.forEach((renderer) => {
            try {
              renderer.destroy();
            } catch (e) {
              console.warn("Error in destroyAll:", e);
            }
          });
          waveRenderers.length = 0;
        },
        reinitialize: initWaveRenderers,
        updateColors: () => {
          waveRenderers.forEach((renderer) => {
            try {
              renderer.updateThemeColors();
            } catch (e) {
              console.warn("Error updating colors:", e);
            }
          });
        }
      };
    } catch (e) {
      console.error("Error initializing wave renderers:", e);
    }
  }

  // Initialize on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWaveRenderers);
  } else {
    try {
      initWaveRenderers();
    } catch (e) {
      console.error("Error during initial wave renderer initialization:", e);
      // Try again after a short delay
      setTimeout(initWaveRenderers, 500);
    }
  }

  // Watch for theme changes by observing class changes on documentElement
  try {
    const themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme') {
          // Theme likely changed, update colors
          setTimeout(() => {
            if (window.waveRenderers && window.waveRenderers.updateColors) {
              window.waveRenderers.updateColors();
            }
          }, 50); // Small delay to ensure CSS variables have updated
        }
      });
    });
    
    // Observe the documentElement for class changes that might indicate theme switches
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });
    
    // Also check for CSS variable changes directly
    const cssVariableObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          shouldUpdate = true;
        }
      });
      
      if (shouldUpdate && window.waveRenderers && window.waveRenderers.updateColors) {
        window.waveRenderers.updateColors();
      }
    });
    
    // Observe changes to the root element's style
    cssVariableObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });
  } catch (e) {
    console.warn("Error setting up theme observers:", e);
  }

  // Reinitialize if dynamically added elements appear
  try {
    const observer = new MutationObserver((mutations) => {
      try {
        const hasEvalWaveChange = mutations.some((mutation) =>
          Array.from(mutation.addedNodes).some((node) => 
            node.nodeType === Node.ELEMENT_NODE && 
            (node.hasAttribute && node.hasAttribute("eval-wave") || 
             (node.querySelector && node.querySelector("[eval-wave]")))
          )
        );

        if (hasEvalWaveChange) {
          initWaveRenderers();
        }
      } catch (e) {
        console.warn("Error in mutation observer:", e);
      }
    });

    // Observe the entire document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } catch (e) {
    console.error("Error setting up mutation observer:", e);
  }
})();

// Function to trigger animation manually
function triggerAnimation() {
  try {
    if (window.waveRenderers && window.waveRenderers.instances.length > 0) {
      window.waveRenderers.instances.forEach(renderer => {
        try {
          renderer.triggerFillAnimation();
        } catch (e) {
          console.warn("Error triggering animation:", e);
        }
      });
    }
  } catch (e) {
    console.error("Error in triggerAnimation:", e);
  }
}