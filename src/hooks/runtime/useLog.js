import { useState, useEffect, useCallback } from 'react';
import * as logService from '../../services/ui/logService.js';
import { subscribeToSSE } from '../../services/ui/sseClient.js';

const MAX_LOG_ENTRIES = 200;

export default function useLog(campaignName) {
   const [logEntries, setLogEntries] = useState([]);
    const [initialized, setInitialized] = useState(false);

      // Load initial log on mount/campaign change
    useEffect(() => {
        if (!campaignName) return;
        (async () => {
          try {
              const entries = await logService.getLog(campaignName);
             setLogEntries(entries.slice(-MAX_LOG_ENTRIES));
            } catch (err) {
                console.error('Failed to load log:', err);
            } finally {
             setInitialized(true);
            }
         })();
        }, [campaignName]);

      // Subscribe to SSE events for new log entries
    useEffect(() => {
         if (!campaignName) return;
         return subscribeToSSE(campaignName, (event) => {
             if (!event.key.startsWith('log-')) return;
             if (event.data === null) {
                 setLogEntries([]);
                 return;
             }
             setLogEntries(prev => {
                 const updated = [...prev, event.data];
                 return updated.slice(-MAX_LOG_ENTRIES);
             });
         });
        }, [campaignName]);

    const addEntry = useCallback(async (entry) => {
        if (!campaignName) return;
       try {
          await logService.addEntry(campaignName, entry);
         // Don't need to update local state - SSE will push it
           } catch (err) {
            console.error('Failed to add log entry:', err);
         }
      }, [campaignName]);

    const reloadLog = useCallback(async () => {
        if (!campaignName) return;
        try {
            const entries = await logService.getLog(campaignName);
            setLogEntries(entries.slice(-MAX_LOG_ENTRIES));
        } catch (err) {
            console.error('Failed to reload log:', err);
        }
    }, [campaignName]);

    return { logEntries, initialized, addEntry, reloadLog };
}
