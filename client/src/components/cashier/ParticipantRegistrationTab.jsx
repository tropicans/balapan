import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ParticipantForm } from './ParticipantForm.jsx';
import { ParticipantList } from './ParticipantList.jsx';
import { ParticipantNumberModal } from './ParticipantNumberModal.jsx';
import { ParticipantEditModal } from './ParticipantEditModal.jsx';
import { ParticipantImportModal } from './ParticipantImportModal.jsx';
import { useRace } from '../../context/RaceContext.jsx';

export function ParticipantRegistrationTab({
  onStatsChange,
  importModalOpen = false,
  onCloseImportModal
}) {
  const { socket } = useRace();
  const formRef = useRef(null);

  // Participants list & search state
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const onStatsChangeRef = useRef(onStatsChange);
  useEffect(() => {
    onStatsChangeRef.current = onStatsChange;
  }, [onStatsChange]);

  // Modals state
  const [registeredModalParticipant, setRegisteredModalParticipant] = useState(null);
  const [editModalParticipant, setEditModalParticipant] = useState(null);

  const fetchParticipants = useCallback(async (searchQuery = searchRef.current) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      const q = typeof searchQuery === 'string' ? searchQuery.trim() : '';
      if (q) {
        queryParams.set('search', q);
      }
      queryParams.set('limit', '200');

      const res = await fetch(`/api/participants?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setParticipants(data.data.participants || []);
        if (onStatsChangeRef.current) {
          onStatsChangeRef.current({
            total: data.data.total || 0,
            latestNumber: data.data.latest_number || 0,
            activeEvent: data.data.active_event || null
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial and search-driven load
  useEffect(() => {
    fetchParticipants(search);
  }, [fetchParticipants, search]);

  // WebSocket subscriptions for live synchronization
  useEffect(() => {
    if (!socket) return;

    const handleParticipantChange = () => {
      fetchParticipants(searchRef.current);
    };

    socket.on('participant_registered', handleParticipantChange);
    socket.on('participant_updated', handleParticipantChange);
    socket.on('participants_imported', handleParticipantChange);
    socket.on('STATE_UPDATE', handleParticipantChange);

    return () => {
      socket.off('participant_registered', handleParticipantChange);
      socket.off('participant_updated', handleParticipantChange);
      socket.off('participants_imported', handleParticipantChange);
      socket.off('STATE_UPDATE', handleParticipantChange);
    };
  }, [socket, fetchParticipants]);

  // D-03: Close giant number modal and return focus to racer name input
  const handleCloseNumberModal = () => {
    setRegisteredModalParticipant(null);
    setTimeout(() => {
      formRef.current?.focusNameInput();
    }, 50);
  };

  const handleEditSuccess = useCallback((updatedParticipant) => {
    fetchParticipants(searchRef.current);
  }, [fetchParticipants]);

  const handleImportSuccess = useCallback(() => {
    fetchParticipants(searchRef.current);
    if (onCloseImportModal) onCloseImportModal();
  }, [fetchParticipants, onCloseImportModal]);

  const handleSearchChange = useCallback((q) => {
    setSearch(q);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchParticipants(searchRef.current);
  }, [fetchParticipants]);

  const handleFormSuccess = useCallback((participant) => {
    setRegisteredModalParticipant(participant);
    fetchParticipants(searchRef.current);
  }, [fetchParticipants]);

  return (
    <div className="space-y-4">
      {/* 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (5 cols / ~40%): Participant Form */}
        <div className="lg:col-span-5 space-y-4">
          <ParticipantForm
            ref={formRef}
            onSuccess={handleFormSuccess}
            onRefreshStats={handleRefresh}
          />
        </div>

        {/* Right Column (7 cols / ~60%): Live Participant Table & Search */}
        <div className="lg:col-span-7 space-y-4">
          <ParticipantList
            participants={participants}
            loading={loading}
            searchQuery={search}
            onSearchChange={handleSearchChange}
            onEditParticipant={(p) => setEditModalParticipant(p)}
            onRefresh={handleRefresh}
          />
        </div>
      </div>

      {/* D-01, D-02, D-03: Giant Confirmation Modal */}
      {registeredModalParticipant && (
        <ParticipantNumberModal
          participant={registeredModalParticipant}
          onClose={handleCloseNumberModal}
        />
      )}

      {/* D-12: Edit Participant Name/Team Modal */}
      {editModalParticipant && (
        <ParticipantEditModal
          participant={editModalParticipant}
          onClose={() => setEditModalParticipant(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* D-07, D-08, D-09: Import Roster CSV Modal */}
      {importModalOpen && (
        <ParticipantImportModal
          onClose={onCloseImportModal}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}
