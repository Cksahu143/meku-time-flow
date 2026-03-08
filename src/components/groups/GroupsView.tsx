import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGroups } from '@/hooks/useGroups';
import { useConversations } from '@/hooks/useConversations';
import { GroupList } from '@/components/groups/GroupList';
import { GroupChat } from '@/components/groups/GroupChat';
import { DirectChat } from '@/components/chat/DirectChat';
import { ConversationsList } from '@/components/chat/ConversationsList';
import { CreateGroupDialog } from '@/components/groups/CreateGroupDialog';
import { StartChatDialog } from '@/components/chat/StartChatDialog';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, MessageSquare, MessageCircle } from 'lucide-react';
import { Group, Conversation } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationState {
  openConversation?: string;
  userId?: string;
}

export const GroupsView = () => {
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const { groups, loading: groupsLoading, createGroup, updateGroup, deleteGroup, leaveGroup } = useGroups();
  const { conversations, loading: conversationsLoading, createOrGetConversation } = useConversations();
  
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<{
    conversation: Conversation;
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar?: string;
  } | null>(null);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStartChatDialog, setShowStartChatDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'chats'>('chats');
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [hasShownWarning, setHasShownWarning] = useState(false);

  const showChatArea = selectedGroup || selectedConversation;

  useEffect(() => {
    const checkPublicProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('is_public')
        .eq('id', user.id)
        .maybeSingle();
      setIsPublicProfile(data?.is_public ?? false);
    };
    checkPublicProfile();

    const channel = supabase
      .channel('profile-public-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && payload.new.id === user.id) {
          setIsPublicProfile(payload.new.is_public ?? false);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!isPublicProfile && !hasShownWarning) {
      toast({ variant: 'destructive', title: 'Warning', description: 'You cannot chat with anyone. Please turn on public profile to allow.', duration: 5000 });
      setHasShownWarning(true);
    }
    if (isPublicProfile) setHasShownWarning(false);
  }, [isPublicProfile, hasShownWarning, toast]);

  useEffect(() => {
    if (locationState?.openConversation && locationState?.userId) {
      const conv = conversations.find(c => c.id === locationState.openConversation);
      if (conv) {
        fetchUserProfile(locationState.userId, conv);
        setActiveTab('chats');
      }
    }
  }, [locationState, conversations]);

  const fetchUserProfile = async (userId: string, conversation: Conversation) => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, username, email, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      setSelectedConversation({
        conversation, otherUserId: userId,
        otherUserName: data.display_name || data.username || data.email,
        otherUserAvatar: data.avatar_url || undefined,
      });
      setSelectedGroup(null);
    }
  };

  const handleSelectConversation = async (conversation: Conversation, otherUserId: string) => {
    if (!isPublicProfile) {
      toast({ variant: 'destructive', title: 'Cannot access chat', description: 'Please turn on public profile in Settings → Privacy to use chats.' });
      return;
    }
    fetchUserProfile(otherUserId, conversation);
    setSelectedGroup(null);
  };

  const handleSelectGroup = (group: Group) => {
    if (!isPublicProfile) {
      toast({ variant: 'destructive', title: 'Cannot access group', description: 'Please turn on public profile in Settings → Privacy to use groups.' });
      return;
    }
    setSelectedGroup(group);
    setSelectedConversation(null);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setSelectedGroup(null);
  };

  const handleChatCreated = (conversationId: string, userId: string, userName: string, avatar?: string) => {
    const newConv: Conversation = {
      id: conversationId, user1_id: userId, user2_id: userId,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    setSelectedConversation({ conversation: newConv, otherUserId: userId, otherUserName: userName, otherUserAvatar: avatar });
    setSelectedGroup(null);
    setActiveTab('chats');
  };

  // WhatsApp-style sidebar
  const renderSidebar = () => (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* WhatsApp-style header */}
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">EDAS Chat</h2>
          <div className="flex gap-1">
            {activeTab === 'groups' ? (
              <Button variant="ghost" size="icon" onClick={() => setShowCreateDialog(true)} disabled={!isPublicProfile} className="rounded-full h-9 w-9">
                <Plus className="h-5 w-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setShowStartChatDialog(true)} disabled={!isPublicProfile} className="rounded-full h-9 w-9">
                <MessageSquare className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp-style tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'groups' | 'chats')}>
        <div className="px-2 pt-2">
          <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="chats" className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Chats
            </TabsTrigger>
            <TabsTrigger value="groups" className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Groups
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* List content */}
      <Tabs value={activeTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsContent value="chats" className="flex-1 m-0 overflow-hidden">
          <ConversationsList
            conversations={conversations}
            loading={conversationsLoading}
            selectedConversationId={selectedConversation?.conversation.id || null}
            onSelectConversation={handleSelectConversation}
            isDisabled={!isPublicProfile}
          />
        </TabsContent>
        <TabsContent value="groups" className="flex-1 m-0 overflow-hidden">
          <GroupList
            groups={groups}
            loading={groupsLoading}
            selectedGroup={selectedGroup}
            onSelectGroup={handleSelectGroup}
            isDisabled={!isPublicProfile}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  // WhatsApp-style empty state
  const renderEmptyState = () => (
    <div className="h-full flex items-center justify-center bg-muted/10">
      <motion.div
        className="text-center px-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="relative mx-auto w-40 h-40 mb-6">
          <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-primary/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <MessageCircle className="h-16 w-16 text-primary/40" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">EDAS Chat</h3>
        <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
          Send and receive messages. Connect with friends, groups, and classmates seamlessly.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-4">
          🔒 End-to-end encrypted
        </p>
      </motion.div>
    </div>
  );

  // Mobile: show sidebar or chat (like WhatsApp)
  if (isMobile) {
    return (
      <AnimatedBackground viewType="groups">
        <div className="h-full">
          <AnimatePresence mode="wait">
            {showChatArea ? (
              <motion.div
                key="chat"
                className="h-full"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {!isPublicProfile ? renderEmptyState() :
                  selectedGroup ? (
                    <GroupChat group={selectedGroup} onUpdateGroup={updateGroup} onDeleteGroup={deleteGroup} onLeaveGroup={leaveGroup} onBack={handleBackToList} />
                  ) : selectedConversation ? (
                    <DirectChat
                      conversationId={selectedConversation.conversation.id}
                      otherUserId={selectedConversation.otherUserId}
                      otherUserName={selectedConversation.otherUserName}
                      otherUserAvatar={selectedConversation.otherUserAvatar}
                      onBack={handleBackToList}
                    />
                  ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="sidebar"
                className="h-full"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {renderSidebar()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <CreateGroupDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onCreateGroup={createGroup} />
        <StartChatDialog open={showStartChatDialog} onOpenChange={setShowStartChatDialog} onChatCreated={handleChatCreated} />
      </AnimatedBackground>
    );
  }

  // Desktop: WhatsApp-style split view
  return (
    <AnimatedBackground viewType="groups">
      <div className="h-full flex">
        {/* Sidebar - fixed width like WhatsApp */}
        <div className="w-[340px] min-w-[280px] max-w-[400px] flex-shrink-0">
          {renderSidebar()}
        </div>

        {/* Chat area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {!isPublicProfile ? (
              <motion.div key="disabled" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="h-full flex items-center justify-center">
                  <div className="text-center p-8 max-w-md">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Users className="h-8 w-8 text-yellow-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Public Profile Required</h3>
                    <p className="text-muted-foreground">Enable your public profile in Settings → Privacy to use chats.</p>
                  </div>
                </div>
              </motion.div>
            ) : selectedGroup ? (
              <motion.div key={`group-${selectedGroup.id}`} className="h-full" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                <GroupChat group={selectedGroup} onUpdateGroup={updateGroup} onDeleteGroup={deleteGroup} onLeaveGroup={leaveGroup} />
              </motion.div>
            ) : selectedConversation ? (
              <motion.div key={`conv-${selectedConversation.conversation.id}`} className="h-full" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                <DirectChat
                  conversationId={selectedConversation.conversation.id}
                  otherUserId={selectedConversation.otherUserId}
                  otherUserName={selectedConversation.otherUserName}
                  otherUserAvatar={selectedConversation.otherUserAvatar}
                  onBack={handleBackToList}
                />
              </motion.div>
            ) : (
              <motion.div key="empty" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {renderEmptyState()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CreateGroupDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onCreateGroup={createGroup} />
      <StartChatDialog open={showStartChatDialog} onOpenChange={setShowStartChatDialog} onChatCreated={handleChatCreated} />
    </AnimatedBackground>
  );
};
