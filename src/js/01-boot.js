(function(){
"use strict";

/* The URL somebody ARRIVED on, captured before a single line of app code has a
   chance to touch it.

   This is not belt and braces, it is a real bug that was shipping: a first-time
   visitor landing on a shared search or a card page got their link thrown away.
   render() ends by writing the current (empty) search back into the address bar,
   and on a cold profile that ran before the boot code that reads the incoming
   hash — so the link was gone by the time anything looked for it. It only worked
   on a SECOND visit, which is exactly the visit that doesn't matter. Every
   arrival from Google is a cold profile. */
const BOOTHASH=location.hash||"";
/* An OAuth return from Google arrives as "#access_token=…&refresh_token=…".
   It is captured HERE, at the very top, because the boot render() calls
   syncHash(), which rewrites the hash to match the current search — and an
   empty search means the hash is wiped entirely. That is why signing in used
   to appear to do nothing (see SIGNIN-FIX.md). */
const AUTHHASH=/[#&](access_token|error_description)=/.test(BOOTHASH)?BOOTHASH:"";

