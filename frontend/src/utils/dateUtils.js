import moment from 'moment';

export const getTimeRemaining = (startTime) => {
  const now = new Date();
  const start = new Date(startTime);
  const diff = start - now;
  
  if (diff <= 0) return 'Started';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${days}d ${hours}h ${minutes}m`;
};

export const formatDuration = (seconds) => {
  return moment.duration(seconds, 'seconds').humanize();
};
