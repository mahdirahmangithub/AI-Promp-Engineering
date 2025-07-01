class CorridorEffect {
  constructor() {
    // Use attribute selector instead of class
    this.container = document.querySelector("[chart-corridor]");
    if (!this.container) throw new Error("Container with [chart-corridor] attribute not found");

    this.config = {
      lines: 11,
      baseWidth: 0.5,
      dotHeight: 2,
      dotGap: 2,
      parallaxStrength: 0.25,
      dampening: 0.1,
      linePositions: [
        { left: 20, opacity: 0.5, blur: 0, width: 0.5 },
        { left: 42, opacity: 0.8, blur: 1, width: 1 },
        { left: 50, opacity: 0.7, blur: 0, width: 0.5 },
        { left: 54, opacity: 0.6, blur: 1, width: 1 },
        { left: 62, opacity: 0.5, blur: 0, width: 0.5 },
        { left: 72, opacity: 0.6, blur: 2, width: 1 },
        { left: 78, opacity: 0.6, blur: 1, width: 1 },
        { left: 88, opacity: 0.5, blur: 0, width: 0.5 },
        { left: 32, opacity: 0.4, blur: 1, width: 1 },
        { left: 24, opacity: 0.6, blur: 2, width: 1 },
        { left: 12, opacity: 0.8, blur: 1, width: 1 },
      ],
    };

    this.mouseX = window.innerWidth / 2;
    this.targetX = 0;
    this.currentX = 0;
    this.windowCenterX = window.innerWidth / 2;
    this.isAnimating = false;

    this.init();
    this.setupEventListeners();
    this.startAnimation();
  }

  init() {
    this.container.innerHTML = "";

    Object.assign(this.container.style, {
      overflow: "hidden",
    });

    this.yContainer = document.createElement("div");
    Object.assign(this.yContainer.style, {
      width: "100%",
      height: "100%",
      position: "absolute",
      top: "0",
      left: "0",
    });

    this.lines = this.config.linePositions.map((pos) => {
      const line = this.createLine(pos);
      this.yContainer.appendChild(line);

      const positionDepth = 1 - Math.abs(pos.left - 50) / 50;
      const opacityDepth = 2 - pos.opacity * 2;
      const combinedDepth = (positionDepth + opacityDepth) / 2;

      return {
        element: line,
        baseLeft: pos.left,
        depth: combinedDepth,
      };
    });

    this.container.appendChild(this.yContainer);
  }

  createLine(position) {
    const line = document.createElement("div");

    Object.assign(line.style, {
      position: "absolute",
      top: "0",
      left: `${position.left}%`,
      width: `${position.width}px`,
      height: "100%",
      opacity: position.opacity,
      filter: position.blur ? `blur(${position.blur}px)` : "none",
      backgroundImage: `repeating-linear-gradient(
                to bottom,
                var(--color-blueprint-primary, white) 0px,
                var(--color-blueprint-primary, white) ${this.config.dotHeight}px,
                transparent ${this.config.dotHeight}px,
                transparent ${this.config.dotHeight + this.config.dotGap}px
            )`,
      maskImage: "linear-gradient(to bottom, transparent, black 24%, black)",
      WebkitMaskImage: "linear-gradient(to bottom, transparent, black 24%, black)",
      transform: "translateX(0)",
      willChange: "transform",
      transition: "transform 0.05s ease-out",
    });

    return line;
  }

  startAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const animate = () => {
      if (!this.isAnimating) return;

      this.currentX += (this.targetX - this.currentX) * this.config.dampening;

      this.lines.forEach(({ element, depth }) => {
        const movement = this.currentX * this.config.parallaxStrength * depth;
        element.style.transform = `translateX(${movement}px)`;
      });

      requestAnimationFrame(animate);
    };

    animate();
  }

  setupEventListeners() {
    const handleResize = () => {
      this.windowCenterX = window.innerWidth / 2;
    };

    const handleMouseMove = (e) => {
      const mouseX = e.clientX;
      this.targetX = (mouseX - this.windowCenterX) * 1.5;
    };

    const handleTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        const touchX = e.touches[0].clientX;
        this.targetX = (touchX - this.windowCenterX) * 1.5;
      }
    };

    const themeObserver = new MutationObserver(() => {
      this.updateColors();
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("resize", handleResize);

    document.addEventListener("mouseleave", () => {
      this.targetX = 0;
    });

    this.cleanup = () => {
      this.isAnimating = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mouseleave", () => {});
      themeObserver.disconnect();
    };
  }

  updateColors() {
    // Colors handled by CSS variables
  }

  destroy() {
    if (this.cleanup) {
      this.cleanup();
    }
    this.container.innerHTML = "";
  }
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new CorridorEffect();
});
