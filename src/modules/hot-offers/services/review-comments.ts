// ponytail: combinatorial phrase pools instead of a stored 50K-comment table —
// same variety, zero rows, zero migrations. Upgrade path: an admin-managed
// comment pool table if marketing ever wants to curate the copy.

const OPENERS = [
  "Really fun app!",
  "Downloaded this last week and I'm hooked.",
  "Not gonna lie, I was skeptical at first.",
  "Been using this daily for a while now.",
  "Okay this one actually surprised me.",
  "One of the better apps I've tried this year.",
  "Super easy to get into.",
  "Found this through a friend and glad I did.",
  "Didn't expect much but here we are.",
  "This has become part of my daily routine.",
  "Installed it out of boredom, kept it on purpose.",
  "Great little time killer.",
  "Honestly a pleasant surprise.",
  "Solid app all around.",
  "Took me like two minutes to get the hang of it.",
  "Way better than similar apps I've tried.",
  "My whole family ended up trying this.",
  "Perfect for short breaks during the day.",
  "Simple, clean and it just works.",
  "I rarely write reviews but this earned one.",
] as const;

const BODIES = [
  "The rewards actually show up, no fake promises.",
  "Runs smooth even on my older phone.",
  "The interface is clean and nothing feels cluttered.",
  "Barely any ads compared to other apps like this.",
  "Everything loads fast and I haven't had a single crash.",
  "The tasks are simple and payouts are quick.",
  "It doesn't drain my battery like most apps do.",
  "Customer support actually replied when I had a question.",
  "The daily bonuses keep me coming back.",
  "Levels get harder at just the right pace.",
  "You can tell the developers actually care about updates.",
  "Signing up took seconds and everything worked first try.",
  "The graphics are surprisingly nice for a free app.",
  "No weird permissions or shady popups, which I appreciate.",
  "It saves my progress properly even when I switch phones.",
  "The challenges are actually fun, not just grindy.",
  "Withdrawals went through faster than I expected.",
  "There's always something new to do when I open it.",
  "It works fine even on slow internet.",
  "The tutorial explains everything without being annoying.",
  "Points add up quicker than in most similar apps.",
  "Notifications are useful and not spammy at all.",
  "The design feels modern and everything is where you'd expect.",
  "Haven't hit a paywall yet, which is rare these days.",
  "It respects your time, sessions can be as short as you want.",
] as const;

const MENTIONS = [
  "{name} has honestly become my go-to app.",
  "Been telling everyone about {name}.",
  "{name} does exactly what it says.",
  "Can't believe {name} is free.",
  "{name} deserves way more downloads.",
  "Whoever made {name} did a great job.",
] as const;

const CLOSERS = [
  "Highly recommend.",
  "Five stars from me.",
  "Definitely worth a try.",
  "Keep up the good work!",
  "Will keep using it for sure.",
  "Give it a shot, you won't regret it.",
  "Easily recommend to anyone.",
  "Hope they keep the updates coming.",
  "No complaints so far.",
  "Two thumbs up.",
  "Already recommended it to my friends.",
  "Would rate higher if I could.",
  "Deserves the good ratings.",
  "Great job by the devs.",
  "Can't wait to see what's next.",
  "Worth the download.",
  "Been recommending it nonstop.",
  "Try it and see for yourself.",
  "Really impressed overall.",
  "Solid five stars.",
] as const;

// Used occasionally (see EMOJI_CHANCE) — most comments stay emoji-free.
const EMOJIS = ["🔥", "👍", "😄", "🎉", "💯"] as const;
const EMOJI_CHANCE = 0.2;
const MENTION_CHANCE = 0.5;

/** Total unique combinations without an app name (emoji slot = pool + "none"). */
export const COMBINATION_SPACE =
  OPENERS.length * BODIES.length * CLOSERS.length * (EMOJIS.length + 1);

const pick = <T>(pool: readonly T[]): T => pool[Math.floor(Math.random() * pool.length)]!;

/** A freshly generated, positive Play-Store-style review comment. */
export const generateReviewComment = (appName: string | null): string => {
  const parts: string[] = [pick(OPENERS), pick(BODIES)];
  if (appName && Math.random() < MENTION_CHANCE) {
    parts.push(pick(MENTIONS).replace("{name}", appName));
  }
  parts.push(pick(CLOSERS));
  if (Math.random() < EMOJI_CHANCE) parts.push(pick(EMOJIS));
  return parts.join(" ");
};
