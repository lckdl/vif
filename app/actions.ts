"use server";

import { generateObject, experimental_transcribe as transcribe } from "ai";
import { z } from "zod";
import { vif } from "@/lib/models";
import { elevenlabs } from '@ai-sdk/elevenlabs';
import { DetermineActionFn } from "@/types/actions";
import { processBatchTasks } from "@/lib/utils/batch-tasks";

export const determineAction: DetermineActionFn = async (text, emoji, todos, model = "vif-default", timezone = "UTC", dateRange?: { startDate: Date; endDate: Date }) => {
    console.log("Determining action...");
    console.log(text, emoji, todos);
    console.log("Model:", model);
    console.log("Timezone:", timezone);

    // Create dates in the user's timezone using a more reliable method
    function getDateInTimezone(timezone: string) {
        // Get current date/time string in the user's timezone
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };

        // Format date in timezone
        const dateTimeString = new Intl.DateTimeFormat('en-US', options).format(now);

        // Parse components from formatted string (formats like "04/10/2024, 00:30:00")
        const [datePart] = dateTimeString.split(', ');
        const [month, day, year] = datePart.split('/').map(num => parseInt(num, 10));

        // Create a date string in YYYY-MM-DD format
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    // Get today and tomorrow in timezone
    const todayStr = getDateInTimezone(timezone);

    // For tomorrow, we need to add one day
    const todayDate = new Date(todayStr);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

    console.log("Today in timezone:", todayStr);
    console.log("Tomorrow in timezone:", tomorrowStr);

    const prompt = `
        Today's date is: ${todayStr} (Timezone: ${timezone})
        The user has entered the following text: ${text}
        ${emoji ? `The user has also entered the following emoji: ${emoji}` : ""}
        Determine the action or multiple actions to take based on the given context.
        Return an array of actions.

        Don't make assumptions about the user's intent, the todo list is very important to understand the user's intent.
        Go through the todo list and make sure to understand the user's intent based on the todo list.
        All the text should be in lowercase!!
        Never add existing todos to the list, only add new todos, but perform actions on existing todos.
        Be very mindful of the user's intent, they may want to add a todo, but they may also want to delete a todo, mark a todo as complete, or edit a todo.
        Take some humor into account, the user may be joking around or being sarcastic.

        The user can specify dates in their commands like:
        - "add buy groceries today" -> targetDate: ${todayStr}
        - "add buy groceries tomorrow" -> targetDate: ${tomorrowStr}
        - "add meeting with John next monday"
        - "add dentist appointment on friday"
        - "add vacation planning for next week"
        - "add homework due in 3 days"
        
        Extract the date from these commands and set it accordingly. If no date is specified, use the currently selected date.
        Parse relative dates like "today", "tomorrow", "next week", "in 3 days", etc.
        For specific days like "monday", "tuesday", etc., use the next occurrence of that day.
        Always return dates in YYYY-MM-DD format.

        NEW: The user can also create batch recurring tasks with patterns like:
        - "every day this week do exercise" -> Create 7 tasks for each day of this week with the same task
        - "monday wednesday friday do yoga" -> Create 3 tasks for Monday, Wednesday, Friday of this week
        - "end of month do summary" -> Create a task for the last day of current month
        - "mon wed fri do meditation" -> Create 3 tasks for Monday, Wednesday, Friday of this week
        - "daily reading" -> Create 7 tasks for each day of this week
        - "tue thu sat do workout" -> Create 3 tasks for Tuesday, Thursday, Saturday of this week
        - "monday wednesday friday exercise" -> Create 3 tasks for Monday, Wednesday, Friday of this week
        - "tuesday thursday yoga" -> Create 2 tasks for Tuesday, Thursday of this week
        
        For batch recurring tasks, return multiple "add" actions with different targetDate values.
        Calculate the correct dates based on the current week and the specified days.
        For "end of month", calculate the last day of the current month.
        For "every day" or "daily", create tasks for all 7 days of the current week (Monday to Sunday).
        
        When you see patterns like "monday wednesday friday", "tuesday thursday saturday", etc., extract the task text and create separate actions for each specified day.
        The task text should be the part after the time specification (e.g., "do exercise", "do yoga", "do meditation").

        The user can also specify date ranges in their commands:
        - "show me tasks from last week" -> action: "filter", startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD"
        - "what do I have this week?" -> action: "filter", startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD"
        - "show all todos from monday to friday" -> action: "filter", startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD"
        - "display tasks from march 1 to march 15" -> action: "filter", startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD"
        - "show me everything from yesterday to tomorrow" -> action: "filter", startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD"
        
        When the user asks for date range filtering, use the "filter" action with startDate and endDate.
        ${dateRange ? `Current date range: ${dateRange.startDate.toISOString().split('T')[0]} to ${dateRange.endDate.toISOString().split('T')[0]}` : ""}

        The user can specify time in their commands in various natural ways:
        Examples with time:
        - "meeting with John at 3pm tomorrow" -> text: "meeting with John", time: "15:00", targetDate: ${tomorrowStr}
        - "dentist appointment at 2:30" -> text: "dentist appointment", time: "14:30", targetDate: ${todayStr}
        - "call mom at 9am" -> text: "call mom", time: "09:00"
        - "lunch with team at 12:15pm" -> text: "lunch with team", time: "12:15"
        - "daily standup at 10" -> text: "daily standup", time: "10:00"
        - "gym session 7am tomorrow" -> text: "gym session", time: "07:00", targetDate: ${tomorrowStr}
        - "movie night at 8:30pm friday" -> text: "movie night", time: "20:30"
        - "coffee break 3:30" -> text: "coffee break", time: "15:30"
        
        Extract time in 24-hour format (HH:mm). Support various time formats:
        - "3pm" -> "15:00"
        - "3:30pm" -> "15:30"
        - "15:00" -> "15:00"
        - "9" -> "09:00"
        - "9:15am" -> "09:15"
        - "12" -> "12:00"
        - "12:30pm" -> "12:30"
        
        If no time is specified, omit the time field.
        Always extract the actual task text separately from the time and date information.
        Keep emojis relevant to both the task and time (e.g., ⏰, 🕐, or 📅 for time-sensitive tasks).

${todos ? `<todo_list>
${todos?.map(todo => `- ${todo.id}: ${todo.text} (${todo.emoji}) - Date: ${todo.date.toISOString().split('T')[0]}`).join("\n")}
</todo_list>` : ""}

        The action should be one of the following: ${["add", "delete", "mark", "sort", "edit", "clear", "filter"].join(", ")}
        - If the action is "add", the text, emoji, and targetDate should be included.
        - If the action is "delete", the todoId should be included.
        - If the action is "mark", the todoId should be included and the status should be "complete" or "incomplete".
        - If the action is "sort", the sortBy should be included.
        - If the action is "edit", both the todoId (to identify the todo to edit) and the text (the new content) should be included.
        - If the action is "clear", the user wants to clear the list of todos with the given listToClear(all, completed, incomplete).
        - If the action is "filter", the user wants to filter todos by date range with startDate and endDate.
        
        For the add action, the text should be in the future tense. like "buy groceries", "make a post with @theo", "go for violin lesson"
        ${emoji ? `Change the emoji to a more appropriate based on the text. The current emoji is: ${emoji}` : ""}
     
        Some queries will be ambiguous stating the tense of the text, which will allow you to infer the correct action to take on the todo list. 
        The add requests will mostly likey to be in the future tense, while the complete requests will be in the past tense.
        The emojis sent by the user should be prioritized and not changed unless they don't match the todo's intent.
        The todo list is very important to understand the user's intent.
        
        IMPORTANT: You must always use the todo's ID for the actions delete, mark, and edit. Do not use the text to identify todos.
        
        CRITICAL: When marking tasks as complete, you must match by BOTH text content AND date. If the user says "today [task] completed", only mark the task that matches both the text AND is scheduled for today (${todayStr}). Do NOT mark all tasks with similar text across different dates.
        
        IMPORTANT: For batch completion requests like this week's [task] completed, you should mark ALL tasks with that text that fall within the current week. Return multiple "mark" actions for each matching task.
        
        For recurring tasks (like daily pushups), when the user says "today [task] completed", only mark the task for today's date. Do NOT mark tasks for other days even if they have the same text.
        
        Examples of correct behavior:
        - User has "do pushups" tasks for Monday, Tuesday, Wednesday, Thursday, Friday
        - User says "today pushups completed" on Tuesday
        - Only mark the Tuesday pushups task as complete
        - Do NOT mark Monday, Wednesday, Thursday, or Friday pushups tasks
        
        Batch completion examples:
        - User has "do pushups" tasks for Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
        - User says this week's pushups completed
        - Mark ALL pushups tasks for the current week as complete
        - Return multiple "mark" actions, one for each task ID
        
        When matching tasks for completion:
        1. First, identify the task text from the user's request
        2. For "today" requests: find the task with that text that is scheduled for today (${todayStr})
        3. For "this week" requests: find ALL tasks with that text that fall within the current week
        4. Only mark the matching task(s) as complete
        5. If no task matches the criteria, do not take any action
        
        Example: "todo id: '123abc', todo text: 'buy groceries', date: '${todayStr}', user request: 'bought groceries today', action: 'mark', todoId: '123abc', status: 'complete'"
        Example: "todo id: '456def', todo text: 'make a post with @theo', date: '${todayStr}', user request: 'i made a post with @theo today', action: 'mark', todoId: '456def', status: 'complete'"
        Example: "todo id: '789ghi', todo text: 'do pushups', date: '${todayStr}', user request: 'today pushups completed', action: 'mark', todoId: '789ghi', status: 'complete'"
        Example: "todo id: '012jkl', todo text: 'do pushups', date: '${tomorrowStr}', user request: 'today pushups completed', action: 'mark' - NO ACTION, because the pushups task is for tomorrow, not today"
        
        Batch completion examples:
        Example: "user request: '本周的俯卧撑完成了', actions: [
          {action: 'mark', todoId: 'abc123', status: 'complete'},
          {action: 'mark', todoId: 'def456', status: 'complete'},
          {action: 'mark', todoId: 'ghi789', status: 'complete'},
          {action: 'mark', todoId: 'jkl012', status: 'complete'},
          {action: 'mark', todoId: 'mno345', status: 'complete'},
          {action: 'mark', todoId: 'pqr678', status: 'complete'},
          {action: 'mark', todoId: 'stu901', status: 'complete'}
        ]"
        Example: "request: 'buy groceries today', action: 'add', text: 'buy groceries', emoji: '🛒', targetDate: '${todayStr}'"
        Example: "request: 'buy groceries tomorrow', action: 'add', text: 'buy groceries', emoji: '🛒', targetDate: '${tomorrowStr}'"

        The edit request will mostly be ambiguous, so make the edit as close to the original as possible to maintain the user's context with the todo to edit.
        Some word could be incomplete, like "meet" instead of "meeting", make sure to edit the todo based on the todo list since the todo already exists just needs a rewrite.

        Example edit requests:
        "todo id: '789ghi', original text: 'meeting w/ John', user request: 'i meant meet Jane', action: 'edit', todoId: '789ghi', text: 'meeting w/ Jane'"
        "todo id: '012jkl', original text: 'buy groceries', user request: 'i meant buy flowers', action: 'edit', todoId: '012jkl', text: 'buy flowers'"
        "todo id: '345mno', original text: 'go for violin lesson', user request: 'i meant go for a walk', action: 'edit', todoId: '345mno', text: 'go for a walk'"

        Example clear requests:
        "user request: 'clear all todos', action: 'clear', listToClear: 'all'"
        "user request: 'clear my completed tasks', action: 'clear', listToClear: 'completed'"
        "user request: 'remove all incomplete items', action: 'clear', listToClear: 'incomplete'"
        "user request: 'start fresh', action: 'clear', listToClear: 'all'"
        "user request: 'delete finished tasks', action: 'clear', listToClear: 'completed'"
        "user request: 'clean up my list', action: 'clear', listToClear: 'all'"
    `;

    console.log("prompt", prompt);
    
    // 检查是否为批量任务
    const batchResult = processBatchTasks(text, emoji);
    if (batchResult) {
      console.log("Batch tasks detected:", batchResult);
      return {
        actions: batchResult.tasks.map(task => ({
          action: "add" as const,
          text: task.text,
          emoji: task.emoji,
          targetDate: task.date
        }))
      };
    }
    
    const startTime = Date.now();
    const { object: action, usage } = await generateObject({
        model: vif.languageModel(model),
        temperature: 0,
        providerOptions: {
            groq: {
                "service_tier": "auto",
            }
        },
        schema: z.object({
            actions: z.array(z.object({
                action: z.enum(["add", "delete", "mark", "sort", "edit", "clear", "filter"]).describe("The action to take"),
                text: z.string().describe("The text of the todo item.").optional(),
                todoId: z.string().describe("The id of the todo item to act upon").optional(),
                emoji: z.string().describe("The emoji of the todo item").optional(),
                targetDate: z.string().describe("The target date for the todo item in YYYY-MM-DD format").optional(),
                time: z.string().describe("The time for the todo item in HH:mm format (24-hour)").optional(),
                sortBy: z.enum(
                    ["newest", "oldest", "alphabetical", "completed"]
                ).describe("The sort order").optional(),
                status: z.enum(["complete", "incomplete"]).describe("The status of the todo item. to be used for the mark action").optional(),
                listToClear: z.enum(["all", "completed", "incomplete"]).describe("The list to clear").optional(),
                startDate: z.string().describe("The start date for filtering in YYYY-MM-DD format").optional(),
                endDate: z.string().describe("The end date for filtering in YYYY-MM-DD format").optional(),
            })),
        }),
        prompt,
    });
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`Time taken: ${duration}ms`);
    console.log(action);
    console.log("usage", usage);
    return action;
}

export async function convertSpeechToText(audioFile: any) {
    "use server";

    if (!audioFile) {
        throw new Error("No audio file provided");
    }

    console.log("Processing audio file:", {
        type: audioFile.type,
        size: audioFile.size,
        name: audioFile.name || "unnamed"
    });

    const { text } = await transcribe({
        model: elevenlabs.transcription("scribe_v1"),
        audio: await audioFile.arrayBuffer(),
    });

    console.log("Transcribed text:", text);
    return text;
}
