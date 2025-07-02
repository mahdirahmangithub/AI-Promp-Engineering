function createSphereVisualization(containerElement, options = {}) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  const config = {
    numbers: "01  0101",
    outerSphereRadius: 360,
    innerSphereRadius: 200,
    outerSpherePoints: 160,
    innerSpherePoints: 180,
    springStrength: 0.2,
    springDamping: 0.2,
    pullStrength: 0.4,
    mobileOuterSphereRadius: 160,
    mobileInnerSphereRadius: 80,
    mobileOuterSpherePoints: 100,
    mobileInnerSpherePoints: 120,
    mobileSpringStrength: 0.15,
    mobileSpringDamping: 0.15,
    mobilePullStrength: 0.3,
    backgroundColor: "transparent",
    ...options,
  };

  const activeOuterRadius = isMobile ? config.mobileOuterSphereRadius : config.outerSphereRadius;
  const activeInnerRadius = isMobile ? config.mobileInnerSphereRadius : config.innerSphereRadius;
  const activeOuterPoints = isMobile ? config.mobileOuterSpherePoints : config.outerSpherePoints;
  const activeInnerPoints = isMobile ? config.mobileInnerSpherePoints : config.innerSpherePoints;
  const activeSpringStrength = isMobile ? config.mobileSpringStrength : config.springStrength;
  const activeSpringDamping = isMobile ? config.mobileSpringDamping : config.springDamping;
  const activePullStrength = isMobile ? config.mobilePullStrength : config.pullStrength;

  // Create main canvas with GPU acceleration hints
  let canvas = document.createElement("canvas");
  containerElement.appendChild(canvas);
  let ctx = canvas.getContext("2d");

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafariMac = /Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !isIOS;

  // Use layers for improved GPU utilization
  let layers = Array.from({ length: 5 }, () => {
    const layerCanvas = document.createElement("canvas");
    return { canvas: layerCanvas, ctx: layerCanvas.getContext("2d") };
  });

  let points = [],
    innerPoints = [];
  let rotation = { x: 0, y: 0, inner: 0 };
  let target = { x: 0, y: 0 };
  let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let rafId = null;
  let isActive = false;
  let isInViewport = false;
  let hasInitializedCanvas = false;
  let dpr = window.devicePixelRatio || 1;
  let centerX, centerY;
  let visibilityCheckTimeout = null;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth * dpr;
    const height = window.innerHeight * dpr;

    // Set canvas dimensions with devicePixelRatio for high-DPI displays
    [canvas, ...layers.map((l) => l.canvas)].forEach((c) => {
      c.width = width;
      c.height = height;
      c.style.width = `${window.innerWidth}px`;
      c.style.height = `${window.innerHeight}px`;
    });

    centerX = width / 2;
    centerY = height / 2;

    // Enable hardware acceleration
    canvas.style.transform = "translateZ(0)";
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function rotatePoint(point, rotX, rotY) {
    const radX = (rotX * Math.PI) / 180,
      radY = (rotY * Math.PI) / 180;
    const cosY = Math.cos(radY),
      sinY = Math.sin(radY);
    const cosX = Math.cos(radX),
      sinX = Math.sin(radX);
    const x = point.x,
      y = point.y,
      z = point.z;
    const nx = x * cosY - z * sinY;
    const nz = z * cosY + x * sinY;
    const ny2 = y * cosX - nz * sinX;
    const nz2 = nz * cosX + y * sinX;
    return { x: nx, y: ny2, z: nz2 };
  }

  function generateSpherePoints() {
    const generatePoints = (numPoints, radius) => {
      const pointsArray = new Array(numPoints);
      for (let i = 0; i < numPoints; i++) {
        const phi = Math.acos(-1 + (2 * i) / numPoints);
        const theta = Math.sqrt(numPoints * Math.PI) * phi;
        const x = Math.cos(theta) * Math.sin(phi);
        const y = Math.sin(theta) * Math.sin(phi);
        const z = Math.cos(phi);
        pointsArray[i] = {
          x,
          y,
          z,
          baseX: x * radius,
          baseY: y * radius,
          baseZ: z * radius,
          radius,
          isOuter: radius === activeOuterRadius,
          pullX: 0,
          pullY: 0,
          pullZ: 0,
          velocityX: 0,
          velocityY: 0,
          velocityZ: 0,
          rotated: null,
        };
      }
      return pointsArray;
    };
    points = generatePoints(activeOuterPoints, activeOuterRadius);
    innerPoints = generatePoints(activeInnerPoints, activeInnerRadius);
  }

  function updatePointPull(pointsArray, rotX, rotY, isInner) {
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;

    pointsArray.forEach((point) => {
      if (isInner) return;

      const rotated = rotatePoint({ x: point.x, y: point.y, z: point.z }, rotX, rotY);
      const screenX = viewportCenterX + rotated.x * point.radius;
      const screenY = viewportCenterY + rotated.y * point.radius;

      const margin = 100;
      const isPointInViewport = screenX >= -margin && screenX <= window.innerWidth + margin && screenY >= -margin && screenY <= window.innerHeight + margin;

      if (isPointInViewport) {
        const dx = mouse.x - screenX;
        const dy = mouse.y - screenY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const pull = Math.max(0, 1 - distance / 200);

        point.velocityX += -point.pullX * activeSpringStrength - point.velocityX * 0.1 + dx * pull * activePullStrength;
        point.velocityY += -point.pullY * activeSpringStrength - point.velocityY * 0.1 + dy * pull * activePullStrength;
        point.velocityZ += -point.pullZ * activeSpringStrength - point.velocityZ * 0.1 + pull * 20 * activePullStrength;
      } else {
        point.velocityX += -point.pullX * activeSpringStrength - point.velocityX * 0.1;
        point.velocityY += -point.pullY * activeSpringStrength - point.velocityY * 0.1;
        point.velocityZ += -point.pullZ * activeSpringStrength - point.velocityZ * 0.1;
      }

      point.velocityX *= activeSpringDamping;
      point.velocityY *= activeSpringDamping;
      point.velocityZ *= activeSpringDamping;

      point.pullX += point.velocityX;
      point.pullY += point.velocityY;
      point.pullZ += point.velocityZ;

      point.rotated = rotatePoint(
        {
          x: (point.baseX + point.pullX) / point.radius,
          y: (point.baseY + point.pullY) / point.radius,
          z: (point.baseZ + point.pullZ) / point.radius,
        },
        rotX,
        rotY
      );
    });
  }

  function drawPoints() {
    const styles = getComputedStyle(document.documentElement);
    const dotColor = styles.getPropertyValue("--color-text-primary").trim();

    // Clear all canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    layers.forEach((layer) => layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height));

    // Combine and sort all points by z-index
    const allPoints = points.concat(innerPoints);
    allPoints.sort((a, b) => (b.rotated ? b.rotated.z : b.z) - (a.rotated ? a.rotated.z : a.z));

    // Draw points to appropriate layer
    allPoints.forEach((point) => {
      const rotated =
        point.rotated ||
        rotatePoint(
          {
            x: (point.baseX + point.pullX) / point.radius,
            y: (point.baseY + point.pullY) / point.radius,
            z: (point.baseZ + point.pullZ) / point.radius,
          },
          rotation.x,
          point.isOuter ? rotation.y : rotation.inner
        );

      const screenX = centerX + rotated.x * point.radius * dpr;
      const screenY = centerY + rotated.y * point.radius * dpr;

      const layerIndex = Math.max(0, Math.min(4, (-rotated.z + 1) * 2)) | 0;
      const layerCtx = layers[layerIndex].ctx;

      const opacity = point.isOuter ? 1 - Math.min(0.85, (-rotated.z + 1) * 0.6) : 1 - Math.min(0.7, (-rotated.z + 1) * 0.6);

      layerCtx.globalAlpha = opacity;
      layerCtx.fillStyle = dotColor;

      if (point.isOuter) {
        layerCtx.font = `${16 * dpr}px monospace`;
        layerCtx.fillText(config.numbers[points.indexOf(point) % config.numbers.length], screenX, screenY);
      } else {
        layerCtx.beginPath();
        layerCtx.arc(screenX, screenY, 1.5 * dpr, 0, Math.PI * 2);
        layerCtx.fill();
      }
    });

    // Apply GPU acceleration hint
    canvas.style.transform = "translateZ(0)";

    if (isIOS || isSafariMac) {
      // Use alpha-offset method for iOS and macOS Safari (more compatible)
      layers.forEach((layer, i) => {
        const alpha = 1 - i * 0.25;
        const offset = i * 1.5;
        ctx.globalAlpha = alpha;
        ctx.drawImage(layer.canvas, 0, 0);
        if (i > 0) {
          for (let j = 1; j <= 3; j++) {
            const offsetAmount = offset * j;
            ctx.globalAlpha = alpha * (0.3 / j);
            ctx.drawImage(layer.canvas, offsetAmount, 0);
            ctx.drawImage(layer.canvas, -offsetAmount, 0);
            ctx.drawImage(layer.canvas, 0, offsetAmount);
            ctx.drawImage(layer.canvas, 0, -offsetAmount);
            ctx.drawImage(layer.canvas, offsetAmount, offsetAmount);
            ctx.drawImage(layer.canvas, -offsetAmount, -offsetAmount);
            ctx.drawImage(layer.canvas, offsetAmount, -offsetAmount);
            ctx.drawImage(layer.canvas, -offsetAmount, offsetAmount);
          }
        }
      });
    } else {
      // Use blur filter for other browsers
      layers.forEach((layer, i) => {
        ctx.filter = `blur(${i * 2}px)`;
        ctx.drawImage(layer.canvas, 0, 0);
      });
      ctx.filter = "none";
    }
  }

  function handleMouseMove(e) {
    if (!isActive) return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    target.x = -((e.clientX - centerX) / centerX) * 45;
    target.y = -((e.clientY - centerY) / centerY) * 45;
  }

  function handleTouchMove(e) {
    if (!isActive || e.touches.length === 0) return;
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    target.x = -((e.touches[0].clientX - centerX) / centerX) * 45;
    target.y = -((e.touches[0].clientY - centerY) / centerY) * 45;
  }

  function animate() {
    if (!isActive) return;

    rotation.x += (target.y - rotation.x) * 0.1;
    rotation.y += (target.x - rotation.y) * 0.1;
    rotation.inner += 0.5;

    updatePointPull(points, rotation.x, rotation.y, false);
    updatePointPull(innerPoints, rotation.x, rotation.y, true);
    drawPoints();

    rafId = requestAnimationFrame(animate);
  }

  function isElementInViewport(el, margin = 50) {
    const rect = el.getBoundingClientRect();
    return (
      rect.bottom >= -margin &&
      rect.right >= -margin &&
      rect.top <= (window.innerHeight || document.documentElement.clientHeight) + margin &&
      rect.left <= (window.innerWidth || document.documentElement.clientWidth) + margin
    );
  }

  function checkVisibility() {
    if (visibilityCheckTimeout) {
      clearTimeout(visibilityCheckTimeout);
    }

    visibilityCheckTimeout = setTimeout(() => {
      const wasInViewport = isInViewport;
      isInViewport = isElementInViewport(containerElement, 50);

      if (isInViewport && !wasInViewport) {
        if (!isActive) {
          isActive = true;

          if (!hasInitializedCanvas) {
            resize();
            hasInitializedCanvas = true;
          }

          if (!rafId) {
            rafId = requestAnimationFrame(animate);
          }
        }
      } else if (!isInViewport && wasInViewport) {
        isActive = false;

        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }

      visibilityCheckTimeout = null;
    }, 100);
  }

  function init() {
    generateSpherePoints();
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleTouchMove, { passive: true });

    // Use IntersectionObserver for better performance
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const wasInViewport = isInViewport;
        isInViewport = entry.isIntersecting;

        if (isInViewport && !wasInViewport) {
          if (!isActive) {
            isActive = true;

            if (!hasInitializedCanvas) {
              resize();
              hasInitializedCanvas = true;
            }

            if (!rafId) {
              rafId = requestAnimationFrame(animate);
            }
          }
        } else if (!isInViewport && wasInViewport) {
          isActive = false;

          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        }
      },
      {
        rootMargin: "50px",
        threshold: 0,
      }
    );

    observer.observe(containerElement);

    // Initialize if in viewport
    isInViewport = isElementInViewport(containerElement, 50);
    if (isInViewport) {
      isActive = true;
      resize();
      hasInitializedCanvas = true;
      rafId = requestAnimationFrame(animate);
    } else {
      resize();
      hasInitializedCanvas = true;
    }

    // Handle resize with ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      const wasOrIsMobile = isMobile !== (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);
      resize();
      if (wasOrIsMobile) generateSpherePoints();

      checkVisibility();
    });

    resizeObserver.observe(containerElement);

    return {
      cleanup: function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
        if (visibilityCheckTimeout) clearTimeout(visibilityCheckTimeout);
        observer.disconnect();
        resizeObserver.disconnect();
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("touchmove", handleTouchMove);
        containerElement.innerHTML = "";
      },
    };
  }

  return init().cleanup;
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("sphere-container");
  const cleanup = createSphereVisualization(container, {
    numbers: "01  0101",
    outerSphereRadius: 200,
    innerSphereRadius: 100,
    outerSpherePoints: 160,
    innerSpherePoints: 180,
    springStrength: 0.6,
    springDamping: 0.2,
    pullStrength: 0.4,
    mobileOuterSphereRadius: 170,
    mobileInnerSphereRadius: 80,
    mobileOuterSpherePoints: 120,
    mobileInnerSpherePoints: 100,
    mobileSpringStrength: 2,
    mobileSpringDamping: 0,
    mobilePullStrength: 0,
  });
});

