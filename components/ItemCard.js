import React, { useState } from 'react';
import axios from 'axios';

export default function ItemCard({ item, session }) {
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`/api/items/${item.id}/logs`);
      setLogs(res.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const toggleLogs = async () => {
    if (!showLogs) {
      await fetchLogs();
    }
    setShowLogs(!showLogs);
  };

  return (
    <div className="item-card">
      <h3>{item.name}</h3>
      <p>Count: {item.count}</p>
      <button onClick={toggleLogs}>
        {showLogs ? 'Hide Logs' : 'Show Logs'}
      </button>

      {showLogs && (
        <div className="logs-container">
          {logs.map((log) => (
            <LogRow key={log.id} log={log} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogRow({ log, session }) {
  const [editing, setEditing] = useState(false);
  const [remark, setRemark] = useState(log.remarks || '');
  const [loading, setLoading] = useState(false);

  const updateRemark = async () => {
    setLoading(true);
    try {
      const res = await axios.patch(`/api/logs/${log.id}`, { remarks: remark });
      setRemark(res.data.remarks);
      setEditing(false);
    } catch (error) {
      console.error('Error updating remark:', error);
    } finally {
      setLoading(false);
    }
  };

  // Only show the "edit remark" option if the log belongs to the current user.
  const canEdit = session?.user?.id === log.userId;

  return (
    <div className="log-row">
      <p>
        <strong>{new Date(log.timestamp).toLocaleString()}:</strong> Changed
        from {log.oldCount} to {log.newCount}
      </p>

      {log.remarks && <p><em>Remark:</em> {log.remarks}</p>}

      {canEdit && (
        <div className="remark-editor">
          {editing ? (
            <>
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Add your remark…"
              />
              <button onClick={updateRemark} disabled={loading}>
                Save
              </button>
              <button onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}>
              {log.remarks ? 'Edit Remark' : 'Add Remark'}
            </button>
          )}
        </div>
      )}
    </div>
  );
} 