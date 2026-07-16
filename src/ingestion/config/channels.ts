// Registry of allowed official YouTube channels by institute

export interface InstituteChannelConfig {
  channelId: string;
  handle: string;
  name: string;
  instituteId: string;
  examTypes: ('JEE' | 'NEET')[];
  language: 'Hindi' | 'English' | 'Hinglish';
  isVerified: boolean;
}

export const ALLOWED_CHANNELS: Record<string, InstituteChannelConfig> = {
  // Physics Wallah channels
  'UCphU2bAGmw304CFAzy0EnCw': {
    channelId: 'UCphU2bAGmw304CFAzy0EnCw',
    handle: '@physicswallah',
    name: 'Physics Wallah - Alakh Pandey',
    instituteId: 'physics_wallah',
    examTypes: ['JEE', 'NEET'],
    language: 'Hinglish',
    isVerified: true,
  },
  'UCGw8iWmsw1cPlfcrww-3C0g': {
    channelId: 'UCGw8iWmsw1cPlfcrww-3C0g',
    handle: '@pwneet-official',
    name: 'PW NEET',
    instituteId: 'physics_wallah',
    examTypes: ['NEET'],
    language: 'Hinglish',
    isVerified: true,
  },
  'UCD16eo98AXl-9T61Xd711kQ': {
    channelId: 'UCD16eo98AXl-9T61Xd711kQ',
    handle: '@pw-neetwallah',
    name: 'Competition Wallah',
    instituteId: 'physics_wallah',
    examTypes: ['NEET'],
    language: 'Hinglish',
    isVerified: true,
  },
  'UCiGyWN6DEbnj2alu7iapuKQ': {
    channelId: 'UCiGyWN6DEbnj2alu7iapuKQ',
    handle: '@pw-jee-wallah',
    name: 'JEE Wallah',
    instituteId: 'physics_wallah',
    examTypes: ['JEE'],
    language: 'Hinglish',
    isVerified: true,
  },

  // Allen Career Institute
  'UC3dLaNdfNsc_zT_S_zT8_sw': {
    channelId: 'UC3dLaNdfNsc_zT_S_zT8_sw',
    handle: '@allencareerinstitute',
    name: 'Allen Career Institute',
    instituteId: 'allen',
    examTypes: ['JEE', 'NEET'],
    language: 'Hinglish',
    isVerified: true,
  },

  // Unacademy JEE
  'UC63V9iYI_vL-P_i36-1WlY9A': {
    channelId: 'UC63V9iYI_vL-P_i36-1WlY9A',
    handle: '@unacademyjee',
    name: 'Unacademy JEE',
    instituteId: 'unacademy',
    examTypes: ['JEE'],
    language: 'Hinglish',
    isVerified: true,
  },

  // Magnet Brains JEE/NEET
  'UC-PZSEHaQOcJiSTsbJMohZQ': {
    channelId: 'UC-PZSEHaQOcJiSTsbJMohZQ',
    handle: '@magnetbrainsiit-jeeneet6538',
    name: 'Magnet Brains IIT-JEE & NEET',
    instituteId: 'magnet_brains',
    examTypes: ['JEE', 'NEET'],
    language: 'Hinglish',
    isVerified: true,
  }
};
