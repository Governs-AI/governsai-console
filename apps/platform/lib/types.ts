export interface DashboardData {
    streakDays: number;
    kpis: {
        matches: KPI;
        applications: KPI;
        interviews: KPI;
        aiScore: KPI;
    };
    topJobs: JobCard[];
    xp: { total: number; weekly: number; };
}

export interface KPI {
    value: number;
    target: number;
}

export interface JobCard {
    id: string;
    companyLogoUrl: string;
    title: string;
    company: string;
    location: string;
    compRange: string;
    postedAgo: string;
    matchScore: number; // 0–1
    tags: string[];
    mlHighlights: string[];
}

export interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    level: number;
    xp: number;
    streakDays: number;
}

export interface LiveActivityEvent {
    id: string;
    type: 'application_submitted' | 'interview_invite' | 'user_levelup' | 'job_match' | 'streak_milestone';
    title: string;
    description: string;
    timestamp: Date;
    color: string;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    name: string;
    avatar: string;
    level: number;
    weeklyXp: number;
    topSkill: string;
    topSkillIcon: string;
}

export interface MysteryBoxReward {
    type: 'resume_review' | 'interview_flashcard' | 'premium_trial' | 'xp_boost';
    title: string;
    description: string;
    value: number;
}

export interface XPEvent {
    type: 'view_job' | 'apply_job' | 'interview_scheduled' | 'resume_update' | 'streak_milestone';
    points: number;
    description: string;
    timestamp: Date;
}

export interface Goal {
    id: string;
    type: 'weekly_applications' | 'weekly_interviews' | 'weekly_matches' | 'streak_days';
    target: number;
    current: number;
    deadline: Date;
    reward: MysteryBoxReward;
}

export interface Notification {
    id: string;
    type: 'success' | 'warning' | 'info' | 'error';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    action?: {
        label: string;
        url: string;
    };
} 