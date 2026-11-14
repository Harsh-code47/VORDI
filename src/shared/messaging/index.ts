import { RuntimeMessage } from '../types';

export function sendRuntimeMessage<T = unknown, R = unknown>(msg: RuntimeMessage<T>): Promise<R> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          // Non-fatal or receiver not active yet
          resolve(undefined as unknown as R);
        } else {
          resolve(response as R);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function sendTabMessage<T = unknown, R = unknown>(tabId: number, msg: RuntimeMessage<T>): Promise<R> {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, msg, (response) => {
        if (chrome.runtime.lastError) {
          resolve(undefined as unknown as R);
        } else {
          resolve(response as R);
        }
      });
    } catch {
      resolve(undefined as unknown as R);
    }
  });
}

