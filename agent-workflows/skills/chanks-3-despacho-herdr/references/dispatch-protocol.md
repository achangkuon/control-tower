# Dispatch protocol rules (V2)

These rules used to live in an always-loaded instruction block. They now live only in the V2
dispatch skills. `../SKILL.md` and `../../chanks-3-coordinador-manual/SKILL.md` carry the rest;
this file holds what neither states elsewhere. Nothing here overrides Gentle AI.

- Radar compatible capacity is the parallel-safety verdict for the lot. Forecasts reserve
  nothing live: Radar acquires no live reservation, and a forecast never grants a seat,
  a worker or a lock.
- After the confirmed fire-and-forget `send` handoffs, the responsible parent returns after one
  delivery result per exact Sesión/worker handoff. Worker completion is never awaited.
- A declared Recurso requires confirmed exclusive or serial execution evidence before mutation.
  On failure, release only actual resources demonstrably acquired; never release one that was not.
- Closure evidence returns to the responsible parent before retire mode: for a Session, through
  `chanks-5-session-doc`; for an issue patch, through `issue-patch-closure.md`. Retirement runs
  only after the parent has integrated and recorded that closure.
- No dispatch, delivery result, roster readback or Herdr JSON response is authority to select
  work, integrate, review or deliver. Delivery follows ordinary repository policy.
