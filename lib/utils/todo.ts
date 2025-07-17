import { TodoItem } from "@/types";
import { format } from "date-fns";

// Helper function to ensure Date objects are properly serialized
export const serializeTodo = (todo: TodoItem): TodoItem => {
  // If date is already a Date object, return the todo as is
  if (todo.date instanceof Date) {
    return todo;
  }

  // If date is a string, convert it to a Date object
  return {
    ...todo,
    date: new Date(todo.date)
  };
};

// Format date for display
export const formatDate = (date: Date) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${format(date, "EEE, d MMM")}`;
  } else {
    return format(date, "EEE, d MMM");
  }
};

// Filter todos by date
export const filterTodosByDate = (todos: TodoItem[], selectedDate: Date) => {
  return todos.filter(
    (todo) => format(todo.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
  );
};

// Filter todos by date range
export const filterTodosByDateRange = (todos: TodoItem[], startDate: Date, endDate: Date) => {
  return todos.filter((todo) => {
    const todoDate = new Date(todo.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Reset time to start of day for comparison
    todoDate.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return todoDate >= start && todoDate <= end;
  });
};

// Sort todos by criteria
export const sortTodos = (todos: TodoItem[], sortBy: string) => {
  return [...todos].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return b.id.localeCompare(a.id);
      case "oldest":
        return a.id.localeCompare(b.id);
      case "alphabetical":
        return a.text.localeCompare(b.text);
      case "completed":
        return Number(b.completed) - Number(a.completed);
      default:
        return 0;
    }
  });
};

// Calculate progress
export const calculateProgress = (todos: TodoItem[]) => {
  const completedCount = todos.filter((todo) => todo.completed).length;
  return todos.length > 0
    ? Math.round((completedCount / todos.length) * 100)
    : 0;
}; 