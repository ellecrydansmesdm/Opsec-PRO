// shared/ipc-types.ts

export type IPCResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Map of IPC Channels to their Request/Response types
export interface IPCTypes {
  'check-auth': {
    params: void;
    response: IPCResponse<{ authenticated: boolean; user?: any }>;
  };
  'login-attempt': {
    params: { token: string; rememberMe: boolean };
    response: IPCResponse<{ user: any }>;
  };
  'get-user-data': {
    params: void;
    response: IPCResponse<any>;
  };
  'get-channels': {
    params: void;
    response: IPCResponse<any[]>;
  };
  'start-purge': {
    params: { channelId: string; amount: number; purgeAll: boolean; delay: number };
    response: IPCResponse<void>;
  };
  'get-settings': {
    params: void;
    response: IPCResponse<any>;
  };
  'save-settings': {
    params: any;
    response: IPCResponse<void>;
  };
  'logout': {
    params: void;
    response: IPCResponse<void>;
  };
  'leave-all-groups': {
    params: void;
    response: IPCResponse<{ count: number }>;
  };
  'nuke-dms': {
    params: { amountPerDM: number; delay: number };
    response: IPCResponse<{ totalDeleted: number; channelsProcessed: number }>;
  };
  'start-spam': {
    params: { channelId: string; texts: string[]; delay: number };
    response: IPCResponse<void>;
  };
  'stop-spam': {
    params: void;
    response: IPCResponse<void>;
  };
  'login-via-discord': {
    params: void;
    response: IPCResponse<{ token: string }>;
  };
}
