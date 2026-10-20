# VIT Chennai QueueLess prototype — local setup

## Run the frontend in VS Code

1. Install Node.js 22 LTS or newer (the frontend package requires Node.js 20.19+).
2. Open this project folder in VS Code.
3. Open Terminal → New Terminal.
4. Run:

   ```powershell
   cd frontend
   npm.cmd install
   npm.cmd run dev
   ```

5. Open the local address Vite prints (usually `http://localhost:5173`).

## Current prototype changes

- The default general service profile is now branded for VIT Chennai.
- Queue choices are Main Canteen, Admin Office, AB1, Student Help Desk, and Campus Administration.
- The token form asks for a VIT registration number and associates it with the token.

## Important authentication limitation

The registration number is currently stored in the browser and is not verified against VIT systems. This is a local UI prototype, **not secure login**. Do not use real student data for production. Before deployment, implement verified authentication (for example, Amazon Cognito plus an approved student identity verification process) and enforce authorization on the backend.

## Backend note

The repository's existing queue API/Firebase configuration may be required for live token creation and real-time updates. Running the frontend locally does not deploy or configure that backend. If API configuration is missing, the interface may load but live queue actions may not work until a local backend or the existing API is configured.
