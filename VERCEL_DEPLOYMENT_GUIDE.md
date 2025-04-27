# Vercel Deployment Guide for OrangeWeb3

This guide outlines the steps needed to deploy your OrangeWeb3 project on Vercel.

## Prerequisites

1. A GitHub account and repository where you've pushed your code
2. A Vercel account (you can sign up for free at vercel.com)
3. A PostgreSQL database (either your existing one or a new one like Neon Database, Supabase, etc.)

## Steps for Deployment

### 1. Update Scripts in package.json

When you import the project to Vercel, you'll need to modify your package.json scripts slightly:

```json
"scripts": {
  "dev": "NODE_ENV=development tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push",
  "vercel-build": "npm run db:push && npm run build"
}
```

Add the `vercel-build` script to ensure your database schema is pushed before building the application.

### 2. Environment Variables

In your Vercel project settings, add the following environment variables:

- `DATABASE_URL`: Connection string to your PostgreSQL database
- Any other environment variables your application needs

### 3. Build & Development Settings

Configure the following settings in Vercel:

- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### 4. Deploy on Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Configure the settings as described above
4. Deploy!

## Troubleshooting

If you encounter any issues during deployment:

1. Check the build logs in Vercel for error messages
2. Ensure your database connection string is correct
3. Verify that all necessary environment variables are set

## Database Considerations

For production, it's recommended to use a cloud PostgreSQL provider like:
- [Neon](https://neon.tech) (serverless PostgreSQL)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)

Make sure your database credentials are properly configured in Vercel environment variables.