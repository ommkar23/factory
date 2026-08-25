# Selective production deployments

1. To-do: Extract the shared Next.js Cloud Run deployment job and add independently dispatchable, path-filtered workflows for Home, Weather, and Live Splash.
   To-verify: Validate each workflow targets only its named app and that shared runtime changes trigger every affected app.
2. To-do: Tighten API and Storybook push triggers so each deploys from main only for relevant changes while retaining manual dispatch.
   To-verify: Validate API and Storybook path filters, checkout behavior, and documented Storybook publishing behavior.
3. To-do: Update deployment guard tests and remove the combined application deployment workflow.
   To-verify: Run focused deployment tests and repository formatting checks for changed files.
