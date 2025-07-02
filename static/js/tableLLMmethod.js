class AnimatedTable {
    constructor() {
        this.tableData = [
            {
                model: "RNN",
                howItWorks: "Processes words one at a time in order",
                strengths: "Good for short sequences",
                weaknesses: "Forgets long-term dependencies"
            },
            {
                model: "LSTM",
                howItWorks: "Adds memory cells to remember better",
                strengths: "Handles longer sequences than RNN",
                weaknesses: "Still sequential and slow"
            },
            {
                model: "Transformer",
                howItWorks: "Looks at all words at once using self-attention",
                strengths: "Fast, parallel, captures complex relations",
                weaknesses: "Requires large data and compute"
            }
        ];
        
        this.headers = ["Model", "How It Works", "Strengths", "Weaknesses"];
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
            .animated-table-container {
                width: 100%;
                width: 1200px;
                max-width: 1200px;
                position: relative;
                margin: 0 auto;
                overflow: hidden;
            }
            
            .animated-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                position: relative;
                background: transparent;
                table-layout: fixed; /* FIXED: Prevents column width changes */
            }
            
            .table-cell {
                padding: 24px 16px;
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
            .table-cell:nth-child(1) {
                width: 15%; /* Model column - narrowest */
                color: var(--color-text-primary) !important; 

            }
            
            .table-cell:nth-child(2) {
                width: 35%; /* How It Works column - wider for descriptions */
            }
            
            .table-cell:nth-child(3) {
                width: 25%; /* Strengths column - medium */
            }
            
            .table-cell:nth-child(4) {
                width: 25%; /* Weaknesses column - medium */
            }
            
            .table-header {
                font-weight: 600;
                color: var(--color-text-primary);
                font-size: 16px;
                background: transparent;
            }
            
            .table-data {
                color: var(--color-text-tertiary);
                font-size: 14px;
                line-height: 1.6;
                background: transparent;
            }
            
            .cell-content {
                opacity: 0;
                display: block;
                min-height: 1.2em;
                /* FIXED: Create invisible placeholder to maintain layout */
                position: relative;
            }
            
            /* FIXED: Invisible text placeholder to maintain column width */
            .cell-content::before {
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
            .row-separator {
                position: absolute;
                left: 0;
                width: 0;
                height: 1px;
                background-color: var(--color-text-tertiary);
                opacity: 0.4;
                transition: width 0.8s ease;
                z-index: 1;
            }
            
            .animate-separators .row-separator {
                width: 100%;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .animated-table-container {
                    width: 95%;
                }
                
                .table-cell {
                    padding: 16px 12px;
                    font-size: 13px;
                }
                
                .table-header {
                    font-size: 15px;
                }
                
                .table-data {
                    font-size: 13px;
                }
                
                /* FIXED: Adjust column widths for mobile */
                .table-cell:nth-child(1) {
                    width: 20%; /* Model column - slightly wider on mobile */
                }
                
                .table-cell:nth-child(2) {
                    width: 40%; /* How It Works column */
                }
                
                .table-cell:nth-child(3) {
                    width: 20%; /* Strengths column */
                }
                
                .table-cell:nth-child(4) {
                    width: 20%; /* Weaknesses column */
                }
            }
            
            @media (max-width: 480px) {
                .table-cell {
                    padding: 12px 8px;
                    font-size: 12px;
                }
                
                .table-header {
                    font-size: 14px;
                }
                
                /* FIXED: Stack into 2 columns on very small screens */
                .table-cell:nth-child(1),
                .table-cell:nth-child(2) {
                    width: 50%;
                }
                
                .table-cell:nth-child(3),
                .table-cell:nth-child(4) {
                    width: 50%;
                }
                
                /* Optional: Hide some columns on very small screens */
                /* 
                .table-cell:nth-child(3),
                .table-cell:nth-child(4) {
                    display: none;
                }
                
                .table-cell:nth-child(1),
                .table-cell:nth-child(2) {
                    width: 50%;
                }
                */
            }
        `;
        document.head.appendChild(style);
    }
    
    createTable() {
        const container = document.querySelector('.view-LLM-methods');
        if (!container) {
            console.error('Container .view-LLM-methods not found');
            return;
        }
        
        // Clear any existing content
        container.innerHTML = '';
        
        // Create table container
        const tableContainer = document.createElement('div');
        tableContainer.className = 'animated-table-container';
        
        // Create table
        const table = document.createElement('table');
        table.className = 'animated-table';
        
        // Create header row
        const headerRow = document.createElement('tr');
        this.headers.forEach((header, index) => {
            const th = document.createElement('th');
            th.className = 'table-cell table-header';
            
            const content = document.createElement('span');
            content.className = 'cell-content';
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
                td.className = 'table-cell table-data';
                
                const content = document.createElement('span');
                content.className = 'cell-content';
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
    
    setupIntersectionObserver() {
        const container = document.querySelector('.view-LLM-methods');
        if (!container) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.tableCreated && !this.animationStarted) {
                    console.log('Table container is now visible - starting animation');
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
        console.log('Intersection observer set up for table animation');
    }
    
    createRowSeparators(container, table) {
        const rows = table.querySelectorAll('tr');
        
        // Create separator lines between rows (not after the last row)
        for (let i = 0; i < rows.length - 1; i++) {
            const separator = document.createElement('div');
            separator.className = 'row-separator';
            separator.style.top = `${((i + 1) * 100 / rows.length)}%`;
            separator.setAttribute('data-row-index', i);
            container.appendChild(separator);
        }
    }
    
    startAnimation() {
        console.log('Starting table animation sequence');
        const tableContainer = document.querySelector('.animated-table-container');
        
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
        const separators = document.querySelectorAll('.row-separator');
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
        const cells = document.querySelectorAll('.cell-content');
        let currentCellIndex = 0;
        
        const typeNextCell = () => {
            if (currentCellIndex >= cells.length) {
                console.log('All text animation completed');
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
        console.log(`Line drawing speed set to: ${speed}ms`);
    }
    
    setLineStaggerDelay(delay) {
        this.lineStaggerDelay = delay;
        console.log(`Line stagger delay set to: ${delay}ms`);
    }
    
    setTypingSpeed(speed) {
        this.typingSpeed = speed;
        console.log(`Typing speed set to: ${speed}ms per character`);
    }
    
    setTypingDelayAfterLines(delay) {
        this.typingDelayAfterLines = delay;
        console.log(`Typing delay after lines set to: ${delay}ms`);
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
        const separators = document.querySelectorAll('.row-separator');
        separators.forEach(separator => {
            separator.style.width = '0';
        });
        
        // Reset cell content
        const cells = document.querySelectorAll('.cell-content');
        cells.forEach(cell => {
            cell.style.opacity = '0';
            cell.textContent = cell.getAttribute('data-text');
        });
        
        console.log('Animation reset - ready to trigger again');
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
            .row-separator {
                background-color: ${color} !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    setTextColor(primaryColor, secondaryColor) {
        const style = document.createElement('style');
        style.textContent = `
            .table-header {
                color: ${primaryColor} !important;
            }
            .table-data {
                color: ${secondaryColor} !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.view-LLM-methods');
    if (container) {
        const animatedTable = new AnimatedTable();
    }
});