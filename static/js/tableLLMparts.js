class AITerminologyTable {
    constructor() {
        this.tableData = [
            {
                term: "Token",
                description: 'A word or word-part (e.g. "language" might be 1 token, "ChatGPT" could be 2)'
            },
            {
                term: "Transformer",
                description: "The architecture used to capture word relationships over long distances"
            },
            {
                term: "Self-attention",
                description: "Mechanism allowing the model to weigh the importance of other words in the sequence"
            },
            {
                term: "Self-supervised learning",
                description: "Training by predicting missing pieces of data, without human labeling"
            },
            {
                term: "Temperature",
                description: "Controls creativity in outputs (low = predictable, high = creative/unexpected)"
            }
        ];
        
        this.headers = ["Term", "Description"];
        this.lineDrawingSpeed = 600;
        this.lineStaggerDelay = 200;
        this.typingSpeed = 10;
        this.typingDelayAfterLines = 10;
        this.tableCreated = false;
        this.animationStarted = false;
        this.init();
    }
    
    init() {
        this.injectStyles();
        this.createTable();
        this.setupIntersectionObserver();
    }
    
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .ai-terminology-table-container {
                width: 90%;
                width: 1200px;
                max-width: 1200px;
                position: relative;
                margin: 0 auto;
                overflow: hidden;
            }
            
            .ai-terminology-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                position: relative;
                background: transparent;
                table-layout: fixed; /* FIXED: Prevents column width changes */
            }
            
            .terminology-table-cell {
                padding: 24px 20px;
                text-align: left;
                vertical-align: top;
                position: relative;
                min-height: 80px;
                box-sizing: border-box;
                border: none;
                word-wrap: break-word; /* FIXED: Handle long text properly */
                overflow-wrap: break-word; /* FIXED: Handle long text properly */
            }
            
            /* FIXED: Set specific column widths to prevent shifting */
            .terminology-table-cell:first-child {
                width: 25%; /* Term column - narrower */
                color: var(--color-text-primary) !important; 

            }
            
            .terminology-table-cell:last-child {
                width: 75%; /* Description column - wider */
            }
            
            .terminology-table-header {
                font-weight: 600;
                color: var(--color-text-primary);
                font-size: 16px;
                background: transparent;
            }
            
            .terminology-table-data {
                color: var(--color-text-tertiary);
                font-size: 14px;
                line-height: 1.6;
                background: transparent;
            }
            
            .terminology-cell-content {
                opacity: 0;
                display: block;
                min-height: 1.2em;
                /* FIXED: Create invisible placeholder to maintain layout */
                position: relative;
            }
            
            /* FIXED: Invisible text placeholder to maintain column width */
            .terminology-cell-content::before {
                content: attr(data-text);
                visibility: hidden;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
                pointer-events: none;
                z-index: -1;
            }
            
            /* Row separator lines */
            .terminology-row-separator {
                position: absolute;
                left: 0;
                width: 0;
                height: 1px;
                background-color: var(--color-text-tertiary);
                opacity: 0.4;
                transition: width 0.8s ease;
                z-index: 1;
            }
            
            .animate-terminology-separators .terminology-row-separator {
                width: 100%;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .ai-terminology-table-container {
                    width: 95%;
                }
                
                .terminology-table-cell {
                    padding: 16px 12px;
                    font-size: 13px;
                }

                
                .terminology-table-header {
                    font-size: 15px;
                }
                
                .terminology-table-data {
                    font-size: 13px;
                }
                
                /* FIXED: Adjust column widths for mobile */
                .terminology-table-cell:first-child {
                    width: 30%;
                }
                
                .terminology-table-cell:last-child {
                    width: 70%;
                }
            }
            
            @media (max-width: 480px) {
                .terminology-table-cell {
                    padding: 12px 8px;
                    font-size: 12px;
                }
                
                .terminology-table-header {
                    font-size: 14px;
                }
                
                /* FIXED: Stack columns on very small screens */
                .terminology-table-cell:first-child,
                .terminology-table-cell:last-child {
                    width: 100%;
                    display: block;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    createTable() {
        const container = document.querySelector('.view-ai-terminology');
        if (!container) {
            console.error('Container .view-ai-terminology not found');
            return;
        }
        
        // Clear any existing content
        container.innerHTML = '';
        
        // Create table container
        const tableContainer = document.createElement('div');
        tableContainer.className = 'ai-terminology-table-container';
        
        // Create table
        const table = document.createElement('table');
        table.className = 'ai-terminology-table';
        
        // Create header row
        const headerRow = document.createElement('tr');
        this.headers.forEach((header, index) => {
            const th = document.createElement('th');
            th.className = 'terminology-table-cell terminology-table-header';
            
            const content = document.createElement('span');
            content.className = 'terminology-cell-content';
            content.textContent = header;
            content.setAttribute('data-text', header);
            
            th.appendChild(content);
            headerRow.appendChild(th);
        });
        
        table.appendChild(headerRow);
        
        // Create data rows
        this.tableData.forEach((rowData, rowIndex) => {
            const row = document.createElement('tr');
            
            Object.values(rowData).forEach((cellData, cellIndex) => {
                const td = document.createElement('td');
                td.className = 'terminology-table-cell terminology-table-data';
                
                const content = document.createElement('span');
                content.className = 'terminology-cell-content';
                content.textContent = cellData;
                content.setAttribute('data-text', cellData);
                
                td.appendChild(content);
                row.appendChild(td);
            });
            
            table.appendChild(row);
        });
        
        tableContainer.appendChild(table);
        container.appendChild(tableContainer);
        
        // Create row separator lines
        this.createRowSeparators(tableContainer, table);
        
        this.tableCreated = true;
    }
    
    createRowSeparators(container, table) {
        const rows = table.querySelectorAll('tr');
        
        // Create separator lines between rows (not after the last row)
        for (let i = 0; i < rows.length - 1; i++) {
            const separator = document.createElement('div');
            separator.className = 'terminology-row-separator';
            separator.style.top = `${((i + 1) * 100 / rows.length)}%`;
            separator.setAttribute('data-row-index', i);
            container.appendChild(separator);
        }
    }
    
    setupIntersectionObserver() {
        const container = document.querySelector('.view-ai-terminology');
        if (!container) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.tableCreated && !this.animationStarted) {
                    console.log('AI Terminology table container is now visible - starting animation');
                    this.animationStarted = true;
                    this.startAnimation();
                    observer.disconnect();
                }
            });
        }, {
            threshold: 0.3,
            rootMargin: '50px 0px -50px 0px'
        });
        
        observer.observe(container);
        console.log('Intersection observer set up for AI terminology table animation');
    }
    
    startAnimation() {
        console.log('Starting AI terminology table animation sequence');
        const tableContainer = document.querySelector('.ai-terminology-table-container');
        
        // Start separator line animation
        setTimeout(() => {
            this.animateRowSeparators(() => {
                // Start typing animation after lines complete
                setTimeout(() => {
                    this.animateTyping();
                }, this.typingDelayAfterLines);
            });
        }, 300);
    }
    
    animateRowSeparators(callback) {
        const separators = document.querySelectorAll('.terminology-row-separator');
        let animationsCompleted = 0;
        
        const onAnimationComplete = () => {
            animationsCompleted++;
            if (animationsCompleted === separators.length) {
                callback();
            }
        };
        
        // Animate each separator with a stagger
        separators.forEach((separator, index) => {
            setTimeout(() => {
                separator.style.transitionDuration = `${this.lineDrawingSpeed}ms`;
                separator.style.width = '100%';
                
                setTimeout(onAnimationComplete, this.lineDrawingSpeed);
            }, index * this.lineStaggerDelay);
        });
        
        // If no separators, call callback immediately
        if (separators.length === 0) {
            callback();
        }
    }
    
    animateTyping() {
        const cells = document.querySelectorAll('.terminology-cell-content');
        let currentCellIndex = 0;
        
        const typeNextCell = () => {
            if (currentCellIndex >= cells.length) {
                console.log('All AI terminology text animation completed');
                return;
            }
            
            const cell = cells[currentCellIndex];
            const text = cell.getAttribute('data-text');
            
            // Show the cell
            cell.style.opacity = '1';
            cell.textContent = '';
            
            let charIndex = 0;
            const typeCharacter = () => {
                if (charIndex < text.length) {
                    cell.textContent += text[charIndex];
                    charIndex++;
                    setTimeout(typeCharacter, this.typingSpeed);
                } else {
                    // Move to next cell
                    currentCellIndex++;
                    setTimeout(typeNextCell, 100);
                }
            };
            
            typeCharacter();
        };
        
        typeNextCell();
    }
    
    // Configuration methods
    setLineDrawingSpeed(speed) {
        this.lineDrawingSpeed = speed;
        console.log(`AI Terminology table line drawing speed set to: ${speed}ms`);
    }
    
    setLineStaggerDelay(delay) {
        this.lineStaggerDelay = delay;
        console.log(`AI Terminology table line stagger delay set to: ${delay}ms`);
    }
    
    setTypingSpeed(speed) {
        this.typingSpeed = speed;
        console.log(`AI Terminology table typing speed set to: ${speed}ms per character`);
    }
    
    setTypingDelayAfterLines(delay) {
        this.typingDelayAfterLines = delay;
        console.log(`AI Terminology table typing delay after lines set to: ${delay}ms`);
    }
    
    // Convenience method to set all speeds at once
    setAnimationSpeeds(config) {
        if (config.lineDrawingSpeed !== undefined) {
            this.setLineDrawingSpeed(config.lineDrawingSpeed);
        }
        if (config.lineStaggerDelay !== undefined) {
            this.setLineStaggerDelay(config.lineStaggerDelay);
        }
        if (config.typingSpeed !== undefined) {
            this.setTypingSpeed(config.typingSpeed);
        }
        if (config.typingDelayAfterLines !== undefined) {
            this.setTypingDelayAfterLines(config.typingDelayAfterLines);
        }
    }
    
    // Method to reset and restart animation
    resetAnimation() {
        this.animationStarted = false;
        
        // Reset separator lines
        const separators = document.querySelectorAll('.terminology-row-separator');
        separators.forEach(separator => {
            separator.style.width = '0';
        });
        
        // Reset cell content
        const cells = document.querySelectorAll('.terminology-cell-content');
        cells.forEach(cell => {
            cell.style.opacity = '0';
            cell.textContent = cell.getAttribute('data-text');
        });
        
        console.log('AI Terminology table animation reset - ready to trigger again');
    }
    
    // Method to trigger animation manually
    triggerAnimation() {
        if (!this.animationStarted && this.tableCreated) {
            this.animationStarted = true;
            this.startAnimation();
        }
    }
    
    // Method to customize colors
    setLineColor(color) {
        const style = document.createElement('style');
        style.textContent = `
            .terminology-row-separator {
                background-color: ${color} !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    setTextColor(primaryColor, secondaryColor) {
        const style = document.createElement('style');
        style.textContent = `
            .terminology-table-header {
                color: ${primaryColor} !important;
            }
            .terminology-table-data {
                color: ${secondaryColor} !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.view-ai-terminology');
    if (container) {
        const aiTerminologyTable = new AITerminologyTable();
    }
});