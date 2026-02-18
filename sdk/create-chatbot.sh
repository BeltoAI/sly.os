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
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --api-key KEY     Slyos API key (prompted if not provided)"
      echo "  --model MODEL     AI model to use (default: quantum-1.7b)"
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
  print_step "Enter your Slyos API key (or press Enter for placeholder)"
  read -r -p "  API Key: " API_KEY

  if [ -z "$API_KEY" ]; then
    API_KEY="YOUR_API_KEY"
    print_info "Using placeholder API key: ${YELLOW}$API_KEY${NC}"
  else
    print_success "API key configured"
  fi
else
  print_success "API key provided via arguments"
fi

# Confirm model selection
print_step "AI Model Configuration"
echo "  Current model: ${YELLOW}$MODEL${NC}"
read -p "  Use this model? (y/n, default: y): " -r -n 1
echo
if [[ ! $REPLY =~ ^[Yy]?$ ]]; then
  read -p "  Enter model name: " -r MODEL
fi
print_success "Model configured: ${YELLOW}$MODEL${NC}"

# Check if project already exists
if [ -d "$PROJECT_NAME" ]; then
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

# Install Slyos SDK
print_step "Installing @emilshirokikh/slyos-sdk"
print_info "This may take a moment..."
npm install @emilshirokikh/slyos-sdk > /dev/null 2>&1
print_success "Slyos SDK installed"

# Create the chatbot application
print_step "Creating interactive chatbot application: ${CYAN}app.mjs${NC}"

cat > app.mjs << 'CHATBOT_EOF'
#!/usr/bin/env node

import readline from 'readline';
import { SlyosSDK } from '@emilshirokikh/slyos-sdk';

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
  server: process.env.SLYOS_SERVER || 'https://slyos-prod.eba-qjz3cmgq.us-east-2.elasticbeanstalk.com'
};

// Initialize Slyos SDK
let sdk;
try {
  sdk = new SlyosSDK({
    apiKey: config.apiKey,
    model: config.model,
    baseURL: config.server
  });
} catch (error) {
  console.error(`${colors.red}Error initializing SDK:${colors.reset}`, error.message);
  process.exit(1);
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

// Store conversation history
let conversationHistory = [];

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
    // Add user message to history
    conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // Call SDK generate method
    const response = await sdk.generate({
      messages: conversationHistory,
      temperature: 0.7,
      maxTokens: 1024
    });

    // Extract response text
    const assistantMessage = response.content || response.text || response;

    // Add assistant response to history
    conversationHistory.push({
      role: 'assistant',
      content: assistantMessage
    });

    // Display response with formatting
    console.log(`\n${colors.bright}${colors.magenta}Assistant:${colors.reset}`);
    console.log(`${colors.dim}${assistantMessage}${colors.reset}\n`);
  } catch (error) {
    console.error(`\n${colors.red}Error generating response:${colors.reset}`);
    console.error(`${colors.dim}${error.message}${colors.reset}\n`);
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
      conversationHistory = [];
      console.log(`${colors.green}✓ Conversation history cleared${colors.reset}\n`);
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
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Review the .env file and update your API key if needed"
echo "  2. Run the chatbot: ${YELLOW}npm start${NC}"
echo "  3. Type messages to chat with the AI"
echo "  4. Type 'exit' to quit"
echo ""
echo -e "${GREEN}Ready to chat! 🚀${NC}"
echo ""

# Auto-run the chatbot (optional - uncomment to enable)
# read -p "Start chatbot now? (y/n, default: y): " -r -n 1
# echo
# if [[ ! $REPLY =~ ^[Nn]$ ]]; then
#   npm start
# fi
