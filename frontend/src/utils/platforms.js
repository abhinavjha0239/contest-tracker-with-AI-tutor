export const platforms = {
  codeforces: {
    id: 1,
    name: 'Codeforces',
    displayName: 'Codeforces',
    color: '#1e88e5',
    enabled: true
  },
  codechef: {
    id: 2,
    name: 'CodeChef', 
    displayName: 'CodeChef',
    color: '#5c4033',
    enabled: true
  },
  leetcode: {
    id: 3,
    name: 'LeetCode',
    displayName: 'LeetCode',
    color: '#ffa116',
    enabled: true
  },
  atcoder: {
    id: 4,
    name: 'AtCoder',
    displayName: 'AtCoder',
    color: '#222222',
    enabled: true
  }
};

export const getEnabledPlatforms = () => Object.values(platforms).filter(p => p.enabled);
export const getPlatformByName = (name) => Object.values(platforms).find(p => p.name === name);
export const getPlatformById = (id) => Object.values(platforms).find(p => p.id === id);
