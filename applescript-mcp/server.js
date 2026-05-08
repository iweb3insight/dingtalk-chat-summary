#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { NodeSSH } from 'node-ssh';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  remoteHost: 'localhost',
  remotePassword: '',
  remoteUser: '',
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--remoteHost' && i + 1 < args.length) {
    config.remoteHost = args[i + 1];
    i++;
  } else if (args[i] === '--remotePassword' && i + 1 < args.length) {
    config.remotePassword = args[i + 1];
    i++;
  } else if (args[i] === '--remoteUser' && i + 1 < args.length) {
    config.remoteUser = args[i + 1];
    i++;
  }
}

// Initialize logging
const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor(name) {
    this.name = name;
    this.logLevel = process.env.LOG_LEVEL ? 
      logLevels[(process.env.LOG_LEVEL || 'INFO').toUpperCase()] : 
      logLevels.INFO;
  }

  log(level, message) {
    if (logLevels[level] <= this.logLevel) {
      const timestamp = new Date().toISOString();
      console.error(`${timestamp} - ${this.name} - ${level} - ${message}`);
    }
  }

  info(message) { this.log('INFO', message); }
  warn(message) { this.log('WARN', message); }
  error(message) { this.log('ERROR', message); }
  debug(message) { this.log('DEBUG', message); }
}

const logger = new Logger('applescript-mcp');

async function executeAppleScript(code, timeout = 60) {
  // Check if all remote credentials are available for SSH execution
  const useRemote = config.remoteHost && config.remoteHost !== 'localhost' &&
                    config.remoteUser && config.remotePassword;
  
  if (useRemote) {
    return executeRemoteAppleScript(code, timeout);
  } else {
    return executeLocalAppleScript(code, timeout);
  }
}

async function executeLocalAppleScript(code, timeout = 60) {
  // Create a temporary file for the AppleScript
  const tempPath = path.join(os.tmpdir(), `applescript_${Date.now()}.scpt`);
  
  try {
    // Write the AppleScript to the temporary file
    fs.writeFileSync(tempPath, code);
    
    // Execute the AppleScript
    return new Promise((resolve, reject) => {
      exec(`/usr/bin/osascript "${tempPath}"`, { timeout: timeout * 1000 }, (error, stdout, stderr) => {
        // Clean up the temporary file
        try {
          fs.unlinkSync(tempPath);
        } catch (e) {
          logger.warn(`Failed to delete temporary file: ${e.message}`);
        }
        
        if (error) {
          if (error.killed) {
            resolve(`AppleScript execution timed out after ${timeout} seconds`);
          } else {
            resolve(`AppleScript execution failed: ${stderr}`);
          }
        } else {
          resolve(stdout);
        }
      });
    });
  } catch (e) {
    return `Error executing AppleScript: ${e.message}`;
  }
}

async function executeRemoteAppleScript(code, timeout = 60) {
  logger.info(`Executing AppleScript on remote host: ${config.remoteHost}`);
  
  // Create a temporary file for the AppleScript
  const localTempPath = path.join(os.tmpdir(), `applescript_${Date.now()}.scpt`);
  const remoteTempPath = `/tmp/applescript_${Date.now()}.scpt`;
  
  try {
    // Write the AppleScript to the temporary file
    fs.writeFileSync(localTempPath, code);
    
    // Initialize SSH client
    const ssh = new NodeSSH();
    
    // Connect to remote host
    try {
      await ssh.connect({
        host: config.remoteHost,
        username: config.remoteUser,
        password: config.remotePassword,
        // Useful when password auth fails and you need to try keyboard-interactive
        tryKeyboard: true,
        onKeyboardInteractive: (name, instructions, lang, prompts, finish) => {
          if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
            finish([config.remotePassword]);
          }
        }
      });
      
      logger.info('SSH connection established successfully');
      
      // Upload the AppleScript file
      await ssh.putFile(localTempPath, remoteTempPath);
      
      // Execute the AppleScript on the remote machine
      const result = await ssh.execCommand(`/usr/bin/osascript "${remoteTempPath}"`, {
        timeout: timeout * 1000
      });
      
      // Clean up the remote file
      await ssh.execCommand(`rm -f "${remoteTempPath}"`);
      
      // Clean up the local file
      try {
        fs.unlinkSync(localTempPath);
      } catch (e) {
        logger.warn(`Failed to delete local temporary file: ${e.message}`);
      }
      
      // Disconnect from the remote host
      ssh.dispose();
      
      if (result.code !== 0) {
        return `Remote AppleScript execution failed: ${result.stderr}`;
      }
      
      return result.stdout;
    } catch (sshError) {
      // Clean up the local file on error
      try {
        fs.unlinkSync(localTempPath);
      } catch (e) {
        logger.warn(`Failed to delete local temporary file: ${e.message}`);
      }
      
      return `SSH error: ${sshError.message}`;
    }
  } catch (e) {
    return `Error executing remote AppleScript: ${e.message}`;
  }
}

async function main() {
  logger.info('Starting AppleScript MCP server');
  logger.info(`Using remote host: ${config.remoteHost}`);
  logger.info(`Remote user: ${config.remoteUser || 'not set'}`);
  logger.info(`Remote password ${config.remotePassword ? 'is' : 'is not'} set`);
  
  try {
    // Create the server
    const server = new McpServer({
      name: 'AppleScript MCP',
      version: '0.1.0'
    });
    
    // Define the tool
    server.tool(
      'applescript_execute',
      'Run AppleScript code to interact with Mac applications and system features. This tool can access and manipulate data in Notes, Calendar, Contacts, Messages, Mail, Finder, Safari, and other Apple applications. Common use cases include but not limited to: - Retrieve or create notes in Apple Notes - Access or add calendar events and appointments - List contacts or modify contact details - Search for and organize files using Spotlight or Finder - Get system information like battery status, disk space, or network details - Read or organize browser bookmarks or history - Access or send emails, messages, or other communications - Read, write, or manage file contents - Execute shell commands and capture the output',
      {
        code_snippet: z.string().describe('Multi-line appleScript code to execute'),
        timeout: z.number().optional().describe('Command execution timeout in seconds (default: 60)')
      },
      async ({ code_snippet, timeout = 60 }) => {
        logger.info(`Executing AppleScript with timeout ${timeout}s`);
        
        if (!code_snippet) {
          return {
            content: [{ type: 'text', text: 'Error: Missing code_snippet argument' }]
          };
        }
        
        try {
          // Inject configuration variables into the AppleScript environment if needed
          if (code_snippet.includes('{{REMOTE_HOST}}')) {
            code_snippet = code_snippet.replace(/\{\{REMOTE_HOST\}\}/g, config.remoteHost);
          }
          
          if (code_snippet.includes('{{REMOTE_PASSWORD}}')) {
            code_snippet = code_snippet.replace(/\{\{REMOTE_PASSWORD\}\}/g, config.remotePassword);
          }
          
          if (code_snippet.includes('{{REMOTE_USER}}')) {
            code_snippet = code_snippet.replace(/\{\{REMOTE_USER\}\}/g, config.remoteUser);
          }
          
          const result = await executeAppleScript(code_snippet, timeout);
          return {
            content: [{ type: 'text', text: result }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );
    
    // Use STDIO transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info('MCP server started and ready to receive requests');
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
}

// Start the server
main(); 