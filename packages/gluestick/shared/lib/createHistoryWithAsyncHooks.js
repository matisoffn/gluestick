import createBrowserHistory from 'history/createBrowserHistory';
import { createLocation } from 'history/LocationUtils';

export default function createHistoryWithAsyncHooks(): History {
  const createKey = () => Math.random().toString(36).substr(2, 6);

  const history = createBrowserHistory();
  const push = history.push.bind(history);
  const replace = history.replace.bind(history);

  let listeners = [];

  const callListeners = async (...args) => {
    await Promise.all(listeners.map(listener => listener(...args)));
  };

  history.removeAllListeners = () => {
    listeners = [];
  };

  history.onTransition = listener => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(item => item !== listener);
    };
  };

  history.push = async (...args) => {
    const location = createLocation(...args, createKey(), history.location);
    await callListeners(location);
    push(...args);
  };

  history.replace = async (...args) => {
    const location = createLocation(...args, createKey(), history.location);
    await callListeners(location);
    replace(...args);
  };

  return history;
}
