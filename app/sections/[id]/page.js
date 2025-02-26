'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MinusIcon, PlusIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline';
import { DeleteItemModal, AddItemModal } from './components/Modals';
import { DeleteSectionModal } from './components/Modals';
import LogsModal from './components/LogsModal';
import debounce from 'lodash.debounce';
import Pusher from 'pusher-js';
import { useSession } from "next-auth/react";

function ItemLogs({ itemId, currentUserId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/items/${itemId}/logs`);
      setLogs(res.data);
    } catch (error) {
      console.error('Error fetching logs for item', itemId, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLogs();
  }, [itemId]);

  if (loading && logs.length === 0) return <p>Loading logs...</p>;
  if (!loading && logs.length === 0) return <p>No logs available for this item.</p>;

  return (
    <div className="logs-container mt-2 p-2 border-t border-gray-500">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-white">Audit Logs</h4>
        <button
          onClick={refreshLogs}
          disabled={loading}
          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors flex items-center gap-1"
        >
          {loading ? (
            <span>Refreshing...</span>
          ) : (
            <>
              <PlusIcon className="w-3 h-3" /> Refresh
            </>
          )}
        </button>
      </div>
      {logs.map((log) => (
        <div key={log.id} className="log-row bg-gray-800/50 p-2 rounded-lg mt-1">
          <p className="text-sm">
            <strong>{new Date(log.timestamp).toLocaleString()}</strong>
            {': '}Changed from {log.oldCount} to {log.newCount} by{' '}
            {log.user?.name || 'Unknown'}
          </p>
          {log.remarks && (
            <p className="text-sm text-gray-400 mt-1">
              <em>Remark:</em> {log.remarks}
            </p>
          )}
          {String(currentUserId) === String(log.userId) && (
            <EditRemark log={log} onUpdate={refreshLogs} />
          )}
        </div>
      ))}
    </div>
  );
}

function EditRemark({ log, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [remark, setRemark] = useState(log.remarks || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateRemark = async () => {
    if (!remark.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await axios.patch(`/api/logs/${log.id}`, { remarks: remark });
      setEditing(false);
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error('Error updating remark:', error);
      setError(error.response?.data?.message || 'Failed to update remark');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      {editing ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Enter your remark"
              className="flex-1 px-2 py-1 text-sm rounded bg-gray-700 border border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={loading}
              autoFocus
            />
            <button
              onClick={updateRemark}
              disabled={loading}
              className="px-3 py-1 text-sm rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={loading}
              className="px-3 py-1 text-sm rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {log.remarks ? 'Edit Remark' : 'Add Remark'}
        </button>
      )}
    </div>
  );
}

export default function SectionDetail() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [section, setSection] = useState(null);
  const [items, setItems] = useState([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    maxQuantity: 1
  });
  const [isDeletingItem, setIsDeletingItem] = useState(null);
  const [isDeletingSection, setIsDeletingSection] = useState(false);
  const [openLogs, setOpenLogs] = useState(null);
  const sectionId = params?.id;

  // Add local state for editing max quantity
  const [editingMax, setEditingMax] = useState({});
  const [changeAmounts, setChangeAmounts] = useState({});

  const fetchSectionDetails = useCallback(async () => {
    if (!sectionId) return;

    try {
      const response = await fetch(`/api/sections/${sectionId}`);
      if (!response.ok) throw new Error('Failed to fetch section');
      const data = await response.json();
      setSection(data);
      setItems(data.items || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchSectionDetails();
  }, [fetchSectionDetails]);

  useEffect(() => {
    if (!sectionId) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    });

    const channel = pusher.subscribe(`section-${sectionId}`);

    channel.bind('itemUpdate', (updatedItem) => {
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === updatedItem.id
            ? { ...item, ...updatedItem }  // Merge the update with existing item data
            : item
        )
      );
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [sectionId]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/sections/${sectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (!response.ok) throw new Error('Failed to add item');
      const data = await response.json();
      setItems([...items, data]);
      setIsAddingItem(false);
      setNewItem({ name: '', description: '', maxQuantity: 1 });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Optimistic update function
  const updateItemLocally = useCallback((itemId, newCount) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { ...item, count: newCount }  // Preserve all existing item properties
          : item
      )
    );
  }, []);

  // Debounced API call
  const updateServer = useCallback(
    debounce(async (itemId, newCount) => {
      if (!sectionId) return Promise.resolve();
      try {
        const response = await fetch(
          `/api/sections/${sectionId}/items/${itemId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: newCount })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server error:', errorData);
          // Refresh from server if needed.
          fetchSectionDetails();
          return Promise.reject(errorData);
        }

        // Return the updated item from the server
        return await response.json();
      } catch (error) {
        console.error('Network error:', error);
        fetchSectionDetails();
        return Promise.reject(error);
      }
    }, 300),
    [sectionId, fetchSectionDetails]
  );

  // Combined function for UI and API updates
  const initiateQuantityChange = useCallback((itemId, newCount) => {
    updateItemLocally(itemId, newCount);
    updateServer(itemId, newCount);
  }, [updateItemLocally, updateServer]);

  const handleDeleteItem = async (itemId) => {
    try {
      const response = await fetch(`/api/sections/${sectionId}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete item');
      setItems(items.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsDeletingItem(null);
    }
  };

  const handleDeleteSection = async () => {
    try {
      const response = await fetch(`/api/sections/${sectionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error deleting section:', errorData);
        throw new Error('Failed to delete section');
      }
      router.push('/home');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsDeletingSection(false);
    }
  };

  const toggleLogsForItem = (itemId) => {
    setOpenLogs((prev) => (prev === itemId ? null : itemId));
  };

  // Modified handler for max quantity changes
  const handleMaxQuantityChange = useCallback(
    async (itemId, newMax) => {
      if (!sectionId || newMax === undefined) return;

      try {
        const response = await fetch(`/api/sections/${sectionId}/items/${itemId}/max`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maxQuantity: newMax })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server error:', errorData.error);
          // Reset to current value if update fails
          setEditingMax(prev => ({ ...prev, [itemId]: undefined }));
          fetchSectionDetails();
          return false;
        }

        // Clear the editing state only after successful update
        setEditingMax(prev => ({ ...prev, [itemId]: undefined }));
        return true;
      } catch (error) {
        console.error('Network error:', error);
        setEditingMax(prev => ({ ...prev, [itemId]: undefined }));
        fetchSectionDetails();
        return false;
      }
    },
    [sectionId, fetchSectionDetails]
  );

  const handleMaxQuantityKeyDown = useCallback(async (e, item, newMax) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (newMax !== undefined && newMax !== '' && newMax >= item.count) {
        const success = await handleMaxQuantityChange(item.id, parseInt(newMax, 10));
        if (!success) {
          // Reset only if update failed
          setEditingMax(prev => ({ ...prev, [item.id]: undefined }));
        }
      } else {
        // Reset if invalid value
        setEditingMax(prev => ({ ...prev, [item.id]: undefined }));
      }
    }
  }, [handleMaxQuantityChange]);

  const handleCountChange = (itemId, newCount) => {
    if (newCount >= 0 && newCount <= items.find(item => item.id === itemId).maxQuantity) {
      initiateQuantityChange(itemId, newCount);
    }
  };

  if (!section) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-lg font-medium">Loading section...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                {section.name}
              </h1>
              {section.description && (
                <p className="text-gray-400 mt-1">{section.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeletingSection(true)}
                className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-200"
              >
                Delete Section
              </button>
              <button
                onClick={() => setIsAddingItem(true)}
                className="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-200"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl p-4 hover:bg-gray-700/50 transition-all duration-300"
              >
                <div className="flex flex-col space-y-4">
                  <h3 className="text-lg font-medium text-white">
                    {item.name}
                  </h3>

                  <div className="text-sm text-gray-400">
                    Available: {item.count}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-1.5">
                      <button
                        onClick={() => {
                          const step = parseInt(changeAmounts[item.id] ?? 1, 10);
                          const newCount = item.count - step;
                          if (newCount >= 0) {
                            initiateQuantityChange(item.id, newCount);
                          }
                        }}
                        className="text-red-400 hover:bg-gray-700/70 p-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={item.count <= 0}
                      >
                        <MinusIcon className="w-5 h-5" />
                      </button>
                      
                      <input
                        type="number"
                        value={changeAmounts[item.id] ?? 1}
                        onChange={(e) =>
                          setChangeAmounts((prev) => ({
                            ...prev,
                            [item.id]:
                              e.target.value === ""
                                ? ""
                                : Math.max(1, parseInt(e.target.value, 10))
                          }))
                        }
                        min="1"
                        className="w-12 bg-gray-800/70 text-white px-1 py-1 rounded-md text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      
                      <button
                        onClick={() => {
                          const step = parseInt(changeAmounts[item.id] ?? 1, 10);
                          const newCount = item.count + step;
                          initiateQuantityChange(item.id, newCount);
                        }}
                        className="text-green-400 hover:bg-gray-700/70 p-2 rounded-md transition-colors duration-200"
                      >
                        <PlusIcon className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={() => setOpenLogs(item.id)}
                        className="text-gray-400 hover:text-gray-300 p-1.5 rounded-md hover:bg-gray-700/50 transition-colors"
                        title="View History"
                      >
                        <ClockIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsDeletingItem(item.id)}
                        className="text-red-400 hover:text-red-300 p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                        title="Delete Item"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-sm text-gray-400 mt-2">{item.description}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <LogsModal
        isOpen={!!openLogs}
        onClose={() => setOpenLogs(null)}
        itemId={openLogs}
        currentUserId={session?.user?.id}
        itemName={items.find(item => item.id === openLogs)?.name}
      />

      <DeleteItemModal
        isOpen={isDeletingItem !== null}
        onClose={() => setIsDeletingItem(null)}
        onConfirm={() => handleDeleteItem(isDeletingItem)}
      />

      <DeleteSectionModal
        isOpen={isDeletingSection}
        onClose={() => setIsDeletingSection(false)}
        onConfirm={handleDeleteSection}
      />

      <AddItemModal
        isOpen={isAddingItem}
        onClose={() => setIsAddingItem(false)}
        newItem={newItem}
        setNewItem={setNewItem}
        onSubmit={handleAddItem}
      />
    </div>
  );
}