"use client";

interface QuickActionsProps {
  onAction: (prompt: string, actionType: string) => void;
  disabled?: boolean;
}

// Ordered by expected frequency of use (left = most frequent)
const QUICK_ACTIONS = [
  {
    label: "Add Food",
    actionType: "add_food",
    prompt: "", // Handled specially - triggers camera + food mode
    icon: "🍽️",
  },
  {
    label: "Set Reminder",
    actionType: "set_reminder",
    prompt: "", // Handled specially - triggers reminder mode
    icon: "⏰",
  },
  {
    label: "What's Next?",
    actionType: "whats_next",
    prompt: "Based on my goals, current situation, and timeline, what should I focus on right now? Give me 1-3 specific, actionable next steps. Be concise - I'm waiting for this response.",
    icon: "🎯",
  },
  {
    label: "Today's Calendar",
    actionType: "quick_calendar",
    prompt: `Quick calendar check! Please:

1. Get the current time
2. Check my Google Calendar for today's events (all connected accounts)
3. Show me what's happening today in a clean format:
   - Events that already happened (brief)
   - What's coming up next
   - Anything later today

Keep it simple and scannable. Don't schedule anything, just show me what's there.`,
    icon: "📅",
  },
  {
    label: "Morning Check-in",
    actionType: "morning_checkin",
    prompt: `Good morning! Let's do a quick check-in to start your day right.

Please do the following in parallel:
1. Read the latest email digest/sync files from context/updates/ (look for the most recent email-digest or email-sync files)
2. Check my Google Calendar for today's events
3. Read my current-state.md and any recent updates

Then ask me:
- How many hours did you sleep last night? (tracking toward 7+ consecutive nights)
- How's your cognitive clarity feeling? (1-10)
- Any overnight symptoms or concerns?

After I answer, give me:
1. **Email Summary**: Any important new emails or updates from the overnight sync
2. **Today's Calendar**: What's on the schedule
3. **Health Check**: How I'm tracking on the 7-night sleep goal
4. **Top 1-2 Priorities**: What to focus on today given my current state

Keep it warm and supportive. Be concise.`,
    icon: "☀️",
  },
  {
    label: "Overwhelmed?",
    actionType: "feeling_overwhelmed",
    prompt: `I'm feeling overwhelmed or anxious right now. Help me reset.

DON'T lecture me or show statistics. Just be supportive and suggest ONE thing I could do right now to feel better.

Check my context files for activities that help me relax, or suggest general calming activities:
- Go outside for a short walk
- Do some light stretching
- Take a hot shower
- Tidy up my space
- Listen to calming music
- Connect with a friend

Pick ONE suggestion based on the time of day and what might be most accessible right now. Keep it short and gentle.`,
    icon: "🌊",
  },
  {
    label: "Wind Down",
    actionType: "evening_winddown",
    prompt: `It's time to start winding down for sleep. Help me transition to rest mode.

Please:
1. Check my context files for any evening medications or routines
2. Read any sleep protocol or evening routine documentation

Then give me a gentle checklist:
- Any evening medication reminders
- Screen/light recommendations for the next 2 hours
- One relaxing activity suggestion
- Any calendar items for tomorrow I should know about

Keep it calming and simple. This is wind-down time, not planning time.`,
    icon: "🌙",
  },
  {
    label: "Schedule Day",
    actionType: "schedule",
    prompt: `I want you to schedule my entire day. Please:

1. First, ask me what time I woke up (or plan to wake up) and what time I want to be asleep by tonight.

2. Then check my Google Calendar for any existing events/meetings today.

3. Read all my context files (goals, current state, timeline, sleep protocol, recent updates) to understand my priorities, health constraints, and what I should focus on.

4. Create a complete day schedule that:
   - Works around my existing calendar events
   - Incorporates my sleep protocol (morning sunlight, afternoon light, evening wind-down)
   - Includes medication timing
   - Balances work tasks with rest (respecting my limited cognitive capacity)
   - Prioritizes according to my goals hierarchy (sleep > self-care > career tasks > rest)

5. Present the proposed schedule in a clear visual format, with EACH time block including:
   - What to do
   - WHY (medical rationale, goal alignment, or strategic reason)
   - Any relevant links or context

6. Let me review and refine the schedule with you until I'm happy with it.

7. Once I confirm, create all the events in my Google Calendar with the detailed descriptions.

IMPORTANT - ADAPTIVE SCHEDULING:
After the schedule is set, stay responsive throughout the day. When I tell you:
- "I just finished X" → Mark it done, adjust remaining times if needed
- "I'm running late" or "I slept in" → Shift the remaining schedule forward
- "I need to add X" → Reschedule to fit the new item
- "I skipped X" or "I can't do X" → Remove it and reallocate that time
- "I'm too tired for X" → Swap it for a lower-energy activity

Always show me the updated schedule and offer to update my calendar.

SPEED NOTE: I'm waiting for this response, so work efficiently. Read files in parallel where possible. Start with a quick question about my wake/sleep times before doing heavy processing.

Let's start - what times should we work with today?`,
    icon: "📆",
  },
  {
    label: "Anime",
    actionType: "anime_recommendation",
    prompt: "", // Handled specially - triggers anime mode
    icon: "📺",
  },
];

export function QuickActions({ onAction, disabled }: QuickActionsProps) {
  return (
    <div className="flex-shrink-0 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800">
      <div className="relative">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-gray-50 dark:from-gray-900/50 to-transparent z-10 pointer-events-none" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-gray-50 dark:from-gray-900/50 to-transparent z-10 pointer-events-none" />

        <div className="flex gap-2 overflow-x-auto pb-1 px-4 scrollbar-hide">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => onAction(action.prompt, action.actionType)}
              disabled={disabled}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
