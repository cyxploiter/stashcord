# Stashcord Heroku Deployment Guide

This guide provides step-by-step instructions for deploying the Stashcord application to Heroku.

## Prerequisites

1.  **Heroku Account**: You will need a Heroku account. If you don't have one, sign up at [heroku.com](https://www.heroku.com/).
2.  **Heroku CLI**: Install the Heroku CLI on your local machine. You can find instructions [here](https://devcenter.heroku.com/articles/heroku-cli).
3.  **Git**: Ensure you have Git installed and configured on your machine.

## Step 1: Log in to Heroku

Open your terminal and log in to your Heroku account:

```bash
heroku login
```

## Step 2: Create a Heroku App

Create a new Heroku app from your terminal:

```bash
heroku create your-app-name
```

Replace `your-app-name` with a unique name for your application.

## Step 3: Add a PostgreSQL Database

Provision a Heroku Postgres database for your application:

```bash
heroku addons:create heroku-postgresql:hobby-dev
```

This will add a free-tier PostgreSQL database to your app and set a `DATABASE_URL` environment variable.

## Step 4: Set Environment Variables

You need to set the same environment variables in Heroku as you have in your local `.env` file. You can do this from the Heroku dashboard (in the "Settings" tab of your app) or via the CLI.

**Required Environment Variables:**

*   `DISCORD_BOT_TOKEN`
*   `DISCORD_CLIENT_ID`
*   `DISCORD_CLIENT_SECRET`
*   `DISCORD_GUILD_ID`
*   `JWT_SECRET`
*   `NEXT_PUBLIC_API_BASE_URL`: The URL of your Heroku backend (e.g., `https://your-app-name.herokuapp.com`).
*   `NEXT_PUBLIC_FRONTEND_URL`: The URL of your Heroku frontend (e.g., `https://your-app-name.herokuapp.com`).
*   `DATABASE_URL`: This is set automatically by Heroku when you add the Postgres addon.

**Example using the Heroku CLI:**

```bash
heroku config:set DISCORD_BOT_TOKEN=your_bot_token_here
heroku config:set DISCORD_CLIENT_ID=your_discord_application_id
# ...and so on for all required variables
```

## Step 5: Add Buildpacks

Heroku needs to know how to build your application. Since this is a monorepo with both Node.js and pnpm, you'll need to add the appropriate buildpacks.

```bash
heroku buildpacks:add -a your-app-name heroku/nodejs
heroku buildpacks:add -a your-app-name https://github.com/pnpm/heroku-buildpack-pnpm
```

## Step 6: Push to Heroku

Commit your changes to Git and push the `main` branch to Heroku:

```bash
git add .
git commit -m "Prepare for Heroku deployment"
git push heroku main
```

This will trigger a build on Heroku. The `heroku-postbuild` script in your root `package.json` will be executed, which installs dependencies for both the frontend and backend and then builds both applications.

## Step 7: Run Database Migrations

After the first deployment, you need to run the database migrations to set up your PostgreSQL database schema.

```bash
heroku run pnpm --filter backend db:migrate -a your-app-name
```

## Step 8: Scale Your Dynos

Your `Procfile` defines two process types: `web` (for the frontend) and `worker` (for the backend). You need to ensure both are running.

```bash
heroku ps:scale web=1 worker=1 -a your-app-name
```

## Step 9: Open Your App

Your application should now be deployed and running. You can open it in your browser with:

```bash
heroku open -a your-app-name
```

## Troubleshooting

*   **Build Failures**: Check the build logs in your Heroku dashboard or with `heroku logs --tail`. Common issues include missing dependencies or incorrect build scripts.
*   **Application Errors**: Use `heroku logs --tail` to view runtime logs from both the web and worker dynos. This will help you debug any application-level errors.
*   **Database Connection Issues**: Ensure the `DATABASE_URL` is set correctly and that your backend is configured to use it with SSL. The `apps/backend/src/db.ts` file is already configured for this.

That's it! Your Stashcord application is now deployed on Heroku.