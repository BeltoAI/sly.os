#!/bin/bash

#################################################################################
# Slyos Chatbot Setup Script
#
# This script creates a fully functional interactive chatbot using the Slyos SDK.
# Supports both Mac and Windows (via bash/powershell).
#
# Usage:
#   ./create-chatbot.sh [--api-key YOUR_KEY] [--model MODEL_NAME]
#
# Examples:
#   ./create-chatbot.sh
#   ./create-chatbot.sh --api-key sk_123456789 --model quantum-1.7b
#################################################################################

set -e

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
API_KEY=""
MODEL="quantum-1.7b"
KB_ID=""
SLYOS_SERVER="https://slyos-prod.eba-qjz3cmgq.us-east-2.elasticbeanstalk.com"
PROJECT_NAME="slyos-chatbot"

#################################################################################
# Helper Functions
#################################################################################

print_header() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC}        ${CYAN}Slyos Interactive Chatbot Setup${NC}               ${BLUE}║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

print_step() {
  echo -e "${CYAN}▶${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1" >&2
}

print_info() {
  echo -e "${YELLOW}ℹ${NC} $1"
}

#################################################################################
# Argument Parsing
#################################################################################

while [[ $# -gt 0 ]]; do
  case $1 in
    --api-key)
      API_KEY="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --kb-id)
      KB_ID="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --api-key KEY     Slyos API key (prompted if not provided)"
      echo "  --model MODEL     AI model to use (default: quantum-1.7b)"
      echo "  --kb-id ID        Knowledge base ID for RAG (optional)"
      echo "  -h, --help        Show this help message"
      exit 0
      ;;
    *)
      print_error "Unknown option: $1"
      exit 1
      ;;
  esac
done

#################################################################################
# Main Setup
#################################################################################

print_header

# Prompt for API key if not provided
if [ -z "$API_KEY" ]; then
  if [ -t 0 ]; then
    print_step "Enter your Slyos API key (or press Enter for placeholder)"
    read -r -p "  API Key: " API_KEY
  fi

  if [ -z "$API_KEY" ]; then
    API_KEY="YOUR_API_KEY"
    print_info "Using placeholder API key — set SLYOS_API_KEY in .env later"
  else
    print_success "API key configured"
  fi
else
  print_success "API key provided via arguments"
fi

# Confirm model selection
print_step "AI Model Configuration"
echo -e "  Current model: ${YELLOW}${MODEL}${NC}"

# Only prompt interactively if stdin is a terminal (not piped)
if [ -t 0 ]; then
  read -p "  Use this model? (y/n, default: y): " -r -n 1
  echo
  if [[ ! $REPLY =~ ^[Yy]?$ ]]; then
    read -p "  Enter model name: " -r MODEL
  fi
fi
print_success "Model configured: ${YELLOW}${MODEL}${NC}"

# Check if project already exists
if [ -d "$PROJECT_NAME" ]; then
  if [ -t 0 ]; then
    print_error "Project folder '$PROJECT_NAME' already exists!"
    read -p "  Remove existing folder and continue? (y/n): " -r -n 1
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      rm -rf "$PROJECT_NAME"
      print_success "Existing folder removed"
    else
      print_error "Setup cancelled"
      exit 1
    fi
  else
    # Non-interactive: auto-remove
    rm -rf "$PROJECT_NAME"
    print_success "Existing folder removed"
  fi
fi

# Create project directory
print_step "Creating project directory: ${CYAN}$PROJECT_NAME${NC}"
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"
print_success "Project directory created"

# Initialize npm
print_step "Initializing npm package"
npm init -y > /dev/null 2>&1
print_success "npm initialized"

# Update package.json to use ES modules
print_step "Configuring ES module support"
cat > package.json << 'EOF'
{
  "name": "slyos-chatbot",
  "version": "1.0.0",
  "description": "Interactive chatbot powered by Slyos SDK",
  "main": "app.mjs",
  "type": "module",
  "scripts": {
    "start": "node app.mjs",
    "chat": "node app.mjs"
  },
  "keywords": ["chatbot", "slyos", "ai"],
  "author": "",
  "license": "MIT"
}
EOF
print_success "Package configuration updated"

