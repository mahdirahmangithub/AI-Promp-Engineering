// More responsive selection tracking
document.addEventListener('selectionchange', function() {
    // This event fires continuously as selection changes
    processLinkSelection();
  });
  
  // Clean up when selection ends
  document.addEventListener('mouseup', function() {
    processLinkSelection();
  });
  
  // Handle selection changes
  function processLinkSelection() {
    const selection = window.getSelection();
    
    // Reset all links first
    document.querySelectorAll('a.no-shadow-temp').forEach(link => {
      link.classList.remove('no-shadow-temp');
    });
    
    // Only proceed if there's a selection
    if (selection.toString().length > 0) {
      // For efficiency, we'll only check links that could be in the vicinity of the selection
      // Get the common ancestor of the selection
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        // Get the nearest parent element if the container is a text node
        const parentElement = container.nodeType === 3 ? container.parentElement : container;
        
        // Look for links within this container (or up to two levels above for broader context)
        const searchArea = parentElement.parentElement?.parentElement || parentElement.parentElement || parentElement;
        
        // Find links in the search area
        const nearbyLinks = searchArea.querySelectorAll('a');
        
        // Check each nearby link
        nearbyLinks.forEach(link => {
          if (selectionIntersectsNode(selection, link)) {
            link.classList.add('no-shadow-temp');
          }
        });
      }
    }
  }
  
  // Helper function to check if selection intersects with a node
  function selectionIntersectsNode(selection, node) {
    if (selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    return range.intersectsNode(node);
  }
  
  // When selection is cleared, restore all links
  document.addEventListener('mousedown', function() {
    document.querySelectorAll('a.no-shadow-temp').forEach(link => {
      link.classList.remove('no-shadow-temp');
    });
  });
  
  // Add the CSS for temporarily removing shadow
  const style = document.createElement('style');
  style.textContent = `
    a.no-shadow-temp {
      text-shadow: none !important;
    }
  `;
  document.head.appendChild(style);