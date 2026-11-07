// Sidebar navigation, grouped by section, per role.
export const NAV_CONFIG = {
  fishpond_owner: [
    { section: null, items: [{ label: 'Dashboard', to: '/owner/dashboard', icon: 'dashboard' }] },
    {
      section: 'Fishpond Management',
      items: [
        { label: 'Fishpond List', to: '/owner/fishponds', icon: 'list' },
        { label: 'Inventory & Resources', to: '/owner/inventory', icon: 'clipboard' },
      ],
    },
    {
      section: 'Monitoring',
      items: [
        { label: 'Stocking Records', to: '/owner/monitoring/stocking', icon: 'fish' },
        { label: 'Feeding Records', to: '/owner/monitoring/feeding', icon: 'clipboard' },
        { label: 'Mortality Records', to: '/owner/monitoring/mortality', icon: 'mortality' },
        { label: 'Growth Monitoring', to: '/owner/monitoring/growth', icon: 'growth' },
        { label: 'Survival Monitoring', to: '/owner/monitoring/survival', icon: 'survival' },
      ],
    },
    {
      section: 'Harvest',
      items: [{ label: 'Harvest Estimation', to: '/owner/harvest-estimation', icon: 'harvest' }],
    },
    {
      section: 'Sales',
      items: [{ label: 'Sales Records', to: '/owner/monitoring/sales', icon: 'report' }],
    },
    { section: 'Reports', items: [{ label: 'Reports', to: '/owner/reports', icon: 'report' }] },
    {
      section: 'Settings',
      items: [{ label: 'Profile Settings', to: '/owner/settings/profile', icon: 'settings' }],
    },
  ],
  agriculture_staff: [
    { section: null, items: [{ label: 'Dashboard', to: '/agri/dashboard', icon: 'dashboard' }] },
    {
      section: 'Management',
      items: [
        { label: 'Fishponds', to: '/agri/fishponds', icon: 'list' },
        { label: 'Fishpond Owners', to: '/agri/owners', icon: 'users' },
        { label: 'Registered List', to: '/agri/registered-list', icon: 'clipboard' },
      ],
    },
    {
      section: 'Monitoring',
      items: [
        { label: 'Production Overview', to: '/agri/monitoring/production', icon: 'fish' },
        { label: 'Mortality Overview', to: '/agri/monitoring/mortality', icon: 'mortality' },
        { label: 'Growth Overview', to: '/agri/monitoring/growth', icon: 'growth' },
        { label: 'Harvest Overview', to: '/agri/monitoring/harvest', icon: 'harvest' },
      ],
    },
    { section: 'Reports', items: [{ label: 'Reports', to: '/agri/reports', icon: 'report' }] },
    {
      section: 'Settings',
      items: [{ label: 'Municipality Settings', to: '/agri/settings', icon: 'settings' }],
    },
  ],
  admin: [
    { section: null, items: [{ label: 'Dashboard', to: '/admin/dashboard', icon: 'dashboard' }] },
    {
      section: 'Administration',
      items: [
        { label: 'User & Role Management', to: '/admin/users', icon: 'users' },
        { label: 'Species Management', to: '/admin/species', icon: 'fish' },
        { label: 'System Settings', to: '/admin/settings', icon: 'settings' },
        { label: 'Activity Logs', to: '/admin/activity-logs', icon: 'clipboard' },
        { label: 'Data Export / Backup', to: '/admin/backup', icon: 'download' },
      ],
    },
  ],
};

export const ROLE_HOME = {
  fishpond_owner: '/owner/dashboard',
  agriculture_staff: '/agri/dashboard',
  admin: '/admin/dashboard',
};

export function getPageTitle(pathname, role) {
  const sections = NAV_CONFIG[role] || [];
  for (const section of sections) {
    for (const item of section.items) {
      if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return item.label;
    }
  }
  return 'AquaTrack';
}
