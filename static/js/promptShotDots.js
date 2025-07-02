// Animated falling dots script for ZeroShot and FewShot sections
(function() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDots);
    } else {
        initializeDots();
    }

    function initializeDots() {
        const shotSections = document.querySelectorAll('.shot-section');
        
        shotSections.forEach((section, index) => {
            const title = section.querySelector('.shot-title');
            if (!title) return;
            
            const titleText = title.textContent.trim();
            const isZeroShot = titleText === 'ZeroShot';
            const isFewShot = titleText === 'FewShot';
            
            if (isZeroShot || isFewShot) {
                const dotCount = isZeroShot ? 1 : 12;
                createFallingDots(section, dotCount);
            }
        });
    }

    function createFallingDots(section, dotCount) {
        // Find the view-shots container
        const viewShotsDiv = document.querySelector('.view-shots');
        if (!viewShotsDiv) return;
        
        // Create container for falling dots - constrained to view-shots div
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'falling-dots-container';
        dotsContainer.style.cssText = `
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            pointer-events: none !important;
            z-index: 1000 !important;
            overflow: hidden !important;
        `;
        
        // Make sure view-shots has relative positioning
        const viewShotsStyle = window.getComputedStyle(viewShotsDiv);
        if (viewShotsStyle.position === 'static') {
            viewShotsDiv.style.position = 'relative';
        }
        
        // Get section position relative to view-shots
        const viewShotsRect = viewShotsDiv.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        
        // Create dots
        for (let i = 0; i < dotCount; i++) {
            createFallingDot(dotsContainer, section, i, dotCount, viewShotsDiv);
        }
        
        viewShotsDiv.appendChild(dotsContainer);
        
        // Store reference for cleanup if needed
        section.dotsContainer = dotsContainer;
    }

    function createFallingDot(container, section, index, totalDots, viewShotsDiv) {
        const dot = document.createElement('div');
        dot.className = 'falling-dot';
        
        // Calculate horizontal position based on section relative to view-shots
        const viewShotsRect = viewShotsDiv.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        const sectionCenterX = sectionRect.left - viewShotsRect.left + sectionRect.width / 2;
        
        // Spread dots horizontally if multiple dots
        let dotX = sectionCenterX;
        if (totalDots > 1) {
            const spacing = 30; // pixels between dots
            const totalWidth = (totalDots - 1) * spacing;
            dotX = sectionCenterX - totalWidth / 2 + (index * spacing);
        }
        
        dot.style.cssText = `
            position: absolute !important;
            width: 6px !important;
            height: 6px !important;
            background-color: var(--color-element-highlight) !important;
            border-radius: 50% !important;
            opacity: 0 !important;
            left: ${dotX}px !important;
            top: -20px !important;
            transition: none !important;
        `;
        
        container.appendChild(dot);
        
        // Start animation after a random delay to create natural randomness
        const randomDelay = Math.random() * 1000; // 0-1 second random delay
        setTimeout(() => {
            animateFallingDot(dot, section, index, viewShotsDiv);
        }, randomDelay);
    }

    function animateFallingDot(dot, section, index) {
        function animate() {
            // Get current section position (in case page scrolled)
            const sectionRect = section.getBoundingClientRect();
            const startY = sectionRect.bottom + window.scrollY;
            const endY = window.scrollY + window.innerHeight + 50; // Bottom of viewport + buffer
            
            // Reset dot position to start
            const sectionCenterX = sectionRect.left + sectionRect.width / 2;
            let dotX = sectionCenterX;
            
            // Handle multiple dots positioning
            const container = dot.parentElement;
            const totalDots = container.querySelectorAll('.falling-dot').length;
            if (totalDots > 1) {
                const spacing = 30;
                const totalWidth = (totalDots - 1) * spacing;
                dotX = sectionCenterX - totalWidth / 2 + (index * spacing);
            }
            
            dot.style.left = dotX + 'px';
            dot.style.top = (startY - window.scrollY) + 'px';
            dot.style.opacity = '0';
            
            // Animation phases with randomness for each loop
            let currentY = startY - window.scrollY;
            const distance = endY - startY;
            
            // Random duration between 2.5-4 seconds for each loop
            const duration = 1000 + Math.random() * 1500;
            
            // Random delay before starting this loop (0-800ms)
            const startDelay = Math.random() * 400;
            
            setTimeout(() => {
                const startTime = Date.now();
                
                function updatePosition() {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Eased progress for smooth movement
                    const easedProgress = 1 - Math.pow(1 - progress, 3);
                    
                    currentY = (startY - window.scrollY) + (distance * easedProgress);
                    dot.style.top = currentY + 'px';
                    
                    // Opacity animation: fade in, stay visible, fade out
                    let opacity = 0;
                    if (progress < 0.2) {
                        // Fade in during first 20%
                        opacity = progress / 0.2;
                    } else if (progress < 0.8) {
                        // Full opacity during middle 60%
                        opacity = 1;
                    } else {
                        // Fade out during last 20%
                        opacity = 1 - ((progress - 0.8) / 0.2);
                    }
                    
                    dot.style.opacity = opacity;
                    
                    if (progress < 1) {
                        requestAnimationFrame(updatePosition);
                    } else {
                        // Animation complete, restart with new randomness
                        animate();
                    }
                }
                
                requestAnimationFrame(updatePosition);
            }, startDelay);
        }
        
        // Start the animation loop
        animate();
    }

    // Handle window resize to reposition dots
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            // Reinitialize dots on resize
            const containers = document.querySelectorAll('.falling-dots-container');
            containers.forEach(container => container.remove());
            initializeDots();
        }, 250);
    });

})();