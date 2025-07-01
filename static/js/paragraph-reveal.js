function splitText(config = {}) {
  // Default config
  const defaultConfig = {
    overlap: 0, // Time (in seconds) before previous line ends to start next; 0 means no overlap
    revealMode: "line", // 'line' or 'word' for different animation styles
    wordDelay: 0.05, // Delay between each word when in word mode (seconds)
    baseAnimationDuration: 0.7, // Base duration for animation
  };
  const { overlap, revealMode, wordDelay, baseAnimationDuration } = { ...defaultConfig, ...config };

  const elements = document.querySelectorAll("[paragraph-reveal]");
  if (!elements.length) return;

  elements.forEach((element) => {
    // Get the computed styles to extract line-height and font-size
    const computedStyle = window.getComputedStyle(element);
    let lineHeight;

    if (computedStyle.lineHeight === "normal") {
      lineHeight = Math.ceil(parseFloat(computedStyle.fontSize) * 1.2);
    } else {
      const lhValue = computedStyle.lineHeight;
      if (lhValue.endsWith("px")) {
        lineHeight = Math.ceil(parseFloat(lhValue));
      } else if (lhValue.endsWith("em")) {
        lineHeight = Math.ceil(parseFloat(lhValue) * parseFloat(computedStyle.fontSize));
      } else {
        lineHeight = Math.ceil(parseFloat(lhValue) * parseFloat(computedStyle.fontSize));
      }
    }

    // Add CSS styles dynamically for animation
    const styleSheet = document.createElement("style");
    document.head.appendChild(styleSheet);
    // Insert the keyframes
    styleSheet.sheet.insertRule(`@keyframes revealLineTextMove{from{transform:translateY(100%);}to{transform:translateY(0);}}`, 0);
    styleSheet.sheet.insertRule(`@keyframes revealLineTextFade{from{opacity:0;}to{opacity:1;}}`, 1);
    styleSheet.sheet.insertRule(`@keyframes revealLineTextBlur{from{filter:blur(4px);}to{filter:blur(0px);}}`, 2);

    // Insert word reveal keyframes (for word mode)
    styleSheet.sheet.insertRule(`@keyframes revealWordMove{from{transform:translateY(100%);}to{transform:translateY(0);}}`, 3);
    styleSheet.sheet.insertRule(`@keyframes revealWordFade{from{opacity:0;}to{opacity:1;}}`, 4);
    styleSheet.sheet.insertRule(`@keyframes revealWordBlur{from{filter:blur(4px);}to{filter:blur(0px);}}`, 5);

    // Common styles
    styleSheet.sheet.insertRule(
      `
        .line {
            display: inline-block;
            overflow: hidden;
            height: ${lineHeight}px;
            line-height: ${lineHeight}px;
            vertical-align: bottom;
            will-change: transform, opacity;
        }
      `,
      6
    );
    styleSheet.sheet.insertRule(
      `
        .line-content {
            display: inline-block;
            transform: translateY(100%);
            opacity: 0;
        }
      `,
      7
    );

    // Word mode styles
    styleSheet.sheet.insertRule(
      `
        .word-container {
            display: inline-block;
            overflow: hidden;
            height: ${lineHeight}px;
            line-height: ${lineHeight}px;
            vertical-align: bottom;
        }
      `,
      8
    );
    styleSheet.sheet.insertRule(
      `
        .word-content {
            display: inline-block;
            transform: translateY(100%);
            opacity: 0;
        }
      `,
      9
    );

    // Store original HTML content and clear the element
    const originalContent = element.innerHTML;
    element.innerHTML = "";

    // Create a wrapper to manage the split structure
    const wrapper = document.createElement("span");
    wrapper.style.display = "inline";
    wrapper.style.whiteSpace = "normal";
    wrapper.style.width = "100%";

    // Function to process nodes (text, <a>, <br>)
    function processNode(node, targetContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text.trim() === "" && text.length > 0) {
          const spaceSpan = document.createElement("span");
          spaceSpan.className = "word";
          spaceSpan.style.display = "inline";
          spaceSpan.textContent = text;
          targetContainer.appendChild(spaceSpan);
          return;
        }

        const words = text.split(/(\s+)/);
        words.forEach((word) => {
          const wordSpan = document.createElement("span");
          wordSpan.className = "word";
          wordSpan.style.display = "inline";

          if (word.trim() !== "") {
            const chars = [...word];
            chars.forEach((char) => {
              const charSpan = document.createElement("span");
              charSpan.className = "char";
              charSpan.style.display = "inline";
              charSpan.textContent = char;
              wordSpan.appendChild(charSpan);
            });
          } else {
            wordSpan.textContent = word;
          }

          targetContainer.appendChild(wordSpan);
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "A") {
          const linkSpan = document.createElement("a");
          linkSpan.className = "word link";
          linkSpan.href = node.href;
          linkSpan.style.display = "inline";

          const linkText = node.textContent;
          const chars = [...linkText];
          chars.forEach((char) => {
            const charSpan = document.createElement("span");
            charSpan.className = "char";
            charSpan.style.display = "inline";
            charSpan.textContent = char;
            linkSpan.appendChild(charSpan);
          });

          targetContainer.appendChild(linkSpan);
        } else if (node.tagName === "BR") {
          targetContainer.appendChild(node.cloneNode());
        }
      }
    }

    // Parse original HTML content and split initially
    const parser = new DOMParser();
    const doc = parser.parseFromString(originalContent, "text/html");
    const nodes = doc.body.childNodes;

    // Split all content into words first
    nodes.forEach((node) => processNode(node, wrapper));
    element.appendChild(wrapper);

    // Temporary wrapper to preserve <br> positions
    const tempWrapper = document.createElement("span");
    tempWrapper.style.display = "none";
    nodes.forEach((node) => processNode(node, tempWrapper));
    document.body.appendChild(tempWrapper);

    // Function to organize content based on reveal mode
    function organizeContent() {
      const allWords = Array.from(wrapper.querySelectorAll(".word"));

      if (revealMode === "line") {
        organizeLines(allWords);
      } else if (revealMode === "word") {
        organizeWords(allWords);
      }
    }

    // Function to organize words into lines
    function organizeLines(allWords) {
      const lines = [];
      let currentLineNodes = [];
      let lastTop = null;
      let lineWidth = 0;
      const containerWidth = element.getBoundingClientRect().width;

      allWords.forEach((word) => {
        const rect = word.getBoundingClientRect();
        const wordWidth = rect.width;
        const top = rect.top;

        if (lastTop !== null && (top !== lastTop || lineWidth + wordWidth > containerWidth)) {
          lines.push(currentLineNodes);
          currentLineNodes = [];
          lineWidth = 0;
        }

        currentLineNodes.push(word);
        lineWidth += wordWidth;
        lastTop = top;
      });

      if (currentLineNodes.length) lines.push(currentLineNodes);

      // Clear wrapper and rebuild with lines
      wrapper.innerHTML = "";
      const brPositions = Array.from(tempWrapper.querySelectorAll("br")).map((br) => Array.from(tempWrapper.childNodes).indexOf(br));

      lines.forEach((lineNodes, index) => {
        const lineSpan = document.createElement("span");
        lineSpan.className = "line";

        const contentSpan = document.createElement("span");
        contentSpan.className = "line-content";
        lineNodes.forEach((node) => contentSpan.appendChild(node));
        lineSpan.appendChild(contentSpan);

        wrapper.appendChild(lineSpan);

        if (
          index < lines.length - 1 &&
          brPositions.some((pos) => pos > 0 && tempWrapper.childNodes[pos - 1].classList?.contains("word") && lineNodes.some((n) => n.textContent === tempWrapper.childNodes[pos - 1].textContent))
        ) {
          wrapper.appendChild(document.createElement("br"));
        }
      });
    }

    // Function to organize words individually for word-by-word reveal
    function organizeWords(allWords) {
      // Clear wrapper
      wrapper.innerHTML = "";
      const brPositions = Array.from(tempWrapper.querySelectorAll("br")).map((br) => Array.from(tempWrapper.childNodes).indexOf(br));

      let lineCounter = 0;
      let lastTop = null;

      // Group words by line first to maintain line structure
      const wordGroups = [];
      let currentGroup = [];

      allWords.forEach((word, idx) => {
        const rect = word.getBoundingClientRect();
        const top = rect.top;

        if (lastTop !== null && top !== lastTop) {
          if (currentGroup.length) {
            wordGroups.push(currentGroup);
            currentGroup = [];
          }
          lineCounter++;
        }

        currentGroup.push({ word, lineIndex: lineCounter, wordIndex: idx });
        lastTop = top;
      });

      if (currentGroup.length) {
        wordGroups.push(currentGroup);
      }

      // Now rebuild with individual word containers
      wordGroups.forEach((group, groupIndex) => {
        group.forEach((item, itemIndex) => {
          // Check if this is a whitespace word
          const isWhitespace = item.word.textContent.trim() === "";

          if (isWhitespace) {
            // Simply append the whitespace without wrapping it
            wrapper.appendChild(document.createTextNode(item.word.textContent));
          } else {
            // Normal word, wrap it in animation container
            const wordContainer = document.createElement("span");
            wordContainer.className = "word-container";

            const wordContent = document.createElement("span");
            wordContent.className = "word-content";
            wordContent.appendChild(item.word.cloneNode(true));
            wordContainer.appendChild(wordContent);

            wrapper.appendChild(wordContainer);
          }
        });

        // Check if we need to add a <br>
        if (
          groupIndex < wordGroups.length - 1 &&
          brPositions.some(
            (pos) => pos > 0 && tempWrapper.childNodes[pos - 1].classList?.contains("word") && group.some((item) => item.word.textContent === tempWrapper.childNodes[pos - 1].textContent)
          )
        ) {
          wrapper.appendChild(document.createElement("br"));
        }
      });
    }

    // Organize content and set up animation
    requestAnimationFrame(() => {
      organizeContent();
      document.body.removeChild(tempWrapper);

      // Set up Intersection Observer for animation
      const observer = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              if (revealMode === "line") {
                animateLines(entry.target);
              } else if (revealMode === "word") {
                animateWords(entry.target);
              }
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(element);
    });

    // Function to animate lines
    function animateLines(target) {
      const lineContents = target.querySelectorAll(".line-content");
      lineContents.forEach((content, index) => {
        // Start time: cumulative duration minus overlap
        const startTime = index * (baseAnimationDuration - overlap);
        content.style.animation = `
          revealLineTextMove ${baseAnimationDuration}s cubic-bezier(0.4, 0, 0.2, 1) ${startTime}s forwards,
          revealLineTextFade ${baseAnimationDuration + 1}s cubic-bezier(0.4, 0, 0.2, 1) ${startTime}s forwards,
          revealLineTextBlur ${baseAnimationDuration + 1}s cubic-bezier(0.4, 0, 0.2, 1) ${startTime}s forwards
        `;
      });
    }

    // Function to animate words
    function animateWords(target) {
      const wordContents = target.querySelectorAll(".word-content");
      wordContents.forEach((content, index) => {
        const startTime = index * wordDelay;
        content.style.animation = `
          revealWordMove ${baseAnimationDuration}s cubic-bezier(0.4, 0, 0.2, 1) ${startTime}s forwards,
          revealWordFade ${baseAnimationDuration + 0.3}s cubic-bezier(0.4, 0, 0.2, 1) ${startTime}s forwards,
          revealWordBlur ${baseAnimationDuration + 0.3}s cubic-bezier(0.4, 0, 0.2, 1) ${startTime}s forwards
        `;
      });
    }
  });
}

// Example usage with config
document.addEventListener("DOMContentLoaded", () => {
  splitText({
    overlap: 0.8, // Next line starts 0.64s before previous ends
    revealMode: "word", // 'line' or 'word'
    wordDelay: 0.02, // Delay between each word when in word mode
    baseAnimationDuration: 0.4, // Base duration for animation
  });
});
