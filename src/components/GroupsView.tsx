import React, { useState } from 'react';
import { useGroups } from '@/hooks/useGroups';
import { GroupList } from './groups/GroupList';
import { GroupChat } from './groups/GroupChat';
import { CreateGroupDialog } from './groups/CreateGroupDialog';
import { InvitationsPanel } from './groups/InvitationsPanel';
import { Button } from './ui/button';
import { Plus, Users } from 'lucide-react';
import { Group } from '@/types';

export const GroupsView = () => {
  const { groups, loading, createGroup, updateGroup, deleteGroup, leaveGroup } = useGroups();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInvitations, setShowInvitations] = useState(false);

  return (
    <div className="h-full flex">
      {/* Groups List Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Groups</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowInvitations(!showInvitations)}
              >
                <Users className="h-4 w-4" />
              </Button>
              <Button
                variant="default"
                size="icon"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {showInvitations ? (
          <InvitationsPanel onClose={() => setShowInvitations(false)} />
        ) : (
          <GroupList
            groups={groups}
            loading={loading}
            selectedGroup={selectedGroup}
            onSelectGroup={setSelectedGroup}
          />
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1">
        {selectedGroup ? (
          <GroupChat
            group={selectedGroup}
            onUpdateGroup={updateGroup}
            onDeleteGroup={deleteGroup}
            onLeaveGroup={leaveGroup}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a group to start chatting</p>
            </div>
          </div>
        )}
      </div>

      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateGroup={createGroup}
      />
    </div>
  );
};
