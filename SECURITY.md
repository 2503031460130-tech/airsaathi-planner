# Security policy

AirSaathi is a student contest prototype. If you find a security issue, please open a private GitHub security advisory instead of a public issue.

Scope notes:

- The public demo (`npm run build:demo`) is a static page with sample data. It makes no network requests and has no login.
- The private evaluation build (`npm run build`) is login-gated; its API endpoints verify the current user server-side on every request.
- API keys live only in server environment variables; report any key or personal data you find in this repository immediately.
- The AI endpoint accepts only approved generic action IDs and a language code; it never takes personal data.
