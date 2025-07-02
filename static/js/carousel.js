function createCarousel(options = {}) {
  const config = {
    itemWidth: options.itemWidth || {
      mobile: "70vw",
      tablet: "40vw",
      desktop: "25vw",
    },
    gap: options.gap || {
      mobile: "16px",
      tablet: "24px",
      desktop: "32px",
    },
    paddingLeft: options.paddingLeft || {
      mobile: "24px",
      tablet: "32px",
      desktop: "40px",
    },
    paddingRight: options.paddingRight || {
      mobile: "24px",
      tablet: "32px",
      desktop: "40px",
    },
    showButtons: options.showButtons !== false,
    animationDuration: options.animationDuration || 1400,
    useNativeScroll: options.useNativeScroll !== false,
  };

  const easingFunctions = {
    linear: (t) => t,
    easeOut: (t) => 1 - Math.pow(1 - t, 2),
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
    easeOutQuint: (t) => 1 - Math.pow(1 - t, 5),
    easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    premium: (t) => 1 - Math.pow(1 - t, 4.5),
    easeOutBack: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeOutSilk: (t) => {
      const cubic = 1 - Math.pow(1 - t, 3);
      const expo = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      return t < 0.5 ? cubic : cubic * 0.3 + expo * 0.7;
    },
    longTail: (t) => 1 - Math.pow(1 - t, 3.2) * (1 - 0.2 * t),
    ultraPremium: (t) => {
      // Refined for Linear.app-like smoothness: continuous, no transitions
      const tAdjusted = 1 - t;
      // Single curve with fast start and ultra-gentle finish
      return 1 - Math.pow(tAdjusted, 3) * (1 + 0.5 * Math.sin(t * Math.PI));
    },
    precisionFinish: (t) => {
      const base = 1 - Math.pow(1 - t, 4);
      if (t > 0.9) {
        const finalPhase = (t - 0.9) / 0.1;
        return base + ((1 - base) * (1 - Math.cos((finalPhase * Math.PI) / 2))) / 2;
      }
      return base;
    },

    smoothStop: (t) => {
      // Enhanced end behavior with extra smooth deceleration
      // Quick acceleration at start, extremely gentle finish
      if (t < 0.7) {
        // Use a cubic ease-out for first 70% of animation
        return 1 - Math.pow(1 - t / 0.7, 3);
      } else {
        // Use a gentler curve for the final 30% to create a soft landing
        const endPhase = (t - 0.7) / 0.3;
        const cubicValue = 1 - Math.pow(1 - t, 3);
        const gentleValue = 1 - Math.pow(1 - t, 2) * (0.2 + 0.8 * Math.cos((endPhase * Math.PI) / 2));
        // Blend from cubic to gentle curve
        return cubicValue * (1 - endPhase) + gentleValue * endPhase;
      }
    },
    appleStore: (t) => {
      // Reverse-engineered from Apple Store carousel
      // Characterized by very smooth start and extremely soft landing

      // Use a custom curve that mimics Apple's distinctive fluid motion
      // Slow graceful start, steady middle, and an extra gentle stop

      // Custom quintic bezier-like approximation
      if (t < 0.2) {
        // Initial slow start (0-20%)
        return 3 * Math.pow(t, 2) - 2 * Math.pow(t, 3);
      } else if (t < 0.6) {
        // Middle part - steady acceleration (20-60%)
        const normalized = (t - 0.2) / 0.4;
        return 0.12 + 0.48 * normalized + 0.32 * Math.pow(normalized, 3);
      } else {
        // Final deceleration with Apple's signature soft landing (60-100%)
        const normalized = (t - 0.6) / 0.4;
        const baseProgress = 0.6 + 0.4 * normalized;

        // Very gentle polynomial curve combined with sine modulation for smoothness
        return baseProgress + (1 - baseProgress) * (1 - Math.pow(1 - normalized, 4)) * (0.98 - 0.06 * Math.cos(normalized * Math.PI));
      }
    },
  };

  // Track if we're currently in a user-initiated or programmatic scroll
  let isAnimating = false;
  let userScrolling = false;
  let lastUserScrollTime = 0;
  const USER_SCROLL_TIMEOUT = 300; // Time to wait after user scroll before considering auto-snap

  function smoothScrollTo(element, target, options = {}) {
    // Default options
    const scrollOptions = {
      duration: config.animationDuration,
      easing: "appleStore",
      allowInterruption: true,
      ...options,
    };

    if (config.useNativeScroll && "scrollBehavior" in document.documentElement.style) {
      element.style.scrollBehavior = "smooth";
      element.scrollLeft = target;
      return;
    }

    if (element._scrollAnimation && scrollOptions.allowInterruption) {
      cancelAnimationFrame(element._scrollAnimation);
      element._scrollAnimation = null;
    } else if (element._scrollAnimation) {
      // Don't interrupt if not allowed
      return;
    }

    const start = element.scrollLeft;
    const maxScroll = element.scrollWidth - element.clientWidth;
    const clampedTarget = Math.max(0, Math.min(target, maxScroll));
    const distance = clampedTarget - start;

    if (Math.abs(distance) < 0.5) {
      element.scrollLeft = clampedTarget;
      return;
    }

    // Set the animating flag
    isAnimating = true;

    const duration = scrollOptions.duration;
    const startTime = performance.now();
    const easing = easingFunctions[scrollOptions.easing];

    function step(currentTime) {
      // If user is scrolling, cancel the animation
      if (userScrolling && scrollOptions.allowInterruption) {
        isAnimating = false;
        element._scrollAnimation = null;
        return;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);

      element.scrollLeft = Math.round(start + distance * easedProgress);

      if (progress < 1) {
        element._scrollAnimation = requestAnimationFrame(step);
      } else {
        element.scrollLeft = clampedTarget;
        element._scrollAnimation = null;
        isAnimating = false;

        // FIXED: Only call updateButtonStates if it exists (showButtons is true)
        if (typeof updateButtonStates === "function") {
          updateButtonStates();
        }
      }
    }

    element._scrollAnimation = requestAnimationFrame(step);
  }

  // Rest of your carousel setup remains unchanged
  document.querySelectorAll("[carousel-container]").forEach((container) => {
    const existingItems = Array.from(container.querySelectorAll(".carousel-item"));

    container.innerHTML = `
      <div class="carousel-wrapper">
        <div class="carousel-track  ${config.showButtons ? "has-btn" : ""}">
          <div class="carousel-inner"></div>
        </div>
        <div class="carousel-btn-container">
        ${config.showButtons ? '<button class="carousel-btn carousel-btn-prev" aria-label="Previous items">←</button>' : ""}
        ${config.showButtons ? '<button class="carousel-btn carousel-btn-next" aria-label="Next items">→</button>' : ""}

        </div>
      </div>
    `;

    const track = container.querySelector(".carousel-track");
    const inner = container.querySelector(".carousel-inner");
    const prevBtn = config.showButtons ? container.querySelector(".carousel-btn-prev") : null;
    const nextBtn = config.showButtons ? container.querySelector(".carousel-btn-next") : null;

    existingItems.forEach((item) => {
      item.classList.add("carousel-item");
      inner.appendChild(item);
    });

    const style = document.createElement("style");
    style.textContent = `
      .carousel-wrapper { position: relative; overflow: hidden; }
      .carousel-track {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        -ms-overflow-style: none;
        scroll-snap-type: x mandatory;
                white-space: nowrap;

      }
 .carousel-track.has-btn{
 padding-bottom:5.5rem;

 }
      .carousel-track::-webkit-scrollbar { display: none; }
      .carousel-inner {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        white-space: nowrap;
      }
      .carousel-item {
        flex: 0 0 auto;
        scroll-snap-align: center; /* Default for mobile */
      }
      
      /* Tablet-specific styles */
      @media (min-width: 768px) and (max-width: 1023px) {
        .carousel-track {
          scroll-padding-left: 0px; /* Will be set dynamically in JS */
        }
        .carousel-item {
          scroll-snap-align: start; /* For tablet alignment */
        }
      }
      
      /* Desktop-specific styles */
      @media (min-width: 1024px) {
        .carousel-track {
          scroll-padding-left: 0px; /* Will be set dynamically in JS */
        }
        .carousel-item {
          scroll-snap-align: start; /* For desktop alignment */
        }
      }

      .carousel-btn-container{
      width: 100%;
      height:auto;
      display:flex;
      flex-direction:row;
      gap:0.5rem;
          position: absolute;
        bottom: 0;
      }



      .carousel-btn:hover { background: rgba(255, 255, 255, 0.9); }
      .carousel-btn-prev {   }
      .carousel-btn-next {   }
      .carousel-btn:disabled { opacity: 0.4; cursor: default; }

      @media (max-width: 767px) {
        .carousel-inner {
          gap: ${config.gap.mobile};
          padding-left: ${config.paddingLeft.mobile};
          padding-right: ${config.paddingRight.mobile};
        }
        .carousel-item { width: ${config.itemWidth.mobile}; }
        .carousel-track.has-btn{padding-bottom:0rem;}
        .carousel-btn-container{display:none; visibility:hidden}

      }
      @media (min-width: 768px) and (max-width: 1023px) {
        .carousel-inner {
          gap: ${config.gap.tablet};
          padding-left: ${config.paddingLeft.tablet};
          padding-right: ${config.paddingRight.tablet};
        }
        .carousel-item { width: ${config.itemWidth.tablet}; }
        .carousel-btn-container{padding-left:${config.paddingLeft.tablet}}

      }
      @media (min-width: 1024px) {
        .carousel-inner {
          gap: ${config.gap.desktop};
          padding-left: ${config.paddingLeft.desktop};
          padding-right: ${config.paddingRight.desktop};
        }
        .carousel-item { width: ${config.itemWidth.desktop}; }
        .carousel-btn-container{padding-left:${config.paddingLeft.desktop}}

      }
    `;
    container.appendChild(style);

    track.scrollLeft = 0;

    // Function to calculate and log computed styles and update scroll-snap-padding
    function updatePaddingAndSnap() {
      const innerElement = container.querySelector(".carousel-inner");
      const trackElement = container.querySelector(".carousel-track");

      if (innerElement && trackElement) {
        const computedStyle = window.getComputedStyle(innerElement);
        const paddingLeftValue = computedStyle.paddingLeft;
        const viewportWidth = window.innerWidth;

        let screenSize = "";
        if (viewportWidth < 768) screenSize = "mobile";
        else if (viewportWidth < 1024) screenSize = "tablet";
        else screenSize = "desktop";

        // Only set scroll padding for tablet and desktop
        if (viewportWidth >= 768) {
          let calculatedPaddingInPixels = parseFloat(paddingLeftValue);

          // For calc values, calculate the actual pixel value
          if (paddingLeftValue.includes("calc")) {
            // Extract the percentage and rem values from calc(40% - 16rem)
            const calcMatch = paddingLeftValue.match(/calc\((\d+)% - (\d+)rem\)/);
            if (calcMatch) {
              const percentage = parseFloat(calcMatch[1]);
              const remValue = parseFloat(calcMatch[2]);
              const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);

              // Calculate the actual pixel value: percentage of viewport width minus rem value
              const percentageInPixels = (percentage / 100) * viewportWidth;
              const remInPixels = remValue * rootFontSize;
              calculatedPaddingInPixels = percentageInPixels - remInPixels;
            }
          }

          // Set scroll-padding-left to match the inner element's padding-left
          trackElement.style.scrollPaddingLeft = `${calculatedPaddingInPixels}px`;
        } else {
          // Reset for mobile
          trackElement.style.scrollPaddingLeft = "";
        }
      }
    }

    // Update padding and scroll snap on initial render and window resize
    updatePaddingAndSnap();
    window.addEventListener("resize", updatePaddingAndSnap);

    // FIXED: Define updateButtonStates regardless of showButtons setting
    // but make its behavior conditional
    function updateButtonStates() {
      if (!config.showButtons) return;

      // Check if we're truly at the start by checking if the first item is aligned with paddingLeft
      let atStart = track.scrollLeft <= 1;

      // For tablet and desktop, do an additional check to ensure prev button remains enabled
      // as long as we're not perfectly at the start
      if (window.innerWidth >= 768) {
        const items = Array.from(inner.querySelectorAll(".carousel-item"));
        if (items.length > 0) {
          const firstItem = items[0];
          const trackRect = track.getBoundingClientRect();
          const firstItemRect = firstItem.getBoundingClientRect();
          const paddingLeftPx = parseFloat(track.style.scrollPaddingLeft || "0");

          // Calculate the position of the first item relative to the track's padding
          const firstItemPosition = firstItemRect.left - trackRect.left;

          // Only consider at start if the first item is aligned with the padding (with small tolerance)
          atStart = Math.abs(firstItemPosition - paddingLeftPx) < 2;
        }
      }

      const atEnd = isNearCarouselEnd();
      prevBtn.disabled = atStart;
      nextBtn.disabled = atEnd;
    }

    // Added a function to check if we're near the end of the carousel
    function isNearCarouselEnd() {
      // Consider "near end" if within 10px of the maximum scroll position
      return track.scrollLeft >= track.scrollWidth - track.clientWidth - 10;
    }

    function getVisibleItems() {
      const items = Array.from(inner.querySelectorAll(".carousel-item"));
      const trackRect = track.getBoundingClientRect();
      return items.map((item) => {
        const rect = item.getBoundingClientRect();
        const itemLeft = rect.left - trackRect.left;
        const itemRight = rect.right - trackRect.left;
        const visibleLeft = Math.max(0, itemLeft);
        const visibleRight = Math.min(trackRect.width, itemRight);
        const visibleWidth = Math.max(0, visibleRight - visibleLeft);
        return {
          item,
          visible: visibleWidth > 0,
          visiblePercent: visibleWidth / rect.width,
          center: (itemLeft + itemRight) / 2,
          index: items.indexOf(item),
        };
      });
    }

    if (config.showButtons) {
      function scrollToNext() {
        const visibleItems = getVisibleItems();
        const fullyVisibleItems = visibleItems.filter((i) => i.visiblePercent > 0.9);
        const lastVisible = fullyVisibleItems[fullyVisibleItems.length - 1];
        if (lastVisible && lastVisible.index < visibleItems.length - 1) {
          const nextItem = inner.querySelectorAll(".carousel-item")[lastVisible.index + 1];
          if (nextItem) {
            const itemRect = nextItem.getBoundingClientRect();
            const trackRect = track.getBoundingClientRect();

            // Check if we're showing the last item after this scroll
            const isLastItem = lastVisible.index + 1 === visibleItems.length - 1;
            const isSecondToLastItem = lastVisible.index + 1 === visibleItems.length - 2;

            // Use different positioning logic based on viewport width and position
            let scrollAmount;
            if (window.innerWidth >= 768) {
              // For tablet and desktop
              if (isLastItem || isSecondToLastItem) {
                // If scrolling to the last or second-to-last item, allow full visibility
                // by scrolling to the maximum right (with a small margin)
                scrollAmount = track.scrollWidth - track.clientWidth;
              } else {
                // Otherwise, align with paddingLeft
                const paddingLeftPx = parseFloat(track.style.scrollPaddingLeft || "0");
                scrollAmount = track.scrollLeft + (itemRect.left - trackRect.left - paddingLeftPx);
              }
            } else {
              // For mobile: use original centered behavior
              scrollAmount = track.scrollLeft + (itemRect.left - trackRect.left) - (trackRect.width - itemRect.width) / 2;
            }

            smoothScrollTo(track, scrollAmount);
          }
        }
      }

      function scrollToPrev() {
        const visibleItems = getVisibleItems();
        const fullyVisibleItems = visibleItems.filter((i) => i.visiblePercent > 0.9);
        const firstVisible = fullyVisibleItems[0];

        // Check for the specific scenario: second card is snapped, first card is partially visible
        if (window.innerWidth >= 768 && track.scrollLeft > 0) {
          const items = Array.from(inner.querySelectorAll(".carousel-item"));
          if (items.length >= 2) {
            const firstItem = items[0];
            const secondItem = items[1];
            const trackRect = track.getBoundingClientRect();
            const firstItemRect = firstItem.getBoundingClientRect();
            const secondItemRect = secondItem.getBoundingClientRect();
            const paddingLeftPx = parseFloat(track.style.scrollPaddingLeft || "0");

            // Check if second item is aligned with padding (with small tolerance)
            const secondItemAligned = Math.abs(secondItemRect.left - trackRect.left - paddingLeftPx) < 5;

            // Check if first item is partially visible
            const firstItemPartiallyVisible =
              firstItemRect.right > trackRect.left && // First item is somewhat visible
              firstItemRect.left < trackRect.left + paddingLeftPx; // But not fully aligned

            // If this is our specific scenario, scroll to the initial position
            if (secondItemAligned && firstItemPartiallyVisible) {
              smoothScrollTo(track, 0);
              return;
            }
          }
        }

        // Otherwise, use the original prev button behavior
        if (firstVisible && firstVisible.index > 0) {
          const prevItem = inner.querySelectorAll(".carousel-item")[firstVisible.index - 1];
          if (prevItem) {
            const itemRect = prevItem.getBoundingClientRect();
            const trackRect = track.getBoundingClientRect();

            let scrollAmount;
            if (window.innerWidth >= 768) {
              // For tablet and desktop: align with paddingLeft
              const paddingLeftPx = parseFloat(track.style.scrollPaddingLeft || "0");
              scrollAmount = track.scrollLeft + (itemRect.left - trackRect.left - paddingLeftPx);
            } else {
              // For mobile: use original centered behavior
              scrollAmount = track.scrollLeft + (itemRect.left - trackRect.left) - (trackRect.width - itemRect.width) / 2;
            }

            smoothScrollTo(track, scrollAmount);
          }
        }
      }

      prevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!prevBtn.disabled) scrollToPrev();
      });

      nextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!nextBtn.disabled) scrollToNext();
      });

      track.addEventListener("scroll", updateButtonStates);
      updateButtonStates();
    }

    let touchStartX = 0;
    let startScrollPos = 0;
    let scrollDistance = 0;
    let scrollVelocity = 0;
    let lastScrollLeft = 0;
    let lastScrollTime = 0;

    // Track user scrolling
    track.addEventListener("scroll", () => {
      // Detect if this is a user-initiated scroll
      if (!isAnimating) {
        userScrolling = true;
        lastUserScrollTime = Date.now();

        // Calculate scroll velocity for momentum-based snapping
        const now = Date.now();
        const dt = now - lastScrollTime;
        if (dt > 0) {
          const dx = track.scrollLeft - lastScrollLeft;
          scrollVelocity = dx / dt; // pixels per millisecond
        }
        lastScrollLeft = track.scrollLeft;
        lastScrollTime = now;
      }

      // FIXED: Call updateButtonStates only if buttons are shown
      if (config.showButtons) {
        updateButtonStates();
      }
    });

    track.addEventListener(
      "touchstart",
      (e) => {
        userScrolling = true;
        touchStartX = e.touches[0].clientX;
        startScrollPos = track.scrollLeft;
        lastScrollLeft = startScrollPos;
        lastScrollTime = Date.now();
        scrollVelocity = 0;

        if (config.useNativeScroll) track.style.scrollBehavior = "auto";

        // Cancel any ongoing animations when user starts interacting
        if (track._scrollAnimation) {
          cancelAnimationFrame(track._scrollAnimation);
          track._scrollAnimation = null;
          isAnimating = false;
        }
      },
      { passive: true }
    );

    track.addEventListener(
      "touchmove",
      (e) => {
        userScrolling = true;
        lastUserScrollTime = Date.now();
        scrollDistance = touchStartX - e.touches[0].clientX;
      },
      { passive: true }
    );

    track.addEventListener(
      "touchend",
      () => {
        if (config.useNativeScroll) track.style.scrollBehavior = "smooth";

        // For Apple-like behavior, we need to consider velocity and momentum
        setTimeout(() => {
          // Only apply snapping if this was a small movement
          // For large, fast swipes, let the natural momentum carry through
          const isMomentumScroll = Math.abs(scrollVelocity) > 0.5; // Threshold for momentum scrolling

          if (window.innerWidth >= 768 && !isMomentumScroll) {
            snapAfterUserInteraction();
          }

          // Mark that user is no longer actively scrolling
          setTimeout(() => {
            userScrolling = false;
          }, 50);
        }, 50); // Small delay to ensure touch is completely finished
      },
      { passive: true }
    );

    // Mouse wheel/trackpad event
    track.addEventListener(
      "wheel",
      () => {
        userScrolling = true;
        lastUserScrollTime = Date.now();

        // Cancel any animations when user starts scrolling
        if (track._scrollAnimation) {
          cancelAnimationFrame(track._scrollAnimation);
          track._scrollAnimation = null;
          isAnimating = false;
        }
      },
      { passive: true }
    );

    // This is a more Apple-like snap function that only runs after user interaction is complete
    function snapAfterUserInteraction() {
      // Don't snap if animating programmatically, or if still scrolling from momentum
      if (isAnimating || Date.now() - lastUserScrollTime < USER_SCROLL_TIMEOUT) {
        return;
      }

      // Check if we're at or near the end of the carousel
      const isNearEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 10;

      // Don't apply snapping if we're at the end of the carousel
      if (isNearEnd) {
        console.log("Near end of carousel, skipping snap");
        return;
      }

      const items = Array.from(inner.querySelectorAll(".carousel-item"));
      if (!items.length) return;

      const trackRect = track.getBoundingClientRect();
      const paddingLeftPx = parseFloat(track.style.scrollPaddingLeft || "0");

      // Find the item closest to the paddingLeft position
      let closestItem = null;
      let minDistance = Infinity;

      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemLeftRelativeToTrack = rect.left - trackRect.left;
        const distance = Math.abs(itemLeftRelativeToTrack - paddingLeftPx);

        if (distance < minDistance) {
          minDistance = distance;
          closestItem = item;
        }
      });

      if (closestItem && minDistance > 3) {
        // Only snap if not already very close to aligned
        const rect = closestItem.getBoundingClientRect();
        const targetScrollLeft = track.scrollLeft + (rect.left - trackRect.left - paddingLeftPx);

        // Use a gentler duration for the snapping animation after user interaction
        smoothScrollTo(track, targetScrollLeft, {
          duration: Math.min(800, 600 + minDistance * 2), // Adaptive duration based on distance
          easing: "appleStore",
          allowInterruption: true,
        });
      }
    }

    // Check for auto-snapping after user stops scrolling
    setInterval(() => {
      // If user recently scrolled, don't auto-snap yet
      if (Date.now() - lastUserScrollTime < USER_SCROLL_TIMEOUT) {
        return;
      }

      // If we're on tablet/desktop and not already animating
      if (window.innerWidth >= 768 && !isAnimating && !userScrolling) {
        snapAfterUserInteraction();
      }
    }, 200);
  });
}

// Example usage
createCarousel({
  showButtons: true,
  itemWidth: { mobile: "85vw", tablet: "auto", desktop: "auto" },
  gap: { mobile: "16px", tablet: "16px", desktop: "16px" },
  paddingLeft: { mobile: "16px", tablet: "calc(40% - 16rem)", desktop: "calc(40% - 16rem)" },
  paddingRight: { mobile: "16px", tablet: "16px", desktop: "16px" },
  animationDuration: 1400,
  useNativeScroll: true,
});