# Install Slyos SDK + dotenv
print_step "Installing dependencies"
print_info "This may take a moment..."
npm install @emilshirokikh/slyos-sdk dotenv > /dev/null 2>&1
print_success "Dependencies installed"

# Create the chatbot application
print_step "Creating interactive chatbot application: ${CYAN}app.mjs${NC}"

cat > app.mjs << 'CHATBOT_EOF'
#!/usr/bin/env node

import 'dotenv/config';
import readline from 'readline';
import SlyOS from '@emilshirokikh/slyos-sdk';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

// Configuration
const config = {
  apiKey: process.env.SLYOS_API_KEY || 'YOUR_API_KEY',
  model: process.env.SLYOS_MODEL || 'quantum-1.7b',
  server: process.env.SLYOS_SERVER || 'https://slyos-prod.eba-qjz3cmgq.us-east-2.elasticbeanstalk.com',
  kbId: process.env.SLYOS_KB_ID || ''
};

// Initialize SlyOS SDK
let sdk;
let authToken = null; // Store auth token for direct RAG API calls
try {
  sdk = new SlyOS({
    apiKey: config.apiKey,
    onProgress: (e) => console.log(`${colors.dim}[${e.progress}%] ${e.message}${colors.reset}`)
  });
} catch (error) {
  console.error(`${colors.red}Error initializing SDK:${colors.reset}`, error.message);
  process.exit(1);
}

