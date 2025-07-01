class PromptEngineeringFormatter {
    constructor() {
        this.methods = [
            {
                title: "Give Direction",
                bulletPoints: [
                    "Define role, tone, audience, and context",
                    "Set the model's perspective or voice",
                    "Avoid vague or general prompts",
                    "Use \"Act as…\" or \"Imagine you are…\""
                ],
                examples: {
                    bad: "Tell me about climate change",
                    good: "Act as a high school teacher. Explain the causes and effects of climate change in under 200 words for a 15-year-old student."
                }
            },
            {
                title: "Specify Format",
                bulletPoints: [
                    "Define output structure clearly",
                    "Use numbered list, table, JSON, etc.",
                    "Limit or organize output length",
                    "Prevent mixed or unstructured responses"
                ],
                examples: {
                    bad: "Suggest some product names",
                    good: "List 5 product name ideas in a numbered list. Each should be one word, followed by a short explanation."
                }
            },
            {
                title: "Provide Examples",
                bulletPoints: [
                    "Show examples of desired tone or format",
                    "Use one or two strong examples",
                    "Guide the model's pattern recognition",
                    "Avoid inconsistent or irrelevant examples"
                ],
                examples: {
                    bad: "Create a tagline for a running shoe",
                    good: "Example taglines: \"Just do it.\", \"Run wild.\" Now write 3 more in the same tone."
                }
            },
            {
                title: "Evaluate Quality",
                bulletPoints: [
                    "Include evaluation criteria in the prompt",
                    "Ask the model to rate, score, or compare",
                    "Define what \"good\" means for the task",
                    "Enable iteration and prompt tuning"
                ],
                examples: {
                    bad: "Suggest some coffee brand names",
                    good: "Suggest 5 coffee brand names. Rate each from 1–10 for memorability and uniqueness."
                }
            },
            {
                title: "Divide Labor",
                bulletPoints: [
                    "Break complex tasks into clear steps",
                    "Let the model focus on one task at a time",
                    "Chain prompts: step-by-step, sequential",
                    "Avoid mixing goals in one instruction"
                ],
                examples: {
                    bad: "Write a blog post, then summarize it and suggest hashtags",
                    good: "Step 1: Write a 300-word blog post on the health benefits of coffee. Wait. Then summarize it in 2 sentences. Then list 10 hashtags."
                }
            },
            {
                title: "Prompt Length Management",
                bulletPoints: [
                    "Keep prompts concise to reduce token consumption",
                    "Long prompts increase cost and risk of losing context",
                    "Split complex instructions into multiple prompts",
                    "Avoid unnecessary repetition or verbose language"
                ],
                examples: {
                    bad: "I want you to imagine you are a very experienced branding expert with 20 years of experience in luxury product naming, and I would like you to now come up with multiple ideas that could potentially be used in a context where the target audience is young, urban, eco-conscious consumers with a sense of style and sophistication...",
                    good: "Act as a branding expert. Suggest 5 luxury-sounding brand names for eco-conscious coffee products."
                }
            },
            {
                title: "Prompt Priority Order",
                bulletPoints: [
                    "Put important instructions early in the prompt",
                    "Transformer models prioritize earlier tokens",
                    "Avoid placing constraints or key tasks at the end",
                    "Order the content by logical and task-critical sequence"
                ],
                examples: {
                    bad: "Write 10 brand names. The names must be unique, short, and avoid the word 'bean' (this is important).",
                    good: "Avoid the word 'bean'. Create 10 short, unique brand names."
                }
            },
            {
                title: "Avoid Conflicting Instructions",
                bulletPoints: [
                    "Ensure the prompt gives clear, non-contradictory guidance",
                    "Don't combine opposing qualities (e.g. 'strict and creative')",
                    "Avoid mixing abstract requirements without prioritization",
                    "Simplify or split conflicting goals across prompts"
                ],
                examples: {
                    bad: "Be highly creative, but only use plain, formal language without abstraction or playfulness.",
                    good: "Use formal language to suggest 5 creative yet realistic product names for a coffee brand."
                }
            },
            {
                title: "Use Positive Framing",
                bulletPoints: [
                    "Tell the model what to do instead of what to avoid",
                    "Positive instructions lead to clearer outputs",
                    "Avoid 'Don't' or 'Never' as primary guidance",
                    "Use affirmative commands to steer behavior"
                ],
                examples: {
                    bad: "Don't write childish names for the product.",
                    good: "Use professional, mature language when naming the product."
                }
            },
            
        ];
        
        this.init();
    }
    
    init() {
        this.injectStyles();
        this.createViewContainers();
        this.createSections();
    }
    
    injectStyles() {
        const style = document.createElement('style');
        
        // Generate CSS selectors dynamically based on number of methods
        const containerSelectors = this.methods.map((_, index) => 
            `.view-prompt-engineering-method-${index + 1}`
        ).join(',\n            ');
        
        style.textContent = `
            /* Container styles for each method */
            ${containerSelectors} {
                width: 100%;
                height: 100vh;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 0 4rem;
                box-sizing: border-box;
            }
            
            /* Content container */
            .prompt-method-content {
                width: 50%;
                max-width: none;
                margin: 0;
                text-align: left;
            }
            
            /* Main title styling */
            .prompt-method-title {
                font-size: 2rem;
                font-weight: 500;
                color: var(--color-text-primary);
                margin-bottom: 2rem;
                text-align: left;
                line-height: 1.2;
            }
            
            /* Bullet points container */
            .prompt-bullet-list {
                margin-bottom: 4rem;
            }
            
            .prompt-bullet-list ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .prompt-bullet-list li {
                font-size: 0.75rem;
                color: var(--color-text-secondary);
                line-height: 1rem;
                margin-bottom: 0.5rem;
                padding-left: 1rem;
                position: relative;
                font-weight: 300;
            }
            
            /* Simple bullet points */
            .prompt-bullet-list li::before {
                content: "•";
                color: var(--color-text-tertiary);
                font-weight: normal;
                position: absolute;
                left: 0;
                top: 0;
                font-size: 0.75rem;
            }
            
            /* Examples section */
            .prompt-examples {
                background: transparent;
                border-radius: 0;
                padding: 0;
                border: none;
            }
            
            .prompt-examples-title {
                font-size: 1.5rem;
                font-weight: 500;
                color: var(--color-text-primary);
                margin-bottom: 1rem;
            }
            
            .prompt-example {
                margin-bottom: 0.5rem;
            }
            
            .prompt-example:last-child {
                margin-bottom: 0;
            }
            
            .prompt-example-label {
                font-weight: 400;
                font-size: 1rem;
                text-transform: none;
                letter-spacing: normal;
                margin-bottom: 0.5rem;
                display: inline;
                margin-right: 0.5rem;
            }
            
            .prompt-example-bad .prompt-example-label {
                color: var(--color-text-primary);
            }
            
            .prompt-example-good .prompt-example-label {
                color: var(--color-text-primary);
            }
            
            .prompt-example-text {
                font-size: 1rem;
                line-height: 1.6;
                color: var(--color-text-secondary);
                font-style: normal;
                padding: 0;
                background: transparent;
                border-radius: 0;
                border: none;
                display: inline;
                font-weight: 300;
            }
            
            .prompt-example-bad .prompt-example-text {
                border: none;
            }
            
            .prompt-example-good .prompt-example-text {
                border: none;
            }
            
            /* Clean example formatting */
            .prompt-example-container {
                display: block;
                margin-bottom: 0.5rem;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                ${containerSelectors} {
                    padding: 0 2rem;
                    justify-content: flex-start;
                    padding-top: 3rem;
                }
                
                .prompt-method-content {
                    width: 90%;
                }
                
                .prompt-method-title {
                    font-size: 2.5rem;
                    margin-bottom: 2rem;
                }
                
                .prompt-bullet-list li {
                    font-size: 1.2rem;
                    padding-left: 1.5rem;
                }
                
                .prompt-bullet-list li::before {
                    font-size: 1.2rem;
                }
                
                .prompt-examples-title {
                    font-size: 1.75rem;
                }
                
                .prompt-example-label,
                .prompt-example-text {
                    font-size: 1.1rem;
                }
            }
            
            @media (max-width: 480px) {
                ${containerSelectors} {
                    padding: 0 1.5rem;
                    padding-top: 2rem;
                }
                
                .prompt-method-content {
                    width: 100%;
                }
                
                .prompt-method-title {
                    font-size: 2rem;
                }
                
                .prompt-bullet-list li {
                    font-size: 1rem;
                    padding-left: 1.2rem;
                }
                
                .prompt-bullet-list li::before {
                    font-size: 1rem;
                }
                
                .prompt-examples-title {
                    font-size: 1.5rem;
                }
                
                .prompt-example-label,
                .prompt-example-text {
                    font-size: 1rem;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    createViewContainers() {
        // Find the parent container where views should be added
        let parentContainer = document.body;
        
        // Try to find a more specific parent container
        const possibleParents = [
            '.prompt-engineering-container',
            '.main-content',
            '#content',
            'main'
        ];
        
        for (const selector of possibleParents) {
            const element = document.querySelector(selector);
            if (element) {
                parentContainer = element;
                break;
            }
        }
        
        // Create view containers for each method
        this.methods.forEach((method, index) => {
            const viewNumber = index + 1;
            const className = `view-prompt-engineering-method-${viewNumber}`;
            
            // Check if container already exists
            let existingContainer = document.querySelector(`.${className}`);
            
            if (!existingContainer) {
                // Create new container
                const container = document.createElement('div');
                container.className = className;
                
                // Add it to the parent
                parentContainer.appendChild(container);
                
                console.log(`Created container: ${className}`);
            } else {
                console.log(`Container already exists: ${className}`);
            }
        });
    }
    
    createSections() {
        this.methods.forEach((method, index) => {
            const container = document.querySelector(`.view-prompt-engineering-method-${index + 1}`);
            
            if (!container) {
                console.warn(`Container .view-prompt-engineering-method-${index + 1} not found`);
                return;
            }
            
            // Clear existing content
            container.innerHTML = '';
            
            // Create content wrapper
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'prompt-method-content';
            
            // Create title (H1)
            const title = document.createElement('h1');
            title.className = 'prompt-method-title';
            title.textContent = method.title;
            
            // Create bullet points section
            const bulletSection = document.createElement('div');
            bulletSection.className = 'prompt-bullet-list';
            
            const bulletList = document.createElement('ul');
            method.bulletPoints.forEach(point => {
                const listItem = document.createElement('li');
                listItem.textContent = point;
                bulletList.appendChild(listItem);
            });
            
            bulletSection.appendChild(bulletList);
            
            // Create examples section
            const examplesSection = document.createElement('div');
            examplesSection.className = 'prompt-examples';
            
            const examplesTitle = document.createElement('div');
            examplesTitle.className = 'prompt-examples-title';
            examplesTitle.textContent = 'Prompt Examples:';
            
            // Bad example
            const badExample = document.createElement('div');
            badExample.className = 'prompt-example prompt-example-bad prompt-example-container';
            
            const badLabel = document.createElement('span');
            badLabel.className = 'prompt-example-label';
            badLabel.textContent = 'Bad:';
            
            const badText = document.createElement('span');
            badText.className = 'prompt-example-text';
            badText.textContent = method.examples.bad;
            
            badExample.appendChild(badLabel);
            badExample.appendChild(badText);
            
            // Good example
            const goodExample = document.createElement('div');
            goodExample.className = 'prompt-example prompt-example-good prompt-example-container';
            
            const goodLabel = document.createElement('span');
            goodLabel.className = 'prompt-example-label';
            goodLabel.textContent = 'Good:';
            
            const goodText = document.createElement('span');
            goodText.className = 'prompt-example-text';
            goodText.textContent = method.examples.good;
            
            goodExample.appendChild(goodLabel);
            goodExample.appendChild(goodText);
            
            // Assemble examples section
            examplesSection.appendChild(examplesTitle);
            examplesSection.appendChild(badExample);
            examplesSection.appendChild(goodExample);
            
            // Assemble content wrapper
            contentWrapper.appendChild(title);
            contentWrapper.appendChild(bulletSection);
            contentWrapper.appendChild(examplesSection);
            
            // Add to container
            container.appendChild(contentWrapper);
        });
    }
    
    // Method to add new methods dynamically
    addMethod(methodData) {
        this.methods.push(methodData);
        this.createViewContainers(); // Create new containers if needed
        this.createSections(); // Recreate all sections
    }
    
    // Method to remove a method
    removeMethod(index) {
        if (index >= 0 && index < this.methods.length) {
            this.methods.splice(index, 1);
            this.removeOldContainers();
            this.createViewContainers();
            this.createSections();
        }
    }
    
    // Method to remove old containers that are no longer needed
    removeOldContainers() {
        // Remove all existing containers
        const existingContainers = document.querySelectorAll('[class*="view-prompt-engineering-method-"]');
        existingContainers.forEach(container => {
            container.remove();
        });
    }
    
    // Method to set parent container
    setParentContainer(selector) {
        this.parentContainerSelector = selector;
        this.removeOldContainers();
        this.createViewContainers();
        this.createSections();
    }
    
    // Method to update a specific method
    updateMethod(index, methodData) {
        if (index >= 0 && index < this.methods.length) {
            this.methods[index] = methodData;
            this.createSections(); // Recreate all sections
        }
    }
    
    // Method to get current methods data
    getMethods() {
        return this.methods;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const promptFormatter = new PromptEngineeringFormatter();
});