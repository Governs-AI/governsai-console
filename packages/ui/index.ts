// Dashboard Layout Components
export { DashboardLayout } from './src/dashboard-layout'
export type { LiveActivityEvent } from './src/dashboard-layout'
export { ProgressRing } from './src/progress-ring'
export { StreakBadge } from './src/streak-badge'
export { LiveActivityFeed } from './src/live-activity-feed'
export { XPProgress } from './src/xp-progress'


// Base UI Components
export { Button } from './src/button'
export { Card, CardContent, CardHeader, CardTitle, CardDescription } from './src/card'
export { Badge } from './src/badge'
export { Avatar, AvatarFallback, AvatarImage } from './src/avatar'
export { Input } from './src/input'
export { Label } from './src/label'
export { Textarea } from './src/textarea'
export { Progress } from './src/progress'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './src/tooltip'
export {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './src/dropdown-menu'
export {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogFooter,
    DialogOverlay,
    DialogPortal,
} from './src/dialog'

// Payment Components
export { X402PaymentModal } from './src/x402-payment-modal'
export { DodoCheckout } from './src/dodo-checkout'
export { PaymentStatus, PaymentStatusInline } from './src/payment-status'
export { usePaymentStatus, usePaymentStream } from './src/use-payment-status'

// Pricing Components
export { PricingTable, CompactPricingTable } from './src/pricing-table'
export { PublicPricing } from './src/public-pricing'

// Quota Components
export {
    QuotaPill,
    InterviewQuotaPill,
    VideoQuotaPill,
    ResumeExportQuotaPill,
    AutoApplyQuotaPill,
    JobMatchesQuotaPill,
    StoredResumesQuotaPill,
    SavedJobsQuotaPill
} from './src/quota-pill'

// Paywall Components
export {
    Paywall,
    InterviewPaywall,
    VideoPaywall,
    ResumeExportPaywall,
    AutoApplyPaywall
} from './src/paywall'