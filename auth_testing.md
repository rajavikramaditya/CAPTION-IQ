# CaptionIQ Auth + Foundation Testing Playbook

Backend base URL: use REACT_APP_BACKEND_URL from /app/frontend/.env, suffixed with /api.
Cookies are Secure; SameSite=None — prefer the HTTPS URL for cookie tests, or use the
`access_token` returned in the login/register JSON body as a Bearer token.

## Seeded / test users
- Admin: admin@captioniq.app / CaptionIQ@2026
- Test creator: creator1@test.com / secret123

## Backend flows to verify
1. POST /api/auth/register {email,password,name} -> 200, returns {user, access_token}, sets cookies.
2. POST /api/auth/login {email,password} -> 200 token; wrong password -> 401; 5 wrong -> 429 lockout.
3. GET /api/auth/me (Bearer or cookie) -> current user; no token -> 401.
4. POST /api/auth/logout -> clears cookies.
5. Projects (auth required):
   - POST /api/projects {title} -> project with empty caption_document
   - GET /api/projects -> list of summaries (only own projects)
   - GET /api/projects/{id} -> full project; other user's id -> 404 (ownership isolation)
   - POST /api/projects/{id}/media (multipart file + duration) -> stores to object storage, links media
   - GET /api/projects/{id}/media -> streams bytes, supports Range (206)
   - POST /api/projects/{id}/transcribe -> real Whisper + entity tagging, persists caption_document, status=ready
   - Reopen GET /api/projects/{id} -> caption_document.words populated with entity_type
   - PUT /api/projects/{id}/caption -> saves edited document

## Google OAuth (no real Google in tests)
Simulate by inserting a user + user_sessions row in mongo, then call /api/auth/me with
Authorization: Bearer <session_token>. Should return the user.

## Frontend flows
- /login and /signup render; signup creates account and lands on /dashboard.
- Dashboard: New Project -> upload file -> navigates to /studio/:id.
- Studio: Generate captions -> transcript shows semantic-colored words (data-testid=caption-word,
  data-entity=person|location|action). Video overlay shows current line.
- Logout -> redirected to /login. Visiting /dashboard while logged out -> redirect to /login.

## Fixtures
- /app/test_fixtures/speech.mp3 (short English/Hinglish speech with a name + place) — reuse for upload/transcribe.
