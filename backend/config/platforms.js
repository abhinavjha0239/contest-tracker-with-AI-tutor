const platforms = {
  codeforces: {
    id: 1,
    name: 'Codeforces',
    displayName: 'Codeforces',
    color: '#1e88e5',
    enabled: true,
    resourceId: 1 // clist.by resource ID
  },
  codechef: {
    id: 2, 
    name: 'CodeChef',
    displayName: 'CodeChef',
    color: '#5c4033',
    enabled: true,
    resourceId: 2 // clist.by resource ID
  },
  leetcode: {
    id: 3,
    name: 'LeetCode',
    displayName: 'LeetCode',
    color: '#ffa116',
    enabled: true,
    resourceId: 102 // clist.by resource ID
  },
  atcoder: {
    id: 4,
    name: 'AtCoder',
    displayName: 'AtCoder',
    color: '#222222',
    enabled: true,
    resourceId: 93 // clist.by resource ID for AtCoder
  }
};

module.exports = {
  platforms,
  getEnabledPlatforms: () => Object.values(platforms).filter(p => p.enabled),
  getPlatformByResourceId: (resourceId) => Object.values(platforms).find(p => p.resourceId === resourceId),
  getPlatformById: (id) => Object.values(platforms).find(p => p.id === id)
};
