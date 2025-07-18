/*──────────────────────────────────────────────────
  AWS Lambda Entry Point Proxy
  
  This file maintains compatibility with AWS Lambda's
  default handler expectations while allowing our
  modular architecture in the src/ directory.
──────────────────────────────────────────────────*/

export { handler } from './src/index.mjs';
