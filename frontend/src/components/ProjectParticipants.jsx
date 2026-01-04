import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config.js';
import { Users, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProjectParticipants({ projectId, shareToken = null }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchParticipants();
    // Refresh participants every 30 seconds
    const interval = setInterval(fetchParticipants, 30000);
    return () => clearInterval(interval);
  }, [projectId, shareToken]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      let response;

      if (projectId) {
        // Try authenticated endpoint first
        try {
          response = await axios.get(`${API_BASE_URL}/projects/${projectId}/participants`);
          setParticipants(response.data.participants || []);
          setLoading(false);
          return;
        } catch (err) {
          // If that fails, try regular project endpoint
          response = await axios.get(`${API_BASE_URL}/projects/${projectId}`);
          const project = response.data.project;
          const allUsers = [
            project.owner,
            ...(project.collaborators || []),
            ...(project.participants || []).map(p => p.user || { name: p.name, email: p.email }),
          ].filter(Boolean);
          setParticipants(allUsers);
        }
      } else if (shareToken) {
        // For shared projects
        response = await axios.get(`${API_BASE_URL}/share/${shareToken}`);
        const project = response.data.project;
        const allUsers = [
          project.owner,
          ...(project.collaborators || []),
          ...(project.participants || []).map(p => p.user || { name: p.name, email: p.email }),
        ].filter(Boolean);
        setParticipants(allUsers);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || participants.length === 0) {
    return null;
  }

  // Limit to 10 avatars, show count if more
  const displayParticipants = participants.slice(0, 10);
  const remainingCount = participants.length - 10;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center -space-x-2">
        {displayParticipants.map((participant, index) => {
          const name = participant.name || participant.email || 'Unknown';
          const initials = name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          
          const bgColors = [
            'bg-gradient-to-br from-primary to-blue-600',
            'bg-gradient-to-br from-purple-500 to-pink-500',
            'bg-gradient-to-br from-emerald-500 to-teal-600',
            'bg-gradient-to-br from-amber-500 to-orange-600',
            'bg-gradient-to-br from-red-500 to-rose-600',
          ];
          const bgColor = bgColors[index % bgColors.length];

          return (
            <div
              key={participant.id || participant._id || index}
              className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-white text-xs font-semibold border-2 border-background shadow-md hover:scale-110 transition-transform cursor-pointer relative group`}
              title={`${name}${participant.email ? ` (${participant.email})` : ''}`}
            >
              {initials}
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {name}
                {participant.role && (
                  <span className="ml-1 text-[10px] opacity-75">
                    ({participant.role})
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div
            className="w-8 h-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-secondary-foreground text-xs font-semibold shadow-md hover:scale-110 transition-transform cursor-pointer relative group"
            title={`${remainingCount} more participant${remainingCount > 1 ? 's' : ''}`}
          >
            +{remainingCount}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {remainingCount} more participant{remainingCount > 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        <span>{participants.length}</span>
      </div>
    </div>
  );
}

