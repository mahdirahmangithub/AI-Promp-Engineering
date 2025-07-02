function initializeProgressiveFaders() {
  // Cache frequently used values and functions
  const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const defaultRGB = "255, 255, 255";
  const directions = {
    top: { degree: "0.344", simple: "to top" },
    right: { degree: "90.344", simple: "to right" },
    bottom: { degree: "180.344", simple: "to bottom" },
    left: { degree: "270.344", simple: "to left" },
  };

  // Optimized hex to RGB conversion
  const hexToRGB = (hex) => {
    const h = hex.replace("#", "");
    const fullHex = h.length === 3 ? h.replace(/(.)/g, "$1$1") : h;
    return `${parseInt(fullHex.slice(0, 2), 16)}, ${parseInt(fullHex.slice(2, 4), 16)}, ${parseInt(fullHex.slice(4, 6), 16)}`;
  };

  // Optimized color parsing
  const parseColor = (color) => {
    if (!color) return defaultRGB;

    if (color.startsWith("--")) {
      const computed = getComputedStyle(document.documentElement).getPropertyValue(color).trim();
      if (!computed) return defaultRGB;
      return computed.startsWith("#") ? hexToRGB(computed) : computed.startsWith("rgb") ? computed.match(/\d+/g)?.slice(0, 3).join(", ") || defaultRGB : defaultRGB;
    }

    return color.includes("#") || /^[0-9A-Fa-f]{3,6}$/.test(color) ? hexToRGB(color) : color;
  };

  // Pre-calculated gradient steps
  const gradientSteps = [
    "0, 0%",
    ".010279201902449131, 14.247293770313263%",
    ".03944973647594452, 26.620104908943176%",
    ".08501099050045013, 37.29010820388794%",
    ".14446234703063965, 46.42897844314575%",
    ".2153032124042511, 54.208385944366455%",
    ".29503297805786133, 60.79999804496765%",
    ".3811509907245636, 66.37549996376038%",
    ".47115668654441833, 71.10655307769775%",
    ".5625494718551636, 75.16483664512634%",
    ".6528286337852478, 78.72201800346375%",
    ".7394936680793762, 81.94977641105652%",
    ".8200439810752869, 85.01977920532227%",
    ".8919788599014282, 88.10369968414307%",
    ".9527977108955383, 91.37321710586548%",
    "1, 94.9999988079071%",
  ];

  // Single style injection
  document.head.insertAdjacentHTML(
    "beforeend",
    `<style>.progressive-fader{position:absolute;pointer-events:none;visibility:hidden}.progressive-fader.ready{visibility:visible}.progressive-fader .grad{position:absolute;z-index:9}</style>`
  );

  // Optimized fader update
  function updateFader(fader) {
    const { dataset } = fader;
    const direction = dataset.direction || "bottom";
    const height = dataset.height || "150px";
    const color = parseColor(dataset.color);
    const intensity = parseFloat(dataset.intensity || 10);
    const hasGradient = dataset.gradient === "true";
    const gradientOpacity = parseFloat(dataset.gradientOpacity || 1);
    const ignoreSafari = dataset.ignoreSafari === "true" && isSafariBrowser;

    // Batch DOM updates
    Object.assign(fader.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    });

    fader.innerHTML = "";

    if (!ignoreSafari) {
      const blurContainer = document.createElement("div");
      Object.assign(blurContainer.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
      });

      // Generate blur layers efficiently
      const blurFragment = document.createDocumentFragment();
      for (let i = 0; i < 8; i++) {
        const start = i * 12.5;
        const blurAmount = (0.28125 * (1 << i) * (intensity / 4)).toFixed(2);
        const mask = `linear-gradient(to ${direction}, rgba(0,0,0,0) ${start}%, rgba(0,0,0,1) ${start + 12.5}%, rgba(0,0,0,1) ${start + 25}%, rgba(0,0,0,0) ${start + 37.5}%)`;

        const blurDiv = document.createElement("div");
        Object.assign(blurDiv.style, {
          position: "absolute",
          inset: "0",
          zIndex: i + 1,
          backdropFilter: `blur(${blurAmount}px)`,
          WebkitBackdropFilter: `blur(${blurAmount}px)`,
          maskImage: mask,
          WebkitMaskImage: mask,
          pointerEvents: "none",
        });
        blurFragment.appendChild(blurDiv);
      }
      blurContainer.appendChild(blurFragment);
      fader.appendChild(blurContainer);
    }

    // Gradient layer
    const gradDiv = document.createElement("div");
    gradDiv.className = "grad";
    const isHorizontal = direction === "left" || direction === "right";
    Object.assign(gradDiv.style, {
      position: "absolute",
      [isHorizontal ? "width" : "height"]: height,
      [isHorizontal ? "top" : "left"]: "0",
      [isHorizontal ? "bottom" : "right"]: "0",
      [direction]: "0",
      background: `linear-gradient(${directions[direction].degree}deg, ${gradientSteps.map((s) => `rgba(${color}, ${s})`).join(", ")})`,
    });
    fader.appendChild(gradDiv);

    // Simple gradient if needed
    if (hasGradient) {
      const simpleGradient = document.createElement("div");
      simpleGradient.className = "simple-gradient";
      Object.assign(simpleGradient.style, {
        position: "absolute",
        inset: "0",
        background: `linear-gradient(${directions[direction].simple}, rgba(${color}, 0) 0%, rgba(${color}, ${gradientOpacity}) 100%)`,
        pointerEvents: "none",
        zIndex: 10,
      });
      fader.appendChild(simpleGradient);
    }

    fader.classList.add("ready");
  }

  // Efficient initialization
  function initializeFaders() {
    const faders = document.querySelectorAll(".progressive-fader");
    if (!faders.length) {
      setTimeout(initializeFaders, 100);
      return;
    }
    requestAnimationFrame(() => faders.forEach(updateFader));
  }

  // Smart DOM load handling
  document.readyState === "complete" ? initializeFaders() : document.addEventListener("DOMContentLoaded", initializeFaders, { once: true });

  // Optimized observer
  new MutationObserver((mutations) => {
    if (mutations.some((m) => m.attributeName === "class" || m.attributeName === "data-theme")) {
      requestAnimationFrame(() => document.querySelectorAll(".progressive-fader").forEach(updateFader));
    }
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });
}

initializeProgressiveFaders();
