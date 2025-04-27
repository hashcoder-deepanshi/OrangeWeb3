# Vercel Deployment Guide for OrangeWeb3

This step-by-step guide will help you deploy your OrangeWeb3 application on Vercel.

## Prerequisites
- Your OrangeWeb3_Vercel_Final.zip file
- A GitHub account
- A Vercel account (free tier is fine)

## Step 1: Upload to GitHub

1. Download the `OrangeWeb3_Vercel_Final.zip` file from Replit
2. Extract the ZIP file on your computer
3. Create a new repository on GitHub (e.g., "OrangeWeb3")
4. Initialize Git, add files, and push to GitHub:
   ```bash
   cd path/to/extracted/folder
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/OrangeWeb3.git
   git push -u origin main
   ```

## Step 2: Prepare for Vercel Deployment

Before deploying, you need to rename a few files:

1. Rename `package.json.vercel` to `package.json` (replacing the existing file)
   ```bash
   mv package.json.vercel package.json
   ```

2. Make sure the `drizzle.config.vercel.ts` file is present in your root directory

## Step 3: Deploy on Vercel

1. Go to [Vercel](https://vercel.com/) and sign up/login
2. Click "Add New..." → "Project"
3. Connect your GitHub account if not already connected
4. Select the "OrangeWeb3" repository
5. Configure the project with these settings:

   **Build and Output Settings:**
   - Framework Preset: Other
   - Install Command: `npm install`
   
   **Note:** The build command and output directory are already defined in the vercel.json file, so you don't need to specify them here.

   **Environment Variables:**
   - Add the following environment variable:
     - Name: `DATABASE_URL`
     - Value: `postgresql://neondb_owner:npg_6wyYsuj5GcnF@ep-sweet-glade-a49pding-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`
   
   **Note:** The NODE_ENV is already set to "production" in the vercel.json file.
   
6. Click "Deploy"

## Important: Fixing the 404 Error

If you encounter a 404 error after deployment, check the following:

1. Make sure your Vercel project is using the latest vercel.json file with the correct rewrites configuration
2. Verify that the backend build completed successfully in the build logs
3. Check that API routes are properly formatted as `/api/route-name`

If issues persist, try the following in your Vercel dashboard:
1. Go to Settings → General → Build & Development Settings
2. Set the "Install Command" to `npm install`
3. Redeploy your application

## Step 3: Verify Deployment

1. Wait for the deployment to complete (this may take a few minutes)
2. Once deployed, Vercel will provide you with a URL (e.g., `orangeweb3.vercel.app`)
3. Visit this URL to verify your application is working correctly
4. Test registration, login, and other features to ensure database connection is working

## Step 4: Custom Domain (Optional)

1. In your Vercel project dashboard, go to "Settings" → "Domains"
2. Add your custom domain and follow Vercel's instructions for DNS configuration

## Troubleshooting

If you encounter issues during deployment:

1. **Build Errors:**
   - Check the build logs in Vercel
   - Ensure all dependencies are properly specified in package.json

2. **Database Connection Issues:**
   - Verify the DATABASE_URL environment variable is correctly set
   - Ensure your Neon database is accessible from Vercel's servers

3. **Static Assets Not Loading:**
   - Check that your vite.config.ts has proper outDir configuration
   - Verify relative paths in your code

4. **API Routes Not Working:**
   - Check that the vercel.json file is properly set up for API routes

## Important Notes

- Your application is now using your permanent Neon database
- All data changes will persist in your Neon database
- Vercel automatically handles HTTPS and CDN distribution
- For future updates, simply push changes to your GitHub repository, and Vercel will automatically redeploy