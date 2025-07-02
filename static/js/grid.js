function createDotGridAnimation(containerElement, options = {}) {
  const getComputedColor = (varName) => {
    const styles = getComputedStyle(document.documentElement);
    return styles.getPropertyValue(varName).trim() || null;
  };

  const config = {
    scrollBreakawayThreshold: 0.4,
    maxScrollDistance: 300,
    scrollSmoothness: 0.08,
    scrollSpread: 40,
    verticalOffset: 100,
    organicMovementSpeed: 0.001,
    organicMovementIntensity: 15,
    spacing: 40,
    baseRadius: 1,
    maxRadius: 3,
    effectRadius: 320,
    attractionStrength: 0.005,
    returnSpeed: 0.05,
    introDelay: 2500,
    blinkProbability: 0.3,
    minBlinkDuration: 100,
    maxBlinkDuration: 400,
    lineOpacity: 0.4,
    lineProbability: 0.08,
    lineLifespan: { min: 800, max: 2000 },
    lineRefreshRate: 150,
    lineBezierVariation: 20,
    lineWidth: { min: 0.2, max: 0.6 },
    lineDisappearScrollThreshold: 200,
    baseZIndex: -1,
    backgroundColor: getComputedColor("--color-bg-primary") || "#08090a",
    dotColor: getComputedColor("--color-text-secondary") || "#d0d6e0",
    ...options,
  };

  // Precompute frequently used values
  const effectRadiusSquared = config.effectRadius * config.effectRadius;
  const maxScrollDistanceInverse = 1 / config.maxScrollDistance;

  // Setup container structure (unchanged)
  const canvasContainer = document.createElement("div");
  canvasContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: ${config.baseZIndex};
    pointer-events: none;
  `;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
  `;

  const vignetteOverlay = document.createElement("div");
  vignetteOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2;
    background: radial-gradient(circle at center,
      transparent 0%,
      transparent 30%,
      var(--color-bg-primary, ${config.backgroundColor}) 90%,
      var(--color-bg-primary, ${config.backgroundColor}) 100%);
  `;

  const updateColors = () => {
    config.backgroundColor = getComputedColor("--color-bg-primary") || config.backgroundColor;
    config.dotColor = getComputedColor("--color-text-secondary") || config.dotColor;
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "class" || mutation.attributeName === "data-theme") {
        updateColors();
      }
    });
  });

  observer.observe(document.documentElement, { attributes: true });

  canvasContainer.appendChild(canvas);
  canvasContainer.appendChild(vignetteOverlay);
  containerElement.appendChild(canvasContainer);

  const ctx = canvas.getContext("2d", { alpha: false });
  let width,
    height,
    mouseX = null,
    mouseY = null;
  let dots = [],
    rafId = null,
    lastLineUpdate = 0;
  let scrollY = 0,
    lastScrollY = 0;
  let isIntroPlaying = true,
    introStartTime;
  let connections = new Set();
  let isInViewport = false;

  // Cached variables
  let cols, rows;

  function noise(x) {
    return Math.sin(x) * Math.cos(x * 2.1) * Math.sin(x * 0.5);
  }

  function createDot(x, y, col, row) {
    const shouldBlink = Math.random() < config.blinkProbability;
    const blinkTimes = shouldBlink ? Math.floor(Math.random() * 3) + 1 : 0;
    const blinkDurations = new Array(blinkTimes);

    for (let i = 0; i < blinkTimes; i++) {
      const duration = Math.random() * (config.maxBlinkDuration - config.minBlinkDuration) + config.minBlinkDuration;
      const start = Math.random() * (config.introDelay - duration);
      blinkDurations[i] = { start, duration };
    }

    return {
      x,
      y,
      originX: x,
      originY: y,
      currentX: x,
      currentY: y,
      radius: config.baseRadius,
      vx: 0,
      vy: 0,
      opacity: 0,
      introDelay: Math.random() * config.introDelay,
      blinkDurations,
      finalRevealDelay: Math.random() * 1000 + config.introDelay - 500,
      col,
      row,
      isBreakaway: Math.random() < config.scrollBreakawayThreshold,
      noiseOffset: Math.random() * 1000,
      breakawayPhase: 0,
    };
  }

  function createConnection(dot1, dot2) {
    const midX = (dot1.currentX + dot2.currentX) * 0.5;
    const midY = (dot1.currentY + dot2.currentY) * 0.5;
    const variation = config.lineBezierVariation;

    return {
      dot1,
      dot2,
      createdAt: performance.now(),
      lifespan: Math.random() * (config.lineLifespan.max - config.lineLifespan.min) + config.lineLifespan.min,
      opacity: config.lineOpacity * (1 + Math.random() * 0.3),
      controlPoint1: {
        x: midX + (Math.random() - 0.5) * variation,
        y: midY + (Math.random() - 0.5) * variation,
      },
      controlPoint2: {
        x: midX + (Math.random() - 0.5) * variation,
        y: midY + (Math.random() - 0.5) * variation,
      },
      width: Math.random() * (config.lineWidth.max - config.lineWidth.min) + config.lineWidth.min,
    };
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Precompute grid dimensions
    cols = Math.ceil(width / config.spacing) + 1;
    rows = Math.ceil(height / config.spacing) + 1;
  }

  function initDots() {
    dots = [];
    connections.clear();

    const dotsLength = rows * cols;
    dots.length = dotsLength; // Preallocate array

    for (let i = 0; i < dotsLength; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = col * config.spacing;
      const y = row * config.spacing;
      dots[i] = createDot(x, y, col, row);
    }

    introStartTime = performance.now();
    isIntroPlaying = true;
  }

  function updateConnections(currentTime) {
    const scrollFade = Math.min(1, scrollY * 0.01);

    for (const conn of connections) {
      if (currentTime - conn.createdAt > conn.lifespan || ((conn.dot1.isBreakaway || conn.dot2.isBreakaway) && scrollFade >= 1)) {
        connections.delete(conn);
      }
    }

    if (scrollFade < 1 && currentTime - lastLineUpdate > config.lineRefreshRate) {
      const lineProb = config.lineProbability * (1 - scrollFade);
      const dotsLength = dots.length;

      for (let i = 0; i < dotsLength; i++) {
        if (Math.random() < lineProb) {
          const dot = dots[i];
          const row = dot.row;
          const col = dot.col;

          const neighbors = [];
          if (col < cols - 1) neighbors.push(dots[i + 1]);
          if (row < rows - 1) neighbors.push(dots[i + cols]);

          const neighborCount = neighbors.length;
          if (neighborCount > 0) {
            const neighbor = neighbors[Math.floor(Math.random() * neighborCount)];
            if (!(dot.isBreakaway && neighbor.isBreakaway && scrollFade > 0)) {
              const connection = createConnection(dot, neighbor);
              if (dot.isBreakaway || neighbor.isBreakaway) {
                connection.opacity = config.lineOpacity * (1 - scrollFade);
              }
              connections.add(connection);
            }
          }
        }
      }
      lastLineUpdate = currentTime;
    }

    for (const conn of connections) {
      if (conn.dot1.isBreakaway || conn.dot2.isBreakaway) {
        conn.opacity = config.lineOpacity * (1 - scrollFade);
      }
    }
  }

  function updateIntro(currentTime) {
    const elapsed = currentTime - introStartTime;
    const introDelayPlus = config.introDelay + 1000;

    for (const dot of dots) {
      let isBlinking = false;
      for (const blink of dot.blinkDurations) {
        if (elapsed > blink.start && elapsed < blink.start + blink.duration) {
          dot.opacity = Math.random() * 0.5;
          isBlinking = true;
          break;
        }
      }

      if (!isBlinking && elapsed > dot.finalRevealDelay) {
        dot.opacity = Math.min(1, (elapsed - dot.finalRevealDelay) / 300);
      }
    }

    if (elapsed >= introDelayPlus) {
      isIntroPlaying = false;
    }
  }

  function easeOutCubic(x) {
    const t = 1 - x;
    return 1 - t * t * t;
  }

  function updateDots() {
    const dotsLength = dots.length;
    const hasMouse = mouseX !== null && mouseY !== null;

    for (let i = 0; i < dotsLength; i++) {
      const dot = dots[i];

      if (hasMouse) {
        const dx = mouseX - dot.currentX;
        const dy = mouseY - dot.currentY;
        const distSquared = dx * dx + dy * dy;

        if (distSquared < effectRadiusSquared) {
          const dist = Math.sqrt(distSquared);
          const normalizedDist = dist / config.effectRadius;
          const easedForce = easeOutCubic(1 - normalizedDist);

          const forceX = (dx / dist) * easedForce * config.attractionStrength * dist;
          const forceY = (dy / dist) * easedForce * config.attractionStrength * dist;
          dot.vx += forceX;
          dot.vy += forceY;

          const targetRadius = config.baseRadius + (config.maxRadius - config.baseRadius) * easedForce;
          dot.radius += (targetRadius - dot.radius) * 0.15;
        } else {
          dot.radius += (config.baseRadius - dot.radius) * 0.1;
        }
      } else {
        dot.radius += (config.baseRadius - dot.radius) * 0.1;
      }

      dot.vx += (dot.originX - dot.currentX) * config.returnSpeed;
      dot.vy += (dot.originY - dot.currentY) * config.returnSpeed;

      dot.vx *= 0.85;
      dot.vy *= 0.85;

      if (dot.isBreakaway) {
        const scrollProgress = Math.min(1, scrollY * maxScrollDistanceInverse);
        if (scrollProgress > 0) {
          const time = currentTime * config.organicMovementSpeed;
          const easedProgress = scrollProgress * scrollProgress;
          const centerX = width * 0.5;
          const convergenceStrength = 0.04 * Math.pow(scrollProgress, 2.5);
          const sway = Math.sin(time + dot.noiseOffset) * config.scrollSpread * 0.8;

          const targetX = dot.originX + sway * (1 - convergenceStrength) + (centerX - dot.currentX) * convergenceStrength * 2;
          dot.vx += (targetX - dot.currentX) * 0.04;
          const targetY = dot.originY + scrollY * 0.4;
          dot.vy += (targetY - dot.currentY) * 0.04;

          dot.vy += easedProgress * 0.2;
          dot.vx *= 0.95;
          dot.vy *= 0.95;
        } else {
          dot.vx += (dot.originX - dot.currentX) * 0.03;
          dot.vy += (dot.originY - dot.currentY) * 0.03;
          dot.vx *= 0.95;
          dot.vy *= 0.95;
        }
      }

      dot.currentX += dot.vx;
      dot.currentY += dot.vy;
    }

    lastScrollY = scrollY;
  }

  function drawDots(currentTime) {
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = config.dotColor;
    ctx.lineCap = "round";

    for (const conn of connections) {
      const age = currentTime - conn.createdAt;
      const fadeIn = Math.min(1, age / 300);
      const fadeOut = Math.max(0, 1 - (age - (conn.lifespan - 300)) / 300);
      const opacity = Math.min(fadeIn, fadeOut) * conn.opacity;

      const dist1 = mouseX !== null ? Math.hypot(mouseX - conn.dot1.currentX, mouseY - conn.dot1.currentY) : Infinity;
      const dist2 = mouseX !== null ? Math.hypot(mouseX - conn.dot2.currentX, mouseY - conn.dot2.currentY) : Infinity;
      const isAffectedByMouse = dist1 < config.effectRadius || dist2 < config.effectRadius;

      ctx.globalAlpha = opacity * Math.min(conn.dot1.opacity, conn.dot2.opacity);
      ctx.lineWidth = conn.width;

      ctx.beginPath();
      ctx.moveTo(conn.dot1.currentX, conn.dot1.currentY);

      if (isAffectedByMouse) {
        ctx.bezierCurveTo(conn.controlPoint1.x, conn.controlPoint1.y, conn.controlPoint2.x, conn.controlPoint2.y, conn.dot2.currentX, conn.dot2.currentY);
      } else {
        ctx.lineTo(conn.dot2.currentX, conn.dot2.currentY);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    const dotsLength = dots.length;
    for (let i = 0; i < dotsLength; i++) {
      const dot = dots[i];
      const opacityHex = Math.round(dot.opacity * 255)
        .toString(16)
        .padStart(2, "0");
      ctx.fillStyle = `${config.dotColor}${opacityHex}`;
      ctx.beginPath();
      ctx.arc(dot.currentX, dot.currentY, dot.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        isInViewport = entry.isIntersecting;
        if (isInViewport && !rafId) {
          animate(performance.now());
        } else if (!isInViewport && rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      });
    },
    { root: null, threshold: 0 }
  );

  visibilityObserver.observe(containerElement);

  let currentTime = 0; // Cache currentTime globally
  function animate(time) {
    if (!isInViewport) {
      rafId = null;
      return;
    }

    currentTime = time;
    if (isIntroPlaying) {
      updateIntro(currentTime);
    } else {
      updateDots();
      updateConnections(currentTime);
    }
    drawDots(currentTime);
    rafId = requestAnimationFrame(animate);
  }

  const throttle = (fn, wait) => {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= wait) {
        fn(...args);
        lastCall = now;
      }
    };
  };

  function updateMousePosition(e) {
    if (!isIntroPlaying) {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    }
  }

  const handlePointerMove = throttle(updateMousePosition, 16);
  const handlePointerLeave = () => {
    mouseX = null;
    mouseY = null;
  };

  let touchStartY = 0;
  let isTouchMoving = false;

  document.body.addEventListener("pointermove", handlePointerMove);
  document.body.addEventListener("pointerleave", handlePointerLeave);

  document.body.addEventListener("touchstart", (e) => {
    touchStartY = e.touches[0].clientY;
    isTouchMoving = false;
  });

  document.body.addEventListener(
    "touchmove",
    throttle((e) => {
      const touch = e.touches[0];
      const touchCurrentY = touch.clientY;
      const touchDeltaY = Math.abs(touchCurrentY - touchStartY);

      if (touchDeltaY > 10) {
        isTouchMoving = true;
        mouseX = null;
        mouseY = null;
        return;
      }

      if (!isTouchMoving && !isIntroPlaying) {
        updateMousePosition(touch);
      }
    }, 16)
  );

  document.body.addEventListener("touchend", handlePointerLeave);
  document.body.addEventListener("touchcancel", handlePointerLeave);

  window.addEventListener("scroll", () => {
    scrollY = window.scrollY;
  });

  let resizeTimeout;
  const resizeObserver = new ResizeObserver(() => {
    if (rafId) cancelAnimationFrame(rafId);
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeCanvas();
      initDots();
      if (isInViewport) animate(performance.now());
    }, 150);
  });

  resizeObserver.observe(document.body);

  resizeCanvas();
  initDots();
  isInViewport = true;
  animate(performance.now());

  function cleanup() {
    resizeObserver.disconnect();
    observer.disconnect();
    visibilityObserver.disconnect();
    if (rafId) cancelAnimationFrame(rafId);
    containerElement.removeChild(canvasContainer);

    document.body.removeEventListener("pointermove", handlePointerMove);
    document.body.removeEventListener("pointerleave", handlePointerLeave);
    document.body.removeEventListener("touchstart", (e) => {});
    document.body.removeEventListener("touchmove", (e) => {});
    document.body.removeEventListener("touchend", handlePointerLeave);
    document.body.removeEventListener("touchcancel", handlePointerLeave);
  }

  return cleanup;
}

const container = document.querySelector("#grid-container");
const cleanup = createDotGridAnimation(container, {
  spacing: 30,
  baseZIndex: -1,
});
