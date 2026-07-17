# Phase 1 Load Test Report

**Date:** 2026-07-17
**Base URL:** http://localhost:8080
**Test Tool:** k6 v1.x

## Test Configuration

| Scenario | Rate | Duration | Max VUs | Purpose |
|----------|------|----------|---------|---------|
| redis_hit_redirect | 100 RPS | 30s | 50-200 | Cache-first redirect — <30ms claim |
| create_urls | 50 RPS | 30s | 10-50 | POST /api/urls write path |
| mongo_fallback_redirect | 100 RPS | 15s | 30-100 | Cache miss → MongoDB fallback |

## Results

### Redis-Hit Redirect (Cache-First Path)

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| p95 latency | **4.22ms** | <30ms | ✅ PASS |
| avg latency | 2.81ms | — | — |
| min latency | 0.56ms | — | — |
| max latency | 85.02ms | — | — |
| Total requests | 3,000 | — | — |
| Successful | 3,000 (100%) | — | ✅ |

### MongoDB Fallback Redirect (Cache Miss Path)

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| p95 latency | 3.73ms | <200ms | ✅ PASS |
| avg latency | 2.92ms | — | — |
| Total requests | 1,500 | — | — |

### Create Short URLs

| Metric | Value |
|--------|-------|
| p95 latency | 4.90ms |
| Total requests | 1,503 |
| Successful | 1,503 |

## Conclusion

All performance thresholds are met. The cache-first strategy delivers sub-5ms p95 redirect latency,
well below the 30ms target. MongoDB fallback path is also latency-competitive due to local Docker
networking. The system handles 100+ RPS without degradation.

## Evidence

See `loadtests/results/summary.json` for raw k6 output.
