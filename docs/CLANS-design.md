# Clans — parked, not abandoned

Ben's idea, 2026-08-18. Shelved the same day for scope, not because it's wrong.
Written down so a cold session doesn't re-derive it, and so the one thing that
could sink it isn't forgotten.

---

## The idea

Clash-of-Clans-shaped social layer. You join a clan, get a clan tag beside your
name, and the clan tab shows who has what.

- In your collection you mark cards **for trade** and **wanted**
- One button shares those to your clan
- Clan mates open the clan tab and see the matches: *you have three cards Sarah
  wants, she has two of yours*
- Request to join a clan, clan leader accepts, leader can remove people
- A dust leaderboard, formatted in thousands — `1k dust`, `500k dust`
- Dust is donated to the clan vault and stays there; a clan can gift dust to
  another clan at a **1:8** ratio

---

## The problem that has to be solved first

**Dust is minted in the browser.** From PROJECT-NOTES:

> Dust is unenforceable and that's fine. It's localStorage; anyone with devtools
> can mint a million. Never gate anything behind dust that costs money or that
> you'd be sorry to give away.

That rule holds while dust buys jokes and cosmetic titles. A leaderboard changes
what dust *is* — it becomes competitive and transferable, and the top of the
board becomes whoever opened developer tools first. The vault and the 1:8 gift
are the same problem: people moving numbers they invented.

Two honest routes:

1. **Rank something unforgeable instead.** Printings owned, sets completed,
   trades completed, notes written — all of which live server-side once clans
   exist. Ship the social half, leave the economy alone.
2. **Move dust earning server-side.** The games report "I finished this" and the
   server decides what it's worth. Correct, and a large job on its own.

Do not ship a forgeable leaderboard. Once players notice, it poisons trust in
the whole clan system, not just the number.

---

## What makes this different from everything built so far

Every feature to date runs in one browser. Clans are the first time **another
person's data appears on your screen**, which brings:

- Membership, roles, join requests, and row-level rules about who may read what
- **Someone will type something vile into a clan name.** Needs filtering and a
  report path from day one, not later
- **Removal.** A leader needs to remove a member; you need to remove a leader
- Privacy: sharing a collection tells people exactly which valuable cards you
  own. Default should be that nothing is shared until explicitly marked

## Cold start

A clan system is empty until people are in it. Build it so it's useful with
**two** members, not fifty. The trade board clears that bar; a leaderboard
doesn't.

---

## Ideas worth keeping

- **Automatic matching.** Nobody should read lists — the site does the matching.
- **Post your borrow list to the clan.** The borrow list already exists and
  already computes "cards I need". Smallest possible step to something used.
- **Clan collection pool.** "Between the five of you, the clan owns four of
  these."
- **Clan tag on notes and contributions**, so tagging art earns your clan
  visibility.
- **Trade history**, so "did they actually send it" isn't a memory game. This is
  what makes people trust it.
- **Invite codes** as well as request-to-join. Most clans start as four friends.

## Suggested order, when it comes off the shelf

1. Clan membership, invite code, roles, removal
2. Trade board — for-trade and wanted marks, sharing, matching
3. Post-borrow-list-to-clan
4. Clan stats and collection pool
5. Leaderboard on unforgeable things
6. Dust vault and gifting — **only after dust earning is server-side**
