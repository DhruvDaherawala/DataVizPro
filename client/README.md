# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# DataViz Pro Frontend

The frontend application for the DataViz Pro data visualization platform.

## Setup and Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create an `.env` file based on `.env.example` and update the values.

3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment to Vercel

This application is configured for easy deployment on Vercel:

1. Fork or clone this repository to your GitHub account

2. Connect to Vercel:
   - Sign up or log in to [Vercel](https://vercel.com)
   - Click "New Project" and import the repository
   - Select the client directory for deployment

3. Configure Environment Variables:
   - Add the `VITE_API_URL` environment variable, pointing to your backend URL
   - Example: `https://your-backend-domain.vercel.app`

4. Deploy:
   - Click "Deploy" and wait for the build to complete
   - Your frontend should now be live at the provided Vercel URL

## Environment Variables

- `VITE_API_URL`: The URL of the backend API server
- `VITE_ENABLE_ANALYTICS`: Enable/disable analytics features
- `VITE_ENABLE_AUTH`: Enable/disable authentication features
- `VITE_APP_NAME`: Application name
- `VITE_APP_VERSION`: Application version
- `VITE_APP_DESCRIPTION`: Application description
- `VITE_MAX_UPLOAD_SIZE`: Maximum file upload size in bytes
