# Social and turf review

REA evidence: `ev_2efc11751ca713befd5ffa79e9502517e5f2445e241fb31c11fbbe90683961c8`.

All 18 scenario steps completed in headless Edge at 390×844. Inspected screenshots and accessibility trees for Home, follower turf map, and sharing eligibility. OpenStreetMap tiles loaded with visible attribution. Follow Nora updated the map to show both Alex and Nora. Like, comment entry, and repost controls completed successfully. No page-error events were recorded.

This verifies a local preview only. Profiles, workouts and turf owners are explicit examples. No real user was followed or contacted. Sharing rejects simulated workouts. Real GPS recording, Supabase authentication, server authorization and verified atomic turf ownership updates remain outstanding. A Mapbox public token was not configured, so Mapbox and native devices were not verified.

Validation: TypeScript and ESLint passed; 17 tests passed, including social validation and turf matching rules. Web export succeeded. Leaflet CSS export warned about unused default marker/layer-control image resources; the application uses circle markers and no layer control, and the inspected map rendered correctly.
