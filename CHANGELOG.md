# Changelog

## 0.1.0-alpha — 2026-10-10

- Consolidated the active game into the `public/` client and removed outdated root-level copies and prototypes.
- Kept only the Kenney GLB model set and its relevant assets, removing unused FBX/OBJ exports and preview documentation from the deployed asset tree.
- Added project documentation, an MIT license for project code, and GitHub Actions syntax/asset checks.
- Added raycast-based placement coordinates so taps map to the visible 3D ground rather than a separate 2D projection.
- Updated the Socket.IO browser client to load from a CDN, avoiding a broken `/socket.io/socket.io.js` URL on GitHub Pages.
- Documented current limitations: account authentication, persistent multiplayer world storage, and complete 3D building coverage are not yet implemented.

This is an early alpha for testing, not a production MMO release.
