/**
 * Live queue state subscription using polling.
 *
 * Returns the current { state, tokens } and updates automatically by polling
 * the backend API every 3 seconds. This replaces Firebase real-time updates.
 */
import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';
const POLL_INTERVAL = 3000; // 3 seconds

export function useQueueState() {
  const [data, setData] = useState({ state: null, tokens: {}, announcement: null, loading: true, error: null });

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;

    const fetchQueueState = async () => {
      try {
        const response = await fetch(`${API_BASE}/queue/active`);
        if (!response.ok) throw new Error('Failed to fetch queue state');
        const result = await response.json();

        if (mounted) {
          setData({
            state: result.state,
            tokens: result.waiting.reduce((acc, t) => ({ ...acc, [t.id]: t }), {}),
            announcement: null, // Will fetch separately if needed
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (mounted) {
          setData(d => ({ ...d, error: err.message, loading: false }));
        }
      }
    };

    // Initial fetch
    fetchQueueState();

    // Set up polling
    const poll = () => {
      timeoutId = setTimeout(() => {
        fetchQueueState();
        poll();
      }, POLL_INTERVAL);
    };

    poll();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return data;
}

/**
 * Live status for a single token using polling.
 */
export function useTokenLive(tokenId) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenId) return;

    let mounted = true;
    let timeoutId = null;

    const fetchToken = async () => {
      try {
        const response = await fetch(`${API_BASE}/tokens/${tokenId}`);
        if (!response.ok) {
          if (response.status === 404) {
            if (mounted) {
              setToken(null);
              setLoading(false);
            }
            return;
          }
          throw new Error('Failed to fetch token');
        }
        const result = await response.json();

        if (mounted) {
          setToken(result);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching token:', err);
        if (mounted) setLoading(false);
      }
    };

    // Initial fetch
    fetchToken();

    // Set up polling
    const poll = () => {
      timeoutId = setTimeout(() => {
        fetchToken();
        poll();
      }, POLL_INTERVAL);
    };

    poll();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [tokenId]);

  return { token, loading };
}
