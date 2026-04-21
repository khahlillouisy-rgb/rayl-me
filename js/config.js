// Supabase configuration
const SUPABASE_URL = 'https://ayiwoadvzozoqwmnwdjp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ogS6zhzAm5YWOQNFjdDtsA_obL5GpC_';

// Admin credentials (client-side only — move to Supabase Auth in production)
const ADMIN_EMAIL = 'khahlil.louisy@gmail.com';
const ADMIN_PASS  = '#Academics#1221';

// Category definitions
const CATEGORIES = [
  { id: 'bodies',       label: 'Bodies' },
  { id: 'scene',        label: 'Scene' },
  { id: 'verified',     label: 'Verified' },
  { id: 'confessions',  label: 'Confessions' },
  { id: 'style',        label: 'Style & Beauty' },
  { id: 'verification', label: 'Verification Check' },
  { id: 'status',       label: 'Status Check' },
  { id: 'infra',        label: 'Infrastructure' },
  { id: 'list',         label: 'The List' },
];

const ROLE_LABELS = {
  publisher: 'Publisher',
  editor:    'Editor',
  writer:    'Writer',
  viewer:    'Viewer',
};
