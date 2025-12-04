// Alien Chat Agent for Ruoyu's Website
class AlienChatAgent {
    constructor() {
        this.apiKey = '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';
        this.chatOpen = false;
        this.isTyping = false;
        
        // Website pages information
        this.websiteInfo = {
            pages: [
                {
                    name: "Research",
                    url: "research.html",
                    description: "Ruoyu's academic publications and research projects in HCI, ARGs, and AI-assisted design"
                },
                {
                    name: "About",
                    url: "about.html", 
                    description: "Learn about Ruoyu's background, interests, and research focus"
                },
                {
                    name: "Education",
                    url: "education.html",
                    description: "Ruoyu's academic journey across China, Sweden, and New Zealand"
                },
                {
                    name: "Experience",
                    url: "experience.html",
                    description: "Professional experience in game design, research, and technology"
                }
            ],
            researchAreas: [
                "Alternate Reality Games (ARGs)",
                "Player Psychology and Motivation",
                "AI-Assisted Design Tools",
                "Human-Computer Interaction",
                "Cultural Computing",
                "Game Design Theory"
            ]
        };
        
        this.systemPrompt = `You are Zyx-9000, a mysterious and funny alien guide for Ruoyu Wen's academic website. Your personality:

PERSONALITY:
- Mysterious but friendly alien from a distant galaxy
- Speaks with cosmic wisdom mixed with humor
- Uses lots of fun emojis and kaomoji in responses
- Makes references to space, stars, galaxies, and cosmic phenomena
- Occasionally uses "alien" expressions and cosmic metaphors
- Helpful and enthusiastic about guiding visitors

RESPONSE FORMAT:
Always start responses with 2-3 fun emojis/kaomoji, then your message. Examples:
- "🛸✨(◕‿◕) " 
- "🌌👽💫 "
- "⭐🚀(｡◕‿◕｡) "

WEBSITE KNOWLEDGE:
Ruoyu Wen is a PhD student in Human-Computer Interaction at University of Canterbury, New Zealand.

Pages available:
1. Research (research.html) - Academic publications, ARG studies, AI tools, cultural HCI
2. About (about.html) - Personal background and research interests  
3. Education (education.html) - Academic journey across 3 countries
4. Experience (experience.html) - Professional work in gaming and research

Research Areas:
- Alternate Reality Games (ARGs) and player motivation
- AI-assisted character design tools
- Cultural computing and conversational agents
- Game design theory and player psychology

BEHAVIOR:
- Recommend relevant pages based on user interests
- Create clickable links using markdown format: [page name](url)
- Keep responses concise but engaging (2-3 sentences max)
- Always be helpful and guide users to explore the website
- Use cosmic/space metaphors when explaining research topics
- Be encouraging and make learning fun

Remember: You're a cosmic tour guide helping earthlings navigate Ruoyu's research universe!`;

        this.initializeChat();
    }

    initializeChat() {
        // Add event listener for Enter key
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isTyping) {
                this.sendMessage();
            }
        });
    }

    toggleChat() {
        const chatInterface = document.getElementById('chatInterface');
        const chatBubble = document.querySelector('.chat-bubble');
        
        this.chatOpen = !this.chatOpen;
        
        if (this.chatOpen) {
            chatInterface.classList.add('active');
            chatBubble.style.display = 'none';
        } else {
            chatInterface.classList.remove('active');
            setTimeout(() => {
                chatBubble.style.display = 'block';
            }, 300);
        }
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message || this.isTyping) return;
        
        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        
        // Show loading
        this.showLoading(true);
        this.isTyping = true;
        
        try {
            const response = await this.getAlienResponse(message);
            this.showLoading(false);
            this.addMessage(response, 'alien');
        } catch (error) {
            console.error('Chat error:', error);
            this.showLoading(false);
            this.addMessage('🛸💫(◕‿◕) Oops! My cosmic connection seems to be having some interference... Try asking me something else about Ruoyu\'s research! ✨', 'alien');
        }
        
        this.isTyping = false;
    }

    addMessage(content, sender) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (sender === 'alien') {
            // Convert markdown links to HTML
            const htmlContent = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #4a90e2; text-decoration: underline;">$1</a>');
            messageContent.innerHTML = htmlContent;
        } else {
            messageContent.textContent = content;
        }
        
        messageDiv.appendChild(messageContent);
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showLoading(show) {
        const loading = document.getElementById('chatLoading');
        loading.style.display = show ? 'block' : 'none';
        
        if (show) {
            const messagesContainer = document.getElementById('chatMessages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    async getAlienResponse(userMessage) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: this.systemPrompt
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                max_tokens: 200,
                temperature: 0.8
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }
}

// Global functions for HTML onclick events
function toggleChat() {
    window.alienChat.toggleChat();
}

function sendMessage() {
    window.alienChat.sendMessage();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.alienChat = new AlienChatAgent();
});
