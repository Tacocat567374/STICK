import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import RoomBrowser from '@/components/game/RoomBrowser';
import OnlineRoom from '@/components/game/OnlineRoom';

export default function OnlineGame() {
  const navigate = useNavigate();
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const createRoom = async (roomName) => {
    setBusy(true);
    setError(null);
    try {
      let host = 'Host';
      try {
        const u = await base44.auth.me();
        if (u && u.full_name) host = String(u.full_name).split(' ')[0];
      } catch {
        /* anonymous host */
      }
      const rec = await base44.entities.Arena.create({
        room_name: roomName || `${host}'s Arena`,
        host_name: host,
        mode: 'public',
        status: 'open',
        player_count: 1,
      });
      setActive({ roomId: rec.id, registryId: rec.id });
    } catch {
      setError('That room could not be opened. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (active) {
    return (
      <OnlineRoom
        roomId={active.roomId}
        registryId={active.registryId}
        onExit={() => {
          setActive(null);
          navigate('/online', { replace: true });
        }}
      />
    );
  }

  return (
    <RoomBrowser
      busy={busy}
      error={error}
      onCreate={createRoom}
      onJoin={(roomId, registryId) => setActive({ roomId, registryId })}
    />
  );
}