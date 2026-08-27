# Fix isolated app deployment URLs and navigation

1. **To-Do:** Make every isolated deployment report its Tailscale Serve origin without appending `/<app-name>`, while retaining the app-scoped port and root proxy target.
   **To-Verify:** Extend deployment route tests to assert that Home, Weather, and Live Splash all expose pathless Tailscale URLs and that route ownership and cleanup behavior remain unchanged.
2. **To-Do:** Pass the isolated deployment's shared-origin mode into the running web container so Home always renders Weather and Live Splash links as `/<app-name>` paths on whichever local or tailnet base URL served the request.
   **To-Verify:** Add deployment topology and Home directory coverage proving Home links resolve to `<current-base-url>/weather` and `<current-base-url>/live-splash` while independently deployed child apps remain rooted at their own base URLs.
3. **To-Do:** Remove the Go to Home controls and obsolete `FACTORY_HOME_URL` handling from the Weather and Live Splash authenticated shells and environment examples.
   **To-Verify:** Update both shell test suites to prove authenticated app pages retain their headers and content without rendering a Home navigation control or depending on Home configuration.
4. **To-Do:** Update local deployment documentation to describe pathless app URLs and same-origin Home directory paths, then prepare the changed app shells for human UI review.
   **To-Verify:** Run the focused deployment and app tests followed by `pnpm check`, and provide local Home, Weather, and Live Splash deployment evidence for UI review.
