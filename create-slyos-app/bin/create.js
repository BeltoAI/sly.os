#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  console.error(`${colors.red}✗ Error: ${message}${colors.reset}`);
  process.exit(1);
}

function success(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function info(message) {
  console.log(`${colors.cyan}ℹ ${message}${colors.reset}`);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsedArgs = {
    projectName: 'my-slyos-app',
    apiKey: null,
    model: 'quantum-1.7b',
    kbId: null,
    serverUrl: 'https://api.slyos.world',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api-key' && i + 1 < args.length) {
      parsedArgs.apiKey = args[i + 1];
      i++;
    } else if (args[i] === '--model' && i + 1 < args.length) {
      parsedArgs.model = args[i + 1];
      i++;
    } else if (args[i] === '--kb-id' && i + 1 < args.length) {
      parsedArgs.kbId = args[i + 1];
      i++;
    } else if (args[i] === '--server' && i + 1 < args.length) {
      parsedArgs.serverUrl = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      parsedArgs.projectName = args[i];
    }
  }

  return parsedArgs;
}

// Copy a file and optionally replace placeholders
function copyFileWithReplacements(src, dest, replacements = {}) {
  try {
    let content = fs.readFileSync(src, 'utf-8');

    // Replace placeholders
    for (const [placeholder, value] of Object.entries(replacements)) {
      const regex = new RegExp(placeholder, 'g');
      content = content.replace(regex, value || '');
    }

    fs.writeFileSync(dest, content, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to copy file ${src}: ${err.message}`);
  }
}

// Recursively copy directory
function copyDirectory(src, dest, replacements = {}) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath, replacements);
    } else {
      // Check if file should have replacements (typical config/template files)
      const shouldReplace =
        entry.name.endsWith('.js') ||
        entry.name.endsWith('.jsx') ||
        entry.name.endsWith('.ts') ||
        entry.name.endsWith('.tsx') ||
        entry.name.endsWith('.env') ||
        entry.name.endsWith('.json') ||
        entry.name.endsWith('.html');

      if (shouldReplace) {
        copyFileWithReplacements(srcPath, destPath, replacements);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

// Create package.json for the new project
function createPackageJson(projectName) {
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    description: 'A React chat app created with create-slyos-app',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      '@emilshirokikh/slyos-sdk': '^1.3.2',
    },
    devDependencies: {
      vite: '^5.0.0',
      '@vitejs/plugin-react': '^4.0.0',
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      typescript: '^5.0.0',
    },
  };

  return packageJson;
}

// Run npm install
function runNpmInstall(projectPath) {
  try {
    info(`Installing dependencies in ${projectPath}...`);
    execSync('npm install', {
      cwd: projectPath,
      stdio: 'inherit',
    });
    success('Dependencies installed successfully');
  } catch (err) {
    error(`Failed to run npm install: ${err.message}`);
  }
}

// Main function
function main() {
  log('\n╔════════════════════════════════════════╗', 'cyan');
  log('║   Create SlyOS App - React Chat CLI   ║', 'cyan');
  log('╚════════════════════════════════════════╝\n', 'cyan');

  const args = parseArgs();
  const projectName = args.projectName;
  const apiKey = args.apiKey;
  const model = args.model;
  const kbId = args.kbId;
  const serverUrl = args.serverUrl;

  const currentDir = process.cwd();
  const projectPath = path.join(currentDir, projectName);
  const templateDir = path.join(__dirname, '..', 'template');

  // Validate project directory doesn't exist
  if (fs.existsSync(projectPath)) {
    error(`Directory "${projectName}" already exists. Please choose a different project name.`);
  }

  // Validate template directory exists
  if (!fs.existsSync(templateDir)) {
    error(`Template directory not found at ${templateDir}. Make sure the template directory exists.`);
  }

  info(`Creating project: ${projectName}`);
  info(`API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'Not provided'}`);
  info(`Model: ${model}`);
  info(`Server URL: ${serverUrl}`);
  info(`Knowledge Base: ${kbId || 'None (plain generation)'}\n`);

  try {
    // Create project directory
    info('Step 1: Creating project directory...');
    fs.mkdirSync(projectPath, { recursive: true });
    success('Project directory created');

    // Copy template files with placeholder replacements
    info('Step 2: Copying template files...');
    const replacements = {
      '__API_KEY__': apiKey || '',
      '__MODEL_ID__': model,
      '__KB_ID__': kbId || '',
      '__SERVER_URL__': serverUrl,
    };
    copyDirectory(templateDir, projectPath, replacements);
    success('Template files copied');

    // Create package.json
    info('Step 3: Creating package.json...');
    const packageJson = createPackageJson(projectName);
    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );
    success('package.json created');

    // Run npm install
    info('Step 4: Installing dependencies...');
    runNpmInstall(projectPath);

    // Print success message
    log('\n╔════════════════════════════════════════╗', 'green');
    log('║     ✓ Project created successfully!   ║', 'green');
    log('╚════════════════════════════════════════╝\n', 'green');

    log(`Next steps:`, 'bright');
    log(`  1. ${colors.cyan}cd ${projectName}${colors.reset}`);
    log(`  2. ${colors.cyan}npm run dev${colors.reset}`);
    log(`\nYour React chat app will start at ${colors.blue}http://localhost:5173${colors.reset}\n`);

    if (!apiKey) {
      log(
        'Note: No API key provided. Update the API key in your environment or config file before running the app.',
        'yellow'
      );
    }
  } catch (err) {
    error(err.message);
  }
}

// Run the script
main();