// Get auth token directly for RAG API calls
async function getAuthToken() {
  if (authToken) return authToken;
  try {
    const res = await fetch(`${config.server}/api/auth/sdk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: config.apiKey })
    });
    const data = await res.json();
    authToken = data.token;
    return authToken;
  } catch (e) {
    return null;
  }
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

// Note: conversation history is not used for generation with small models
// They work better with single prompts

/**
 * Print welcome banner
 */
function printWelcome() {
  console.clear();
  console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║${colors.reset}                                                              ${colors.bright}${colors.cyan}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║${colors.reset}  ${colors.bright}Welcome to the Slyos Interactive Chatbot${colors.reset}             ${colors.bright}${colors.cyan}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║${colors.reset}                                                              ${colors.bright}${colors.cyan}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.blue}Model:${colors.reset} ${colors.yellow}${config.model}${colors.reset}`);
  console.log(`${colors.blue}Server:${colors.reset} ${colors.yellow}${config.server}${colors.reset}`);
  if (config.kbId) {
    console.log(`${colors.blue}Knowledge Base:${colors.reset} ${colors.green}${config.kbId}${colors.reset} ${colors.green}(RAG enabled)${colors.reset}`);
  } else {
    console.log(`${colors.blue}Knowledge Base:${colors.reset} ${colors.dim}None (plain generation)${colors.reset}`);
  }
  if (config.apiKey === 'YOUR_API_KEY') {
    console.log(`${colors.red}⚠ Using placeholder API key - set SLYOS_API_KEY environment variable${colors.reset}`);
  }
  console.log(`\n${colors.bright}Commands:${colors.reset}`);
  console.log(`  ${colors.green}Type your message and press Enter to chat${colors.reset}`);
  console.log(`  ${colors.green}Type 'clear' to clear conversation history${colors.reset}`);
  console.log(`  ${colors.green}Type 'exit' or 'quit' to end the session${colors.reset}`);
  console.log(`\n${colors.bright}${colors.cyan}─────────────────────────────────────────────────────────────${colors.reset}\n`);
}

/**
 * Send message to AI and get response
 */
async function sendMessage(userMessage) {
  try {
    console.log(`${colors.dim}Thinking...${colors.reset}`);

    let assistantMessage = '';
    let sourceInfo = '';

    if (config.kbId) {
      // RAG mode: call API directly to get relevant chunks, then generate locally with context
      console.log(`${colors.dim}Searching knowledge base...${colors.reset}`);
      try {
        const token = await getAuthToken();
        const ragRes = await fetch(`${config.server}/api/rag/knowledge-bases/${config.kbId}/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ query: userMessage, top_k: 5, model_id: config.model })
        });
        const ragData = await ragRes.json();

        if (ragData.prompt_template) {
          // Generate response locally using the RAG-augmented prompt
          const response = await sdk.generate(config.model, ragData.prompt_template, {
            temperature: 0.7,
            maxTokens: 300
          });
          assistantMessage = response || '';

          // Collect source names
          const chunks = ragData.retrieved_chunks || [];
          const sources = [...new Set(chunks.map(c => c.document_name || c.source).filter(Boolean))];
          if (sources.length > 0) {
            sourceInfo = `\n${colors.dim}[Sources: ${sources.join(', ')}]${colors.reset}`;
          }
        } else {
          // RAG API returned no context, fall back to plain generation
          const response = await sdk.generate(config.model, userMessage, { temperature: 0.7, maxTokens: 200 });
          assistantMessage = response || '';
        }
      } catch (ragErr) {
        console.log(`${colors.dim}RAG lookup failed, using plain generation...${colors.reset}`);
        const response = await sdk.generate(config.model, userMessage, { temperature: 0.7, maxTokens: 200 });
        assistantMessage = response || '';
      }
    } else {
      // Plain mode: direct chat completion
      const response = await sdk.chatCompletion(config.model, {
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant. Give short, direct answers.' },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 200,
        temperature: 0.7
      });
      assistantMessage = response?.choices?.[0]?.message?.content || '';
    }

    // Light cleanup — stop at any hallucinated role prefixes
    assistantMessage = assistantMessage
      .split(/\n\s*(User|Human|System):/i)[0]
      .trim();

    if (!assistantMessage) {
      assistantMessage = '(No response generated — try rephrasing your question)';
    }

    console.log(`\n${colors.bright}${colors.magenta}AI:${colors.reset} ${assistantMessage}${sourceInfo}\n`);
  } catch (error) {
    console.error(`\n${colors.red}Error:${colors.reset} ${error.message}\n`);
  }
}

/**
 * Prompt user for input
 */
function promptUser() {
  rl.question(`${colors.bright}${colors.green}You:${colors.reset} `, async (input) => {
    const message = input.trim();

    if (!message) {
      promptUser();
      return;
    }

    // Handle commands
    if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
      console.log(`\n${colors.bright}${colors.cyan}Thank you for chatting! Goodbye.${colors.reset}\n`);
      rl.close();
      process.exit(0);
    }

    if (message.toLowerCase() === 'clear') {
      console.clear();
      printWelcome();
      console.log(`${colors.green}✓ Screen cleared${colors.reset}\n`);
      promptUser();
      return;
    }

    // Send message to AI
    await sendMessage(message);
    promptUser();
  });
}

/**
 * Main entry point
 */
async function main() {
  printWelcome();

  try {
    console.log(`${colors.cyan}Initializing SlyOS...${colors.reset}`);
    await sdk.initialize();

    console.log(`${colors.cyan}Loading model: ${config.model}...${colors.reset}`);
    await sdk.loadModel(config.model);

    console.log(`${colors.green}Ready! Start chatting below.${colors.reset}\n`);
    console.log(`${colors.bright}${colors.cyan}─────────────────────────────────────────────────────────────${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}Failed to initialize: ${error.message}${colors.reset}`);
    console.error(`${colors.dim}Make sure your API key is correct and you have internet access.${colors.reset}`);
    process.exit(1);
  }

  promptUser();
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log(`\n${colors.bright}${colors.cyan}Session ended. Goodbye!${colors.reset}\n`);
  rl.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  rl.close();
  process.exit(0);
});

// Start the chatbot
main();
CHATBOT_EOF

chmod +x app.mjs
print_success "Chatbot application created"

# Create .env.example file
print_step "Creating environment configuration example"
cat > .env.example << 'ENV_EOF'
# Slyos SDK Configuration
SLYOS_API_KEY=your_api_key_here
SLYOS_MODEL=quantum-1.7b
SLYOS_SERVER=https://slyos-prod.eba-qjz3cmgq.us-east-2.elasticbeanstalk.com
ENV_EOF
print_success "Environment configuration template created"

# Create README
print_step "Creating README documentation"
cat > README.md << 'README_EOF'
# Slyos Interactive Chatbot

A simple yet powerful interactive chatbot powered by the Slyos SDK.

## Features

- Interactive command-line interface with colored output
- Conversation history management
- Easy API configuration
- Cross-platform support (Mac, Windows, Linux)

## Installation

1. Clone or download this project
2. Install dependencies: `npm install`
3. Configure your API key (see Configuration)

## Configuration

### Environment Variables

Set these environment variables before running:

```bash
export SLYOS_API_KEY=your_api_key_here
export SLYOS_MODEL=quantum-1.7b
export SLYOS_SERVER=https://slyos-prod.eba-qjz3cmgq.us-east-2.elasticbeanstalk.com
```

Or create a `.env` file based on `.env.example`.

## Running the Chatbot

### Direct Method
```bash
npm start
```

### With Environment Variables
```bash
SLYOS_API_KEY=your_key npm start
```

### Manual
```bash
node app.mjs
```

## Usage

Once the chatbot starts:

- **Chat**: Type your message and press Enter
- **Clear History**: Type `clear` to reset conversation
- **Exit**: Type `exit` or `quit` to end session
- **Interrupt**: Press Ctrl+C to exit anytime

## API Response Format

The chatbot supports multiple response formats from the SDK:

- `response.content` - Primary response text
- `response.text` - Alternative response field
- Direct string response - Fallback format

## Troubleshooting

### "Error initializing SDK"
- Check that your API key is valid
- Verify the Slyos server is accessible
- Ensure internet connection is active

### "Cannot find module '@emilshirokikh/slyos-sdk'"
- Run `npm install` to install dependencies
- Check npm log: `npm list`

### Placeholder API Key Warning
- Set the `SLYOS_API_KEY` environment variable with your actual key
- Or update `config.apiKey` in `app.mjs`

## System Requirements

- Node.js 14+ (14.17.0 or higher recommended)
- npm 6+
- Internet connection for API access

## License

MIT
README_EOF
print_success "README created"

# Set up environment with provided values
print_step "Configuring environment variables"
cat > .env << ENV_SETUP_EOF
SLYOS_API_KEY=${API_KEY}
SLYOS_MODEL=${MODEL}
SLYOS_SERVER=${SLYOS_SERVER}
SLYOS_KB_ID=${KB_ID}
ENV_SETUP_EOF
print_success "Environment configured"

# Final summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}            ${GREEN}✓ Setup Complete!${NC}                          ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Project Details:${NC}"
echo "  Location: ${YELLOW}$(pwd)${NC}"
echo "  API Key: ${YELLOW}${API_KEY}${NC}"
echo "  Model: ${YELLOW}${MODEL}${NC}"
if [ -n "$KB_ID" ]; then
  echo "  Knowledge Base: ${GREEN}${KB_ID} (RAG enabled)${NC}"
fi
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Review the .env file and update your API key if needed"
echo "  2. Run the chatbot: ${YELLOW}npm start${NC}"
echo "  3. Type messages to chat with the AI"
echo "  4. Type 'exit' to quit"
echo ""
echo -e "${GREEN}Ready to chat! 🚀${NC}"
echo ""

# Tell user how to start (can't auto-run when piped because stdin is closed)
echo -e "${CYAN}To start chatting, run:${NC}"
echo ""
echo -e "  ${YELLOW}cd ${PROJECT_NAME} && npm start${NC}"
echo ""
