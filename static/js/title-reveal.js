function initTitleRevealAnimations() {
  const titleElements = document.querySelectorAll("[title-reveal]");
  if (titleElements.length === 0) {
    console.warn("No elements with [title-reveal] found.");
    return;
  }

  // Inject CSS keyframes and styles
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes titleReveal {
      0% {
        opacity: 0;
        filter: blur(10px);
      }
      100% {
        opacity: 1;
        filter: blur(0);
      }
    }
    [title-reveal] span {
      display: inline-block;
      opacity: 0;
      filter: blur(10px);
      will-change: opacity, filter;
    }
  `;
  document.head.appendChild(styleSheet);

  // Process text nodes and links
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const words = node.textContent.trim().split(/\s+/);
      const fragment = document.createDocumentFragment();

      words.forEach((word) => {
        if (word) {
          const span = document.createElement("span");
          span.textContent = word;
          fragment.appendChild(span);
          fragment.appendChild(document.createTextNode(" "));
        }
      });

      return fragment;
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "A") {
      const link = node.cloneNode(false);
      const words = node.textContent.trim().split(/\s+/);

      words.forEach((word) => {
        if (word) {
          const span = document.createElement("span");
          span.textContent = word;
          link.appendChild(span);
          link.appendChild(document.createTextNode(" "));
        }
      });

      return link;
    }

    return node.cloneNode(true);
  }

  // Split content while preserving links
  function splitContentPreservingLinks(element) {
    const fragment = document.createDocumentFragment();

    Array.from(element.childNodes).forEach((node) => {
      const processed = processNode(node);
      fragment.appendChild(processed);
    });

    const spacesToRemove = fragment.querySelectorAll("a + text");
    spacesToRemove.forEach((textNode) => {
      if (textNode.textContent.startsWith(" ")) {
        textNode.textContent = textNode.textContent.slice(1);
      }
    });

    element.innerHTML = "";
    element.appendChild(fragment);
  }

  // Function to check if element is above the viewport
  function isAboveViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.bottom < 0;
  }

  // Function to animate an element
  function animateElement(element) {
    const spans = element.querySelectorAll("span");
    const baseDelay = parseFloat(element.getAttribute("title-reveal-delay") || "0") / 1000;

    spans.forEach((span, index) => {
      const staggerDelay = index * 0.1; // 0.1s per word
      const totalDelay = baseDelay + staggerDelay;
      span.style.animation = `titleReveal 1.3s ease-out`;
      span.style.animationDelay = `${totalDelay}s`;
      span.style.animationFillMode = "forwards";
    });
  }

  // Intersection Observer
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateElement(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Process each title-reveal element
  titleElements.forEach((element) => {
    splitContentPreservingLinks(element); // Prepare spans

    // Check if element is above the viewport
    if (isAboveViewport(element)) {
      // If it's above, animate it immediately
      animateElement(element);
    } else {
      // Otherwise, observe it for when it enters the viewport
      observer.observe(element);
    }
  });

  console.log(`Initialized animation for ${titleElements.length} [title-reveal] elements`);
}

// Run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTitleRevealAnimations);
} else {
  initTitleRevealAnimations();
}
