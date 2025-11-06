import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGroups } from '@/hooks/useGroups';
import { useConversations } from '@/hooks/useConversations';
import { GroupList } from './groups/GroupList';
import { GroupChat } from './groups/GroupChat';
import { DirectChat } from './DirectChat';
import { ConversationsList } from './ConversationsList';
import { CreateGroupDialog } from './groups/CreateGroupDialog';
import { InvitationsPanel } from './groups/InvitationsPanel';
import { AnimatedBackground } from './AnimatedBackground';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from './ui/resizable';
import { Plus, Users } from 'lucide-react';
import { Group, Conversation } from '@/types';

interface LocationState {
  openConversation?: string;
  userId?: string;
}

export const GroupsView = () => {
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  
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
  const [showInvitations, setShowInvitations] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'chats'>('groups');

  // Handle navigation from Active Users
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
      .single();

    if (data) {
      setSelectedConversation({
        conversation,
        otherUserId: userId,
        otherUserName: data.display_name || data.username || data.email,
        otherUserAvatar: data.avatar_url || undefined,
      });
      setSelectedGroup(null);
    }
  };

  const handleSelectConversation = async (conversation: Conversation, otherUserId: string) => {
    fetchUserProfile(otherUserId, conversation);
    setSelectedGroup(null);
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    setSelectedConversation(null);
  };

  const handleBackToList = () => {
    if (activeTab === 'chats') {
      setSelectedConversation(null);
    } else {
      setSelectedGroup(null);
    }
  };

  return (
    <AnimatedBackground viewType="groups">
      <div className="h-full flex">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar */}
          <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
            <div className="h-full border-r border-border bg-card/50 backdrop-blur-sm flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Messages</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowInvitations(!showInvitations)}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    {activeTab === 'groups' && (
                      <Button
                        variant="default"
                        size="icon"
                        onClick={() => setShowCreateDialog(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'groups' | 'chats')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="groups">Groups</TabsTrigger>
                    <TabsTrigger value="chats">Chats</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {showInvitations ? (
                <InvitationsPanel onClose={() => setShowInvitations(false)} />
              ) : (
                <Tabs value={activeTab} className="flex-1 flex flex-col">
                  <TabsContent value="groups" className="flex-1 m-0">
                    <GroupList
                      groups={groups}
                      loading={groupsLoading}
                      selectedGroup={selectedGroup}
                      onSelectGroup={handleSelectGroup}
                    />
                  </TabsContent>
                  <TabsContent value="chats" className="flex-1 m-0">
                    <ConversationsList
                      conversations={conversations}
                      loading={conversationsLoading}
                      selectedConversationId={selectedConversation?.conversation.id || null}
                      onSelectConversation={handleSelectConversation}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Chat Area */}
          <ResizablePanel defaultSize={75}>
            <div className="h-full">
              {selectedGroup ? (
                <GroupChat
                  group={selectedGroup}
                  onUpdateGroup={updateGroup}
                  onDeleteGroup={deleteGroup}
                  onLeaveGroup={leaveGroup}
                />
              ) : selectedConversation ? (
                <DirectChat
                  conversationId={selectedConversation.conversation.id}
                  otherUserId={selectedConversation.otherUserId}
                  otherUserName={selectedConversation.otherUserName}
                  otherUserAvatar={selectedConversation.otherUserAvatar}
                  onBack={handleBackToList}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center animate-fade-in">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50 animate-bounce-in" />
                    <p className="text-lg">
                      {activeTab === 'groups' 
                        ? 'Select a group to start chatting'
                        : 'Select a chat or start a new one from Active Users'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        <CreateGroupDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreateGroup={createGroup}
        />
      </div>
    </AnimatedBackground>
  );
};
