# Security Controls Checklist

- [x] JWT_SECRET is minimum 32 characters
      Verify: `echo -n "$JWT_SECRET" | wc -c`
- [x] No secrets committed to git history
      Verify: `git log --all -p | grep -E "API_KEY|SECRET|PASSWORD" | head -5`
- [x] RLS blocks cross-tenant access
      Verify: manual psql test — set user A's ID, query repositories, confirm 0 rows returned for user B's data
- [x] Rate limiting active (60 req/min/user)
      Verify: `for i in {1..70}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/health; done | grep -c 429`
- [x] Redis not exposed externally (port 6379 not public)
      Verify: `docker-compose ps | grep redis` — confirm no `0.0.0.0:6379` binding
- [x] HMAC webhook verification active
      Verify: `curl -X POST http://localhost:8000/api/v1/webhooks/github -d '{}'` → expect HTTP 403
- [x] QDRANT_API_KEY set and enforced
      Verify: `curl http://localhost:6333/collections` without API key → expect 401
- [x] Query max length enforced (1000 chars)
      Verify: send 1001-char query string to /search → expect HTTP 422
