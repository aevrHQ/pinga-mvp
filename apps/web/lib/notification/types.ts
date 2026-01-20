export interface NotificationPayload {
  title: string;
  emoji: string;
  fields: { label: string; value: string }[];
  links: { label: string; url: string }[];
  payloadUrl: string;
  // Metadata for AI/Routing
  source?: string;
  eventType?: string;
  summary?: string; // AI generated summary
  rawPayload?: unknown;
}

export interface ChannelConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export interface NotificationChannel {
  name: string;
  type: string;
  send(
    config: ChannelConfig,
    notification: NotificationPayload,
  ): Promise<boolean>;
}

export interface UserChannel {
  type: string;
  config: ChannelConfig;
  enabled: boolean;
  name?: string;
}
