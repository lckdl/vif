/**
 * 批量任务处理器 - 优雅简洁的实现
 */

export interface BatchTaskPattern {
    type: 'daily' | 'weekly' | 'monthly';
    days?: number[]; // 0=Monday, 1=Tuesday, etc.
    task: string;
    emoji?: string;
  }
  
  export interface BatchTaskResult {
    tasks: Array<{
      text: string;
      date: string;
      emoji?: string;
    }>;
  }
  
  // 星期映射
  const WEEKDAY_MAP: Record<string, number> = {
    'monday': 0, 'mon': 0,
    'tuesday': 1, 'tue': 1, 'tues': 1,
    'wednesday': 2, 'wed': 2,
    'thursday': 3, 'thu': 3, 'thurs': 3,
    'friday': 4, 'fri': 4,
    'saturday': 5, 'sat': 5,
    'sunday': 6, 'sun': 6
  };
  
  // 解析批量任务模式
  export function parseBatchPattern(input: string): BatchTaskPattern | null {
    const lowerInput = input.toLowerCase();
    
    // 每日任务
    if (lowerInput.includes('every day') || lowerInput.includes('daily')) {
      const task = extractTaskText(input, ['every day', 'daily']);
      return { type: 'daily', task };
    }
    
    // 月末任务
    if (lowerInput.includes('end of month')) {
      const task = extractTaskText(input, ['end of month']);
      return { type: 'monthly', task };
    }
    
    // 特定星期任务
    const weekdays = Object.keys(WEEKDAY_MAP);
    const foundDays: number[] = [];
    
    weekdays.forEach(day => {
      if (lowerInput.includes(day)) {
        foundDays.push(WEEKDAY_MAP[day]);
      }
    });
    
    if (foundDays.length > 0) {
      const task = extractTaskText(input, weekdays);
      return { type: 'weekly', days: foundDays, task };
    }
    
    return null;
  }
  
  // 提取任务文本
  function extractTaskText(input: string, keywords: string[]): string {
    let task = input.toLowerCase();
    
    // 移除关键词
    keywords.forEach(keyword => {
      task = task.replace(new RegExp(keyword, 'gi'), '');
    });
    
    // 清理和格式化
    task = task
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^do\s+/i, '') // 移除开头的 "do"
      .replace(/^to\s+/i, '') // 移除开头的 "to"
      .replace(/^the\s+/i, ''); // 移除开头的 "the"
    
    return task;
  }
  
  // 生成日期
  export function generateDates(pattern: BatchTaskPattern, timezone: string = 'UTC'): string[] {
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    
    switch (pattern.type) {
      case 'daily':
        return generateDailyDates(currentWeekStart);
      
      case 'weekly':
        return generateWeeklyDates(currentWeekStart, pattern.days!);
      
      case 'monthly':
        return [getMonthEndDate(now)];
      
      default:
        return [];
    }
  }
  
  // 获取本周开始日期（周一）
  function getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一
    return new Date(date.setDate(diff));
  }
  
  // 生成每日日期
  function generateDailyDates(weekStart: Date): string[] {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }
  
  // 生成特定星期日期
  function generateWeeklyDates(weekStart: Date, days: number[]): string[] {
    return days.map(day => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + day);
      return date.toISOString().split('T')[0];
    });
  }
  
  // 获取月末日期
  function getMonthEndDate(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const lastDay = new Date(year, month, 0);
    return lastDay.toISOString().split('T')[0];
  }
  
  // 主函数：处理批量任务
  export function processBatchTasks(input: string, emoji?: string): BatchTaskResult | null {
    const pattern = parseBatchPattern(input);
    if (!pattern) return null;
    
    const dates = generateDates(pattern);
    const tasks = dates.map(date => ({
      text: pattern.task,
      date,
      emoji: emoji || getDefaultEmoji(pattern.task)
    }));
    
    return { tasks };
  }
  
  // 获取默认表情符号
  function getDefaultEmoji(task: string): string {
    const emojiMap: Record<string, string> = {
      'exercise': '💪',
      'workout': '🏋️',
      'yoga': '🧘',
      'meditation': '🧘‍♀️',
      'reading': '📚',
      'study': '📖',
      'summary': '📝',
      'review': '📋',
      'planning': '📅',
      'cleaning': '🧹',
      'cooking': '👨‍🍳',
      'shopping': '🛒'
    };
    
    for (const [keyword, emoji] of Object.entries(emojiMap)) {
      if (task.includes(keyword)) {
        return emoji;
      }
    }
    
    return '📋'; // 默认表情符号
  } 