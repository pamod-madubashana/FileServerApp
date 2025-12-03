# Telegram File Server Frontend

## Project Overview

This is the frontend component of the Telegram File Server application, built with modern web technologies to provide a seamless file management experience integrated with Telegram.

## Technologies Used

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Key Features

- Cross-platform file downloads (browser and Tauri)
- Advanced download management with progress tracking
- File browsing and organization
- User authentication and profile management
- Settings customization

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Development Setup

Follow these steps to set up the development environment:

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies
npm i

# Step 4: Start the development server with auto-reloading and an instant preview
npm run dev
```

### Direct File Editing

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

### GitHub Codespaces

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Deployment

The frontend can be deployed using standard React deployment procedures. Build the project using:

```bash
npm run build
```

Then deploy the generated files in the `dist` folder to your preferred hosting platform.