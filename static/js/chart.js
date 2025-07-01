function createInteractiveChart(config = {}) {
  const defaultConfig = {
    colorVar: "--color-element-highlight",
    maxHeightRatio: {
      mobile: 0.7,
      tablet: 0.8,
      desktop: 1,
    },
    offsetRatio: {
      mobile: 0.041,
      tablet: 0.028,
      desktop: 0.01,
    },
    ambientAnimation: {
      enabled: true,
      baseHeight: 40,
      variance: 10,
      speed: 0.002,
    },
    entrance: {
      duration: 1000,
      delay: 100,
    },
  };

  const chartConfig = { ...defaultConfig, ...config };

  function smooth(current, target, delta, speed = 0.01) {
    const diff = target - current;
    const step = (diff / 2) * delta * speed;
    if (Math.abs(step) > Math.abs(diff)) return target;
    const result = current + step;
    return Math.abs(result - target) < 1 ? target : result;
  }

  function initCharts() {
    const charts = document.querySelectorAll(".eval-chart");
    charts.forEach(initSingleChart);
  }

  function initSingleChart(container) {
    const falloff = [1, 0.98, 0.96, 0.9, 0.83, 0.76, 0.66, 0.5, 0.33, 0.24, 0.17, 0.11, 0.06, 0.055, 0.037, 0.019];
    const config = {
      POSITION: 0,
      RANGE: 0,
    };

    const pixelRatio = window.devicePixelRatio;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.style.background = "transparent";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    container.style.position = "relative";
    container.style.overflow = "hidden";

    const size = {
      width: container.clientWidth,
      height: container.clientHeight,
    };

    const bars = [];
    let rafId;
    let lastTime = 0;
    let animationTime = 0;
    let isVisible = false;
    let entranceStartTime = 0;
    let lastInteractionX = null; // Track both mouse and touch X position

    const randomOffsets = Array.from({ length: 1000 }, () => ({
      phase: Math.random() * Math.PI * 2,
      frequency: 0.8 + Math.random() * 0.4,
    }));

    const interaction = {
      current: null,
      target: null,
      isPresent: false,
    };

    const height = {
      current: 0,
      target: chartConfig.ambientAnimation.baseHeight,
    };

    const themeObserver = new MutationObserver(() => {
      if (isVisible) {
        requestAnimationFrame(animate);
      }
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            isVisible = true;
            entranceStartTime = performance.now();
            interaction.current = config.POSITION;
            height.target = chartConfig.ambientAnimation.baseHeight;
            requestAnimationFrame(animate);
          }
        });
      },
      {
        threshold: 0.2,
      }
    );

    observer.observe(container);

    // Process pointer position (mouse or touch)
    function processPointerPosition(clientX, clientY) {
      const rect = container.getBoundingClientRect();
      const pointerX = clientX - rect.left;

      // Check if pointer is within horizontal bounds of chart
      if (clientX >= rect.left && clientX <= rect.right) {
        lastInteractionX = pointerX;
        interaction.isPresent = true;
        height.target = chartConfig.ambientAnimation.baseHeight;
        updateTarget(pointerX);
      }
    }

    // Mouse event handler
    const handleMouseMove = (e) => {
      processPointerPosition(e.clientX, e.clientY);
    };

    // Touch event handlers
    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        processPointerPosition(touch.clientX, touch.clientY);
      }
      e.preventDefault(); // Prevent scrolling while touching the chart
    };

    const handleTouchStart = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        processPointerPosition(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = (e) => {
      // Keep the last interaction point but mark that touch is no longer present
      interaction.isPresent = false;
    };

    // Add event listeners when chart becomes visible
    const visibilityHandler = (entries) => {
      if (entries[0].isIntersecting) {
        // Add global mouse listeners
        document.addEventListener("mousemove", handleMouseMove, { passive: true });

        // Add touch listeners directly to the container for better performance
        container.addEventListener("touchstart", handleTouchStart, { passive: false });
        container.addEventListener("touchmove", handleTouchMove, { passive: false });
        container.addEventListener("touchend", handleTouchEnd, { passive: true });
        container.addEventListener("touchcancel", handleTouchEnd, { passive: true });
      }
    };

    const visibilityObserver = new IntersectionObserver(visibilityHandler);
    visibilityObserver.observe(container);

    container.appendChild(canvas);

    function updateTarget(x) {
      if (Math.abs(x - config.POSITION) < config.RANGE) {
        interaction.target = config.POSITION;
        if (height.target !== 0) height.target = 80;
        return;
      }
      if (height.target !== 0) height.target = chartConfig.ambientAnimation.baseHeight;
      interaction.target = x;
    }

    function getAmbientOffset(index, time) {
      if (!chartConfig.ambientAnimation.enabled) return 0;
      const { variance, speed } = chartConfig.ambientAnimation;
      const offset = randomOffsets[index];
      const wave = Math.sin(time * speed * offset.frequency + offset.phase);
      return variance * wave;
    }

    function getEntranceProgress(time, index) {
      if (!isVisible || !entranceStartTime) return 0;
      const elapsed = time - entranceStartTime;
      const delay = index * chartConfig.entrance.delay;
      const duration = chartConfig.entrance.duration;

      if (elapsed < delay) return 0;
      if (elapsed > delay + duration) return 1;

      const progress = (elapsed - delay) / duration;
      return 1 - Math.pow(1 - progress, 3);
    }

    function animate(time = 0) {
      const delta = time - lastTime;
      animationTime += delta;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(chartConfig.colorVar).trim();

      const maxHeight = size.height;

      // Only smooth to last known position if interaction isn't present
      if (!interaction.isPresent && lastInteractionX !== null) {
        interaction.current = smooth(interaction.current || config.POSITION, lastInteractionX, delta);
      } else if (interaction.current !== interaction.target) {
        interaction.current = smooth(interaction.current || config.POSITION, interaction.target, delta);
      }

      height.current = smooth(height.current, height.target, delta, 0.005);

      const activeIndex = bars.findIndex((bar) => interaction.current >= bar.x && interaction.current <= bar.x + 4);

      bars.forEach((bar, i) => {
        const distance = Math.abs(activeIndex - i);
        if (distance >= falloff.length) {
          bar.targetHeight = 0;
          return;
        }

        const baseHeight = interaction.isPresent ? height.current : chartConfig.ambientAnimation.baseHeight;
        const ambientOffset = getAmbientOffset(i, animationTime);
        const rawHeight = (baseHeight + ambientOffset) * falloff[distance];
        const entranceProgress = getEntranceProgress(time, i);
        bar.targetHeight = rawHeight * entranceProgress;
      });

      bars.forEach((bar) => {
        if (bar.height !== bar.targetHeight) {
          bar.height = smooth(bar.height, bar.targetHeight, delta, 0.015);
        }
      });

      bars
        .filter((bar) => bar.height > 0)
        .forEach((bar) => {
          const x = scale(bar.x);
          const y = scale(size.height) - scale(bar.height);
          const width = scale(1);
          const height = scale(bar.height);
          ctx.fillRect(x, y, width, height);
        });

      lastTime = time;
      if (isVisible) {
        rafId = requestAnimationFrame(animate);
      }
    }

    function scale(value) {
      return value * pixelRatio;
    }

    new ResizeObserver((entries) => {
      cancelAnimationFrame(rafId);
      const {
        contentRect: { width, height },
      } = entries[0];
      size.width = width;
      size.height = height;
      canvas.width = scale(width);
      canvas.height = scale(height);

      const offset = (function () {
        const { clientWidth: w } = document.documentElement;
        return w <= 478 ? chartConfig.offsetRatio.mobile : w <= 767 ? chartConfig.offsetRatio.tablet : chartConfig.offsetRatio.desktop;
      })();

      config.POSITION = width * offset + 0.78 * width * (1 - 2 * offset);
      config.RANGE = 0.05 * width;

      bars.length = 0;
      for (let x = 0; x < width; x += 4 / pixelRatio) {
        bars.push({
          x,
          height: 0,
          targetHeight: 0,
        });
      }

      if (isVisible) {
        animate();
      }
    }).observe(container);

    // Initial setup
    canvas.width = scale(size.width);
    canvas.height = scale(size.height);

    for (let x = 0; x < size.width; x += 4 / pixelRatio) {
      bars.push({
        x,
        height: 0,
        targetHeight: 0,
      });
    }

    const rect = container.getBoundingClientRect();
    const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    if (rect.bottom >= 0 && rect.top <= viewHeight) {
      isVisible = true;
      entranceStartTime = performance.now();
      interaction.current = config.POSITION;
      height.target = chartConfig.ambientAnimation.baseHeight;
      requestAnimationFrame(animate);
    }

    return function cleanup() {
      observer.disconnect();
      themeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
      cancelAnimationFrame(rafId);
    };
  }

  initCharts();
}

// Usage example:
createInteractiveChart({
  colorVar: "--color-element-highlight",
  ambientAnimation: {
    enabled: true,
    baseHeight: 80,
    variance: 10,
    speed: 0.002,
  },
  entrance: {
    duration: 1000,
    delay: 1,
  },
});
