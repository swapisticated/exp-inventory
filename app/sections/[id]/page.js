'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MinusIcon, PlusIcon } from './components/Icons';
import { DeleteItemModal, AddItemModal } from './components/Modals';
import { DeleteSectionModal } from './components/Modals';
import LogsModal from './components/LogsModal';

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
  const router = useRouter();
  const params = useParams();
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
  const [session, setSession] = useState(null);

  const fetchSectionDetails = async () => {
    try {
      const response = await fetch(`/api/sections/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch section');
      const data = await response.json();
      setSection(data);
      setItems(data.items || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchSession = async () => {
    try {
      const res = await axios.get('/api/auth/session');
      setSession(res.data);
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  };

  useEffect(() => {
    fetchSectionDetails();
    fetchSession();
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;

    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    const setupEventSource = () => {
      const eventSource = new EventSource(`/api/sections/${params.id}/sse`);

      eventSource.addEventListener('open', () => {
        console.log('SSE connection established');
        retryCount = 0; // Reset retry count on successful connection
      });

      eventSource.addEventListener('itemUpdate', (event) => {
        try {
          const updatedItem = JSON.parse(event.data);
          setItems(currentItems => 
            currentItems.map(item => 
              item.id === updatedItem.id ? updatedItem : item
            )
          );
        } catch (error) {
          console.error('Error processing itemUpdate:', error);
        }
      });

      eventSource.addEventListener('error', (event) => {
        console.error('SSE Error State:', {
          readyState: eventSource.readyState,
          retryCount,
          maxRetries
        });

        if (eventSource.readyState === EventSource.CLOSED) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Attempting to reconnect (${retryCount}/${maxRetries})...`);
            setTimeout(setupEventSource, retryDelay);
          } else {
            console.error('Max retry attempts reached. SSE connection permanently closed.');
          }
        }
        
        eventSource.close();
      });

      return eventSource;
    };

    const eventSource = setupEventSource();

    // Cleanup function
    return () => {
      if (eventSource) {
        console.log('Closing SSE connection...');
        eventSource.close();
      }
    };
  }, [params.id]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/sections/${params.id}/items`, {
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

  const initiateQuantityChange = async (itemId, increment) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const newCount = item.count + (increment ? 1 : -1);
    if (newCount < 0 || newCount > item.maxQuantity) return;

    try {
      const response = await fetch(`/api/sections/${params.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: newCount }),
      });
      if (!response.ok) throw new Error('Failed to update quantity');
      
      setItems(items.map(i => 
        i.id === itemId ? { ...i, count: newCount } : i
      ));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const response = await fetch(`/api/sections/${params.id}/items/${itemId}`, {
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
      const response = await fetch(`/api/sections/${params.id}`, {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 backdrop-blur-lg bg-opacity-80 rounded-2xl shadow-2xl p-6 mb-8"
        >
          <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {section.name}
              </h1>
              {section.description && (
                <p className="text-gray-400 text-lg">{section.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeletingSection(true)}
                className="group relative px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-200 font-medium"
              >
                Delete Section
                <span className="absolute inset-0 rounded-xl bg-red-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>
              <button
                onClick={() => setIsAddingItem(true)}
                className="group relative px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-200 font-medium"
              >
                Add Item
                <span className="absolute inset-0 rounded-xl bg-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>
            </div>
          </div>

          {/* Items Grid */}
          <motion.div 
            layout
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-5 hover:bg-gray-700 transition-all duration-300"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex-1 space-y-3">
                      <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-gray-400">{item.description}</p>
                      )}
                    </div>
                    
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>Maximum: {item.maxQuantity}</span>
                        <div className="flex items-center gap-2 bg-gray-800/70 rounded-lg p-1">
                          <button
                            onClick={() => initiateQuantityChange(item.id, false)}
                            className="text-red-400 hover:bg-gray-700/70 p-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={item.count <= 0}
                          >
                            <MinusIcon className="w-5 h-5" />
                          </button>
                          <span className="min-w-[3ch] text-center font-medium text-white text-lg">
                            {item.count}
                          </span>
                          <button
                            onClick={() => initiateQuantityChange(item.id, true)}
                            className="text-green-400 hover:bg-gray-700/70 p-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={item.count >= item.maxQuantity}
                          >
                            <PlusIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setOpenLogs(item.id)}
                          className="flex-1 bg-gray-800/70 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition-all duration-200"
                        >
                          View History
                        </button>
                        <button
                          onClick={() => setIsDeletingItem(item.id)}
                          className="bg-red-500/10 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>

      {/* Move LogsModal outside of the items mapping */}
      <LogsModal
        isOpen={!!openLogs}
        onClose={() => setOpenLogs(null)}
        itemId={openLogs}
        currentUserId={session?.user?.id}
        itemName={items.find(item => item.id === openLogs)?.name}
      />
      
      {/* Modals */}
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