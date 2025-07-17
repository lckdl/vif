import { TodoItem } from ".";
import { Model } from "@/lib/models";

export type DetermineActionResponse = {
    actions: Array<{
        action: "add" | "delete" | "mark" | "sort" | "edit" | "clear" | "filter";
        text?: string;
        todoId?: string;
        emoji?: string;
        targetDate?: string;
        time?: string; // Optional time in HH:mm format
        sortBy?: "newest" | "oldest" | "alphabetical" | "completed";
        status?: "complete" | "incomplete";
        listToClear?: "all" | "completed" | "incomplete";
        startDate?: string;
        endDate?: string;
    }>;
};

export type DetermineActionFn = (
    text: string,
    emoji?: string,
    todos?: TodoItem[],
    model?: Model,
    timezone?: string,
    dateRange?: { startDate: Date; endDate: Date }
) => Promise<DetermineActionResponse>; 