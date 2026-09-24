import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Share2, 
  Copy, 
  Radio, 
  PhoneOff, 
  X,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const LiveVideoRoomModal: React.FC = () => {
  const { 
    isLiveRoomOpen, 
    setIsLiveRoomOpen, 
    activeMeetingRoom, 
    leaveMeeting, 
    currentRole, 
    profile, 
    triggerToast 
  } = useApp();

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  if (!isLiveRoomOpen || !activeMeetingRoom) return null;

  const isHost = currentRole === 'team_leader' || currentRole === 'admin';
  const myName = profile?.name || (currentRole === 'admin' ? 'Super Admin' : isHost ? 'Team Leader' : 'Team Member');
  const myRoleLabel = currentRole === 'admin'
    ? 'You (Super Admin / Host)'
    : isHost 
    ? 'You (Host)' 
    : currentRole === 'telecaller' 
    ? 'You (Telecaller)' 
    : currentRole === 'hr' 
    ? 'You (HR)' 
    : 'You';

  const otherPersonName = activeMeetingRoom.createdByRole === 'admin' && currentRole !== 'admin'
    ? 'Super Admin (Executive Host)'
    : isHost 
    ? activeMeetingRoom.invitedMemberName || (activeMeetingRoom.targetTeam ? `${activeMeetingRoom.targetTeam} Squad` : 'Company Attendees') 
    : 'Team Leader';

  const effectiveJoinUrl = activeMeetingRoom.zoomJoinUrl || activeMeetingRoom.meetingLink || `https://meet.tradenexus.io/room/${activeMeetingRoom.id}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(effectiveJoinUrl);
    triggerToast('✓ Meeting invite link copied to clipboard!');
  };

  const copyMeetingCredentials = () => {
    const text = `Zoom Meeting Details:\nTopic: ${activeMeetingRoom.title}\nJoin Link: ${effectiveJoinUrl}${activeMeetingRoom.zoomMeetingId ? `\nMeeting ID: ${activeMeetingRoom.zoomMeetingId}` : ''}${activeMeetingRoom.zoomPassword ? `\nPasscode: ${activeMeetingRoom.zoomPassword}` : ''}`;
    navigator.clipboard?.writeText(text);
    triggerToast('✓ Zoom credentials copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col justify-between p-4 md:p-6 text-white animate-in zoom-in-95">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Live Video Session
              </span>
              {activeMeetingRoom.zoomMeetingId ? (
                <span className="text-[10px] font-mono bg-blue-600/30 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-400" /> Zoom API Room
                </span>
              ) : (
                <span className="text-xs font-mono text-slate-400 font-medium">Room ID: {activeMeetingRoom.id}</span>
              )}
            </div>
            <h3 className="font-display font-black text-lg text-white mt-0.5">
              {activeMeetingRoom.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {activeMeetingRoom.zoomJoinUrl && (
            <a
              href={activeMeetingRoom.zoomJoinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Launch Zoom App</span>
            </a>
          )}

          <button
            onClick={copyMeetingCredentials}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Copy Zoom Meeting Details"
          >
            <Copy className="w-3.5 h-3.5 text-[#00C9A7]" /> Copy Credentials
          </button>

          <button
            onClick={() => setIsLiveRoomOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
            title="Minimize Window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Zoom Credentials Badge Strip (If Zoom Room) */}
      {activeMeetingRoom.zoomMeetingId && (
        <div className="my-2 bg-blue-950/70 border border-blue-800/60 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Zoom Cloud Room
            </span>
            <span className="text-slate-300 font-mono">
              Meeting ID: <strong className="text-white font-bold">{activeMeetingRoom.zoomMeetingId}</strong>
            </span>
            {activeMeetingRoom.zoomPassword && (
              <span className="text-slate-300 font-mono">
                Passcode: <strong className="text-emerald-400 font-bold">{activeMeetingRoom.zoomPassword}</strong>
              </span>
            )}
            {activeMeetingRoom.zoomHostEmail && (
              <span className="text-slate-400 font-mono text-[11px] hidden md:inline">
                Host: {activeMeetingRoom.zoomHostEmail}
              </span>
            )}
          </div>
          <a
            href={effectiveJoinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 font-bold text-xs flex items-center gap-1 underline"
          >
            Join directly via Zoom Web Client →
          </a>
        </div>
      )}

      {/* Video Grid Canvas */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4 h-[380px]">
          
          {/* Tile 1: Current User */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between z-10">
              <span className="text-xs font-bold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg">
                {myName} • {myRoleLabel}
              </span>
              {isMicMuted ? (
                <span className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <MicOff className="w-4 h-4" />
                </span>
              ) : (
                <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Mic className="w-4 h-4" />
                </span>
              )}
            </div>

            <div className="flex flex-col items-center justify-center space-y-3 my-auto z-10">
              {isCameraOff ? (
                <div className="w-24 h-24 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-black text-2xl border border-slate-700">
                  {myName.substring(0, 2).toUpperCase()}
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-black text-2xl border-2 border-[#00C9A7] shadow-lg shadow-[#00C9A7]/20">
                  {myName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-slate-400">
                {isCameraOff ? 'Camera is turned off' : 'Live stream connected'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 z-10">
              <span>HD 1080p • 60 FPS</span>
              <span className="text-emerald-400 font-bold">● Connected</span>
            </div>
          </div>

          {/* Tile 2: Other Participant / Host */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between z-10">
              <span className="text-xs font-bold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg">
                {otherPersonName}
              </span>
              <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Mic className="w-4 h-4" />
              </span>
            </div>

            <div className="flex flex-col items-center justify-center space-y-3 my-auto z-10">
              <div className="w-24 h-24 rounded-full bg-purple-950 text-purple-300 flex items-center justify-center font-black text-2xl border-2 border-purple-500/50 shadow-lg shadow-purple-500/20">
                {otherPersonName.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-purple-300">
                {otherPersonName} (In Session)
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 z-10">
              <span>{activeMeetingRoom.location || 'Zoom Cloud Room'}</span>
              <span className="text-emerald-400 font-bold">● Live Video Active</span>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Bottom Control Bar */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-3 max-w-xl mx-auto flex items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMicMuted(!isMicMuted)}
            className={`p-3 rounded-2xl transition-all cursor-pointer ${
              isMicMuted ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsCameraOff(!isCameraOff)}
            className={`p-3 rounded-2xl transition-all cursor-pointer ${
              isCameraOff ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            title={isCameraOff ? 'Turn Video On' : 'Turn Video Off'}
          >
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button
            onClick={() => {
              setIsScreenSharing(!isScreenSharing);
              triggerToast(isScreenSharing ? 'Screen sharing stopped' : '🖥️ Screen sharing started');
            }}
            className={`p-3 rounded-2xl transition-all cursor-pointer ${
              isScreenSharing ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            title="Share Screen"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center text-[11px] text-slate-400 font-mono hidden sm:flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Zoom Live Engine</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all cursor-pointer"
            title="Copy Invite Link"
          >
            <Copy className="w-5 h-5" />
          </button>

          <button
            onClick={leaveMeeting}
            className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>{isHost ? 'End Meeting' : 'Leave Room'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
