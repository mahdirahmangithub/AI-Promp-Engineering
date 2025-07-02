class TypingEffect {
    constructor() {
        this.caretColor = 'var(--color-text-primary)';
        this.typingSpeed = 50;
        this.injectStyles();
        this.init();
    }
    
    // Inject CSS styles directly into the page
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes typing-blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
            }
            
            .typing-caret {
                display: inline-block !important;
                width: 1.5px !important;
                height: 1.2em !important;
                background-color: var(--color-element-highlight) !important;
                vertical-align: baseline !important;
                animation: typing-blink 1s infinite !important;
                transform: translateY(2px) !important;
                transition: filter 0.3s ease, opacity 0.3s ease !important;
            }
            
            .typing-text {
                display: inline !important;
                color: inherit !important;
                margin-right: 0 !important;
            }
            
            .word-span {
                display: inline !important;
                transition: filter 0.3s ease, opacity 0.3s ease !important;
            }
            
            [typing-effect] {
                cursor: pointer !important;
                min-height: 1.2em !important;
                transition: opacity 0.2s ease !important;
            }
            
            [typing-effect]:hover {
                opacity: 0.8 !important;
            }
            
            .view-typing {
                cursor: pointer !important;
                transition: opacity 0.2s ease !important;
            }
            
            .view-typing:hover {
                opacity: 0.9 !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    setCaretColor(color) {
        this.caretColor = color;
        document.querySelectorAll('.typing-caret').forEach(caret => {
            caret.style.backgroundColor = color;
        });
    }
    
    setTypingSpeed(speed) {
        this.typingSpeed = speed;
    }
    
    init() {
        const elements = document.querySelectorAll('[typing-effect]');
        elements.forEach(element => {
            this.setupElement(element);
        });
    }
    
    setupElement(element) {
        // Store the original text and classes
        const originalText = element.textContent.trim();
        const originalClasses = element.className;
        element.setAttribute('data-original-text', originalText);
        element.setAttribute('data-original-classes', originalClasses);
        
        // Clear content but keep all styling
        element.innerHTML = '';
        
        // Create the caret at the beginning
        const caret = document.createElement('span');
        caret.className = 'typing-caret';
        // Apply inline styles for guaranteed visibility
        this.applyCaretStyles(caret);
        
        // Find the parent container (view-typing)
        const parentContainer = element.closest('.view-typing');
        
        if (parentContainer) {
            // Make the entire parent container clickable
            parentContainer.style.cursor = 'pointer';
            
            // Add click event to the parent container
            const clickHandler = (e) => {
                e.preventDefault();
                this.startTyping(element, originalText, caret, parentContainer, clickHandler);
            };
            
            parentContainer.addEventListener('click', clickHandler);
        } else {
            // Fallback: make just the element clickable
            element.style.cursor = 'pointer';
            element.addEventListener('click', (e) => {
                e.preventDefault();
                this.startTyping(element, originalText, caret);
            });
        }
        
        element.style.minHeight = '1.2em';
        
        // Just add the caret - it will appear at the natural text position
        element.appendChild(caret);
    }
    
    applyCaretStyles(caret) {
        caret.style.display = 'inline-block';
        caret.style.width = '1.5px';
        caret.style.height = '1.2em';
        caret.style.backgroundColor = 'var(--color-element-highlight)';
        caret.style.verticalAlign = 'baseline';
        caret.style.animation = 'typing-blink 1s infinite';
        caret.style.transform = 'translateY(2px)';
        caret.style.transition = 'filter 0.3s ease, opacity 0.3s ease';
    }
    
    startTyping(element, text, caret, parentContainer = null, clickHandler = null) {
        // Disable clicking during typing
        if (parentContainer) {
            parentContainer.style.pointerEvents = 'none';
            parentContainer.style.cursor = 'default';
            // Remove the click handler to prevent multiple triggers
            if (clickHandler) {
                parentContainer.removeEventListener('click', clickHandler);
            }
        } else {
            element.style.pointerEvents = 'none';
            element.style.cursor = 'default';
        }
        
        // Create span for the typing text
        const textSpan = document.createElement('span');
        textSpan.className = 'typing-text';
        // Apply inline styles
        textSpan.style.display = 'inline';
        textSpan.style.color = 'inherit';
        textSpan.style.marginRight = '0';
        
        // Insert the text span BEFORE the caret
        element.insertBefore(textSpan, caret);
        
        let currentIndex = 0;
        
        const typeCharacter = () => {
            if (currentIndex < text.length) {
                textSpan.textContent += text[currentIndex];
                currentIndex++;
                setTimeout(typeCharacter, this.typingSpeed);
            } else {
                // Typing complete - enable blur effect on "2" key
                this.enableBlurEffect(element, textSpan);
            }
        };
        
        typeCharacter();
    }
    
    resetElement(element) {
        const originalText = element.getAttribute('data-original-text');
        if (originalText) {
            element.innerHTML = '';
            element.style.minHeight = '1.2em';
            
            const caret = document.createElement('span');
            caret.className = 'typing-caret';
            this.applyCaretStyles(caret);
            
            // Find the parent container again
            const parentContainer = element.closest('.view-typing');
            
            if (parentContainer) {
                parentContainer.style.cursor = 'pointer';
                parentContainer.style.pointerEvents = 'auto';
                
                const clickHandler = (e) => {
                    e.preventDefault();
                    this.startTyping(element, originalText, caret, parentContainer, clickHandler);
                };
                
                parentContainer.addEventListener('click', clickHandler);
            } else {
                element.style.cursor = 'pointer';
                element.style.pointerEvents = 'auto';
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.startTyping(element, originalText, caret);
                });
            }
            
            element.appendChild(caret);
        }
    }
    
    resetAll() {
        document.querySelectorAll('[typing-effect]').forEach(element => {
            this.resetElement(element);
        });
    }
    
    enableBlurEffect(element, textSpan) {
        // Split text into words and wrap each in a span
        const text = textSpan.textContent;
        const words = text.split(' ');
        
        // Clear the text span and rebuild with individual word spans
        textSpan.innerHTML = '';
        
        words.forEach((word, index) => {
            const wordSpan = document.createElement('span');
            wordSpan.textContent = word;
            wordSpan.classList.add('word-span');
            wordSpan.setAttribute('data-word-index', index);
            // Apply inline styles
            wordSpan.style.display = 'inline';
            wordSpan.style.transition = 'filter 0.3s ease, opacity 0.3s ease';
            
            textSpan.appendChild(wordSpan);
            
            // Add space after each word except the last one
            if (index < words.length - 1) {
                textSpan.appendChild(document.createTextNode(' '));
            }
        });
        
        // Get the caret element
        const caret = element.querySelector('.typing-caret');
        
        // Remove any existing listeners first
        if (this.currentKeyListener) {
            document.removeEventListener('keydown', this.currentKeyListener);
        }
        
        // Add keyboard listener for "2", "3", and "4" keys
        this.currentKeyListener = (e) => {
            console.log('Key pressed:', e.key); // Debug log
            if (e.key === '2') {
                e.preventDefault();
                console.log('Applying blur effect for key 2'); // Debug log
                this.applyBlurToAllWordsExceptSecond(textSpan, caret);
            } else if (e.key === '3') {
                e.preventDefault();
                console.log('Applying blur effect for key 3'); // Debug log
                this.applyBlurExceptSecondFifthSixth(textSpan, caret);
            } else if (e.key === '4') {
                e.preventDefault();
                console.log('Applying blur effect for key 4'); // Debug log
                this.applyBlurToAllWordsExceptFourth(textSpan, caret);
            }
        };
        
        document.addEventListener('keydown', this.currentKeyListener);
        console.log('Keyboard listener added'); // Debug log
        
        // Store the listener reference for cleanup if needed
        element.setAttribute('data-blur-listener', 'active');
    }
    
    applyBlurToAllWordsExceptSecond(textSpan, caret) {
        console.log('Applying blur to all words except second'); // Debug log
        const wordSpans = textSpan.querySelectorAll('.word-span');
        console.log('Found word spans:', wordSpans.length); // Debug log
        
        wordSpans.forEach((wordSpan, index) => {
            if (index !== 1) { // Skip the second word (index 1)
                wordSpan.style.filter = 'blur(3px)';
                wordSpan.style.opacity = '0.6';
                wordSpan.style.transition = 'filter 0.3s ease, opacity 0.3s ease';
                console.log(`Blurred word ${index}: ${wordSpan.textContent}`); // Debug log
            } else {
                // Clear any existing blur on the second word and set full opacity
                wordSpan.style.filter = 'none';
                wordSpan.style.opacity = '1';
                console.log(`Kept clear word ${index}: ${wordSpan.textContent}`); // Debug log
            }
        });
        
        // Blur the caret with reduced opacity
        if (caret) {
            caret.style.filter = 'blur(3px)';
            caret.style.opacity = '0.6';
            caret.style.transition = 'filter 0.3s ease, opacity 0.3s ease';
            console.log('Caret blurred'); // Debug log
        }
    }
    
    applyBlurExceptSecondFifthSixth(textSpan, caret) {
        console.log('Applying blur except 2nd, 5th, 6th words'); // Debug log
        const wordSpans = textSpan.querySelectorAll('.word-span');
        console.log('Found word spans:', wordSpans.length); // Debug log
        
        wordSpans.forEach((wordSpan, index) => {
            // Keep clear: 2nd (index 1), 5th (index 4), 6th (index 5)
            if (index !== 1 && index !== 4 && index !== 5) {
                wordSpan.style.filter = 'blur(3px)';
                wordSpan.style.opacity = '0.6';
                wordSpan.style.transition = 'filter 0.3s ease, opacity 0.3s ease';
                console.log(`Blurred word ${index}: ${wordSpan.textContent}`); // Debug log
            } else {
                // Clear any existing blur on the excepted words and set full opacity
                wordSpan.style.filter = 'none';
                wordSpan.style.opacity = '1';
                console.log(`Kept clear word ${index}: ${wordSpan.textContent}`); // Debug log
            }
        });
        
        // Keep caret blurred with reduced opacity
        if (caret) {
            caret.style.filter = 'blur(3px)';
            caret.style.opacity = '0.6';
            caret.style.transition = 'filter 0.3s ease, opacity 0.3s ease';
            console.log('Caret blurred'); // Debug log
        }
    }
    
    applyBlurToAllWordsExceptFourth(textSpan, caret) {
        console.log('Applying blur to all words except fourth'); // Debug log
        const wordSpans = textSpan.querySelectorAll('.word-span');
        console.log('Found word spans:', wordSpans.length); // Debug log
        
        wordSpans.forEach((wordSpan, index) => {
            if (index !== 3) { // Skip the fourth word (index 3)
                wordSpan.style.filter = 'blur(3px)';
                wordSpan.style.opacity = '0.6';
                wordSpan.style.transition = 'filter 0.3s ease, opacity 0.3s ease';
                console.log(`Blurred word ${index}: ${wordSpan.textContent}`); // Debug log
            } else {
                // Clear any existing blur on the fourth word and set full opacity
                wordSpan.style.filter = 'none';
                wordSpan.style.opacity = '1';
                console.log(`Kept clear word ${index}: ${wordSpan.textContent}`); // Debug log
            }
        });
        
        // Blur the caret with reduced opacity
        if (caret) {
            caret.style.filter = 'blur(3px)';
            caret.style.opacity = '0.6';
            caret.style.transition = 'filter 0.3s ease, opacity 0.3s ease';
            console.log('Caret blurred'); // Debug log
        }
    }
    
    // Method to clear all blur effects (optional - can be called with "0" key if needed)
    clearAllBlur(textSpan, caret) {
        const wordSpans = textSpan.querySelectorAll('.word-span');
        
        wordSpans.forEach(wordSpan => {
            wordSpan.style.filter = 'none';
            wordSpan.style.opacity = '1';
        });
        
        if (caret) {
            caret.style.filter = 'none';
            caret.style.opacity = '1';
        }
    }
}

// Initialize the typing effect when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const typingEffect = new TypingEffect();
    
    // Set caret color to match your theme
    typingEffect.setCaretColor('var(--color-matrix)');
    
    // Optional: Adjust typing speed
    typingEffect.setTypingSpeed(75);
});