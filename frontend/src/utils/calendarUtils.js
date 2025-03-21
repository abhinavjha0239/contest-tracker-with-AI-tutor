export function createGoogleCalendarUrl(contest) {
  const { name, platform, startTime, endTime, url } = contest;
  
  const formatDate = (date) => new Date(date).toISOString().replace(/-|:|\.\d+/g, '');
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${platform} - ${name}`,
    details: `Contest Link: ${url}\n\nPlatform: ${platform}`,
    dates: `${formatDate(startTime)}/${formatDate(endTime)}`,
    location: url
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
