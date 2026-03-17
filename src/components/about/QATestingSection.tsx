import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Bug, Download, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useRBACContext } from '@/contexts/RBACContext';

interface TestCase {
  id: string;
  title: string;
  steps: string[];
  expected: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface TestCategory {
  name: string;
  tests: TestCase[];
}

const qaCategories: TestCategory[] = [
  {
    name: 'Authentication & Security',
    tests: [
      { id: 'AUTH-001', title: 'Email signup with valid credentials', steps: ['Go to /auth', 'Enter valid email and strong password', 'Submit signup form', 'Check for confirmation email prompt'], expected: 'User sees email confirmation message. No auto-login until verified.', priority: 'critical' },
      { id: 'AUTH-002', title: 'Login with verified account', steps: ['Go to /auth', 'Enter verified email and password', 'Submit login form'], expected: 'User is redirected to /app with correct role loaded.', priority: 'critical' },
      { id: 'AUTH-003', title: 'Login with unverified email', steps: ['Sign up with a new email', 'Attempt to login without confirming', 'Check error message'], expected: 'Error message indicating email not verified. No access granted.', priority: 'critical' },
      { id: 'AUTH-004', title: 'Password reset flow', steps: ['Click "Forgot Password"', 'Enter email', 'Check for reset email', 'Follow reset link to /reset-password', 'Enter new password'], expected: 'Password is updated. User can login with new password.', priority: 'high' },
      { id: 'AUTH-005', title: 'Strong password enforcement', steps: ['Try signup with "abc" (too short)', 'Try "abcdefgh" (no uppercase/number/special)', 'Try "Abcdefg1!" (valid)'], expected: 'First two are rejected with clear error. Third succeeds.', priority: 'high' },
      { id: 'AUTH-006', title: 'Session persistence', steps: ['Login', 'Close browser tab', 'Reopen the app URL'], expected: 'User remains authenticated.', priority: 'high' },
      { id: 'AUTH-007', title: 'Logout clears session', steps: ['Login', 'Click logout from settings/sidebar', 'Try navigating to /app'], expected: 'User is redirected to /auth or /landing. No cached data visible.', priority: 'high' },
      { id: 'AUTH-008', title: 'RLS prevents cross-user data access', steps: ['Login as User A', 'Note a resource ID', 'Login as User B', 'Try to access User A\'s resource via API'], expected: 'Access denied. No data returned.', priority: 'critical' },
    ],
  },
  {
    name: 'RBAC & Permissions',
    tests: [
      { id: 'RBAC-001', title: 'Default role assignment', steps: ['Create a new account', 'Check user_roles table or role badge'], expected: 'New user has "student" role.', priority: 'critical' },
      { id: 'RBAC-002', title: 'Platform admin role badge', steps: ['Login as platform admin', 'Check sidebar and profile for role badge'], expected: 'Platform Admin badge is visible with correct color.', priority: 'medium' },
      { id: 'RBAC-003', title: 'Student cannot access admin views', steps: ['Login as student', 'Try navigating to admin features (Schools, Role Management, Analytics)'], expected: 'Admin sidebar items not visible. Direct navigation blocked.', priority: 'critical' },
      { id: 'RBAC-004', title: 'School admin scoped to own school', steps: ['Login as school admin', 'Try to view/edit another school\'s data'], expected: 'Only own school data is visible and editable.', priority: 'critical' },
      { id: 'RBAC-005', title: 'Platform admin cannot be demoted', steps: ['Login as platform admin', 'Try to change own role to student via Role Management'], expected: 'Operation fails. Platform admin role is protected.', priority: 'critical' },
      { id: 'RBAC-006', title: 'PermissionGuard disables restricted actions', steps: ['Login as student', 'Navigate to a feature with admin-only actions', 'Check if buttons are disabled with tooltip'], expected: 'Restricted buttons appear disabled with "No permission" tooltip.', priority: 'high' },
      { id: 'RBAC-007', title: 'Teacher can mark attendance', steps: ['Login as teacher with school', 'Navigate to Attendance', 'Mark a student present/absent'], expected: 'Attendance is saved. Teacher can view their school\'s records.', priority: 'high' },
    ],
  },
  {
    name: 'Timetable',
    tests: [
      { id: 'TT-001', title: 'Create a timetable', steps: ['Navigate to Timetable', 'Click "Add Timetable" or create default', 'Add periods with subjects and times'], expected: 'Timetable is created and displayed correctly.', priority: 'high' },
      { id: 'TT-002', title: 'Edit existing periods', steps: ['Open a timetable', 'Click on a period cell', 'Change subject/time', 'Save'], expected: 'Changes persist after refresh.', priority: 'high' },
      { id: 'TT-003', title: 'Share timetable via email', steps: ['Click "Share"', 'Enter another user\'s email', 'Submit invitation'], expected: 'Invitation appears in recipient\'s notification hub. Can accept/decline.', priority: 'high' },
      { id: 'TT-004', title: 'Accept shared timetable', steps: ['Login as invited user', 'Navigate to notifications/invitations', 'Accept the timetable share'], expected: 'Shared timetable appears in recipient\'s timetable list (read-only).', priority: 'high' },
      { id: 'TT-005', title: 'Today\'s schedule widget accuracy', steps: ['Create timetable with today\'s day populated', 'Check dashboard widget'], expected: 'Widget shows current day\'s classes in correct order.', priority: 'medium' },
    ],
  },
  {
    name: 'Resources & AI Tools',
    tests: [
      { id: 'RES-001', title: 'Add a link resource', steps: ['Navigate to Resources', 'Click "Add Resource"', 'Select type: Link', 'Enter URL, title, subject', 'Save'], expected: 'Resource appears in list with correct metadata.', priority: 'high' },
      { id: 'RES-002', title: 'Upload a PDF resource', steps: ['Click "Add Resource"', 'Select type: PDF', 'Upload a PDF file', 'Fill in details', 'Save'], expected: 'PDF is uploaded to storage. File is viewable via in-app PDF viewer.', priority: 'high' },
      { id: 'RES-003', title: 'Favorite/unfavorite a resource', steps: ['Click the heart/star icon on a resource', 'Filter by favorites'], expected: 'Resource toggles favorite state. Filter shows only favorites.', priority: 'medium' },
      { id: 'RES-004', title: 'Filter resources by subject/category', steps: ['Add resources with different subjects', 'Use the filter bar'], expected: 'Only matching resources are displayed.', priority: 'medium' },
      { id: 'RES-005', title: 'AI Quiz generation', steps: ['Open a resource with content', 'Click AI Tools > Quiz', 'Generate quiz'], expected: 'Quiz dialog opens with generated questions. Answers can be checked.', priority: 'high' },
      { id: 'RES-006', title: 'AI Flashcards generation', steps: ['Open a resource', 'Click AI Tools > Flashcards'], expected: 'Flashcards are generated and can be flipped.', priority: 'high' },
      { id: 'RES-007', title: 'AI Mind Map generation', steps: ['Open a resource', 'Click AI Tools > Mind Map'], expected: 'Mind map visualization renders with resource content.', priority: 'medium' },
      { id: 'RES-008', title: 'Audio Overview (single voice)', steps: ['Open a resource', 'Click AI Tools > Audio Overview', 'Select Normal mode', 'Play audio'], expected: 'Audio plays with natural-sounding voice. Controls work (play/pause/stop).', priority: 'high' },
      { id: 'RES-009', title: 'Podcast mode (dual voices)', steps: ['Open a resource', 'Click Audio Overview', 'Select Podcast mode', 'Play'], expected: 'Two distinct voices alternate. Speaker indicators update correctly.', priority: 'high' },
      { id: 'RES-010', title: 'CoCo Chat (AI study assistant)', steps: ['Open a resource', 'Click CoCo Chat', 'Ask a question about the resource'], expected: 'AI responds with context-aware answer based on the resource content.', priority: 'high' },
      { id: 'RES-011', title: 'Slide Deck generation', steps: ['Open a resource', 'Click AI Tools > Slide Deck'], expected: 'Slides are generated with content from the resource.', priority: 'medium' },
      { id: 'RES-012', title: 'Delete a resource', steps: ['Click delete on a resource', 'Confirm deletion'], expected: 'Resource is removed from list and storage.', priority: 'high' },
    ],
  },
  {
    name: 'Groups & Messaging',
    tests: [
      { id: 'GRP-001', title: 'Create a group', steps: ['Navigate to Groups', 'Click "Create Group"', 'Enter name and description', 'Submit'], expected: 'Group is created. Creator is auto-added as admin.', priority: 'high' },
      { id: 'GRP-002', title: 'Invite user to group', steps: ['Open group settings', 'Click "Invite"', 'Select a user', 'Send invitation'], expected: 'Invitation appears in target user\'s notifications.', priority: 'high' },
      { id: 'GRP-003', title: 'Accept group invitation', steps: ['Login as invited user', 'Navigate to invitations', 'Accept the group invite'], expected: 'User is added to group. Can see messages.', priority: 'high' },
      { id: 'GRP-004', title: 'Send a text message', steps: ['Open a group', 'Type a message', 'Press send'], expected: 'Message appears in chat. Other members see it in real-time.', priority: 'critical' },
      { id: 'GRP-005', title: 'Send a file attachment', steps: ['Open a group', 'Click attachment icon', 'Select a file', 'Send'], expected: 'File is uploaded and visible as a downloadable attachment.', priority: 'high' },
      { id: 'GRP-006', title: 'Voice message recording', steps: ['Open a group', 'Click mic icon', 'Record audio', 'Send'], expected: 'Voice message is sent with playback controls and duration.', priority: 'high' },
      { id: 'GRP-007', title: 'Reply to a message', steps: ['Long-press/hover a message', 'Click Reply', 'Type reply', 'Send'], expected: 'Reply shows quoted original message above the response.', priority: 'medium' },
      { id: 'GRP-008', title: 'Pin a message', steps: ['Open message options', 'Click Pin', 'Check pinned messages panel'], expected: 'Message appears in pinned list.', priority: 'medium' },
      { id: 'GRP-009', title: 'Forward a message', steps: ['Open message options', 'Click Forward', 'Select target group/user'], expected: 'Message is forwarded to selected destination.', priority: 'medium' },
      { id: 'GRP-010', title: 'Typing indicator', steps: ['Open group as User A', 'Start typing as User B'], expected: 'User A sees typing indicator for User B.', priority: 'low' },
      { id: 'GRP-011', title: 'Read receipts', steps: ['Send a message as User A', 'Open chat as User B'], expected: 'User A sees read receipt update.', priority: 'low' },
    ],
  },
  {
    name: 'Direct Messages',
    tests: [
      { id: 'DM-001', title: 'Start a new conversation', steps: ['Navigate to Chat', 'Click "New Chat"', 'Search for a user', 'Send first message'], expected: 'Conversation is created. Both users can see messages.', priority: 'high' },
      { id: 'DM-002', title: 'Message editing', steps: ['Send a message', 'Click edit on your message', 'Change text', 'Save'], expected: 'Message is updated with "edited" indicator.', priority: 'medium' },
      { id: 'DM-003', title: 'Link preview in messages', steps: ['Send a message containing a URL'], expected: 'Link preview card appears with title, description, and image.', priority: 'low' },
    ],
  },
  {
    name: 'Calendar & Exams',
    tests: [
      { id: 'CAL-001', title: 'Create an exam entry', steps: ['Navigate to Calendar', 'Click "Add Exam"', 'Fill subject, date, time', 'Save'], expected: 'Exam appears on the calendar on the correct date.', priority: 'high' },
      { id: 'CAL-002', title: 'Create an exam period', steps: ['Click "Exam Periods"', 'Create a period with date range', 'Add exam days within the period'], expected: 'Period is created with all exam days visible.', priority: 'high' },
      { id: 'CAL-003', title: 'Month/Week view switching', steps: ['Toggle between month and week views'], expected: 'Calendar renders correctly in both views with exam data.', priority: 'medium' },
      { id: 'CAL-004', title: 'Delete an exam', steps: ['Click on an exam', 'Click delete', 'Confirm'], expected: 'Exam is removed from calendar.', priority: 'medium' },
    ],
  },
  {
    name: 'To-Do & Pomodoro',
    tests: [
      { id: 'TODO-001', title: 'Create a task', steps: ['Navigate to To-Do', 'Enter task title', 'Set priority', 'Save'], expected: 'Task appears in list with correct priority badge.', priority: 'high' },
      { id: 'TODO-002', title: 'Complete a task', steps: ['Click the checkbox on a task'], expected: 'Task is marked as complete. Counter updates.', priority: 'high' },
      { id: 'TODO-003', title: 'Delete a task', steps: ['Click delete on a task', 'Confirm'], expected: 'Task is removed.', priority: 'medium' },
      { id: 'POMO-001', title: 'Start a Pomodoro session', steps: ['Navigate to Pomodoro', 'Click Start'], expected: 'Timer counts down from configured duration.', priority: 'high' },
      { id: 'POMO-002', title: 'Break transition', steps: ['Complete a work session'], expected: 'Timer switches to break mode automatically.', priority: 'medium' },
    ],
  },
  {
    name: 'Transcription',
    tests: [
      { id: 'TR-001', title: 'Start live transcription', steps: ['Navigate to Transcribe', 'Click "Start Recording"', 'Speak into microphone'], expected: 'Speech is converted to text in real-time.', priority: 'high' },
      { id: 'TR-002', title: 'Save transcription as resource', steps: ['Complete a transcription', 'Click "Save to Resources"', 'Fill in title/subject'], expected: 'Transcription is saved as a resource with type "AI Transcription Notes".', priority: 'high' },
    ],
  },
  {
    name: 'Profile & Social',
    tests: [
      { id: 'PROF-001', title: 'Edit display name and bio', steps: ['Navigate to Profile > Edit', 'Change display name and bio', 'Save'], expected: 'Profile updates are reflected immediately.', priority: 'high' },
      { id: 'PROF-002', title: 'Upload avatar', steps: ['Go to Edit Profile', 'Click avatar area', 'Select an image', 'Save'], expected: 'Avatar is uploaded and visible across the app.', priority: 'high' },
      { id: 'PROF-003', title: 'Follow/Unfollow a user', steps: ['Visit another user\'s profile', 'Click Follow', 'Click Unfollow'], expected: 'Follow count updates. Activity feed reflects the action.', priority: 'medium' },
      { id: 'PROF-004', title: 'Privacy: private profile', steps: ['Set profile to private', 'View as another user'], expected: 'Private profile shows limited info to non-followers.', priority: 'medium' },
      { id: 'PROF-005', title: 'Create a post', steps: ['Navigate to Profile', 'Write a post', 'Optionally add images', 'Submit'], expected: 'Post appears in profile feed with correct timestamp.', priority: 'high' },
      { id: 'PROF-006', title: 'Like/unlike a post', steps: ['Click like on a post', 'Click again to unlike'], expected: 'Like count increments/decrements correctly.', priority: 'medium' },
    ],
  },
  {
    name: 'Admin: Schools & Classes',
    tests: [
      { id: 'ADM-001', title: 'Create a school (Platform Admin)', steps: ['Navigate to Schools Management', 'Click "Add School"', 'Fill in details', 'Save'], expected: 'School is created with unique code.', priority: 'high' },
      { id: 'ADM-002', title: 'Create a class', steps: ['Navigate to Classes', 'Click "Add Class"', 'Select school, grade, section', 'Save'], expected: 'Class is created and visible under the school.', priority: 'high' },
      { id: 'ADM-003', title: 'Enroll a student in a class', steps: ['Open a class', 'Add a student by email/search', 'Assign roll number'], expected: 'Student is enrolled and can see class data.', priority: 'high' },
      { id: 'ADM-004', title: 'Create announcement', steps: ['Navigate to Announcements', 'Click "New Announcement"', 'Set title, content, priority, audience', 'Publish'], expected: 'Announcement is visible to targeted audience.', priority: 'high' },
      { id: 'ADM-005', title: 'Feature toggles per school', steps: ['Open school settings', 'Toggle features on/off', 'Save'], expected: 'Disabled features are hidden for that school\'s users.', priority: 'medium' },
      { id: 'ADM-006', title: 'Provision a School Admin account', steps: ['As Platform Admin, create a new user via create-school-user', 'Assign school_admin role with school_id'], expected: 'New school admin can login and manage their school.', priority: 'critical' },
    ],
  },
  {
    name: 'Notifications & Real-Time',
    tests: [
      { id: 'NOTIF-001', title: 'Notification on group invite', steps: ['Invite a user to a group', 'Check target user\'s notifications'], expected: 'Notification appears with correct message and link.', priority: 'high' },
      { id: 'NOTIF-002', title: 'Browser push notifications', steps: ['Enable browser notifications in settings', 'Trigger a notification event'], expected: 'Browser notification appears even when tab is in background.', priority: 'medium' },
      { id: 'NOTIF-003', title: 'Mark notification as read', steps: ['Click on a notification', 'Check if it\'s marked as read'], expected: 'Unread count decrements. Notification style changes.', priority: 'medium' },
      { id: 'NOTIF-004', title: 'Real-time message delivery', steps: ['Open same group in two browser sessions', 'Send a message from one'], expected: 'Message appears in both sessions without refresh.', priority: 'high' },
    ],
  },
  {
    name: 'UI/UX & Responsiveness',
    tests: [
      { id: 'UI-001', title: 'Mobile sidebar toggle', steps: ['Open app on mobile viewport (< 768px)', 'Click hamburger menu', 'Navigate between views'], expected: 'Sidebar opens/closes correctly. Navigation works.', priority: 'high' },
      { id: 'UI-002', title: 'Theme switching (Light/Dark/Pastel)', steps: ['Open Settings > Theme', 'Switch between all themes'], expected: 'All views render correctly in each theme. No broken colors.', priority: 'medium' },
      { id: 'UI-003', title: 'Global search', steps: ['Click search icon', 'Type a feature name', 'Select result'], expected: 'Search dialog shows relevant features. Selecting navigates correctly.', priority: 'medium' },
      { id: 'UI-004', title: 'Error boundary recovery', steps: ['Trigger a component error (if possible)', 'Check error boundary UI'], expected: 'Error boundary catches the error. User can recover without blank screen.', priority: 'high' },
      { id: 'UI-005', title: 'Loading states', steps: ['Navigate between views', 'Observe loading indicators'], expected: 'Skeleton loaders or spinners appear during data fetching.', priority: 'medium' },
      { id: 'UI-006', title: 'Music player controls', steps: ['Open music player', 'Play/pause/change track', 'Adjust volume'], expected: 'All controls work. Audio plays correctly.', priority: 'low' },
    ],
  },
  {
    name: 'SSO Integration',
    tests: [
      { id: 'SSO-001', title: 'SSO token generation', steps: ['Login to EDAS', 'Navigate to a module using SSO (Transcriber)', 'Check token is generated'], expected: 'Token is created with 5-minute expiry. User lands authenticated in target app.', priority: 'high' },
      { id: 'SSO-002', title: 'Expired SSO token rejection', steps: ['Generate an SSO token', 'Wait 5+ minutes', 'Try to use the token'], expected: 'Token is rejected. User prompted to re-authenticate.', priority: 'high' },
    ],
  },
];

const priorityConfig = {
  critical: { label: 'Critical', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  high: { label: 'High', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  medium: { label: 'Medium', className: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  low: { label: 'Low', className: 'bg-muted text-muted-foreground border-border' },
};

const qaDocTextContent = (() => {
  let text = `=====================================\n  EDAS — QA Bug Testing Document\n  Comprehensive Test Checklist\n=====================================\n\n`;
  text += `Total Test Cases: ${qaCategories.reduce((a, c) => a + c.tests.length, 0)}\n`;
  text += `Categories: ${qaCategories.length}\n\n`;
  qaCategories.forEach((cat) => {
    text += `\n${'='.repeat(50)}\n  ${cat.name.toUpperCase()}\n${'='.repeat(50)}\n\n`;
    cat.tests.forEach((t) => {
      text += `[${t.id}] ${t.title}  (Priority: ${t.priority.toUpperCase()})\n`;
      text += `  Steps:\n`;
      t.steps.forEach((s, i) => { text += `    ${i + 1}. ${s}\n`; });
      text += `  Expected: ${t.expected}\n\n`;
    });
  });
  text += `\n${'='.repeat(50)}\n  END OF QA DOCUMENT\n${'='.repeat(50)}\n`;
  return text;
})();

export const QATestingSection: React.FC = () => {
  const { hasRole, loading } = useRBACContext();
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());

  if (loading || !hasRole('platform_admin')) return null;

  const toggleCategory = (index: number) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const expandAll = () => setOpenCategories(new Set(qaCategories.map((_, i) => i)));
  const collapseAll = () => setOpenCategories(new Set());

  const handleDownload = () => {
    const blob = new Blob([qaDocTextContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'EDAS-QA-Testing-Document.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalTests = qaCategories.reduce((a, c) => a + c.tests.length, 0);
  const criticalCount = qaCategories.reduce((a, c) => a + c.tests.filter((t) => t.priority === 'critical').length, 0);

  return (
    <motion.section
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-destructive/10">
          <Bug className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">QA Testing Document</h2>
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" /> Platform Admin Only
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {totalTests} test cases across {qaCategories.length} categories · {criticalCount} critical
          </p>
        </div>
      </div>

      {/* Download + Controls */}
      <Card className="border-border/40 border-dashed">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-semibold text-foreground">Download Full QA Document</h3>
            <p className="text-sm text-muted-foreground">Get the complete checklist as a text file for offline use.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
            <Button size="sm" className="gap-2" onClick={handleDownload}>
              <Download className="h-4 w-4" /> Download .txt
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="space-y-3">
        {qaCategories.map((cat, catIdx) => (
          <Collapsible key={cat.name} open={openCategories.has(catIdx)} onOpenChange={() => toggleCategory(catIdx)}>
            <Card className="border-border/40">
              <CollapsibleTrigger asChild>
                <button className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors rounded-lg">
                  {openCategories.has(catIdx) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="font-semibold text-foreground flex-1">{cat.name}</span>
                  <Badge variant="outline" className="text-xs">{cat.tests.length} tests</Badge>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  {cat.tests.map((test) => {
                    const pCfg = priorityConfig[test.priority];
                    return (
                      <div key={test.id} className="rounded-lg border border-border/50 p-3 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{test.id}</code>
                          <span className="font-medium text-sm text-foreground flex-1">{test.title}</span>
                          <Badge variant="outline" className={`text-xs ${pCfg.className}`}>{pCfg.label}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p className="font-medium text-foreground/70">Steps:</p>
                          <ol className="list-decimal list-inside space-y-0.5 pl-2">
                            {test.steps.map((s, i) => <li key={i}>{s}</li>)}
                          </ol>
                        </div>
                        <div className="flex items-start gap-1.5 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground"><span className="font-medium text-foreground/70">Expected:</span> {test.expected}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </motion.section>
  );
};
